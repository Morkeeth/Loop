import { NextRequest, NextResponse } from 'next/server';
import { CalendarService } from '@/lib/calendar-service';

export async function POST(request: NextRequest) {
  try {
    const { accessToken, events } = await request.json();

    if (!accessToken || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Access token and events array required' },
        { status: 400 }
      );
    }

    const calendarService = new CalendarService(accessToken);
    const createdEvents = [];
    const errors = [];

    // Add each event to the calendar
    for (const event of events) {
      try {
        const eventData = {
          summary: event.title,
          description: event.description || '',
          start: {
            dateTime: event.startTime,
            timeZone: 'UTC',
          },
          end: {
            dateTime: event.endTime,
            timeZone: 'UTC',
          },
          location: event.location || '',
          // Add custom properties for tracking
          extendedProperties: {
            private: {
              source: 'loop-recommendations',
              category: event.category || 'general',
              relevance_score: event.relevance_score?.toString() || '0',
              source_url: event.source_url || '',
            }
          }
        };

        const newEvent = await calendarService.createEvent(eventData);
        createdEvents.push(newEvent);
      } catch (error) {
        console.error(`Failed to create event "${event.title}":`, error);
        errors.push({
          event: event.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      createdEvents: createdEvents.length,
      totalEvents: events.length,
      events: createdEvents,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Calendar events creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar events' },
      { status: 500 }
    );
  }
}
