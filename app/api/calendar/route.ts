import { NextRequest, NextResponse } from 'next/server';
import { CalendarService } from '@/lib/calendar-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('accessToken');
    const monthsBack = parseInt(searchParams.get('monthsBack') || '3');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 400 }
      );
    }

    const calendarService = new CalendarService(accessToken);
    const events = await calendarService.getProcessedEvents(monthsBack);

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      monthsBack
    });

  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, eventData } = await request.json();

    if (!accessToken || !eventData) {
      return NextResponse.json(
        { error: 'Access token and event data required' },
        { status: 400 }
      );
    }

    const calendarService = new CalendarService(accessToken);
    const newEvent = await calendarService.createEvent(eventData);

    return NextResponse.json({
      success: true,
      event: newEvent
    });

  } catch (error) {
    console.error('Calendar creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
