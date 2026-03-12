import ical from 'node-ical';
import { CalendarEvent } from '@/types/calendar';

/**
 * Fetch and parse events from an iCal/ICS feed URL.
 * Returns events in the same format as Google Calendar for compatibility.
 */
export async function fetchEventsFromIcalUrl(
  icalUrl: string,
  monthsBack: number = 6
): Promise<CalendarEvent[]> {
  const data = await ical.async.fromURL(icalUrl);
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const events: CalendarEvent[] = [];

  for (const key of Object.keys(data)) {
    const ev = data[key] as {
      type?: string;
      start?: Date | { dateOnly?: boolean; toISOString: () => string };
      end?: Date;
      uid?: string;
      summary?: string;
      description?: string;
      location?: string;
    };
    if (!ev || ev.type !== 'VEVENT' || !ev.start) continue;

    const start = ev.start instanceof Date ? ev.start : new Date(ev.start as unknown as string);
    const end = ev.end instanceof Date ? ev.end : new Date((ev.end as unknown as string) || start);

    // Filter by date range
    if (start < startDate || start > endDate) continue;

    const startObj = ev.start as { dateOnly?: boolean; toISOString?: () => string };
    const isAllDay = startObj?.dateOnly === true || (startObj?.toISOString?.() ?? start.toISOString()).endsWith('T00:00:00.000Z');

    events.push({
      id: ev.uid || `ical-${key}-${start.getTime()}`,
      summary: ev.summary || 'Untitled',
      description: ev.description,
      start: isAllDay
        ? { date: start.toISOString().split('T')[0] }
        : { dateTime: start.toISOString() },
      end: isAllDay
        ? { date: end.toISOString().split('T')[0] }
        : { dateTime: end.toISOString() },
      location: ev.location || undefined,
    });
  }

  return events.sort((a, b) => {
    const aStart = a.start?.dateTime || a.start?.date || '';
    const bStart = b.start?.dateTime || b.start?.date || '';
    return new Date(aStart).getTime() - new Date(bStart).getTime();
  });
}

/**
 * Generate ICS file content for recommended events (for iCal users who can't add to Google).
 */
export function generateIcsForEvents(
  events: Array<{
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
  }>
): string {
  const formatDate = (d: string) =>
    new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Loop//Recommendations//EN',
    'CALSCALE:GREGORIAN',
  ].join('\r\n');

  for (const ev of events) {
    ics += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:loop-${ev.startTime}-${Math.random().toString(36).slice(2)}@loop`,
      `DTSTAMP:${formatDate(new Date().toISOString())}`,
      `DTSTART:${formatDate(ev.startTime)}`,
      `DTEND:${formatDate(ev.endTime)}`,
      `SUMMARY:${(ev.title || '').replace(/\n/g, ' ').slice(0, 200)}`,
      ev.description ? `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n').slice(0, 500)}` : '',
      ev.location ? `LOCATION:${(ev.location || '').replace(/\n/g, ' ').slice(0, 200)}` : '',
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n');
  }

  ics += '\r\nEND:VCALENDAR';
  return ics;
}
