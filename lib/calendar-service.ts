import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

import { CalendarEvent, ProcessedEvent, EventCategory } from '@/types/calendar';

export class CalendarService {
  private accessToken: string;
  private static miniClient: OpenAI | null = null;
  private static insightPrompt: string | null = null;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private static getMiniClient() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    if (!CalendarService.miniClient) {
      CalendarService.miniClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    return CalendarService.miniClient;
  }

  private static async getInsightPrompt() {
    if (CalendarService.insightPrompt) {
      return CalendarService.insightPrompt;
    }

    const promptPath = path.join(process.cwd(), 'loop-project-spec.md');
    let raw = '';

    try {
      raw = await fs.promises.readFile(promptPath, 'utf8');
    } catch (error) {
      raw = '';
    }

    const match = raw.match(/\*\*GPT-Mini Commentary During Processing:\*\*[\s\S]*?(?=###|$)/);
    const examples = match ? match[0] : '';

    CalendarService.insightPrompt = `You are Loop's mini commentator. Generate 3 short energetic insights about a user's identity inferred from calendar events. Be witty but kind. Use quick takes similar to these:
${examples}

Rules:
- Output a JSON array of strings (no markdown, no explanations).
- Each string ≤ 120 characters.
- Reference patterns, hobbies, or routines visible in the events.
- Avoid sensitive topics (health, politics, religion, demographics).
- If signals are weak, acknowledge light data.
`;

    return CalendarService.insightPrompt;
  }

  private summarizeForInsights(events: CalendarEvent[]) {
    const sorted = [...events].sort((a, b) => {
      const aStart = a.start?.dateTime || a.start?.date || '';
      const bStart = b.start?.dateTime || b.start?.date || '';
      return new Date(bStart).getTime() - new Date(aStart).getTime();
    });

    const recent = sorted.slice(0, 60); // latest 60 events for quick signal

    return recent.map((event) => ({
      summary: event.summary || 'Untitled',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location,
      attendee_count: event.attendees?.length || 0,
      has_recurrence: Boolean(event.recurrence?.length || event.recurringEventId),
    }));
  }

  async generateRealtimeInsights(events: CalendarEvent[]): Promise<string[]> {
    try {
      if (!events.length) {
        return [
          'Calendar is quiet right now — add a few events so I can learn more.',
        ];
      }

      const miniClient = CalendarService.getMiniClient();
      const prompt = await CalendarService.getInsightPrompt();

      // Analyze events for contextual insights
      const eventTypes = this.analyzeEventTypes(events);
      const timePatterns = this.analyzeTimePatterns(events);
      const socialPatterns = this.analyzeSocialPatterns(events);

      const payload = {
        now_iso: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        event_sample: this.summarizeForInsights(events),
        analysis_context: {
          event_types: eventTypes,
          time_patterns: timePatterns,
          social_patterns: socialPatterns,
        }
      };

      let response;
      try {
        response = await miniClient.chat.completions.create({
          model: process.env.OPENAI_INSIGHT_MODEL || 'gpt-4o-mini',
          temperature: 0.35,
          max_tokens: 200,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: JSON.stringify(payload) },
          ],
        });
      } catch (error: any) {
        if (error.status === 429) {
          console.error('OpenAI API quota exceeded for insights generation');
          return ['OpenAI API quota exceeded - insights temporarily unavailable'];
        }
        throw error;
      }

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        return [];
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const raw = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5).map((item) => String(item));
      }

      return [];
    } catch (error) {
      console.error('Realtime insight generation failed:', error);
      return [];
    }
  }

  private analyzeEventTypes(events: CalendarEvent[]) {
    const types = events.map(event => this.categorizeEvent(event).type);
    const counts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }));
  }

  private analyzeTimePatterns(events: CalendarEvent[]) {
    const hours = events
      .filter(event => event.start.dateTime)
      .map(event => new Date(event.start.dateTime!).getHours());
    
    const morningCount = hours.filter(h => h >= 6 && h < 12).length;
    const afternoonCount = hours.filter(h => h >= 12 && h < 18).length;
    const eveningCount = hours.filter(h => h >= 18 && h < 24).length;
    
    return { morningCount, afternoonCount, eveningCount };
  }

  private analyzeSocialPatterns(events: CalendarEvent[]) {
    const socialEvents = events.filter(event => 
      this.categorizeEvent(event).type === 'social'
    );
    
    const recurringSocial = events.filter(event => 
      event.recurrence && event.recurrence.length > 0 && 
      this.categorizeEvent(event).type === 'social'
    );
    
    return {
      socialEventCount: socialEvents.length,
      recurringSocialCount: recurringSocial.length,
      avgAttendees: Math.round(
        events.reduce((sum, event) => sum + (event.attendees?.length || 0), 0) / events.length
      )
    };
  }

  // Method to get all calendars the user has access to
  async getAllCalendars(): Promise<any[]> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Calendar access token expired. Please re-authenticate with Google.');
        } else if (response.status === 403) {
          throw new Error('Calendar access denied. Please check your permissions.');
        } else {
          throw new Error(`Calendar list API error: ${response.status}`);
        }
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      throw error;
    }
  }

  async fetchCalendarEvents(monthsBack: number = 3): Promise<CalendarEvent[]> {
    const result = await this.fetchCalendarEventsWithMetadata(monthsBack);
    return result.events;
  }

  async fetchCalendarEventsWithMetadata(monthsBack: number = 3): Promise<{events: CalendarEvent[], actualMonthsUsed: number}> {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const params = new URLSearchParams({
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '2500', // Google Calendar API limit
      });

      // First, get all calendars the user has access to
      const calendars = await this.getAllCalendars();

      // Filter to only calendars with selected: true
      const selectedCalendars = calendars.filter((calendar: any) => 
        calendar.selected === true
      );

      console.log(`Found ${calendars.length} total calendars, ${selectedCalendars.length} selected calendars`);
      selectedCalendars.forEach((calendar, index) => {
        console.log(`  ${index + 1}. ${calendar.summary} (${calendar.id}) - Access: ${calendar.accessRole}`);
      });

      // Try to fetch events with dynamic context reduction if needed
      const result = await this.fetchEventsWithContextReduction(selectedCalendars, params, monthsBack);
      return result;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  private async fetchEventsWithContextReduction(
    calendars: any[], 
    params: URLSearchParams, 
    originalMonthsBack: number,
    maxRetries: number = 3
  ): Promise<{events: CalendarEvent[], actualMonthsUsed: number}> {
    let monthsBack = originalMonthsBack;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        console.log(`Attempt ${attempt + 1}: Fetching events from ${calendars.length} calendars for ${monthsBack} months back`);

        // Update time range for this attempt
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        params.set('timeMin', startDate.toISOString());
        params.set('timeMax', endDate.toISOString());

        // Fetch events from all selected calendars
        const allEvents: CalendarEvent[] = [];
        const fetchPromises = calendars.map(async (calendar: any) => {
          try {
            const calendarId = encodeURIComponent(calendar.id);
            const response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
              {
                headers: {
                  Authorization: `Bearer ${this.accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (!response.ok) {
              console.warn(`Failed to fetch events from calendar ${calendar.summary}: ${response.status}`);
              return [];
            }

            const data = await response.json();
            const events = data.items || [];
            
            // Add calendar info to each event
            return events.map((event: CalendarEvent) => ({
              ...event,
              calendarId: calendar.id,
              calendarSummary: calendar.summary,
              calendarAccessRole: calendar.accessRole,
            }));
          } catch (error) {
            console.warn(`Error fetching events from calendar ${calendar.summary}:`, error);
            return [];
          }
        });

        const calendarEventsArrays = await Promise.all(fetchPromises);
        
        // Flatten all events into a single array
        calendarEventsArrays.forEach(events => {
          allEvents.push(...events);
        });

        console.log(`Fetched ${allEvents.length} total events from ${calendars.length} calendars`);

        // Sort all events by start time
        allEvents.sort((a, b) => {
          const aStart = a.start?.dateTime || a.start?.date || '';
          const bStart = b.start?.dateTime || b.start?.date || '';
          return new Date(aStart).getTime() - new Date(bStart).getTime();
        });

        // Estimate token usage and reduce context if needed
        const estimatedTokens = this.estimateTokenUsage(allEvents);
        console.log(`Estimated token usage: ${estimatedTokens}`);

        if (estimatedTokens > 25000) { // Leave some buffer below the 30k limit
          console.log(`Token usage too high (${estimatedTokens}), reducing context...`);
          monthsBack = Math.max(1, Math.floor(monthsBack * 0.7)); // Reduce by 30%
          attempt++;
          continue;
        }

        // If we get here, the context size is acceptable
        return { events: allEvents, actualMonthsUsed: monthsBack };

      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        attempt++;
        monthsBack = Math.max(1, Math.floor(monthsBack * 0.7));
      }
    }

    // If all attempts failed, return empty array
    console.warn('All attempts to fetch calendar events failed, returning empty array');
    return { events: [], actualMonthsUsed: originalMonthsBack };
  }

  private estimateTokenUsage(events: CalendarEvent[]): number {
    // Rough estimation: 1 token ≈ 4 characters
    let totalChars = 0;
    
    events.forEach(event => {
      totalChars += (event.summary || '').length;
      totalChars += (event.description || '').length;
      totalChars += (event.location || '').length;
      totalChars += (event.start?.dateTime || event.start?.date || '').length;
      totalChars += (event.end?.dateTime || event.end?.date || '').length;
      totalChars += (event.calendarSummary || '').length;
      
      if (event.attendees) {
        event.attendees.forEach(attendee => {
          totalChars += (attendee.email || '').length;
          totalChars += (attendee.displayName || '').length;
        });
      }
    });

    return Math.ceil(totalChars / 4);
  }

  categorizeEvent(event: CalendarEvent): EventCategory {
    const summary = event.summary.toLowerCase();
    const description = event.description?.toLowerCase() || '';
    const location = event.location?.toLowerCase() || '';
    const attendees = event.attendees?.length || 0;

    // Work-related keywords
    const workKeywords = [
      'meeting', 'standup', 'review', 'sprint', 'retrospective', 'interview',
      'conference', 'workshop', 'training', 'presentation', 'demo', 'call',
      'office hours', '1:1', 'team', 'project', 'deadline', 'client'
    ];

    // Education keywords
    const educationKeywords = [
      'class', 'lecture', 'exam', 'homework', 'study', 'seminar', 'course',
      'assignment', 'quiz', 'lab', 'tutorial', 'office hours', 'professor'
    ];

    // Health/Fitness keywords
    const healthKeywords = [
      'gym', 'workout', 'run', 'yoga', 'pilates', 'doctor', 'dentist',
      'appointment', 'therapy', 'massage', 'fitness', 'exercise', 'swim'
    ];

    // Social keywords
    const socialKeywords = [
      'dinner', 'lunch', 'party', 'birthday', 'wedding', 'date', 'hangout',
      'coffee', 'drinks', 'movie', 'concert', 'game', 'trip', 'vacation'
    ];

    const allText = `${summary} ${description} ${location}`;
    
    let type: EventCategory['type'] = 'other';
    let confidence = 0.5;
    let keywords: string[] = [];

    // Check for work events
    const workMatches = workKeywords.filter(keyword => allText.includes(keyword));
    if (workMatches.length > 0 || attendees > 2) {
      type = 'work';
      confidence = Math.min(0.9, 0.5 + (workMatches.length * 0.1));
      keywords = workMatches;
    }

    // Check for education events
    const educationMatches = educationKeywords.filter(keyword => allText.includes(keyword));
    if (educationMatches.length > 0 && confidence < 0.7) {
      type = 'education';
      confidence = Math.min(0.9, 0.5 + (educationMatches.length * 0.1));
      keywords = educationMatches;
    }

    // Check for health events
    const healthMatches = healthKeywords.filter(keyword => allText.includes(keyword));
    if (healthMatches.length > 0 && confidence < 0.7) {
      type = 'health';
      confidence = Math.min(0.9, 0.5 + (healthMatches.length * 0.1));
      keywords = healthMatches;
    }

    // Check for social events
    const socialMatches = socialKeywords.filter(keyword => allText.includes(keyword));
    if (socialMatches.length > 0 && confidence < 0.7) {
      type = 'social';
      confidence = Math.min(0.9, 0.5 + (socialMatches.length * 0.1));
      keywords = socialMatches;
    }

    // Personal events (low confidence, few attendees, personal keywords)
    if (confidence < 0.6 && attendees <= 2 && !allText.includes('meeting')) {
      type = 'personal';
      confidence = 0.4;
    }

    return {
      type,
      confidence,
      keywords,
    };
  }

  processEvent(event: CalendarEvent): ProcessedEvent {
    const category = this.categorizeEvent(event);
    
    // Calculate duration
    const startTime = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
    const endTime = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date!);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

    // Extract participants
    const participants = event.attendees?.map(attendee => attendee.email) || [];

    // Determine if recurring
    const isRecurring = !!event.recurrence && event.recurrence.length > 0;

    // Determine location type
    let locationType: ProcessedEvent['locationType'] = 'other';
    if (event.location) {
      const location = event.location.toLowerCase();
      if (location.includes('office') || location.includes('work')) {
        locationType = 'office';
      } else if (location.includes('home') || location.includes('zoom') || location.includes('meet')) {
        locationType = 'virtual';
      } else if (location.includes('restaurant') || location.includes('venue') || location.includes('theater')) {
        locationType = 'venue';
      }
    }

    return {
      ...event,
      category,
      duration,
      isRecurring,
      participants,
      locationType,
    };
  }

  async getProcessedEvents(monthsBack: number = 3): Promise<ProcessedEvent[]> {
    const events = await this.fetchCalendarEvents(monthsBack);
    return events.map(event => this.processEvent(event));
  }

  async createEvent(eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  // Method to calculate free time slots for recommendations
  // Filter events for digest timeframe (7 days back + 2 weeks forward)
  filterEventsForDigest(
    events: CalendarEvent[],
    currentDate: string = new Date().toISOString()
  ): CalendarEvent[] {
    const now = new Date(currentDate);
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const twoWeeksFromNow = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
    
    return events.filter(event => {
      const eventDate = event.start.dateTime ? 
        new Date(event.start.dateTime) : 
        new Date(event.start.date!);
      
      return eventDate >= sevenDaysAgo && eventDate <= twoWeeksFromNow;
    });
  }

  calculateFreeTimeSlotsForRecommendations(
    events: CalendarEvent[], 
    persona: any, 
    currentDate: string = new Date().toISOString()
  ): Array<{
    date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    weekday: string;
  }> {
    const now = new Date(currentDate);
    const fourWeeksFromNow = new Date(now.getTime() + (28 * 24 * 60 * 60 * 1000));
    
    const freeSlots: Array<{
      date: string;
      start_time: string;
      end_time: string;
      duration_minutes: number;
      weekday: string;
    }> = [];
    
    const typicalStart = persona?.profile?.typical_day_start_local || '09:00';
    const typicalEnd = persona?.profile?.typical_day_end_local || '18:00';
    const quietHours = persona?.profile?.quiet_hours || '22:00-07:00';
    
    const [quietStart, quietEnd] = quietHours.split('-');
    
    for (let i = 0; i < 28; i++) {
      const date = new Date(now.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      const dayEvents = events.filter(event => {
        const eventDate = event.start.dateTime ? 
          new Date(event.start.dateTime).toISOString().split('T')[0] :
          event.start.date;
        return eventDate === dateStr;
      });
      
      dayEvents.sort((a, b) => {
        const aTime = a.start.dateTime || a.start.date || '';
        const bTime = b.start.dateTime || b.start.date || '';
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      });
      
      const gaps = [];
      let lastEndTime = typicalStart;
      
      for (const event of dayEvents) {
        const eventStart = event.start.dateTime ? 
          new Date(event.start.dateTime).toTimeString().slice(0, 5) :
          '09:00';
        
        if (eventStart > lastEndTime) {
          const duration = this.timeDiffInMinutes(lastEndTime, eventStart);
          if (duration >= 60) {
            gaps.push({
              date: dateStr,
              start_time: lastEndTime,
              end_time: eventStart,
              duration_minutes: duration,
              weekday
            });
          }
        }
        
        const eventEnd = event.end.dateTime ? 
          new Date(event.end.dateTime).toTimeString().slice(0, 5) :
          '17:00';
        
        lastEndTime = eventEnd;
      }
      
      if (lastEndTime < quietStart) {
        const duration = this.timeDiffInMinutes(lastEndTime, quietStart);
        if (duration >= 60) {
          gaps.push({
            date: dateStr,
            start_time: lastEndTime,
            end_time: quietStart,
            duration_minutes: duration,
            weekday
          });
        }
      }
      
      freeSlots.push(...gaps);
    }
    
    return freeSlots;
  }

  private timeDiffInMinutes(start: string, end: string): number {
    const startTime = new Date(`2000-01-01T${start}:00`);
    const endTime = new Date(`2000-01-01T${end}:00`);
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  }
}