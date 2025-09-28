import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SuggestedEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  reason: string;
  selected: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { persona, calendarData } = await request.json();

    if (!persona || !calendarData) {
      return NextResponse.json(
        { error: 'Persona and calendar data required' },
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

    // Estimate token usage and reduce context if needed
    const estimatedTokens = estimateTokenUsage(persona, calendarData);
    console.log(`Estimated token usage: ${estimatedTokens}`);

    let processedCalendarData = calendarData;
    let contextReductionAttempts = 0;
    const maxAttempts = 3;

    // GPT-5 has much higher token limits (128k+), using more of its capacity
    const maxTokens = 120000; // Increased limit for GPT-5's larger context window
    
    // If token usage is too high, reduce context
    while (estimatedTokens > maxTokens && contextReductionAttempts < maxAttempts) {
      console.log(`Token usage too high (${estimatedTokens}), reducing context...`);
      processedCalendarData = reduceCalendarContext(calendarData, contextReductionAttempts + 1);
      const newEstimatedTokens = estimateTokenUsage(persona, processedCalendarData);
      console.log(`Reduced context: ${estimatedTokens} -> ${newEstimatedTokens} tokens`);
      
      if (newEstimatedTokens <= maxTokens) {
        break;
      }
      
      contextReductionAttempts++;
    }

    if (contextReductionAttempts >= maxAttempts) {
      console.warn('Max context reduction attempts reached, proceeding with reduced data');
    }

    // Calculate date constraints
    const now = new Date();
    const fourWeeksFromNow = new Date(now.getTime() + (4 * 7 * 24 * 60 * 60 * 1000));
    
    // System prompt: Core behavior and rules
    const systemPrompt = `You are a calendar suggestion assistant that suggests diverse activities based on user patterns and interests.

CORE RULES:
- Suggest a MIX of activity types: public events, social activities, and personal/solo activities
- Use web search to find actual public events happening in their area
- Create personalized social and solo activities based on their interests
- NO imaginary/fake public events - only real, verifiable public events
- CRITICAL: NEVER suggest events that conflict with existing calendar events
- Check ALL existing events in the provided calendar data before suggesting times
- Avoid meal times (7-9am breakfast, 12-2pm lunch, 6-8pm dinner local time)
- Events must be specific, actionable, and personally relevant
- Duration: 30min-2hours typically

ACTIVITY TYPES TO INCLUDE:
1. PUBLIC EVENTS (use web search): Meetups, workshops, exhibitions, concerts, festivals
2. SOCIAL ACTIVITIES: "Coffee with Sarah", "Football with friends", "Study group with classmates"
3. PERSONAL/SOLO ACTIVITIES: "Self-study session", "Morning run", "Cooking new recipe", "Reading time"

REASON FIELD STYLE:
Write compelling invitations, not explanations. Focus on benefits and appeal.
For public events, include relevant links when available (event websites, registration pages, venue info).
GOOD: "Perfect opportunity to network with local entrepreneurs over coffee"
GOOD: "Great way to stay active and catch up with friends"
GOOD: "Dedicated time to focus on your learning goals"
GOOD: "Join this tech meetup - register at meetup.com/paris-tech"
BAD: "You typically have coffee meetings, so this fits your pattern"

OUTPUT FORMAT:
Respond with ONLY valid JSON:
{
  "suggestions": [
    {
      "title": "Specific Activity Title",
      "startTime": "2024-01-15T09:00:00.000Z",
      "endTime": "2024-01-15T10:00:00.000Z", 
      "category": "fitness|social|learning|work|hobby|health",
      "reason": "Compelling invitation-style description"
    }
  ]
}

Generate 6-10 diverse suggestions mixing public events, social activities, and personal activities.`;

    // Create a more efficient calendar summary for analysis
    const calendarSummary = createCalendarSummary(processedCalendarData);
    
    const userPrompt = `USER CONTEXT:
${JSON.stringify(persona, null, 2)}

CALENDAR PATTERNS:
${calendarSummary}

SCHEDULING CONSTRAINTS:
- Time window: ${now.toISOString()} to ${fourWeeksFromNow.toISOString()}
- Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
- Avoid meal times: 7-9am breakfast, 12-2pm lunch, 6-8pm dinner
- CRITICAL: Check ALL existing events in CALENDAR PATTERNS section for conflicts
- NEVER suggest events that overlap with existing calendar events
- Find FREE time slots between existing events
- ALL SELECTED CALENDARS are included in the analysis above

TASK:
1. Analyze their calendar patterns, interests, and social connections
2. CAREFULLY review ALL existing events in the calendar data to identify free time slots
3. Create a diverse mix of suggestions ONLY in available time slots:
   - Use web search to find REAL public events in their area
   - For public events, include relevant links (event websites, registration pages, venue info)
   - Suggest social activities with friends/colleagues based on their interests
   - Recommend personal/solo activities that align with their goals
4. Ensure suggestions match their lifestyle and fit their schedule WITHOUT conflicts
5. Write compelling reasons that make them want to participate

Generate personalized activity suggestions mixing public events, social activities, and personal activities ONLY in free time slots.`;

    // Try with GPT-5 Responses API for web search capability
    console.log('Attempting to use GPT-5 Responses API with web search...');
    let response;
    try {
      response = await openai.responses.create({
        model: 'gpt-5',
        input: [
          {
            role: 'developer',
            content: [
              {
                type: 'input_text',
                text: systemPrompt,
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: userPrompt,
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
      
      console.log('GPT-5 Responses API succeeded with web search capability');
    } catch (structuredError) {
      console.log('GPT-5 Responses API failed:', structuredError);
      console.log('Error details:', {
        message: structuredError instanceof Error ? structuredError.message : 'Unknown error',
        code: (structuredError as any)?.code,
        status: (structuredError as any)?.status,
      });
      console.log('Falling back to regular chat completions...');
      // Fallback to regular completion without web search
      response = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        // GPT-5 only supports default temperature (1), custom values not supported
        // Note: GPT-5 may not support max_completion_tokens parameter
      });
    }

    const content = (response as any).output_text || 
      ((response as any).choices?.[0]?.message?.content) ||
      ((response as any).output?.map((item: any) =>
        item.content?.map((chunk: any) =>
          typeof chunk.text === 'string'
            ? chunk.text
            : chunk.text?.value ?? ''
        ).join('')
      ).join(''));
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response content length:', content.length);
    console.log('OpenAI response preview:', content.substring(0, 200) + '...');

    // Parse the JSON response
    let parsedResponse: { suggestions: Omit<SuggestedEvent, 'id' | 'selected'>[] };
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // Try to extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (secondParseError) {
          console.error('Failed to parse extracted JSON:', jsonMatch[0]);
          throw new Error('Invalid response format from OpenAI - could not parse JSON');
        }
      } else {
        throw new Error('Invalid response format from OpenAI - no JSON found');
      }
    }

    // Extract suggestions from the response
    const suggestions = parsedResponse.suggestions || [];
    
    if (!Array.isArray(suggestions)) {
      console.error('Invalid suggestions format:', suggestions);
      throw new Error('Invalid suggestions format - expected array');
    }

    if (suggestions.length === 0) {
      throw new Error('No suggestions generated');
    }

    // Validate and add id and selected fields
    const suggestionsWithIds: SuggestedEvent[] = suggestions.map((suggestion, index) => {
      // Validate required fields
      if (!suggestion.title || !suggestion.startTime || !suggestion.endTime || !suggestion.category || !suggestion.reason) {
        console.error('Invalid suggestion format:', suggestion);
        throw new Error(`Invalid suggestion at index ${index} - missing required fields`);
      }
      
      // Validate dates are within the correct range
      const startDate = new Date(suggestion.startTime);
      const endDate = new Date(suggestion.endTime);
      
      if (startDate < now || startDate > fourWeeksFromNow) {
        console.error('Invalid start date:', suggestion.startTime, 'must be between', now.toISOString(), 'and', fourWeeksFromNow.toISOString());
        throw new Error(`Invalid start date at index ${index} - must be within 4 weeks from now`);
      }
      
      if (endDate <= startDate) {
        console.error('Invalid end date:', suggestion.endTime, 'must be after start date', suggestion.startTime);
        throw new Error(`Invalid end date at index ${index} - must be after start date`);
      }
      
      // Validate event duration is reasonable (not too long)
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      if (durationHours > 8) {
        console.warn(`Event at index ${index} is very long (${durationHours} hours):`, suggestion.title);
      }
      
      return {
        ...suggestion,
        id: `suggestion_${Date.now()}_${index}`,
        selected: true, // Default to selected
      };
    });

    return NextResponse.json({
      success: true,
      suggestions: suggestionsWithIds
    });

  } catch (error) {
    console.error('Auto-populate generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function estimateTokenUsage(persona: any, calendarData: any[]): number {
  // Rough estimation: 1 token ≈ 4 characters
  const personaStr = JSON.stringify(persona, null, 2);
  
  // Estimate calendar summary size instead of full JSON
  const calendarSummary = createCalendarSummary(calendarData);
  
  const totalChars = personaStr.length + calendarSummary.length;
  return Math.ceil(totalChars / 4);
}

function createCalendarSummary(calendarData: any[]): string {
  if (!calendarData || calendarData.length === 0) {
    return "No calendar events found for pattern analysis.";
  }

  // Group events by type and analyze patterns
  const eventTypes: { [key: string]: any[] } = {};
  const timePatterns: { [key: string]: number } = {};
  const dayPatterns: { [key: string]: number } = {};
  const mealTimeConflicts: { [key: string]: number } = {};
  
  calendarData.forEach(event => {
    const summary = event.s || event.summary || 'Untitled Event';
    const startTime = event.st || event.startTime;
    const endTime = event.et || event.endTime;
    
    if (!startTime) return;
    
    const startDate = new Date(startTime);
    const hour = startDate.getHours();
    const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check for meal time conflicts
    if (hour >= 7 && hour < 9) {
      mealTimeConflicts['breakfast'] = (mealTimeConflicts['breakfast'] || 0) + 1;
    } else if (hour >= 12 && hour < 14) {
      mealTimeConflicts['lunch'] = (mealTimeConflicts['lunch'] || 0) + 1;
    } else if (hour >= 18 && hour < 20) {
      mealTimeConflicts['dinner'] = (mealTimeConflicts['dinner'] || 0) + 1;
    }
    
    // Categorize events by keywords
    const lowerSummary = summary.toLowerCase();
    let category = 'other';
    if (lowerSummary.includes('meeting') || lowerSummary.includes('call') || lowerSummary.includes('standup')) {
      category = 'work';
    } else if (lowerSummary.includes('run') || lowerSummary.includes('gym') || lowerSummary.includes('workout') || lowerSummary.includes('yoga')) {
      category = 'fitness';
    } else if (lowerSummary.includes('dinner') || lowerSummary.includes('lunch') || lowerSummary.includes('coffee') || lowerSummary.includes('social')) {
      category = 'social';
    } else if (lowerSummary.includes('class') || lowerSummary.includes('learn') || lowerSummary.includes('course') || lowerSummary.includes('study')) {
      category = 'learning';
    } else if (lowerSummary.includes('doctor') || lowerSummary.includes('appointment') || lowerSummary.includes('health')) {
      category = 'health';
    }
    
    if (!eventTypes[category]) eventTypes[category] = [];
    eventTypes[category].push({ summary, startTime, endTime });
    
    // Track time patterns
    const timeSlot = hour < 6 ? 'late_night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    timePatterns[timeSlot] = (timePatterns[timeSlot] || 0) + 1;
    
    // Track day patterns
    dayPatterns[dayOfWeek] = (dayPatterns[dayOfWeek] || 0) + 1;
  });

  // Create summary
  let summary = `Total Events Analyzed: ${calendarData.length}\n`;
  
  // Show calendar sources
  const calendarSources = [...new Set(calendarData.map(event => event.cal || 'Primary'))];
  summary += `Calendars Included: ${calendarSources.join(', ')}\n\n`;
  
  // Event type breakdown
  summary += "EVENT TYPES:\n";
  Object.entries(eventTypes).forEach(([type, events]) => {
    summary += `- ${type.toUpperCase()}: ${events.length} events\n`;
    // Show a few examples
    events.slice(0, 3).forEach(event => {
      const time = new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      summary += `  • ${event.summary} (${time})\n`;
    });
    if (events.length > 3) summary += `  • ... and ${events.length - 3} more\n`;
    summary += '\n';
  });
  
  // Time patterns
  summary += "TIME PREFERENCES:\n";
  Object.entries(timePatterns)
    .sort(([,a], [,b]) => b - a)
    .forEach(([timeSlot, count]) => {
      summary += `- ${timeSlot.replace('_', ' ')}: ${count} events\n`;
    });
  summary += '\n';
  
  // Day patterns
  summary += "DAY PREFERENCES:\n";
  Object.entries(dayPatterns)
    .sort(([,a], [,b]) => b - a)
    .forEach(([day, count]) => {
      summary += `- ${day}: ${count} events\n`;
    });
  
  // Meal time conflicts
  summary += "\nMEAL TIME CONFLICTS (avoid scheduling during these times):\n";
  Object.entries(mealTimeConflicts).forEach(([meal, count]) => {
    summary += `- ${meal}: ${count} events scheduled during this time\n`;
  });
  
  // CRITICAL: Add detailed schedule for conflict detection
  summary += "\n\nEXISTING EVENTS SCHEDULE (DO NOT SCHEDULE OVER THESE):\n";
  const sortedEvents = calendarData
    .filter(event => event.st || event.startTime)
    .sort((a, b) => {
      const aTime = new Date(a.st || a.startTime).getTime();
      const bTime = new Date(b.st || b.startTime).getTime();
      return aTime - bTime;
    });
  
  // Group events by date for better readability
  const eventsByDate: { [date: string]: any[] } = {};
  sortedEvents.forEach(event => {
    const startDate = new Date(event.st || event.startTime);
    const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(event);
  });
  
  // Show events for the next 4 weeks
  const now = new Date();
  const fourWeeksFromNow = new Date(now.getTime() + (4 * 7 * 24 * 60 * 60 * 1000));
  
  Object.entries(eventsByDate)
    .filter(([date]) => {
      const eventDate = new Date(date);
      return eventDate >= now && eventDate <= fourWeeksFromNow;
    })
    .slice(0, 14) // Show next 2 weeks max to avoid token limits
    .forEach(([date, events]) => {
      const eventDate = new Date(date);
      summary += `\n${eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}:\n`;
      events.forEach(event => {
        const startTime = new Date(event.st || event.startTime);
        const endTime = new Date(event.et || event.endTime);
        const startStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        summary += `  ${startStr}-${endStr}: ${event.s || event.summary}\n`;
      });
    });
  
  summary += "\nIMPORTANT: Only suggest events in FREE time slots between the above events!";
  
  return summary;
}

function reduceCalendarContext(calendarData: any[], reductionLevel: number): any[] {
  // Reduce context by keeping the most recent and most relevant events
  const sortedEvents = [...calendarData].sort((a, b) => {
    const aTime = a.st || a.startTime || '';
    const bTime = b.st || b.startTime || '';
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  // Keep more events for better pattern analysis with GPT-5's larger context
  const keepCount = Math.max(500, Math.floor(sortedEvents.length / (reductionLevel * 0.3 + 1)));
  
  // Prioritize recent events and events with more detail
  const prioritizedEvents = sortedEvents.slice(0, keepCount).map(event => ({
    ...event,
    // Add summary info for better analysis
    summary: event.s || event.summary || 'Untitled Event',
    start: event.st || event.startTime,
    end: event.et || event.endTime,
    calendar: event.cal || event.calendarSummary || 'Primary'
  }));
  
  return prioritizedEvents;
}
