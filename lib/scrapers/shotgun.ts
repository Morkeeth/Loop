import { parse } from 'node-html-parser';
import type { ScrapedEvent } from './types';

// Shotgun city slugs
const CITY_SLUGS: Record<string, string> = {
  'dublin': 'dublin',
  'london': 'london',
  'paris': 'paris',
  'berlin': 'berlin',
  'amsterdam': 'amsterdam',
  'new york': 'new-york',
  'new-york': 'new-york',
  'lisbon': 'lisbon',
  'barcelona': 'barcelona',
  'manchester': 'manchester',
  'lyon': 'lyon',
  'marseille': 'marseille',
  'brussels': 'brussels',
  'milan': 'milan',
  'rome': 'rome',
  'madrid': 'madrid',
  'edinburgh': 'edinburgh',
  'glasgow': 'glasgow',
  'bordeaux': 'bordeaux',
  'toulouse': 'toulouse',
};

function getCitySlug(city: string): string {
  const normalized = city.toLowerCase().trim();
  return CITY_SLUGS[normalized] || normalized.replace(/\s+/g, '-');
}

async function fetchWithRetry(url: string, retries = 3): Promise<string | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (res.status === 429) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`Shotgun: 429 rate limited, retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (!res.ok) {
        console.log(`Shotgun: ${res.status} for ${url}`);
        return null;
      }

      return await res.text();
    } catch (error) {
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      console.log(`Shotgun fetch failed:`, error instanceof Error ? error.message : 'unknown');
      return null;
    }
  }
  return null;
}

export async function scrapeShotgun(city: string): Promise<ScrapedEvent[]> {
  const slug = getCitySlug(city);
  const html = await fetchWithRetry(`https://shotgun.live/en/cities/${slug}`);

  if (!html) return [];

  try {
    // First try: look for embedded JSON data (Nuxt/SSR hydration)
    const jsonEvents = extractJsonEvents(html);
    if (jsonEvents.length > 0) return jsonEvents;

    // Fallback: parse HTML structure
    return extractHtmlEvents(html, slug);
  } catch (error) {
    console.log(`Shotgun parse failed for ${slug}:`, error instanceof Error ? error.message : 'unknown');
    return [];
  }
}

function extractJsonEvents(html: string): ScrapedEvent[] {
  // Shotgun may embed event data in __NUXT_DATA__ or similar script tags
  const patterns = [
    /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    /<script[^>]*>window\.__NUXT__\s*=\s*([\s\S]*?)<\/script>/,
    /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        const data = JSON.parse(match[1]);
        // Try to extract events from common Nuxt data structures
        const events = findEventsInObject(data);
        if (events.length > 0) return events;
      } catch {
        // Not valid JSON, try next pattern
      }
    }
  }

  return [];
}

function findEventsInObject(obj: any, depth = 0): ScrapedEvent[] {
  if (depth > 5 || !obj) return [];

  // Look for arrays that contain event-like objects
  if (Array.isArray(obj)) {
    const hasEventShape = obj.some((item: any) =>
      item && typeof item === 'object' && (item.title || item.name) && (item.date || item.start_date || item.starts_at)
    );
    if (hasEventShape) {
      return obj
        .filter((item: any) => item && (item.title || item.name))
        .map((item: any) => ({
          title: item.title || item.name || '',
          venue: item.venue?.name || item.venue || item.location || '',
          address: item.venue?.address || item.address || '',
          startAt: item.starts_at || item.start_date || item.date || '',
          endAt: item.ends_at || item.end_date || '',
          url: item.url ? (item.url.startsWith('http') ? item.url : `https://shotgun.live${item.url}`) : '',
          imageUrl: item.cover_url || item.image_url || item.flyer_url || null,
          description: item.description || '',
          price: item.price ? String(item.price) : null,
          source: 'shotgun' as const,
          category: 'nightlife',
        }));
    }
    // Recurse into array items
    for (const item of obj.slice(0, 20)) {
      const found = findEventsInObject(item, depth + 1);
      if (found.length > 0) return found;
    }
  }

  // Recurse into object values
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj).slice(0, 30)) {
      if (['events', 'items', 'results', 'data'].includes(key)) {
        const found = findEventsInObject(obj[key], depth + 1);
        if (found.length > 0) return found;
      }
    }
  }

  return [];
}

function extractHtmlEvents(html: string, citySlug: string): ScrapedEvent[] {
  const root = parse(html);
  const events: ScrapedEvent[] = [];

  // Shotgun renders event cards as links to /en/events/{slug}
  const eventLinks = root.querySelectorAll('a[href*="/en/events/"]');

  for (const link of eventLinks) {
    try {
      const href = link.getAttribute('href');
      if (!href) continue;

      // Get event title from heading or strong text
      const title = link.querySelector('h2, h3, h4, [class*="title"], strong')?.text?.trim()
        || link.text?.trim()?.split('\n')[0]?.trim();

      if (!title || title.length < 3) continue;

      // Try to extract venue/date from surrounding text
      const allText = link.text?.trim() || '';
      const textParts = allText.split('\n').map(s => s.trim()).filter(Boolean);

      // Get image
      const img = link.querySelector('img');
      const imageUrl = img?.getAttribute('src') || img?.getAttribute('data-src') || null;

      const url = href.startsWith('http') ? href : `https://shotgun.live${href}`;

      events.push({
        title,
        venue: textParts[1] || '',
        address: '',
        startAt: '',  // HTML scraping may not get clean dates
        endAt: '',
        url,
        imageUrl,
        description: '',
        price: null,
        source: 'shotgun',
        category: 'nightlife',
      });
    } catch {
      // Skip malformed entries
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const unique = events.filter(e => {
    const key = e.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Shotgun: found ${unique.length} events in ${citySlug}`);
  return unique.slice(0, 20); // Cap at 20
}
