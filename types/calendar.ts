export interface CalendarEvent {
  id: string;
  status?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  recurrence?: string[];
  transparency?: string;
  visibility?: string;
  hangoutLink?: string;
  htmlLink?: string;
  recurringEventId?: string;
}

export interface CalendarData {
  events: CalendarEvent[];
  timeZone: string;
  summary: string;
  description?: string;
}

export interface EventCategory {
  type: 'work' | 'personal' | 'education' | 'health' | 'social' | 'other';
  confidence: number;
  keywords: string[];
}

export interface ProcessedEvent extends CalendarEvent {
  category: EventCategory;
  duration: number; // in minutes
  isRecurring: boolean;
  participants: string[];
  locationType?: 'office' | 'home' | 'venue' | 'virtual' | 'other';
}
