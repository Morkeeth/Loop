import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

import { CalendarEvent, ProcessedEvent, EventCategory } from '@/types/calendar';
import { CalendarTrends } from '@/types/digest-context';

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

      const response = await miniClient.chat.completions.create({
        model: process.env.OPENAI_INSIGHT_MODEL || 'gpt-4o-mini',
        temperature: 0.35,
        max_tokens: 200,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      });

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

  async fetchCalendarList(): Promise<any[]> {
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
          throw new Error(`Calendar API error: ${response.status}`);
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

      // Fetch calendar list to get all accessible calendars
      const calendarList = await this.fetchCalendarList();
      const allEvents: CalendarEvent[] = [];

      // Fetch events from each calendar
      for (const calendar of calendarList) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`,
            {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const events = data.items || [];
            // Add calendar metadata to each event
            const eventsWithCalendar = events.map((event: CalendarEvent) => ({
              ...event,
              calendarId: calendar.id,
              calendarSummary: calendar.summary,
              calendarAccessRole: calendar.accessRole,
            }));
            allEvents.push(...eventsWithCalendar);
          } else {
            console.warn(`Failed to fetch events from calendar ${calendar.id}: ${response.status}`);
          }
        } catch (error) {
          console.warn(`Error fetching events from calendar ${calendar.id}:`, error);
          // Continue with other calendars even if one fails
        }
      }

      // Sort all events by start time
      return allEvents.sort((a, b) => {
        const aStart = a.start?.dateTime || a.start?.date || '';
        const bStart = b.start?.dateTime || b.start?.date || '';
        return new Date(aStart).getTime() - new Date(bStart).getTime();
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
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

  // New method to fetch 14 days of past and future data
  async fetchCalendarTrends(): Promise<CalendarTrends> {
    try {
      const now = new Date();
      const pastDate = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)); // 14 days ago
      const futureDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now

      const params = new URLSearchParams({
        timeMin: pastDate.toISOString(),
        timeMax: futureDate.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '2500',
      });

      // Fetch calendar list to get all accessible calendars
      const calendarList = await this.fetchCalendarList();
      const allEvents: CalendarEvent[] = [];

      // Fetch events from each calendar
      for (const calendar of calendarList) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`,
            {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const events = data.items || [];
            // Add calendar metadata to each event
            const eventsWithCalendar = events.map((event: CalendarEvent) => ({
              ...event,
              calendarId: calendar.id,
              calendarSummary: calendar.summary,
              calendarAccessRole: calendar.accessRole,
            }));
            allEvents.push(...eventsWithCalendar);
          } else {
            console.warn(`Failed to fetch events from calendar ${calendar.id}: ${response.status}`);
          }
        } catch (error) {
          console.warn(`Error fetching events from calendar ${calendar.id}:`, error);
          // Continue with other calendars even if one fails
        }
      }
      
      // Separate past and future events
      const pastEvents = allEvents.filter((event: CalendarEvent) => {
        const eventDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
        return eventDate < now;
      });

      const upcomingEvents = allEvents.filter((event: CalendarEvent) => {
        const eventDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
        return eventDate >= now;
      });

      // Analyze patterns
      const pastPatterns = this.analyzePastPatterns(pastEvents);
      const upcomingPatterns = this.analyzeUpcomingPatterns(upcomingEvents);
      const trends = this.analyzeTrends(pastEvents, upcomingEvents);

      return {
        pastEvents,
        pastPatterns,
        upcomingEvents,
        upcomingPatterns,
        trends,
      };
    } catch (error) {
      console.error('Error fetching calendar trends:', error);
      throw error;
    }
  }

  private analyzePastPatterns(pastEvents: CalendarEvent[]) {
    const eventTypes = pastEvents.map(event => this.categorizeEvent(event).type);
    const eventTypeCounts = eventTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Most frequent event types
    const mostFrequentEventTypes = Object.entries(eventTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);

    // Average events per day
    const averageEventsPerDay = pastEvents.length / 14;

    // Busiest days of the week
    const dayCounts = pastEvents.reduce((acc, event) => {
      const eventDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
      const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const busiestDays = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    // Common meeting times
    const timeCounts = pastEvents.reduce((acc, event) => {
      if (event.start.dateTime) {
        const hour = new Date(event.start.dateTime).getHours();
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        acc[timeSlot] = (acc[timeSlot] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const commonMeetingTimes = Object.entries(timeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([time]) => time);

    // Find recurring events
    const recurringEvents = pastEvents
      .filter(event => event.recurrence && event.recurrence.length > 0)
      .map(event => ({
        title: event.summary || 'Untitled Event',
        frequency: this.determineRecurrenceFrequency(event.recurrence![0]),
        lastOccurrence: event.start.dateTime || event.start.date!,
      }));

    return {
      mostFrequentEventTypes,
      averageEventsPerDay: Math.round(averageEventsPerDay * 10) / 10,
      busiestDays,
      commonMeetingTimes,
      recurringEvents,
    };
  }

  private analyzeUpcomingPatterns(upcomingEvents: CalendarEvent[]) {
    const eventTypes = upcomingEvents.map(event => this.categorizeEvent(event).type);
    const scheduledEventTypes = [...new Set(eventTypes)];

    // Find upcoming deadlines (events with keywords like 'deadline', 'due', 'submit')
    const deadlineKeywords = ['deadline', 'due', 'submit', 'deliver', 'present', 'review'];
    const upcomingDeadlines = upcomingEvents.filter(event => {
      const text = `${event.summary} ${event.description}`.toLowerCase();
      return deadlineKeywords.some(keyword => text.includes(keyword));
    });

    // Calculate free time slots (simplified - assumes 9 AM to 6 PM work hours)
    const freeTimeSlots = this.calculateFreeTimeSlots(upcomingEvents);

    // Identify busy periods
    const busyPeriods = this.identifyBusyPeriods(upcomingEvents);

    return {
      scheduledEventTypes,
      upcomingDeadlines,
      freeTimeSlots,
      busyPeriods,
    };
  }

  private analyzeTrends(pastEvents: CalendarEvent[], upcomingEvents: CalendarEvent[]) {
    const pastEventCount = pastEvents.length;
    const upcomingEventCount = upcomingEvents.length;
    
    // Event frequency trend
    let eventFrequencyTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (upcomingEventCount > pastEventCount * 1.2) {
      eventFrequencyTrend = 'increasing';
    } else if (upcomingEventCount < pastEventCount * 0.8) {
      eventFrequencyTrend = 'decreasing';
    }

    // Work-life balance score (simplified calculation)
    const workEvents = [...pastEvents, ...upcomingEvents].filter(event => 
      this.categorizeEvent(event).type === 'work'
    ).length;
    const totalEvents = pastEvents.length + upcomingEvents.length;
    const workLifeBalanceScore = totalEvents > 0 ? Math.max(1, Math.min(10, 10 - (workEvents / totalEvents * 10))) : 5;

    // Meeting density
    const meetingEvents = [...pastEvents, ...upcomingEvents].filter(event => 
      event.summary?.toLowerCase().includes('meeting') || 
      event.summary?.toLowerCase().includes('call')
    ).length;
    const meetingDensityTrend: 'low' | 'medium' | 'high' = meetingEvents > totalEvents * 0.6 ? 'high' : 
                               meetingEvents > totalEvents * 0.3 ? 'medium' : 'low';

    // Productivity windows (times with fewer meetings)
    const productivityWindows = this.findProductivityWindows([...pastEvents, ...upcomingEvents]);

    // Social activity level
    const socialEvents = [...pastEvents, ...upcomingEvents].filter(event => 
      this.categorizeEvent(event).type === 'social'
    ).length;
    const socialActivityLevel: 'low' | 'medium' | 'high' = socialEvents > totalEvents * 0.2 ? 'high' : 
                               socialEvents > totalEvents * 0.1 ? 'medium' : 'low';

    return {
      eventFrequencyTrend,
      workLifeBalanceScore: Math.round(workLifeBalanceScore),
      meetingDensityTrend,
      productivityWindows,
      socialActivityLevel,
    };
  }

  private determineRecurrenceFrequency(recurrenceRule: string): 'daily' | 'weekly' | 'monthly' {
    if (recurrenceRule.includes('DAILY')) return 'daily';
    if (recurrenceRule.includes('WEEKLY')) return 'weekly';
    if (recurrenceRule.includes('MONTHLY')) return 'monthly';
    return 'weekly'; // default
  }

  private calculateFreeTimeSlots(upcomingEvents: CalendarEvent[]) {
    // Simplified calculation - assumes 9 AM to 6 PM work hours
    const freeTimeSlots: { date: string; availableHours: string[] }[] = [];
    
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEvents = upcomingEvents.filter(event => {
        const eventDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
        return eventDate.toISOString().split('T')[0] === dateStr;
      });

      // Simple availability calculation
      const availableHours = ['09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00'];
      freeTimeSlots.push({
        date: dateStr,
        availableHours: dayEvents.length < 3 ? availableHours : availableHours.slice(0, 2),
      });
    }

    return freeTimeSlots;
  }

  private identifyBusyPeriods(upcomingEvents: CalendarEvent[]) {
    const busyPeriods: { date: string; eventCount: number; description: string }[] = [];
    
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEvents = upcomingEvents.filter(event => {
        const eventDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
        return eventDate.toISOString().split('T')[0] === dateStr;
      });

      if (dayEvents.length >= 4) {
        busyPeriods.push({
          date: dateStr,
          eventCount: dayEvents.length,
          description: `${dayEvents.length} events scheduled`,
        });
      }
    }

    return busyPeriods;
  }

  private findProductivityWindows(allEvents: CalendarEvent[]) {
    // Find hours with fewer meetings (9 AM to 6 PM)
    const hourCounts = Array(10).fill(0); // 9 AM to 6 PM = 10 hours
    
    allEvents.forEach(event => {
      if (event.start.dateTime) {
        const hour = new Date(event.start.dateTime).getHours();
        if (hour >= 9 && hour < 19) {
          hourCounts[hour - 9]++;
        }
      }
    });

    // Find hours with least meetings
    const productivityWindows = hourCounts
      .map((count, index) => ({ hour: index + 9, count }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 3)
      .map(({ hour }) => `${hour.toString().padStart(2, '0')}:00`);

    return productivityWindows;
  }

  /**
   * Calculate free time slots for the next 4 weeks for event recommendations
   */
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
    
    // Get user's typical schedule from persona
    const typicalStart = persona?.profile?.typical_day_start_local || '09:00';
    const typicalEnd = persona?.profile?.typical_day_end_local || '18:00';
    const quietHours = persona?.profile?.quiet_hours || '22:00-07:00';
    
    // Parse quiet hours
    const [quietStart, quietEnd] = quietHours.split('-');
    
    // Generate free slots for each day
    for (let i = 0; i < 28; i++) {
      const date = new Date(now.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Get events for this day
      const dayEvents = events.filter(event => {
        const eventDate = event.start.dateTime ? 
          new Date(event.start.dateTime).toISOString().split('T')[0] :
          event.start.date;
        return eventDate === dateStr;
      });
      
      // Sort events by start time
      dayEvents.sort((a, b) => {
        const aTime = a.start.dateTime || a.start.date || '';
        const bTime = b.start.dateTime || b.start.date || '';
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      });
      
      // Find gaps between events
      const gaps = [];
      let lastEndTime = typicalStart;
      
      for (const event of dayEvents) {
        const eventStart = event.start.dateTime ? 
          new Date(event.start.dateTime).toTimeString().slice(0, 5) :
          '09:00'; // Default for all-day events
        
        if (eventStart > lastEndTime) {
          const duration = this.timeDiffInMinutes(lastEndTime, eventStart);
          if (duration >= 60) { // Only include gaps of 60+ minutes
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
          '17:00'; // Default for all-day events
        
        lastEndTime = eventEnd;
      }
      
      // Add gap after last event if there's time before quiet hours
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

  private timeDiffInMinutes(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    return (end.getTime() - start.getTime()) / (1000 * 60);
  }
}
