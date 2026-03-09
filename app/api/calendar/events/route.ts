import { NextRequest, NextResponse } from 'next/server';
import { CalendarService } from '@/lib/calendar-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = request.cookies.get('loop_access_token')?.value || body.accessToken;
    const { events } = body;

    if (!accessToken || !events || !Array.isArray(events)) {
      return NextResponse.json({ error: 'Access token and events array required' }, { status: 400 });
    }

    const calendarService = new CalendarService(accessToken);
    const createdEvents = [];
    const errors = [];

    for (const event of events) {
      try {
        const eventData = {
          summary: event.title,
          description: event.description || '',
          start: { dateTime: event.startTime, timeZone: 'UTC' },
          end: { dateTime: event.endTime, timeZone: 'UTC' },
          location: event.location || '',
          extendedProperties: {
            private: {
              source: 'loop-recommendations',
              category: event.category || 'general',
              relevance_score: event.relevance_score?.toString() || '0',
              source_url: event.source_url || '',
            },
          },
        };

        const newEvent = await calendarService.createEvent(eventData);
        createdEvents.push(newEvent);
      } catch (error) {
        errors.push({
          event: event.title,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      createdEvents: createdEvents.length,
      totalEvents: events.length,
      events: createdEvents,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create calendar events' }, { status: 500 });
  }
}
