export interface MorningBrief {
  id: string;
  userId: string;
  date: string;
  generatedAt: string;
  
  // Weather Information
  weather: {
    location: string;
    temperature: number;
    condition: string;
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
  };
  
  // Personalized News
  news: {
    industryNews: Array<{
      title: string;
      summary: string;
      url: string;
      relevance: number;
    }>;
    hobbyNews: Array<{
      title: string;
      summary: string;
      url: string;
      relevance: number;
    }>;
    localNews: Array<{
      title: string;
      summary: string;
      url: string;
      relevance: number;
    }>;
  };
  
  // Today's Opportunities
  opportunities: Array<{
    title: string;
    description: string;
    timeSlot: string;
    location?: string;
    type: 'event' | 'activity' | 'meeting' | 'learning';
    relevance: number;
    actionRequired: boolean;
  }>;
  
  // Discover Section
  discover: Array<{
    title: string;
    description: string;
    date: string;
    location: string;
    category: string;
    relevance: number;
    url?: string;
  }>;
  
  // Reminders
  reminders: Array<{
    title: string;
    time: string;
    priority: 'low' | 'medium' | 'high';
    type: 'meeting' | 'deadline' | 'personal' | 'health';
  }>;
  
  // Personalized Greeting
  greeting: {
    personalized: string;
    mood: 'energetic' | 'calm' | 'focused' | 'relaxed';
    motivationalMessage: string;
  };
}

export interface BriefGenerationRequest {
  persona: any; // PersonaProfile
  calendarEvents: any[]; // CalendarEvent[]
  userPreferences?: {
    newsCategories: string[];
    eventTypes: string[];
    timeZone: string;
  };
}
