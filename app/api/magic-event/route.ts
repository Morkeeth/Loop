import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PersonaProfile } from '@/types/persona';
import { CalendarEvent } from '@/types/calendar';
import { CalendarService } from '@/lib/calendar-service';

function minifyEvents(events: CalendarEvent[]) {
  return events.map((event) => ({
    s: event.summary,
    st: event.start?.dateTime || event.start?.date,
    et: event.end?.dateTime || event.end?.date,
    loc: event.location,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { persona, location, calendarEvents, currentDate, userApiKey }: {
      persona: PersonaProfile;
      location: { city: string; country: string; timezone: string };
      calendarEvents: CalendarEvent[];
      currentDate: string;
      userApiKey?: string;
    } = await request.json();

    if (!persona || !location) {
      return NextResponse.json(
        { error: 'Persona and location required' },
        { status: 400 }
      );
    }

    const hasUserKey = Boolean(userApiKey?.trim());
    const apiKey = hasUserKey ? userApiKey!.trim() : process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Calculate free time slots
    const calendarService = new CalendarService('dummy-token');
    const freeTimeSlots = calendarService.calculateFreeTimeSlotsForRecommendations(
      calendarEvents || [], persona, currentDate
    );

    // Recent events for context
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentEvents = (calendarEvents || []).filter(event => {
      const eventDate = event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date || '');
      return eventDate >= oneWeekAgo;
    });

    const systemPrompt = `You are Loop's magic event finder. Your job is to find ONE serendipitous, real event happening THIS WEEK near the user that feels like fate.

This isn't a generic recommendation. This is the one event that, when they see it, they think: "how did you know?"

Use the persona data to understand what would genuinely move this person. Then search the web for something real, specific, and upcoming.

Think: the underground thing they'd never find on their own. The workshop that perfectly intersects two of their interests. The community event that connects them to their tribe.

RULES:
- MUST be a REAL event found via web search
- MUST be happening within the next 7 days
- MUST be near ${location.city}, ${location.country} (or online)
- MUST include a verifiable source URL
- MUST fit in one of their free time slots if possible
- Write the "why" like a friend who knows them deeply

Return ONLY this JSON:
{
  "title": "Event name",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "location": "Full address or 'Online'",
  "why": "2-3 sentences — personal, warm, specific to them",
  "link": "https://verifiable-source-url",
  "category": "one of: social, cultural, fitness, creative, learning, professional",
  "vibe": "one evocative word that captures the feeling"
}`;

    const payload = {
      persona_summary: `${persona.professional?.jobTitle || 'Professional'} in ${persona.professional?.industry || 'tech'}`,
      interests: persona.interests || {},
      lifestyle: persona.lifestyle || {},
      personality_traits: persona.personality?.traits || [],
      social_preferences: persona.social?.socialPreferences || [],
      location: persona.location || {},
      recent_calendar: minifyEvents(recentEvents.slice(0, 10)),
      free_time_slots: freeTimeSlots.slice(0, 6),
      current_date: currentDate,
    };

    // User key gets premium model with reasoning, app key gets cheap model
    const defaultModel = process.env.OPENAI_RECOMMENDATIONS_MODEL_DEFAULT || 'gpt-4o';
    const premiumModel = process.env.OPENAI_RECOMMENDATIONS_MODEL || 'gpt-4o';
    const model = hasUserKey ? premiumModel : defaultModel;

    const response = await openai.responses.create({
      model,
      input: [
        {
          role: 'developer',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: JSON.stringify(payload) }],
        },
      ],
      tools: [
        {
          type: 'web_search',
          user_location: { type: 'approximate' },
          search_context_size: 'medium',
        },
      ],
      text: { format: { type: 'text' } },
      store: true,
    });

    const content = (response as any).output_text ||
      ((response as any).output
        ?.map((item: any) =>
          item.content
            ?.map((chunk: any) =>
              typeof chunk.text === 'string' ? chunk.text : chunk.text?.value ?? ''
            )
            .join('')
        )
        .join(''))?.trim();

    if (!content) {
      return NextResponse.json(
        { error: 'No magic event found' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse magic event', raw: content },
        { status: 500 }
      );
    }

    const magicEvent = JSON.parse(jsonMatch[0]);

    // Transform into Google Calendar event shape
    const calendarEvent = {
      summary: `✨ ${magicEvent.title}`,
      description: `${magicEvent.why}\n\nFound by Loop — your calendar's serendipity engine.\n\nSource: ${magicEvent.link}`,
      start: {
        dateTime: `${magicEvent.date}T${magicEvent.start_time}:00`,
        timeZone: location.timezone,
      },
      end: {
        dateTime: `${magicEvent.date}T${magicEvent.end_time}:00`,
        timeZone: location.timezone,
      },
      location: magicEvent.location,
    };

    return NextResponse.json({
      success: true,
      magicEvent,
      calendarEvent,
    });

  } catch (error) {
    console.error('Magic event error:', error);
    return NextResponse.json(
      {
        error: 'Failed to find magic event',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
