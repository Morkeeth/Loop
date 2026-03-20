import OpenAI from 'openai';
import type { ScrapedEvent, CuratedCityEvent } from './types';
import { parseJsonFromText } from '../discover';
import { buildCurationPrompt } from '../prompts';

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

  const prompt = buildCurationPrompt(city, JSON.stringify(eventsJson, null, 2));

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
