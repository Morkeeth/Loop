export interface SourceAttribution {
  type: 'news' | 'weather' | 'event' | 'calendar' | 'service';
  name: string;
  url: string;
  credibilityScore: number;
  lastUpdated?: string;
}

export interface BriefItem {
  id: string;
  title: string;
  summary: string;
  source: SourceAttribution;
  category: 'work' | 'personal' | 'health' | 'social' | 'education' | 'other';
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  relevanceScore: number;
}

export interface BriefContext {
  items: BriefItem[];
  generatedAt: string;
  timeRange: {
    start: string;
    end: string;
  };
  totalItems: number;
  categories: {
    [key: string]: number;
  };
}
