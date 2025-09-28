import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 400 }
      );
    }

    console.log('Starting undo operation...');

    // Find the "Loop – Autoplan" calendar
    const listResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!listResponse.ok) {
      const errorData = await listResponse.text();
      console.error('Failed to list calendars:', {
        status: listResponse.status,
        statusText: listResponse.statusText,
        error: errorData
      });
      throw new Error(`Failed to list calendars: ${listResponse.status} ${listResponse.statusText} - ${errorData}`);
    }

    const calendars = await listResponse.json();
    console.log('Found calendars:', calendars.items?.map((cal: any) => cal.summary));
    
    const autoplanCalendar = calendars.items?.find((cal: any) => 
      cal.summary === 'Loop – Autoplan'
    );

    console.log('Autoplan calendar found:', !!autoplanCalendar);
    let deletedCount = 0;

    if (autoplanCalendar) {
      // Delete all events from the autoplan calendar
      console.log('Deleting all events from autoplan calendar...');
      const eventsResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${autoplanCalendar.id}/events`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const events = eventsData.items || [];
        console.log(`Found ${events.length} events in autoplan calendar`);

        // Delete each event
        for (const event of events) {
          try {
            const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${autoplanCalendar.id}/events/${event.id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (deleteResponse.ok) {
              deletedCount++;
              console.log(`Deleted event: ${event.summary}`);
            } else {
              console.error(`Failed to delete event ${event.summary}:`, deleteResponse.status);
            }
          } catch (error) {
            console.error(`Error deleting event ${event.summary}:`, error);
          }
        }
      } else {
        console.error('Failed to fetch events from autoplan calendar:', eventsResponse.status);
      }
    }

    // Also check primary calendar for any tagged events (backward compatibility)
    console.log('Checking primary calendar for tagged events...');
    const primaryEventsResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (primaryEventsResponse.ok) {
      const primaryEventsData = await primaryEventsResponse.json();
      const taggedEvents = primaryEventsData.items?.filter((event: any) => 
        event.source?.title === 'Loop Labs Auto-Populate' || 
        event.description?.includes('[loop_autopopulate_v1]')
      ) || [];

      console.log(`Found ${taggedEvents.length} tagged events in primary calendar`);

      // Delete tagged events from primary calendar
      for (const event of taggedEvents) {
        try {
          const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (deleteResponse.ok) {
            deletedCount++;
            console.log(`Deleted tagged event from primary: ${event.summary}`);
          } else {
            console.error(`Failed to delete tagged event ${event.summary}:`, deleteResponse.status);
          }
        } catch (error) {
          console.error(`Error deleting tagged event ${event.summary}:`, error);
        }
      }
    } else {
      console.error('Failed to fetch events from primary calendar:', primaryEventsResponse.status);
    }

    console.log(`Undo operation completed. Deleted ${deletedCount} events total.`);

    return NextResponse.json({
      success: true,
      deletedEvents: deletedCount,
      message: `Successfully deleted ${deletedCount} autopopulated events`
    });

  } catch (error) {
    console.error('Undo operation failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to undo autopopulated events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}