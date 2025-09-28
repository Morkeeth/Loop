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
      // Delete events from dedicated autoplan calendar
      const eventsResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${autoplanCalendar.id}/events`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (eventsResponse.ok) {
        const events = await eventsResponse.json();
        console.log(`Found ${events.items?.length || 0} total events in autoplan calendar`);
        
        const autoplanEvents = events.items?.filter((event: any) => 
          event.source?.title === 'Loop Labs Auto-Populate' || 
          event.description?.includes('[loop_autopopulate_v1]')
        ) || [];

        console.log(`Found ${autoplanEvents.length} autoplan events to delete`);

        // Delete all autoplan events
        for (const event of autoplanEvents) {
          try {
            console.log(`Deleting event: ${event.summary}`);
            const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${autoplanCalendar.id}/events/${event.id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (deleteResponse.ok) {
              deletedCount++;
              console.log(`Successfully deleted event: ${event.summary}`);
            } else {
              console.error(`Failed to delete event ${event.summary}:`, deleteResponse.status, deleteResponse.statusText);
            }
          } catch (error) {
            console.error(`Failed to delete event ${event.id}:`, error);
          }
        }

        // Delete the entire calendar if it's empty
        const remainingEventsResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${autoplanCalendar.id}/events`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (remainingEventsResponse.ok) {
          const remainingEvents = await remainingEventsResponse.json();
          if (remainingEvents.items?.length === 0) {
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/${autoplanCalendar.id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
          }
        }
      }
    }

    // Also check primary calendar for tagged events (fallback case)
    console.log('Checking primary calendar for tagged events...');
    const primaryEventsResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (primaryEventsResponse.ok) {
      const primaryEvents = await primaryEventsResponse.json();
      console.log(`Found ${primaryEvents.items?.length || 0} total events in primary calendar`);
      
      const taggedEvents = primaryEvents.items?.filter((event: any) => 
        event.source?.title === 'Loop Labs Auto-Populate' || 
        event.description?.includes('[loop_autopopulate_v1]')
      ) || [];

      console.log(`Found ${taggedEvents.length} tagged events in primary calendar`);

      // Delete tagged events from primary calendar
      for (const event of taggedEvents) {
        try {
          console.log(`Deleting tagged event from primary: ${event.summary}`);
          const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (deleteResponse.ok) {
            deletedCount++;
            console.log(`Successfully deleted tagged event: ${event.summary}`);
          } else {
            console.error(`Failed to delete tagged event ${event.summary}:`, deleteResponse.status, deleteResponse.statusText);
          }
        } catch (error) {
          console.error(`Failed to delete event ${event.id} from primary:`, error);
        }
      }
    } else {
      console.error('Failed to fetch primary calendar events:', primaryEventsResponse.status, primaryEventsResponse.statusText);
    }

    console.log(`Undo operation completed. Deleted ${deletedCount} events.`);
    return NextResponse.json({
      success: true,
      deletedEvents: deletedCount,
      message: `Deleted ${deletedCount} auto-populated events`
    });

  } catch (error) {
    console.error('Auto-populate undo error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to undo events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
