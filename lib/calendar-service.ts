import { CalendarEvent, ProcessedEvent, EventCategory } from '@/types/calendar';

export class CalendarService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async fetchCalendarEvents(monthsBack: number = 3): Promise<CalendarEvent[]> {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const params = new URLSearchParams({
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '2500', // Google Calendar API limit
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  categorizeEvent(event: CalendarEvent): EventCategory {
    const summary = event.summary.toLowerCase();
    const description = event.description?.toLowerCase() || '';
    const location = event.location?.toLowerCase() || '';
    const attendees = event.attendees?.length || 0;

    // Work-related keywords
    const workKeywords = [
      'meeting', 'standup', 'review', 'sprint', 'retrospective', 'interview',
      'conference', 'workshop', 'training', 'presentation', 'demo', 'call',
      'office hours', '1:1', 'team', 'project', 'deadline', 'client'
    ];

    // Education keywords
    const educationKeywords = [
      'class', 'lecture', 'exam', 'homework', 'study', 'seminar', 'course',
      'assignment', 'quiz', 'lab', 'tutorial', 'office hours', 'professor'
    ];

    // Health/Fitness keywords
    const healthKeywords = [
      'gym', 'workout', 'run', 'yoga', 'pilates', 'doctor', 'dentist',
      'appointment', 'therapy', 'massage', 'fitness', 'exercise', 'swim'
    ];

    // Social keywords
    const socialKeywords = [
      'dinner', 'lunch', 'party', 'birthday', 'wedding', 'date', 'hangout',
      'coffee', 'drinks', 'movie', 'concert', 'game', 'trip', 'vacation'
    ];

    const allText = `${summary} ${description} ${location}`;
    
    let type: EventCategory['type'] = 'other';
    let confidence = 0.5;
    let keywords: string[] = [];

    // Check for work events
    const workMatches = workKeywords.filter(keyword => allText.includes(keyword));
    if (workMatches.length > 0 || attendees > 2) {
      type = 'work';
      confidence = Math.min(0.9, 0.5 + (workMatches.length * 0.1));
      keywords = workMatches;
    }

    // Check for education events
    const educationMatches = educationKeywords.filter(keyword => allText.includes(keyword));
    if (educationMatches.length > 0 && confidence < 0.7) {
      type = 'education';
      confidence = Math.min(0.9, 0.5 + (educationMatches.length * 0.1));
      keywords = educationMatches;
    }

    // Check for health events
    const healthMatches = healthKeywords.filter(keyword => allText.includes(keyword));
    if (healthMatches.length > 0 && confidence < 0.7) {
      type = 'health';
      confidence = Math.min(0.9, 0.5 + (healthMatches.length * 0.1));
      keywords = healthMatches;
    }

    // Check for social events
    const socialMatches = socialKeywords.filter(keyword => allText.includes(keyword));
    if (socialMatches.length > 0 && confidence < 0.7) {
      type = 'social';
      confidence = Math.min(0.9, 0.5 + (socialMatches.length * 0.1));
      keywords = socialMatches;
    }

    // Personal events (low confidence, few attendees, personal keywords)
    if (confidence < 0.6 && attendees <= 2 && !allText.includes('meeting')) {
      type = 'personal';
      confidence = 0.4;
    }

    return {
      type,
      confidence,
      keywords,
    };
  }

  processEvent(event: CalendarEvent): ProcessedEvent {
    const category = this.categorizeEvent(event);
    
    // Calculate duration
    const startTime = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
    const endTime = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date!);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

    // Extract participants
    const participants = event.attendees?.map(attendee => attendee.email) || [];

    // Determine if recurring
    const isRecurring = !!event.recurrence && event.recurrence.length > 0;

    // Determine location type
    let locationType: ProcessedEvent['locationType'] = 'other';
    if (event.location) {
      const location = event.location.toLowerCase();
      if (location.includes('office') || location.includes('work')) {
        locationType = 'office';
      } else if (location.includes('home') || location.includes('zoom') || location.includes('meet')) {
        locationType = 'virtual';
      } else if (location.includes('restaurant') || location.includes('venue') || location.includes('theater')) {
        locationType = 'venue';
      }
    }

    return {
      ...event,
      category,
      duration,
      isRecurring,
      participants,
      locationType,
    };
  }

  async getProcessedEvents(monthsBack: number = 3): Promise<ProcessedEvent[]> {
    const events = await this.fetchCalendarEvents(monthsBack);
    return events.map(event => this.processEvent(event));
  }

  async createEvent(eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }
}
