export interface SourceAttribution {
  type: 'news' | 'event' | 'weather' | 'calendar' | 'service' | 'other';
  url?: string;
  title?: string;
  publication?: string;
  date?: string;
  credibility?: number;
}

export interface BriefItem {
  title: string;
  content: string;
  sources: SourceAttribution[];
  category: 'news' | 'events' | 'weather' | 'opportunities' | 'reminders';
}

export interface MorningBrief {
  id: string;
  date: string;
  greeting: string;
  items: BriefItem[];
  summary: string;
  generatedAt: string;
}
