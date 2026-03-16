import { NextRequest, NextResponse } from 'next/server';
import { getAllUserIds, getUser, updateUser, getFeedback } from '@/lib/kv-store';
import { refreshAccessToken } from '@/lib/google-auth';
import { discoverEvent } from '@/lib/discover';
import { CalendarService } from '@/lib/calendar-service';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: { userId: string; status: string; event?: string }[] = [];
  const userIds = await getAllUserIds();

  for (const userId of userIds) {
    try {
      const user = await getUser(userId);
      if (!user || !user.refresh_token || !user.persona || !user.city) {
        results.push({ userId, status: 'skipped — incomplete profile' });
        continue;
      }

      // Refresh the access token
      const tokens = await refreshAccessToken(user.refresh_token);

      // Discover an event using saved persona
      const persona = {
        ...user.persona,
        profile: {
          ...(user.persona.profile || {}),
          home_base: { city: user.city },
          interests_tags: user.tags,
          local_event_interests: user.tags,
        },
      };

      // Load feedback to personalize picks
      let feedbackSignals: { liked: string[]; disliked: string[] } | undefined;
      try {
        const history = await getFeedback(userId);
        if (history.length > 0) {
          feedbackSignals = {
            liked: history.filter(f => f.feedback === 'up').map(f => `${f.eventTitle} (${f.category})`).slice(0, 10),
            disliked: history.filter(f => f.feedback === 'down').map(f => `${f.eventTitle} (${f.category})`).slice(0, 10),
          };
        }
      } catch {}

      const { event } = await discoverEvent(persona, { feedback: feedbackSignals });

      // Add event to user's dedicated Loop calendar
      const calendarService = new CalendarService(tokens.access_token);
      const tz = user.timezone || 'UTC';
      const start = new Date(`${event.date}T${event.time}:00`);
      const end = new Date(`${event.date}T${event.end_time || event.time}:00`);
      if (end <= start) end.setTime(start.getTime() + 2 * 3600000);

      const desc = [
        event.description,
        '',
        event.why_this,
        '',
        event.url ? `Details: ${event.url}` : '',
        '',
        'Found by Loop',
      ].filter(Boolean).join('\n');

      // Use dedicated Loop calendar, or create one
      let loopCalendarId = user.loop_calendar_id || 'primary';
      if (loopCalendarId === 'primary' || !user.loop_calendar_id) {
        try {
          loopCalendarId = await calendarService.getOrCreateLoopCalendar();
          if (loopCalendarId !== 'primary') {
            await updateUser(userId, { loop_calendar_id: loopCalendarId } as any);
          }
        } catch {}
      }

      await calendarService.createEvent({
        summary: event.event_title,
        location: event.address || event.venue,
        description: desc,
        start: { dateTime: start.toISOString(), timeZone: tz },
        end: { dateTime: end.toISOString(), timeZone: tz },
      } as any, loopCalendarId);

      await updateUser(userId, { last_event_at: new Date().toISOString() });
      results.push({ userId, status: 'success', event: event.event_title });
    } catch (error) {
      results.push({
        userId,
        status: `error: ${error instanceof Error ? error.message : 'unknown'}`,
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
