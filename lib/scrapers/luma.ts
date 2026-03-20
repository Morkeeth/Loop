import type { ScrapedEvent } from './types';

// Luma city slugs — maps normalized city names to luma.com/{slug}
const CITY_SLUGS: Record<string, string> = {
  'dublin': 'dublin',
  'london': 'london',
  'paris': 'paris',
  'berlin': 'berlin',
  'amsterdam': 'amsterdam',
  'new york': 'new-york',
  'new-york': 'new-york',
  'san francisco': 'san-francisco',
  'san-francisco': 'san-francisco',
  'lisbon': 'lisbon',
  'barcelona': 'barcelona',
  'tokyo': 'tokyo',
  'los angeles': 'los-angeles',
  'los-angeles': 'los-angeles',
  'austin': 'austin',
  'miami': 'miami',
  'singapore': 'singapore',
  'sydney': 'sydney',
  'toronto': 'toronto',
  'seattle': 'seattle',
  'chicago': 'chicago',
  'boston': 'boston',
  'denver': 'denver',
  'portland': 'portland',
  'melbourne': 'melbourne',
  'stockholm': 'stockholm',
  'copenhagen': 'copenhagen',
  'vienna': 'vienna',
  'munich': 'munich',
  'manchester': 'manchester',
  'edinburgh': 'edinburgh',
  'bangkok': 'bangkok',
  'lagos': 'lagos',
  'nairobi': 'nairobi',
  'cape-town': 'cape-town',
  'cape town': 'cape-town',
};

function getCitySlug(city: string): string {
  const normalized = city.toLowerCase().trim();
  return CITY_SLUGS[normalized] || normalized.replace(/\s+/g, '-');
}

export async function scrapeLuma(city: string): Promise<ScrapedEvent[]> {
  const slug = getCitySlug(city);

  try {
    const res = await fetch(`https://luma.com/${slug}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.log(`Luma: ${res.status} for ${slug}`);
      return [];
    }

    const html = await res.text();

    // Extract __NEXT_DATA__ JSON from the page
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match?.[1]) {
      console.log(`Luma: no __NEXT_DATA__ found for ${slug}`);
      return [];
    }

    const nextData = JSON.parse(match[1]);
    const initialData = nextData?.props?.pageProps?.initialData;
    // Structure: initialData.data.events (not initialData.events)
    const entries = initialData?.data?.events || initialData?.events;
    if (!Array.isArray(entries) || entries.length === 0) {
      console.log(`Luma: no events found for ${slug}`);
      return [];
    }

    const now = new Date();
    const threeWeeksOut = new Date(now);
    threeWeeksOut.setDate(threeWeeksOut.getDate() + 21);

    const events: ScrapedEvent[] = [];

    for (const entry of entries) {
      try {
        const evt = entry.event;
        if (!evt?.name || !evt?.start_at) continue;

        const startAt = new Date(evt.start_at);
        if (startAt < now || startAt > threeWeeksOut) continue;
        if (entry.ticket_info?.is_sold_out) continue;

        const geo = evt.geo_address_info || {};

        let price: string | null = null;
        if (entry.ticket_info?.is_free) {
          price = 'Free';
        } else if (entry.ticket_info?.price?.cents) {
          const symbols: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };
          const sym = symbols[entry.ticket_info.price.currency] || entry.ticket_info.price.currency?.toUpperCase() + ' ';
          price = `${sym}${(entry.ticket_info.price.cents / 100).toFixed(0)}`;
        }

        events.push({
          title: evt.name,
          venue: geo.address || geo.sublocality || '',
          address: geo.full_address || geo.short_address || '',
          startAt: evt.start_at,
          endAt: evt.end_at || evt.start_at,
          url: `https://lu.ma/${evt.url}`,
          imageUrl: evt.cover_url || null,
          description: '', // Luma doesn't include descriptions in the list
          price,
          source: 'luma',
          category: evt.event_type || undefined,
        });
      } catch {
        // Skip malformed entries
      }
    }

    console.log(`Luma: found ${events.length} events in ${slug}`);
    return events;
  } catch (error) {
    console.log(`Luma scrape failed for ${slug}:`, error instanceof Error ? error.message : 'unknown');
    return [];
  }
}
