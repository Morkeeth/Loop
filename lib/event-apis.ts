// Real Event API Integration Utilities
// This file provides utilities for fetching real events from various APIs

export interface EventAPIResult {
  title: string;
  description: string;
  date: string;
  location: string;
  category: string;
  url: string;
  venue?: string;
  organizer?: string;
  ticketUrl?: string;
  price?: string;
}

export class EventAPIManager {
  private static readonly EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;
  private static readonly MEETUP_API_KEY = process.env.MEETUP_API_KEY;
  private static readonly GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  /**
   * Search for real events using multiple APIs
   */
  static async searchEvents(
    location: string, 
    interests: string[], 
    dateRange: { start: Date; end: Date }
  ): Promise<EventAPIResult[]> {
    const events: EventAPIResult[] = [];

    try {
      // Try Eventbrite API first
      if (this.EVENTBRITE_API_KEY) {
        const eventbriteEvents = await this.searchEventbrite(location, interests, dateRange);
        events.push(...eventbriteEvents);
      }

      // Try Meetup API
      if (this.MEETUP_API_KEY) {
        const meetupEvents = await this.searchMeetup(location, interests, dateRange);
        events.push(...meetupEvents);
      }

      // Try Google Events API
      if (this.GOOGLE_PLACES_API_KEY) {
        const googleEvents = await this.searchGoogleEvents(location, interests, dateRange);
        events.push(...googleEvents);
      }

      // Remove duplicates and sort by date
      const uniqueEvents = this.removeDuplicates(events);
      return uniqueEvents.slice(0, 10); // Return top 10 events

    } catch (error) {
      console.error('Error fetching real events:', error);
      return this.getFallbackEvents(location, interests);
    }
  }

  /**
   * Search Eventbrite for real events
   */
  private static async searchEventbrite(
    location: string, 
    interests: string[], 
    dateRange: { start: Date; end: Date }
  ): Promise<EventAPIResult[]> {
    try {
      const query = interests.join(' ');
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const response = await fetch(
        `https://www.eventbriteapi.com/v3/events/search/?` +
        `q=${encodeURIComponent(query)}&` +
        `location.address=${encodeURIComponent(location)}&` +
        `start_date.range_start=${startDate}&` +
        `start_date.range_end=${endDate}&` +
        `token=${this.EVENTBRITE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Eventbrite API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.events?.map((event: any) => ({
        title: event.name?.text || 'Untitled Event',
        description: event.description?.text?.substring(0, 200) || '',
        date: event.start?.utc || new Date().toISOString(),
        location: event.venue?.address?.city || location,
        category: event.category?.name || 'General',
        url: event.url || '',
        venue: event.venue?.name,
        organizer: event.organizer?.name,
        ticketUrl: event.url,
        price: event.is_free ? 'Free' : 'Paid'
      })) || [];

    } catch (error) {
      console.error('Eventbrite API error:', error);
      return [];
    }
  }

  /**
   * Search Meetup for real events
   */
  private static async searchMeetup(
    location: string, 
    interests: string[], 
    dateRange: { start: Date; end: Date }
  ): Promise<EventAPIResult[]> {
    try {
      const query = interests.join(' ');
      const startDate = Math.floor(dateRange.start.getTime() / 1000);
      const endDate = Math.floor(dateRange.end.getTime() / 1000);

      const response = await fetch(
        `https://api.meetup.com/find/events?` +
        `text=${encodeURIComponent(query)}&` +
        `location=${encodeURIComponent(location)}&` +
        `start_date=${startDate}&` +
        `end_date=${endDate}&` +
        `key=${this.MEETUP_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Meetup API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((event: any) => ({
        title: event.name || 'Untitled Event',
        description: event.description?.substring(0, 200) || '',
        date: new Date(event.time).toISOString(),
        location: event.venue?.city || location,
        category: event.group?.category?.name || 'General',
        url: event.link || '',
        venue: event.venue?.name,
        organizer: event.group?.name,
        ticketUrl: event.link,
        price: event.fee?.amount ? `$${event.fee.amount}` : 'Free'
      })) || [];

    } catch (error) {
      console.error('Meetup API error:', error);
      return [];
    }
  }

  /**
   * Search Google Events for real events
   */
  private static async searchGoogleEvents(
    location: string, 
    interests: string[], 
    dateRange: { start: Date; end: Date }
  ): Promise<EventAPIResult[]> {
    try {
      // This would use Google Places API or Google Events API
      // For now, return empty array as this requires more complex setup
      return [];

    } catch (error) {
      console.error('Google Events API error:', error);
      return [];
    }
  }

  /**
   * Remove duplicate events based on title and date
   */
  private static removeDuplicates(events: EventAPIResult[]): EventAPIResult[] {
    const seen = new Set();
    return events.filter(event => {
      const key = `${event.title}-${event.date}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Fallback events when APIs fail
   */
  private static getFallbackEvents(location: string, interests: string[]): EventAPIResult[] {
    const today = new Date();
    const events: EventAPIResult[] = [];

    interests.forEach(interest => {
      if (interest === 'technology') {
        events.push({
          title: 'Tech Meetup: AI and Machine Learning',
          description: 'Join local developers discussing latest AI trends and practical applications.',
          date: today.toISOString(),
          location: location,
          category: 'Technology',
          url: 'https://www.meetup.com/tech-ai-ml',
          venue: 'Tech Hub Downtown',
          organizer: 'Tech Community',
          ticketUrl: 'https://www.eventbrite.com/tech-ai-ml',
          price: 'Free'
        });
      }

      if (interest === 'business') {
        events.push({
          title: 'Business Networking Breakfast',
          description: 'Connect with local entrepreneurs and business leaders over breakfast.',
          date: today.toISOString(),
          location: location,
          category: 'Business',
          url: 'https://www.eventbrite.com/business-networking',
          venue: 'Business Center',
          organizer: 'Business Network',
          ticketUrl: 'https://www.eventbrite.com/business-networking',
          price: '$25'
        });
      }
    });

    return events;
  }
}
