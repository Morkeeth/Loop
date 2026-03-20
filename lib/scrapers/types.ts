export interface ScrapedEvent {
  title: string;
  venue: string;
  address: string;
  startAt: string;       // ISO datetime
  endAt: string;         // ISO datetime
  url: string;           // direct event link
  imageUrl: string | null;
  description: string;
  price: string | null;  // "Free", "€25", etc.
  source: 'luma' | 'shotgun' | 'eventbrite' | 'dice';
  category?: string;
}

export interface CuratedCityEvent {
  title: string;
  venue: string;
  address: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM
  endTime: string;       // HH:MM
  url: string;
  imageUrl: string | null;
  description: string;   // 2-3 sentence sell
  category: string;      // music | art | food | tech | wellness | social | culture | nightlife | other
  source: 'luma' | 'shotgun' | 'eventbrite' | 'dice';
  whyGo: string;         // one-line pitch
}
