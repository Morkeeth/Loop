import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { getCityEvents, addActiveCity } from '@/lib/kv-store';
import { scrapeLuma } from '@/lib/scrapers/luma';
import { scrapeShotgun } from '@/lib/scrapers/shotgun';
import { curateEvents } from '@/lib/scrapers/curate';
import { saveCityEvents } from '@/lib/kv-store';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const limit = rateLimit(ip, { maxRequests: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const city = request.nextUrl.searchParams.get('city')?.toLowerCase().trim();
  if (!city) {
    return NextResponse.json({ error: 'City parameter required' }, { status: 400 });
  }

  // Check cache first
  const cached = await getCityEvents(city);
  if (cached && cached.length > 0) {
    return NextResponse.json({ events: cached, city, cached: true });
  }

  // Register this city for future cron runs
  await addActiveCity(city);

  // Cold start: scrape and curate inline
  try {
    const [lumaEvents, shotgunEvents] = await Promise.all([
      scrapeLuma(city),
      scrapeShotgun(city),
    ]);

    const allEvents = [...lumaEvents, ...shotgunEvents];
    if (allEvents.length === 0) {
      return NextResponse.json({
        events: [],
        city,
        message: `No events found for ${city} this week. We've added it to our radar.`,
      });
    }

    const curated = await curateEvents(city, allEvents);
    await saveCityEvents(city, curated);

    return NextResponse.json({ events: curated, city, cached: false });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}
