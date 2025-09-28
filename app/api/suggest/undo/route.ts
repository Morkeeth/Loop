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

    // Find the "Loop – Autoplan" calendar
    const listResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!listResponse.ok) {
      throw new Error('Failed to list calendars');
    }

    const calendars = await listResponse.json();
    const autoplanCalendar = calendars.items?.find((cal: any) => 
      cal.summary === 'Loop – Autoplan'
    );

    let deletedCount = 0;

    if (autoplanCalendar) {
      // Delete ALL events from the dedicated autoplan calendar (regardless of tag)
      let pageToken: string | undefined = undefined;
      do {
        const eventsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${autoplanCalendar.id}/events`);
        eventsUrl.searchParams.set('maxResults', '2500');
        if (pageToken) eventsUrl.searchParams.set('pageToken', pageToken);

        const eventsResponse = await fetch(eventsUrl.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!eventsResponse.ok) break;

        const events = await eventsResponse.json();
        const allEvents = events.items || [];

        for (const event of allEvents) {
          try {
            const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${autoplanCalendar.id}/events/${event.id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
            if (deleteResponse.ok) deletedCount++;
          } catch (error) {
            console.error(`Failed to delete event ${event.id}:`, error);
          }
        }

        pageToken = events.nextPageToken;
      } while (pageToken);

      // Finally, delete the entire autoplan calendar to fully clean up
      try {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/${autoplanCalendar.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        console.warn('Failed to delete the autoplan calendar:', error);
      }
    }

    // Also check primary calendar for tagged events (fallback case)
    const primaryEventsResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (primaryEventsResponse.ok) {
      const primaryEvents = await primaryEventsResponse.json();
      const ours = primaryEvents.items?.filter((event: any) => {
        const isTagged = event.description?.includes('[loop_autopopulate_v1]');
        const hasSource = event.source?.title === 'Loop Labs Auto-Populate';
        const hasPrivateFlag = event.extendedProperties?.private?.loopAutopopulate === 'v1';
        return isTagged || hasSource || hasPrivateFlag;
      }) || [];

      // Delete our events from primary calendar
      for (const event of ours) {
        try {
          const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (deleteResponse.ok) {
            deletedCount++;
          }
        } catch (error) {
          console.error(`Failed to delete event ${event.id} from primary:`, error);
        }
      }
    }

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
