import { NextRequest, NextResponse } from 'next/server';
import { getActiveCities, saveCityEvents } from '@/lib/kv-store';
import { scrapeLuma } from '@/lib/scrapers/luma';
import { scrapeShotgun } from '@/lib/scrapers/shotgun';
import { scrapeEventbrite } from '@/lib/scrapers/eventbrite';
import { scrapeDice } from '@/lib/scrapers/dice';
import { curateEvents } from '@/lib/scrapers/curate';

const DEFAULT_CITIES = [
  'dublin', 'london', 'paris', 'berlin', 'amsterdam',
  'new-york', 'san-francisco', 'lisbon', 'barcelona', 'tokyo',
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let cities = await getActiveCities();
  if (cities.length === 0) {
    cities = DEFAULT_CITIES;
  }

  const results: { city: string; status: string; eventCount?: number }[] = [];

  for (const city of cities) {
    try {
      // Stagger requests to respect rate limits
      if (results.length > 0) {
        await new Promise(r => setTimeout(r, 2000));
      }

      const [lumaEvents, shotgunEvents, eventbriteEvents, diceEvents] = await Promise.all([
        scrapeLuma(city),
        scrapeShotgun(city),
        scrapeEventbrite(city),
        scrapeDice(city),
      ]);

      const allEvents = [...lumaEvents, ...shotgunEvents, ...eventbriteEvents, ...diceEvents];

      if (allEvents.length === 0) {
        results.push({ city, status: 'no events found' });
        continue;
      }

      const curated = await curateEvents(city, allEvents);
      await saveCityEvents(city, curated);

      results.push({ city, status: 'success', eventCount: curated.length });
    } catch (error) {
      results.push({
        city,
        status: `error: ${error instanceof Error ? error.message : 'unknown'}`,
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
