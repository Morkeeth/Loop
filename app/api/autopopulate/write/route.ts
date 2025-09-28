import { NextRequest, NextResponse } from 'next/server';

interface SuggestedEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  reason: string;
  selected: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { suggestions, accessToken } = await request.json();

    if (!suggestions || !Array.isArray(suggestions)) {
      return NextResponse.json(
        { error: 'Suggestions array required' },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 400 }
      );
    }

    // Filter only selected suggestions
    const selectedSuggestions = suggestions.filter((s: SuggestedEvent) => s.selected);

    if (selectedSuggestions.length === 0) {
      return NextResponse.json(
        { error: 'No suggestions selected' },
        { status: 400 }
      );
    }

    // First, create or get the "Loop – Autoplan" calendar
    let calendarId = await getOrCreateAutoplanCalendar(accessToken);

    // Create events in the autoplan calendar
    const createdEvents = [];
    for (const suggestion of selectedSuggestions) {
      try {
        const event = await createCalendarEvent(accessToken, calendarId, suggestion);
        createdEvents.push(event);
      } catch (error) {
        console.error(`Failed to create event ${suggestion.title}:`, error);
        // Continue with other events even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      createdEvents: createdEvents.length,
      calendarId: calendarId
    });

  } catch (error) {
    console.error('Auto-populate write error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add events to calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getOrCreateAutoplanCalendar(accessToken: string): Promise<string> {
  // First, try to find existing "Loop – Autoplan" calendar
  const listResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (listResponse.ok) {
    const calendars = await listResponse.json();
    const autoplanCalendar = calendars.items?.find((cal: any) => 
      cal.summary === 'Loop – Autoplan'
    );
    
    if (autoplanCalendar) {
      return autoplanCalendar.id;
    }
  } else {
    const errorData = await listResponse.text();
    console.error('Failed to list calendars:', {
      status: listResponse.status,
      statusText: listResponse.statusText,
      error: errorData
    });
    throw new Error(`Failed to list calendars: ${listResponse.status} ${listResponse.statusText} - ${errorData}`);
  }

  // Create new calendar if not found
  try {
    const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: 'Loop – Autoplan',
        description: 'Auto-generated events by Loop Labs',
        timeZone: 'UTC',
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error('Failed to create autoplan calendar:', {
        status: createResponse.status,
        statusText: createResponse.statusText,
        error: errorData
      });
      
      // Fallback: use primary calendar if creation fails
      console.log('Falling back to primary calendar');
      return 'primary';
    }

    const newCalendar = await createResponse.json();
    return newCalendar.id;
  } catch (error) {
    console.error('Error creating autoplan calendar, falling back to primary:', error);
    return 'primary';
  }
}

async function createCalendarEvent(accessToken: string, calendarId: string, suggestion: SuggestedEvent) {
  // Create a clean description without the loop_autopopulate tag
  const cleanDescription = suggestion.reason || '';
  
  const eventData = {
    summary: suggestion.title,
    description: cleanDescription,
    start: {
      dateTime: suggestion.startTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: suggestion.endTime,
      timeZone: 'UTC',
    },
    source: {
      title: 'Loop Labs Auto-Populate',
      url: 'https://loop-labs.app',
    },
  };

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Failed to create calendar event:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData,
      eventData: suggestion.title
    });
    throw new Error(`Failed to create event: ${response.status} ${response.statusText} - ${errorData}`);
  }

  return await response.json();
}
