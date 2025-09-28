export interface SourceAttribution {
  url: string;
  title: string;
  domain: string;
  publishedDate?: string;
  credibilityScore?: number;
  type: 'news' | 'event' | 'weather' | 'calendar' | 'service' | 'other';
}

export interface BriefItem {
  id: string;
  title: string;
  content: string;
  category: 'news' | 'events' | 'weather' | 'opportunities' | 'personal';
  priority: number;
  sources: SourceAttribution[];
  timestamp: string;
}

export interface MorningBrief {
  id: string;
  userId: string;
  generatedAt: string;
  items: BriefItem[];
  summary: string;
  calendarEvent?: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
  };
}
