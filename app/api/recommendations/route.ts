import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const { persona, calendarEvents, userLocation, currentDate }: RecommendationRequest = await request.json();

    if (!persona || !calendarEvents || !userLocation) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Selective recommendations system prompt
    const cleanSystemPrompt = `Find ONLY truly exceptional events in user's city. Be extremely selective - only suggest events that are genuinely cool, unique, or special. Return JSON only.

CRITERIA FOR "COOL" EVENTS:
- Unique experiences (art exhibitions, concerts, workshops, meetups)
- Special occasions (festivals, launches, premieres, talks by notable people)
- High-quality cultural events (theater, music, art, food experiences)
- Professional/networking events with interesting speakers or topics
- NOT routine activities (regular meetups, weekly classes, common events)

RULES:
- Maximum 2-4 events TOTAL across all 4 weeks
- Only suggest if relevance_score >= 0.8
- Prioritize free or low-cost events
- Must match user's interests from persona
- Must fit in provided free time slots

{
  "recommendations": [
    {
      "week_start_date": "2024-01-15",
      "week_end_date": "2024-01-21", 
      "recommendations": [
        {
          "title": "Event Name",
          "description": "Description",
          "date": "2024-01-18",
          "start_time": "18:30",
          "end_time": "20:30",
          "location": "Venue",
          "category": "cultural",
          "relevance_score": 0.9,
          "source_url": "https://example.com",
          "cost": "free",
          "registration_required": false
        }
      ]
    }
  ],
  "metadata": {
    "total_recommendations": 2,
    "search_queries_used": ["unique events", "special events"],
    "confidence_score": 0.8,
    "caveats": []
  }
}`;

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
      persona_summary: (persona as any).persona_summary_120 || 'Professional based in Lisbon',
      interests: persona.interests || {},
      location: persona.location || {},
      historical_events: minifiedEvents, // Minified format
      free_time_slots: freeTimeSlots.slice(0, 8), // More slots since minified
      user_location: userLocation,
      current_date: currentDate,
    };

    console.log('Calling GPT-5 with web search for recommendations...');
    console.log('Persona data size:', JSON.stringify(persona).length, 'characters');
    console.log('Total calendar events:', calendarEvents.length);
    console.log('Historical events (1 month):', historicalEvents.length);
    console.log('Free time slots:', freeTimeSlots.length);

    // Call GPT-5 with web search using responses API
    const response = await openai.responses.create({
      model: 'gpt-5',
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
      text: {
        format: {
          type: 'text',
        },
        verbosity: 'medium',
      },
      reasoning: {
        effort: 'medium',
      },
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
      include: ['reasoning.encrypted_content', 'web_search_call.action.sources'] as any,
    });

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
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[0] : content;
      recommendations = JSON.parse(jsonContent);
    } catch (error) {
      console.error('Failed to parse recommendations JSON:', error);
      console.error('Raw content:', content);
      
      // Return a fallback response with selective mock recommendations
      recommendations = {
        recommendations: [
          {
            week_start_date: new Date().toISOString().split('T')[0],
            week_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            recommendations: [
              {
                title: "Art Gallery Opening",
                description: "Contemporary art exhibition with local artists",
                date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                start_time: "19:00",
                end_time: "21:00",
                location: "Modern Art Gallery",
                category: "cultural",
                relevance_score: 0.9,
                source_url: "https://example.com",
                cost: "free",
                registration_required: false
              }
            ]
          }
        ],
        metadata: {
          total_recommendations: 1,
          search_queries_used: ["unique events", "art exhibitions"],
          confidence_score: 0.6,
          caveats: ["Generated selective fallback recommendation due to parsing error"]
        }
      };
    }

    return NextResponse.json({
      success: true,
      ...recommendations,
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