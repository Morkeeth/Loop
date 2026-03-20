import type { ScrapedEvent } from './types';

// Dice.fm doesn't have city browse pages — we scrape known venue pages instead.
// Each city maps to a list of popular small/medium venue slugs.
// Add venues as we discover them.
const CITY_VENUES: Record<string, string[]> = {
  'dublin': [
    'index-dublin-aagd',
    'block-dkk3e',
    'twenty-two-night-club-eovq6',
    'opium-live-96qd',
    'centre-point-q6kx',
    'the-academy-g5npp',
  ],
  'london': [
    'fabric-vvpd',
    'corsica-studios-jqna',
    'moth-club-43ox',
    'earth-76a7',
    'the-jazz-cafe-4m7k',
    'village-underground-wwop',
    'colour-factory-z6v7',
    'the-lexington-jomz',
    'aaja-mpqr',
    'colours-hoxton-mxew',
  ],
  'berlin': [
    'berghain-e53d',
    'tresor--globus-lrab',
    'ohm-gallery-im-tresor-mrok',
    'rsoberlin-6ddq7',
    'astra-kulturhaus-6rgq',
    'sage-club-r6yy',
    'anomalie-art-club-xnge',
  ],
  'paris': [
    'rex-club-76v7',
    'la-java-pm3y',
    'badaboum-9b87',
    'petit-bain-n2rl',
    'la-station--gare-des-mines-enqd',
    'le-hasard-ludique-rmxq',
    'cabaret-sauvage-ve7v',
    'glazart-xwwa',
  ],
  'amsterdam': [
    'parallel-amsterdam-g55xb',
    'shelter-amsterdam-wwqlp',
  ],
  'manchester': [
    'the-white-hotel-4w7n',
    'band-on-the-wall-zl6r',
    'yes-basement-2onp',
    'new-century-n8al',
    'depot-mayfield-8oxr',
  ],
  'barcelona': [
    'sala-apolo-naaq',
    'sala-upload-qovx',
    'laut-ao6x',
    'sidecar-y39a',
    'boris-club-pylwy',
  ],
  'lisbon': [
    'musicbox-lisboa-7gwv',
    'lux-logp',
    'bleza-pyo2w',
    'republica-da-musica-2-7d6a7',
  ],
};

function getVenueSlugs(city: string): string[] {
  const normalized = city.toLowerCase().trim();
  return CITY_VENUES[normalized] || [];
}

export async function scrapeDice(city: string): Promise<ScrapedEvent[]> {
  const venues = getVenueSlugs(city);
  if (venues.length === 0) {
    console.log(`Dice: no venue slugs configured for ${city}`);
    return [];
  }

  const now = new Date();
  const threeWeeksOut = new Date(now);
  threeWeeksOut.setDate(threeWeeksOut.getDate() + 21);

  const allEvents: ScrapedEvent[] = [];
  const seenTitles = new Set<string>();

  // Fetch venues sequentially with small delays to be respectful
  for (const venueSlug of venues) {
    try {
      if (allEvents.length >= 25) break; // Cap total events

      const events = await scrapeVenuePage(venueSlug, now, threeWeeksOut);
      for (const event of events) {
        const key = event.title.toLowerCase();
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          allEvents.push(event);
        }
      }

      // Small delay between venue fetches
      await new Promise(r => setTimeout(r, 500));
    } catch {
      // Skip failed venues
    }
  }

  console.log(`Dice: found ${allEvents.length} events in ${city} (${venues.length} venues)`);
  return allEvents;
}

async function scrapeVenuePage(
  venueSlug: string,
  now: Date,
  threeWeeksOut: Date,
): Promise<ScrapedEvent[]> {
  const url = `https://dice.fm/venue/${venueSlug}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.log(`Dice: ${res.status} for venue ${venueSlug}`);
    return [];
  }

  const html = await res.text();

  // Extract __NEXT_DATA__
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) return [];

  try {
    const nextData = JSON.parse(match[1]);
    const pageProps = nextData?.props?.pageProps;

    // Dice stores venue data in pageProps.profile or pageProps.initialState
    let events: any[] = [];

    // Try pageProps.profile.sections[].events[]
    if (pageProps?.profile?.sections) {
      for (const section of pageProps.profile.sections) {
        if (Array.isArray(section.events)) {
          events.push(...section.events);
        }
        if (Array.isArray(section.data)) {
          events.push(...section.data);
        }
      }
    }

    // Try initialState (JSON string that needs double-parsing)
    if (events.length === 0 && pageProps?.initialState) {
      try {
        const state = typeof pageProps.initialState === 'string'
          ? JSON.parse(pageProps.initialState)
          : pageProps.initialState;
        events = findEventsInState(state);
      } catch {
        // Skip
      }
    }

    return events
      .map(evt => parseEvent(evt, now, threeWeeksOut))
      .filter((e): e is ScrapedEvent => e !== null);
  } catch {
    return [];
  }
}

function findEventsInState(obj: any, depth = 0): any[] {
  if (depth > 4 || !obj) return [];

  if (Array.isArray(obj)) {
    const hasEvents = obj.some(
      (item: any) => item && typeof item === 'object' && (item.name || item.title) && item.dates
    );
    if (hasEvents) return obj;

    for (const item of obj.slice(0, 20)) {
      const found = findEventsInState(item, depth + 1);
      if (found.length > 0) return found;
    }
  }

  if (typeof obj === 'object') {
    for (const key of ['events', 'items', 'data', 'results']) {
      if (obj[key]) {
        const found = findEventsInState(obj[key], depth + 1);
        if (found.length > 0) return found;
      }
    }
  }

  return [];
}

function parseEvent(evt: any, now: Date, threeWeeksOut: Date): ScrapedEvent | null {
  const name = evt.name || evt.title;
  if (!name) return null;

  // Parse dates
  const dates = evt.dates || {};
  const startAt = dates.event_start_date || evt.date || '';
  if (!startAt) return null;

  const startDate = new Date(startAt);
  if (isNaN(startDate.getTime())) return null;
  if (startDate < now || startDate > threeWeeksOut) return null;

  // Skip sold out
  if (evt.status === 'sold-out' || evt.sold_out) return null;

  // Parse venue
  const venues = evt.venues || [];
  const venue = venues[0] || {};

  // Parse price
  let price: string | null = null;
  if (evt.price) {
    const symbols: Record<string, string> = { EUR: '\u20AC', USD: '$', GBP: '\u00A3' };
    const currency = evt.price.currency || 'EUR';
    const amount = evt.price.amount != null
      ? (evt.price.amount / 100).toFixed(0)
      : evt.price.amount_from != null
        ? `${(evt.price.amount_from / 100).toFixed(0)}+`
        : null;
    if (amount) {
      price = `${symbols[currency] || currency + ' '}${amount}`;
    }
  }

  // Build URL
  const slug = evt.perm_name || evt.slug || evt.id;
  const url = slug ? `https://dice.fm/event/${slug}` : '';

  // Pick best image
  const images = evt.images || [];
  const imageUrl = images[0]?.url || evt.image_url || null;

  return {
    title: name,
    venue: venue.name || '',
    address: venue.address || '',
    startAt: startAt,
    endAt: dates.event_end_date || startAt,
    url,
    imageUrl,
    description: evt.about?.description?.slice(0, 300) || evt.description || '',
    price,
    source: 'dice',
    category: inferDiceCategory(name, evt.tags_types || []),
  };
}

function inferDiceCategory(title: string, tags: any[]): string {
  const tagNames = tags.map((t: any) => (t.name || t).toString().toLowerCase());
  const text = `${title.toLowerCase()} ${tagNames.join(' ')}`;

  if (/\b(club|techno|house|rave|dj set|dance)\b/.test(text)) return 'nightlife';
  if (/\b(live|concert|gig|band|jazz|acoustic|indie|rock|hip.hop|rap)\b/.test(text)) return 'music';
  if (/\b(comedy|standup|stand-up|improv|drag)\b/.test(text)) return 'social';
  if (/\b(art|gallery|exhibition|painting)\b/.test(text)) return 'art';
  if (/\b(food|dinner|tasting|wine|supper)\b/.test(text)) return 'food';
  if (/\b(film|cinema|screening|documentary)\b/.test(text)) return 'culture';
  if (/\b(yoga|wellness|meditation)\b/.test(text)) return 'wellness';
  return 'music'; // Dice is primarily music-focused
}
