import { PersonaProfile } from './persona';
import { CalendarEvent } from './calendar';

export interface CalendarTrends {
  // Past 14 days analysis
  pastEvents: CalendarEvent[];
  pastPatterns: {
    mostFrequentEventTypes: string[];
    averageEventsPerDay: number;
    busiestDays: string[]; // ['Monday', 'Wednesday', 'Friday']
    commonMeetingTimes: string[]; // ['09:00', '14:00', '16:00']
    recurringEvents: {
      title: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      lastOccurrence: string;
    }[];
  };
  
  // Future 14 days analysis
  upcomingEvents: CalendarEvent[];
  upcomingPatterns: {
    scheduledEventTypes: string[];
    upcomingDeadlines: CalendarEvent[];
    freeTimeSlots: {
      date: string;
      availableHours: string[]; // ['09:00-11:00', '14:00-16:00']
    }[];
    busyPeriods: {
      date: string;
      eventCount: number;
      description: string;
    }[];
  };
  
  // Trend analysis
  trends: {
    eventFrequencyTrend: 'increasing' | 'decreasing' | 'stable';
    workLifeBalanceScore: number; // 1-10
    meetingDensityTrend: 'high' | 'medium' | 'low';
    productivityWindows: string[]; // Best times for focused work
    socialActivityLevel: 'high' | 'medium' | 'low';
  };
}

export interface DigestContext {
  // Core persona information
  persona: PersonaProfile;
  
  // Calendar context
  calendarTrends: CalendarTrends;
  
  // Additional context
  currentDate: string; // ISO date string
  timezone: string;
  location: {
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Digest preferences
  preferences: {
    digestLength: 'brief' | 'standard' | 'detailed';
    focusAreas: string[]; // ['work', 'health', 'social', 'learning']
    avoidTopics: string[]; // Topics to minimize
    prioritySources: string[]; // Preferred news sources
  };
  
  // Context metadata
  metadata: {
    lastDigestGenerated: string;
    digestCount: number;
    userEngagementScore: number; // Based on previous digest interactions
    contextFreshness: string; // How recent the calendar data is
  };
}
