import { NextRequest, NextResponse } from 'next/server';

import { CalendarService } from '@/lib/calendar-service';

type NormalizedEvent = ReturnType<typeof normalizeEvent>;

function normalizeEvent(event: any) {
  return {
    id: event.id,
    status: event.status,
    summary: event.summary || 'Untitled',
    description: event.description,
    start: event.start,
    end: event.end,
    location: event.location,
    creator: event.creator ? { email: event.creator.email, displayName: event.creator.displayName } : undefined,
    organizer: event.organizer ? { email: event.organizer.email, displayName: event.organizer.displayName } : undefined,
    attendees: Array.isArray(event.attendees)
      ? event.attendees.map((attendee: any) => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus,
        }))
      : undefined,
    recurringEventId: event.recurringEventId,
    recurrence: event.recurrence,
    hangoutLink: event.hangoutLink,
    htmlLink: event.htmlLink,
    calendarId: event.calendarId,
    calendarSummary: event.calendarSummary,
    calendarAccessRole: event.calendarAccessRole,
  };
}

function minifyEvents(events: NormalizedEvent[]) {
  return events.map((event) => ({
    s: event.summary,
    st: event.start?.dateTime || event.start?.date,
    et: event.end?.dateTime || event.end?.date,
    loc: event.location,
    attn: event.attendees?.slice(0, 5).map((attendee: { email: string }) => attendee.email),
    recur: Boolean(event.recurrence?.length || event.recurringEventId),
    cal: event.calendarSummary || 'Primary',
    calId: event.calendarId,
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

function getAccessToken(request: NextRequest): string | null {
  // Prefer cookie (new secure flow), fall back to query param (legacy/calendar POST)
  return request.cookies.get('loop_access_token')?.value
    || new URL(request.url).searchParams.get('accessToken');
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const { searchParams } = new URL(request.url);
    const monthsBack = parseInt(searchParams.get('monthsBack') || '6');
    const realtimeInsights = searchParams.get('insights') === 'true';

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const calendarService = new CalendarService(accessToken);
    const events = await calendarService.fetchCalendarEvents(monthsBack);
    const normalized = events.map(normalizeEvent);
    const timeframe = getTimeframe(normalized);

    let insights: string[] = [];
    if (realtimeInsights) {
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
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) {
      return NextResponse.json(
        { error: 'Authentication expired', requiresReauth: true },
        { status: 401 },
      );
    }

    if (error instanceof Error && error.message.includes('access denied')) {
      return NextResponse.json(
        { error: 'Access denied', requiresReauth: true },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = request.cookies.get('loop_access_token')?.value || body.accessToken;
    const { eventData } = body;

    if (!accessToken || !eventData) {
      return NextResponse.json({ error: 'Access token and event data required' }, { status: 400 });
    }

    const calendarService = new CalendarService(accessToken);
    const newEvent = await calendarService.createEvent(eventData);

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
}
