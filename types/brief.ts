// Enhanced source attribution interface
export interface SourceAttribution {
  url: string;
  name: string;
  type: 'news' | 'weather' | 'event' | 'service' | 'calendar';
  credibilityScore: number; // 1-10 scale
  lastVerified: string; // ISO timestamp
  domain: string;
}

// Enhanced news article interface
export interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  relevance: number;
  source: SourceAttribution;
  publishedAt: string;
  category: 'industry' | 'hobby' | 'local' | 'global';
  tags: string[];
}

// Enhanced opportunity interface
export interface Opportunity {
  title: string;
  description: string;
  timeSlot: string;
  location?: string;
  type: 'event' | 'activity' | 'meeting' | 'learning';
  relevance: number;
  actionRequired: boolean;
  source: SourceAttribution;
  bookingUrl?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

// Enhanced discover item interface
export interface DiscoverItem {
  title: string;
  description: string;
  date: string;
  location: string;
  category: string;
  relevance: number;
  source: SourceAttribution;
  eventUrl?: string;
  venueUrl?: string;
  ticketUrl?: string;
  organizerInfo?: {
    name: string;
    website?: string;
    contact?: string;
  };
}

// Enhanced reminder interface
export interface Reminder {
  title: string;
  time: string;
  priority: 'low' | 'medium' | 'high';
  type: 'meeting' | 'deadline' | 'personal' | 'health';
  source: SourceAttribution;
  calendarUrl?: string;
  meetingUrl?: string;
  taskUrl?: string;
}

export interface MorningBrief {
  id: string;
  userId: string;
  date: string;
  generatedAt: string;
  
  // Weather Information with source attribution
  weather: {
    location: string;
    temperature: number;
    condition: string;
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    source: SourceAttribution;
    lastUpdated: string;
  };
  
  // Enhanced Personalized News
  news: {
    industryNews: NewsArticle[];
    hobbyNews: NewsArticle[];
    localNews: NewsArticle[];
  };
  
  // Enhanced Today's Opportunities
  opportunities: Opportunity[];
  
  // Enhanced Discover Section
  discover: DiscoverItem[];
  
  // Enhanced Reminders
  reminders: Reminder[];
  
  // Personalized Greeting
  greeting: {
    personalized: string;
    mood: 'energetic' | 'calm' | 'focused' | 'relaxed';
    motivationalMessage: string;
  };
  
  // Metadata for quality assurance
  metadata: {
    totalSources: number;
    averageCredibilityScore: number;
    lastWebSearch: string;
    verificationStatus: 'verified' | 'partial' | 'unverified';
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
