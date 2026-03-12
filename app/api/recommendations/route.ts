import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { CalendarService } from '@/lib/calendar-service';
import { PersonaProfile } from '@/types/persona';
import { CalendarEvent } from '@/types/calendar';

// Minify events function (same as calendar API)
function minifyEvents(events: CalendarEvent[]) {
  return events.map((event) => ({
    s: event.summary,
    st: event.start?.dateTime || event.start?.date,
    et: event.end?.dateTime || event.end?.date,
    loc: event.location,
    attn: event.attendees?.slice(0, 5).map((attendee: { email: string }) => attendee.email),
    recur: Boolean(event.recurrence?.length || event.recurringEventId),
  }));
}

function getOpenAIClient(apiKey?: string | null) {
  const key = apiKey?.trim() || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OpenAI API key not configured');
  return new OpenAI({ apiKey: key });
}

interface RecommendationRequest {
  persona: PersonaProfile;
  calendarEvents: CalendarEvent[];
  userLocation: {
    city: string;
    country: string;
    timezone: string;
  };
  currentDate: string;
}

interface WeeklyRecommendation {
  week_start_date: string;
  week_end_date: string;
  recommendations: EventRecommendation[];
}

interface EventRecommendation {
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  category: 'professional' | 'social' | 'cultural' | 'fitness' | 'learning' | 'entertainment';
  relevance_score: number;
  source_url: string;
  cost: 'free' | 'low' | 'medium' | 'high' | 'unknown';
  registration_required: boolean;
}

interface RecommendationsResponse {
  recommendations: WeeklyRecommendation[];
  metadata: {
    total_recommendations: number;
    search_queries_used: string[];
    confidence_score: number;
    caveats: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const { persona, calendarEvents, userLocation, currentDate, userApiKey, archetypeProfile }: RecommendationRequest & { userApiKey?: string | null; archetypeProfile?: string } = await request.json();

    if (!persona || !userLocation) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const hasUserKey = Boolean(userApiKey?.trim());
    const apiKey = hasUserKey ? userApiKey!.trim() : process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Add your key in Setup or set OPENAI_API_KEY.' },
        { status: 500 }
      );
    }

    const openai = getOpenAIClient(apiKey);

    // Build persona-driven event type hints
    const interestHints = [
      ...(persona.interests?.hobbies || []),
      ...(persona.interests?.sports || []),
      ...(persona.interests?.entertainment || []),
    ].filter(Boolean).slice(0, 8);

    const budgetHint = archetypeProfile?.includes('BUDGET:')
      ? archetypeProfile.match(/BUDGET:\s*(.+)/)?.[1]?.trim() || ''
      : '';

    const cleanSystemPrompt = `You are Loop's event curation engine. Find 3 real, specific, upcoming events for this user.

The user's persona, interests, location, free time slots, and recent calendar activity are in the payload below.

TASK: Search the web for 3 real upcoming events in the next 14 days in/near the user's city that match their personality and interests. Each event should feel personally chosen — like a friend who knows them well sent it.

SEARCH STRATEGY:
1. First search for events matching their strongest interests: ${interestHints.join(', ') || 'general culture and social events'}
2. Then search for a wildcard — something outside their usual routine they'd still love
3. Use Eventbrite, Meetup, Luma, local venue sites, and city event calendars
4. Search with the user's specific city name + date range

EVENT SELECTION CRITERIA:
- Must be REAL, VERIFIABLE, and CURRENTLY LISTED online (include source URL from search results)
- Must be SPECIFIC: exact date, time, venue name, address
- Must happen within the next 14 days from ${new Date(currentDate).toISOString().split('T')[0]}
- Prefer events that are: ${budgetHint ? budgetHint.toLowerCase() + ' cost,' : ''} easy to attend solo or with one friend
- AVOID: generic recurring classes, events that already happened, placeholder listings
- DIVERSIFY: don't suggest 3 events of the same type — vary across categories

RELEVANCE SCORING (be honest):
- 0.9-1.0: Directly matches a stated interest + fits their schedule perfectly
- 0.7-0.89: Related to their interests but not an exact match
- 0.5-0.69: Wildcard — interesting stretch outside their comfort zone
- Below 0.5: Don't include it

TONE: Write each "why" like a friend texting them — casual, specific to THEIR persona, not generic.

Return as JSON array only:
[
  {
    "title": "Event name",
    "description": "One sentence about the event itself",
    "date": "YYYY-MM-DD",
    "start_time": "HH:MM",
    "end_time": "HH:MM",
    "location": "Venue Name, Full Address",
    "why": "2-3 sentences explaining why THIS event is perfect for THIS person based on their specific interests/personality",
    "link": "https://... (actual URL from search results)",
    "category": "professional|social|cultural|fitness|learning|entertainment",
    "cost": "free|low|medium|high",
    "registration_required": true/false,
    "relevance_score": 0.0-1.0
  }
]`;

    // Calculate free time slots
    const calendarService = new CalendarService('dummy-token'); // We don't need auth for calculation
    const freeTimeSlots = calendarService.calculateFreeTimeSlotsForRecommendations(calendarEvents, persona, currentDate);

    // Filter calendar events to last month only for minimal context
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const historicalEvents = calendarEvents.filter(event => {
      const eventDate = event.start.dateTime ? 
        new Date(event.start.dateTime) : 
        new Date(event.start.date!);
      return eventDate >= oneMonthAgo;
    });

    // Prepare minimal payload with minified events
    const minifiedEvents = minifyEvents(historicalEvents.slice(0, 20)); // More events since minified
    
    const payload = {
      persona_summary: archetypeProfile || `${persona.professional?.jobTitle || 'Professional'} in ${persona.professional?.industry || 'tech'} based in ${persona.location?.primaryLocation || 'your city'}`,
      archetype_profile: archetypeProfile || null,
      interests: persona.interests || {},
      personality: persona.personality || {},
      lifestyle: persona.lifestyle || {},
      location: persona.location || {},
      historical_events: minifiedEvents,
      free_time_slots: freeTimeSlots.slice(0, 12),
      user_location: userLocation,
      current_date: currentDate,
    };

    // Cheap default (gpt-4o-mini-search-preview) with app key; premium (gpt-5) when user provides key
    const defaultModel = process.env.OPENAI_RECOMMENDATIONS_MODEL_DEFAULT || 'gpt-4o-mini-search-preview';
    const premiumModel = process.env.OPENAI_RECOMMENDATIONS_MODEL || 'gpt-5';
    const model = hasUserKey ? premiumModel : defaultModel;
    const promptId = process.env.OPENAI_RECOMMENDATIONS_PROMPT_ID;

    console.log(`Recommendations: ${hasUserKey ? 'user key' : 'app key'}, model=${model}`);

    const createParams: Parameters<typeof openai.responses.create>[0] = {
      model,
      ...(promptId
        ? {
            // Use stored prompt from OpenAI dashboard
            prompt: {
              id: promptId,
              version: '1',
              variables: {
                persona_summary: payload.persona_summary,
                interests: JSON.stringify(payload.interests),
                historical_events: JSON.stringify(payload.historical_events),
                free_time_slots: JSON.stringify(payload.free_time_slots),
                user_location: JSON.stringify(payload.user_location),
                current_date: payload.current_date,
                payload: JSON.stringify(payload), // fallback if prompt uses single variable
              },
            },
          }
        : {
            // Fallback: inline prompt (existing behavior)
            input: [
              {
                role: 'developer',
                content: [
                  {
                    type: 'input_text',
                    text: cleanSystemPrompt,
                  },
                ],
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: JSON.stringify(payload),
                  },
                ],
              },
            ],
          }),
      text: {
        format: {
          type: 'text',
        },
        verbosity: 'medium',
      },
      ...(model.includes('gpt-5') || model.includes('o3') || model.includes('o4')
        ? { reasoning: { effort: 'medium' as const } }
        : {}),
      tools: [
        {
          type: 'web_search',
          user_location: {
            type: 'approximate',
          },
          search_context_size: 'medium',
        },
      ],
      store: true,
      include: [
        'web_search_call.action.sources',
        ...(model.includes('gpt-5') || model.includes('o3') || model.includes('o4') ? ['reasoning.encrypted_content'] : []),
      ] as any,
    };

    const response = await openai.responses.create(createParams);

    const content = (response as any).output_text ||
      ((response as any).output
        ?.map((item: any) =>
          item.content
            ?.map((chunk: any) =>
              typeof chunk.text === 'string'
                ? chunk.text
                : chunk.text?.value ?? ''
            )
            .join('')
        )
        .join(''))?.trim();
    
    console.log('GPT-5 response content:', content);
    console.log('Response output:', (response as any).output?.length);
    
    if (!content) {
      console.log('No content received from GPT-5');
      console.log('Full response:', JSON.stringify(response, null, 2));
      return NextResponse.json(
        { error: 'No recommendations generated' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let recommendations: RecommendationsResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonContent);

      // Normalize: single-event format (title, date, why, link, vibe) → full format
      recommendations = normalizeRecommendationsResponse(parsed);
    } catch (error) {
      console.error('Failed to parse recommendations JSON:', error);
      console.error('Raw content:', content);
      
      // Return honest error instead of fake events
      return NextResponse.json(
        {
          error: 'Could not parse event recommendations from AI response',
          raw_content: content?.substring(0, 500),
        },
        { status: 500 }
      );
    }

    // Detect conflicts and mark events as placeholders
    const recommendationsWithConflicts = detectConflictsAndMarkPlaceholders(
      recommendations, 
      calendarEvents, 
      freeTimeSlots
    );

    return NextResponse.json({
      success: true,
      ...recommendationsWithConflicts,
      usage: (response as any).usage,
      metadata: {
        reasoning: (response as any).reasoning,
        includes: (response as any).included,
      },
    });

  } catch (error) {
    console.error('Recommendations API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/** Normalize API response: array of events, single event, or legacy weekly format */
function normalizeRecommendationsResponse(parsed: any): RecommendationsResponse {
  // Already in weekly format
  if (parsed.recommendations && Array.isArray(parsed.recommendations) && parsed.recommendations[0]?.week_start_date) {
    return {
      recommendations: parsed.recommendations,
      metadata: parsed.metadata || {
        total_recommendations: parsed.recommendations.reduce((n: number, w: any) => n + (w.recommendations?.length || 0), 0),
        search_queries_used: [],
        confidence_score: 0.8,
        caveats: [],
      },
    };
  }

  // Array of events (new format: [{title, date, ...}, ...])
  const events: any[] = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.recommendations) ? parsed.recommendations : null);
  if (events && events.length > 0 && events[0]?.title) {
    const normalized = events
      .filter((e: any) => e.title && e.link)
      .map((e: any) => {
        const dateStr = e.date?.split('T')[0] || new Date().toISOString().split('T')[0];
        return {
          title: e.title,
          description: e.description || e.why || '',
          date: dateStr,
          start_time: e.start_time || '18:00',
          end_time: e.end_time || '20:00',
          location: e.location || '',
          category: mapCategory(e.category),
          relevance_score: typeof e.relevance_score === 'number' ? e.relevance_score : 0.8,
          source_url: e.link || e.source_url || '',
          cost: (['free', 'low', 'medium', 'high'].includes(e.cost) ? e.cost : 'unknown') as EventRecommendation['cost'],
          registration_required: e.registration_required ?? false,
          why: e.why || e.description || '',
        };
      });

    if (normalized.length > 0) {
      const dates = normalized.map((e: any) => e.date).sort();
      return {
        recommendations: [
          {
            week_start_date: dates[0],
            week_end_date: dates[dates.length - 1],
            recommendations: normalized,
          },
        ],
        metadata: {
          total_recommendations: normalized.length,
          search_queries_used: [],
          confidence_score: normalized.reduce((sum: number, e: any) => sum + e.relevance_score, 0) / normalized.length,
          caveats: [],
        },
      };
    }
  }

  // Single-event format: { title, date, location, why, link, category, vibe }
  if (parsed.title && parsed.link) {
    const dateStr = parsed.date?.split('T')[0] || new Date().toISOString().split('T')[0];
    const startTime = parsed.start_time || '18:00';
    const endTime = parsed.end_time || '20:00';
    return {
      recommendations: [
        {
          week_start_date: dateStr,
          week_end_date: dateStr,
          recommendations: [
            {
              title: parsed.title,
              description: parsed.description || parsed.why || '',
              date: dateStr,
              start_time: startTime,
              end_time: endTime,
              location: parsed.location || '',
              category: mapCategory(parsed.category),
              relevance_score: typeof parsed.relevance_score === 'number' ? parsed.relevance_score : 0.85,
              source_url: parsed.link,
              cost: (['free', 'low', 'medium', 'high'].includes(parsed.cost) ? parsed.cost : 'unknown') as EventRecommendation['cost'],
              registration_required: parsed.registration_required ?? false,
            },
          ],
        },
      ],
      metadata: {
        total_recommendations: 1,
        search_queries_used: [],
        confidence_score: 0.85,
        caveats: [],
      },
    };
  }

  return {
    recommendations: [],
    metadata: { total_recommendations: 0, search_queries_used: [], confidence_score: 0, caveats: ['No valid events found'] },
  };
}

function mapCategory(cat: string | undefined): EventRecommendation['category'] {
  const m: Record<string, EventRecommendation['category']> = {
    running: 'fitness',
    crypto: 'professional',
    social: 'social',
    culture: 'cultural',
    fitness: 'fitness',
    creative: 'cultural',
    learning: 'learning',
    entertainment: 'entertainment',
  };
  return (cat && m[cat]) || 'cultural';
}

function detectConflictsAndMarkPlaceholders(
  recommendations: RecommendationsResponse,
  calendarEvents: any[],
  _freeTimeSlots: any[]
): RecommendationsResponse {
  if (!recommendations.recommendations) {
    return recommendations;
  }

  // Only filter out events that directly conflict with existing calendar events.
  // Don't reject events just because they're outside calculated free slots —
  // the user might want to attend anyway.
  const modifiedRecommendations = {
    ...recommendations,
    recommendations: recommendations.recommendations.map(week => ({
      ...week,
      recommendations: week.recommendations?.map(event => {
        const eventDateTime = new Date(`${event.date}T${event.start_time}`);
        const eventEndDateTime = new Date(`${event.date}T${event.end_time || event.start_time}`);

        // Only check hard conflicts with existing calendar events
        const hasConflict = calendarEvents.some(existingEvent => {
          const existingStart = new Date(existingEvent.start?.dateTime || existingEvent.start?.date);
          const existingEnd = new Date(existingEvent.end?.dateTime || existingEvent.end?.date);
          return (eventDateTime < existingEnd && eventEndDateTime > existingStart);
        });

        return {
          ...event,
          is_placeholder: false,
          has_conflict: hasConflict,
          conflict_note: hasConflict ? 'Heads up: overlaps with something on your calendar' : undefined,
        };
      })
    }))
  };

  return modifiedRecommendations;
}

function generateSearchQueries(persona: PersonaProfile, userLocation: { city: string; country: string }): string[] {
  const queries: string[] = [];
  const city = userLocation.city;
  const currentDate = new Date();
  const nextMonth = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  const dateRange = `${currentDate.toISOString().slice(0, 7)}-${nextMonth.toISOString().slice(0, 7)}`;
  
  // Generate queries based on persona interests
  if (persona.interests?.hobbies) {
    for (const hobby of persona.interests.hobbies.slice(0, 3)) {
      queries.push(`${city} ${hobby} events ${dateRange}`);
    }
  }
  
  if (persona.interests?.sports) {
    for (const sport of persona.interests.sports.slice(0, 2)) {
      queries.push(`${city} ${sport} classes ${dateRange}`);
    }
  }
  
  if (persona.interests?.entertainment) {
    for (const entertainment of persona.interests.entertainment.slice(0, 2)) {
      queries.push(`${city} ${entertainment} ${dateRange}`);
    }
  }
  
  // Add professional development queries
  if (persona.professional?.industry && persona.professional.industry !== 'unknown') {
    queries.push(`${city} ${persona.professional.industry} meetup ${dateRange}`);
    queries.push(`${city} ${persona.professional.industry} conference ${dateRange}`);
  }
  
  // Add cultural events
  queries.push(`${city} cultural events ${dateRange}`);
  queries.push(`${city} concerts ${dateRange}`);
  queries.push(`${city} meetups ${dateRange}`);
  
  return queries.slice(0, 10); // Limit to 10 queries
}