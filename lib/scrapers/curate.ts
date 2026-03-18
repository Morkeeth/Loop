import OpenAI from 'openai';
import type { ScrapedEvent, CuratedCityEvent } from './types';
import { parseJsonFromText } from '../discover';

export async function curateEvents(city: string, events: ScrapedEvent[]): Promise<CuratedCityEvent[]> {
  if (events.length === 0) return [];

  // If we have 3 or fewer events, format them directly without AI
  if (events.length <= 3) {
    return events.map(e => formatRawEvent(e));
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const eventsJson = events.map(e => ({
    title: e.title,
    venue: e.venue,
    address: e.address,
    startAt: e.startAt,
    endAt: e.endAt,
    url: e.url,
    price: e.price,
    source: e.source,
    category: e.category,
  }));

  const prompt = `You are Loop's city editor. You have ${events.length} events happening in ${city} soon. Pick the 5 most interesting, surprising, or niche ones — the kind of thing a cool local friend would text you about.

EVENTS:
${JSON.stringify(eventsJson, null, 2)}

RULES:
- Pick 3-5 events (fewer if there aren't enough good ones)
- Reject: corporate meetups, generic networking, tourist attractions, ongoing exhibitions
- Prefer: intimate live music, pop-up dinners, workshops, gallery openings, DJ sets, comedy nights, film screenings, run clubs, markets
- Write the description like you're texting a friend at 6pm: "Dude, there's this tiny jazz thing in a bookshop tonight..."
- whyGo should be one punchy line that makes someone stop scrolling

Return JSON array only:
[
  {
    "title": "Exact event name",
    "venue": "Venue name",
    "address": "Full address",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "endTime": "HH:MM",
    "url": "Event URL",
    "imageUrl": null,
    "description": "2-3 sentences, casual and warm",
    "category": "music | art | food | tech | wellness | social | culture | nightlife | other",
    "source": "luma or shotgun",
    "whyGo": "One punchy line"
  }
]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from GPT-4o-mini');

    const parsed = parseJsonFromText(content);
    const curated: CuratedCityEvent[] = Array.isArray(parsed) ? parsed : [parsed];

    // Restore imageUrl from original events
    return curated.map(c => {
      const original = events.find(e => e.title.toLowerCase() === c.title.toLowerCase());
      return {
        ...c,
        imageUrl: original?.imageUrl || c.imageUrl || null,
      };
    });
  } catch (error) {
    console.log(`Curation failed for ${city}:`, error instanceof Error ? error.message : 'unknown');
    // Fallback: return top 5 raw events formatted
    return events.slice(0, 5).map(e => formatRawEvent(e));
  }
}

function formatRawEvent(e: ScrapedEvent): CuratedCityEvent {
  const start = e.startAt ? new Date(e.startAt) : null;
  return {
    title: e.title,
    venue: e.venue,
    address: e.address,
    date: start ? start.toISOString().split('T')[0] : '',
    time: start ? start.toISOString().split('T')[1]?.slice(0, 5) || '' : '',
    endTime: e.endAt ? new Date(e.endAt).toISOString().split('T')[1]?.slice(0, 5) || '' : '',
    url: e.url,
    imageUrl: e.imageUrl,
    description: e.description || `${e.title} at ${e.venue}`,
    category: e.category || 'other',
    source: e.source,
    whyGo: e.price === 'Free' ? 'Free and worth checking out' : 'One to watch this week',
  };
}
