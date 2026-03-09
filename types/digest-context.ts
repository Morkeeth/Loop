import { CalendarEvent } from './calendar';

export interface CalendarTrends {
  pastEvents: CalendarEvent[];
  pastPatterns: {
    mostFrequentEventTypes: string[];
    averageEventsPerDay: number;
    busiestDays: string[];
    commonMeetingTimes: string[];
    recurringEvents: {
      title: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      lastOccurrence: string;
    }[];
  };

  upcomingEvents: CalendarEvent[];
  upcomingPatterns: {
    scheduledEventTypes: string[];
    upcomingDeadlines: CalendarEvent[];
    freeTimeSlots: {
      date: string;
      availableHours: string[];
    }[];
    busyPeriods: {
      date: string;
      eventCount: number;
      description: string;
    }[];
  };

  trends: {
    eventFrequencyTrend: 'increasing' | 'decreasing' | 'stable';
    workLifeBalanceScore: number;
    meetingDensityTrend: 'high' | 'medium' | 'low';
    productivityWindows: string[];
    socialActivityLevel: 'high' | 'medium' | 'low';
  };
}
