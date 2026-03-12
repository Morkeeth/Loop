import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type NormalizedEvent = {
  id: string;
  status?: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
};

function normalizeEvent(event: any): NormalizedEvent {
  return {
    id: event.id,
    status: event.status,
    summary: event.summary || 'Untitled',
    description: event.description,
    start: event.start,
    end: event.end,
    location: event.location,
  };
}

function minifyEvents(events: NormalizedEvent[]) {
  return events.map((event) => ({
    s: event.summary,
    st: event.start?.dateTime || event.start?.date,
    et: event.end?.dateTime || event.end?.date,
    loc: event.location,
    attn: [] as string[],
    recur: false,
    cal: 'iCal',
    calId: 'ical',
  }));
}

function getTimeframe(events: NormalizedEvent[]) {
  if (!events.length) return null;
  const sorted = [...events].sort((a, b) => {
    const aStart = a.start?.dateTime || a.start?.date || '';
    const bStart = b.start?.dateTime || b.start?.date || '';
    return new Date(aStart).getTime() - new Date(bStart).getTime();
  });
  return {
    start: sorted[0].start?.dateTime || sorted[0].start?.date,
    end: sorted[sorted.length - 1].end?.dateTime || sorted[sorted.length - 1].end?.date,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { fetchEventsFromIcalUrl } = await import('@/lib/ical-service');
    const { CalendarService } = await import('@/lib/calendar-service');

    const { searchParams } = new URL(request.url);
    const icalUrl = searchParams.get('icalUrl');
    const monthsBack = parseInt(searchParams.get('monthsBack') || '6');
    const realtimeInsights = searchParams.get('insights') === 'true';

    if (!icalUrl) {
      return NextResponse.json(
        { error: 'icalUrl query parameter required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(icalUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid iCal URL' },
        { status: 400 }
      );
    }

    const events = await fetchEventsFromIcalUrl(icalUrl, monthsBack);
    const normalized = events.map(normalizeEvent);
    const timeframe = getTimeframe(normalized);

    let insights: string[] = [];
    if (realtimeInsights && normalized.length > 0) {
      const calendarService = new CalendarService('ical-dummy');
      insights = await calendarService.generateRealtimeInsights(normalized);
    }

    return NextResponse.json({
      success: true,
      events: normalized,
      minified: minifyEvents(normalized),
      insights,
      timeframe,
      count: normalized.length,
      monthsBack,
      source: 'ical',
    });
  } catch (error) {
    console.error('iCal API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch iCal events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
