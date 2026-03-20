import type { ScrapedEvent } from './types';

// Eventbrite uses {country}--{city} slugs
const CITY_SLUGS: Record<string, string> = {
  'dublin': 'ireland--dublin',
  'london': 'united-kingdom--london',
  'paris': 'france--paris',
  'berlin': 'germany--berlin',
  'amsterdam': 'netherlands--amsterdam',
  'new york': 'ny--new-york',
  'new-york': 'ny--new-york',
  'san francisco': 'ca--san-francisco',
  'san-francisco': 'ca--san-francisco',
  'lisbon': 'portugal--lisbon',
  'barcelona': 'spain--barcelona',
  'tokyo': 'japan--tokyo',
  'los angeles': 'ca--los-angeles',
  'los-angeles': 'ca--los-angeles',
  'austin': 'tx--austin',
  'miami': 'fl--miami',
  'singapore': 'singapore--singapore',
  'sydney': 'australia--sydney',
  'toronto': 'canada--toronto',
  'seattle': 'wa--seattle',
  'chicago': 'il--chicago',
  'boston': 'ma--boston',
  'denver': 'co--denver',
  'portland': 'or--portland',
  'melbourne': 'australia--melbourne',
  'stockholm': 'sweden--stockholm',
  'copenhagen': 'denmark--copenhagen',
  'vienna': 'austria--vienna',
  'munich': 'germany--munich',
  'manchester': 'united-kingdom--manchester',
  'edinburgh': 'united-kingdom--edinburgh',
  'bangkok': 'thailand--bangkok',
  'lagos': 'nigeria--lagos',
  'nairobi': 'kenya--nairobi',
  'cape town': 'south-africa--cape-town',
  'cape-town': 'south-africa--cape-town',
};

function getCitySlug(city: string): string {
  const normalized = city.toLowerCase().trim();
  return CITY_SLUGS[normalized] || normalized;
}

export async function scrapeEventbrite(city: string): Promise<ScrapedEvent[]> {
  const slug = getCitySlug(city);
  const url = `https://www.eventbrite.com/d/${slug}/all-events/?page=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.log(`Eventbrite: ${res.status} for ${slug}`);
      return [];
    }

    const html = await res.text();

    // Extract JSON-LD structured data (Schema.org events)
    const ldEvents = extractJsonLd(html);
    if (ldEvents.length > 0) {
      console.log(`Eventbrite: found ${ldEvents.length} events in ${slug} (JSON-LD)`);
      return ldEvents;
    }

    // Fallback: try __SERVER_DATA__
    const serverDataEvents = extractServerData(html);
    if (serverDataEvents.length > 0) {
      console.log(`Eventbrite: found ${serverDataEvents.length} events in ${slug} (__SERVER_DATA__)`);
      return serverDataEvents;
    }

    console.log(`Eventbrite: no events found for ${slug}`);
    return [];
  } catch (error) {
    console.log(`Eventbrite scrape failed for ${slug}:`, error instanceof Error ? error.message : 'unknown');
    return [];
  }
}

function extractJsonLd(html: string): ScrapedEvent[] {
  const now = new Date();
  const threeWeeksOut = new Date(now);
  threeWeeksOut.setDate(threeWeeksOut.getDate() + 21);

  const events: ScrapedEvent[] = [];

  // Find all application/ld+json script tags
  const ldPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;

  while ((match = ldPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);

      // Can be a single event or an array
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item['@type'] !== 'Event' && item['@type'] !== 'MusicEvent') continue;

        const startAt = item.startDate;
        if (!startAt || !item.name) continue;

        const startDate = new Date(startAt);
        if (startDate < now || startDate > threeWeeksOut) continue;

        const location = item.location || {};
        const address = location.address;
        const addressStr = typeof address === 'string'
          ? address
          : [address?.streetAddress, address?.addressLocality, address?.addressRegion, address?.postalCode]
            .filter(Boolean).join(', ');

        events.push({
          title: item.name,
          venue: location.name || '',
          address: addressStr || '',
          startAt: startAt,
          endAt: item.endDate || startAt,
          url: item.url || '',
          imageUrl: typeof item.image === 'string' ? item.image : item.image?.url || null,
          description: item.description?.slice(0, 300) || '',
          price: null, // Eventbrite doesn't include price in JSON-LD
          source: 'eventbrite',
          category: inferCategory(item.name, item.description || ''),
        });
      }
    } catch {
      // Skip malformed JSON-LD blocks
    }
  }

  return events.slice(0, 20);
}

function extractServerData(html: string): ScrapedEvent[] {
  const match = html.match(/window\.__SERVER_DATA__\s*=\s*({[\s\S]*?});/);
  if (!match?.[1]) return [];

  const now = new Date();
  const threeWeeksOut = new Date(now);
  threeWeeksOut.setDate(threeWeeksOut.getDate() + 21);

  try {
    const data = JSON.parse(match[1]);
    const events: ScrapedEvent[] = [];

    // Navigate into buckets structure
    const buckets = data.search_data?.events?.results || data.buckets || [];
    const allItems = Array.isArray(buckets)
      ? buckets.flatMap((b: any) => b.events || b.results || [b])
      : [];

    for (const item of allItems) {
      if (!item.name && !item.title) continue;

      const startAt = item.start_date || item.start?.utc || '';
      if (!startAt) continue;

      const startDate = new Date(startAt);
      if (startDate < now || startDate > threeWeeksOut) continue;

      const venue = item.primary_venue || item.venue || {};

      events.push({
        title: item.name || item.title,
        venue: venue.name || '',
        address: venue.address?.localized_address_display || venue.address?.address_1 || '',
        startAt,
        endAt: item.end_date || item.end?.utc || startAt,
        url: item.url || item.tickets_url || '',
        imageUrl: item.image?.url || item.image?.original?.url || null,
        description: item.summary || '',
        price: null,
        source: 'eventbrite',
        category: inferCategory(item.name || '', item.summary || ''),
      });
    }

    return events.slice(0, 20);
  } catch {
    return [];
  }
}

function inferCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/\b(dj|club|rave|techno|house music|afterparty)\b/.test(text)) return 'nightlife';
  if (/\b(concert|live music|gig|band|jazz|acoustic|open mic)\b/.test(text)) return 'music';
  if (/\b(gallery|art|exhibition|painting|sculpture|ceramics)\b/.test(text)) return 'art';
  if (/\b(food|dinner|supper|tasting|wine|cocktail|brunch)\b/.test(text)) return 'food';
  if (/\b(yoga|meditation|wellness|breathwork|fitness|run)\b/.test(text)) return 'wellness';
  if (/\b(tech|coding|hack|startup|ai|developer)\b/.test(text)) return 'tech';
  if (/\b(comedy|standup|stand-up|improv|drag)\b/.test(text)) return 'social';
  if (/\b(film|cinema|screening|book|poetry|literary)\b/.test(text)) return 'culture';
  if (/\b(football|soccer|basketball|tennis|sport)\b/.test(text)) return 'sport';
  if (/\b(market|fair|vintage|flea|swap)\b/.test(text)) return 'culture';
  return 'other';
}
