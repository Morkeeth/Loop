// Client-side event categorizer + archetype scorer
// Runs instantly on calendar data before the AI persona call

export interface Archetype {
  id: string;
  label: string;
  description: string;
  score: number; // 0-100
  signals: string[]; // matching event titles
}

interface EventSignal {
  title: string;
  categories: string[];
}

// Keyword → archetype mapping
const SIGNAL_MAP: Record<string, string[]> = {
  // Fitness
  'run': ['fitness'], 'running': ['fitness'], 'marathon': ['fitness'], 'trail': ['fitness'],
  'gym': ['fitness'], 'tennis': ['fitness'], 'yoga': ['fitness'], 'pilates': ['fitness'],
  'swim': ['fitness'], 'cycling': ['fitness'], 'crossfit': ['fitness'], 'boxing': ['fitness'],
  'padel': ['fitness'], 'football': ['fitness'], 'basketball': ['fitness'], 'climbing': ['fitness'],
  'workout': ['fitness'], 'training': ['fitness'], 'coach': ['fitness'], 'match': ['fitness'],

  // Culture
  'museum': ['culture'], 'gallery': ['culture'], 'exhibition': ['culture'], 'expo': ['culture'],
  'art': ['culture'], 'theatre': ['culture'], 'theater': ['culture'], 'cinema': ['culture'],
  'film': ['culture'], 'opera': ['culture'], 'ballet': ['culture'],
  'vernissage': ['culture'], 'lecture': ['culture'], 'book': ['culture'],
  'concert': ['culture', 'music'],

  // Music
  'dj': ['music'], 'festival': ['music'], 'gig': ['music'],
  'live music': ['music'], 'jazz': ['music'], 'techno': ['music'], 'club': ['music'],
  'band': ['music'], 'show': ['music'], 'listening': ['music'],

  // Food & Drink
  'dinner': ['food'], 'restaurant': ['food'], 'brunch': ['food'], 'lunch': ['food'],
  'tasting': ['food'], 'wine': ['food'], 'cocktail': ['food'], 'cooking': ['food'],
  'supper': ['food'], 'food': ['food'], 'café': ['food'], 'cafe': ['food'],
  'apéro': ['food'], 'aperitif': ['food'], 'bar': ['food'],
  'provsmakning': ['food'], // Swedish for tasting

  // Social
  'birthday': ['social'], 'party': ['social'], 'drinks': ['social'],
  'networking': ['social'], 'get-together': ['social'], 'wedding': ['social'],
  'celebration': ['social'], 'housewarming': ['social'], 'bbq': ['social'],
  'fyller år': ['social'], // Swedish for birthday

  // Wellness
  'meditation': ['wellness'], 'retreat': ['wellness'], 'spa': ['wellness'],
  'therapy': ['wellness'], 'mindfulness': ['wellness'], 'breathwork': ['wellness'],
  'sauna': ['wellness'], 'massage': ['wellness'], 'wellness': ['wellness'],

  // Tech
  'hackathon': ['tech'], 'meetup': ['tech', 'social'], 'demo': ['tech'],
  'startup': ['tech'], 'pitch': ['tech'], 'code': ['tech'], 'workshop': ['tech'],
  'conference': ['tech'], 'talk': ['tech'], 'webinar': ['tech'],

  // Outdoor
  'hike': ['outdoor'], 'hiking': ['outdoor'], 'camping': ['outdoor'], 'beach': ['outdoor'],
  'park': ['outdoor'], 'picnic': ['outdoor'], 'kayak': ['outdoor'], 'surf': ['outdoor'],
  'walk': ['outdoor'], 'nature': ['outdoor'],

  // Romantic
  'romantic': ['romantic'], 'date night': ['romantic'], 'anniversary': ['romantic'],
  'valentine': ['romantic'],
};

const ARCHETYPE_DEFS: Record<string, { label: string; description: string }> = {
  fitness: { label: 'The Fitness Devotee', description: 'You move your body like it owes you rent' },
  culture: { label: 'The Cultural Explorer', description: 'Always first to a gallery opening' },
  music: { label: 'The Music Head', description: 'You know the DJ before they blow up' },
  food: { label: 'The Epicurean', description: 'Life is too short for bad wine' },
  social: { label: 'The Social Connector', description: 'Everyone\'s +1, always in the mix' },
  wellness: { label: 'The Wellness Seeker', description: 'Breathwork before brunch' },
  tech: { label: 'The Tech Mind', description: 'Building the future, one meetup at a time' },
  outdoor: { label: 'The Outdoor Soul', description: 'Happiest when the signal drops' },
  romantic: { label: 'The Romantic', description: 'Date night is non-negotiable' },
};

export function categorizeEvents(events: any[]): EventSignal[] {
  return events.map((evt) => {
    const title = (evt.s || evt.summary || '').toLowerCase();
    const categories: string[] = [];

    for (const [keyword, cats] of Object.entries(SIGNAL_MAP)) {
      if (title.includes(keyword)) {
        cats.forEach(c => { if (!categories.includes(c)) categories.push(c); });
      }
    }

    return { title: evt.s || evt.summary || 'Untitled', categories };
  });
}

export function scoreArchetypes(signals: EventSignal[]): Archetype[] {
  const counts: Record<string, { count: number; titles: string[] }> = {};

  for (const signal of signals) {
    for (const cat of signal.categories) {
      if (!counts[cat]) counts[cat] = { count: 0, titles: [] };
      counts[cat].count++;
      if (counts[cat].titles.length < 3) counts[cat].titles.push(signal.title);
    }
  }

  const maxCount = Math.max(...Object.values(counts).map(c => c.count), 1);

  return Object.entries(ARCHETYPE_DEFS)
    .map(([id, def]) => ({
      id,
      label: def.label,
      description: def.description,
      score: Math.round(((counts[id]?.count || 0) / maxCount) * 100),
      signals: counts[id]?.titles || [],
    }))
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score);
}
