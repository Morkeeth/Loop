import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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
        { error: 'Persona and calendar data are required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('Generating event suggestions...');

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
      "startTime": "YYYY-MM-DDTHH:MM:00.000Z",
      "endTime": "YYYY-MM-DDTHH:MM:00.000Z", 
      "category": "fitness|social|learning|work|hobby|health",
      "reason": "Compelling invitation-style description"
    }
  ]
}

CRITICAL DATE REQUIREMENTS:
- Use REAL future dates within the specified time window
- Each suggestion must have DIFFERENT dates
- Spread suggestions across multiple days/weeks
- Use proper ISO 8601 format with timezone UTC
- Ensure startTime is before endTime
- Duration should be 30min-2hours typically

Generate 6-10 diverse suggestions mixing public events, social activities, and personal activities.`;

    // Create a more efficient calendar summary for analysis
    const calendarSummary = createCalendarSummary(calendarData);
    
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
6. CRITICAL: Generate DIFFERENT dates for each suggestion - spread them across the 4-week window
7. Use realistic future dates within the time window specified above

Generate personalized activity suggestions mixing public events, social activities, and personal activities ONLY in free time slots.`;

    // Use regular chat completions API
    console.log('Generating suggestions with GPT-5...');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_AUTOPOPULATE_MODEL || 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);

  } catch (error) {
    // Check for quota issues and provide fallback
    if (error instanceof Error && error.message.includes('quota')) {
      console.warn('OpenAI quota exceeded, returning empty suggestions...');
      return NextResponse.json({
        success: true,
        suggestions: [],
        message: 'OpenAI quota exceeded - no suggestions generated',
        fallback: true
      });
    }

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

function createCalendarSummary(calendarData: any[]): string {
  if (!calendarData || calendarData.length === 0) {
    return 'No calendar events found.';
  }

  // Analyze event patterns
  const eventTypes: { [key: string]: any[] } = {};
  const timePatterns: { [key: string]: number } = {};
  const dayPatterns: { [key: string]: number } = {};
  const mealTimeConflicts: { [key: string]: number } = {};

  calendarData.forEach(event => {
    const summary = event.s || event.summary || 'Untitled';
    const startTime = event.st || event.startTime;
    const endTime = event.et || event.endTime;
    
    if (!startTime) return;

    // Categorize by event type
    const lowerSummary = summary.toLowerCase();
    let category = 'other';
    if (lowerSummary.includes('meeting') || lowerSummary.includes('call') || lowerSummary.includes('work')) {
      category = 'work';
    } else if (lowerSummary.includes('lunch') || lowerSummary.includes('dinner') || lowerSummary.includes('coffee')) {
      category = 'social';
    } else if (lowerSummary.includes('gym') || lowerSummary.includes('run') || lowerSummary.includes('fitness')) {
      category = 'fitness';
    } else if (lowerSummary.includes('study') || lowerSummary.includes('learn') || lowerSummary.includes('class')) {
      category = 'learning';
    }
    
    if (!eventTypes[category]) eventTypes[category] = [];
    eventTypes[category].push(event);

    // Time patterns
    const start = new Date(startTime);
    const hour = start.getHours();
    let timeSlot = 'morning';
    if (hour >= 12 && hour < 17) timeSlot = 'afternoon';
    else if (hour >= 17) timeSlot = 'evening';
    
    timePatterns[timeSlot] = (timePatterns[timeSlot] || 0) + 1;

    // Day patterns
    const dayOfWeek = start.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    dayPatterns[dayOfWeek] = (dayPatterns[dayOfWeek] || 0) + 1;

    // Meal time conflicts
    if (hour >= 7 && hour <= 9) mealTimeConflicts['breakfast'] = (mealTimeConflicts['breakfast'] || 0) + 1;
    else if (hour >= 12 && hour <= 14) mealTimeConflicts['lunch'] = (mealTimeConflicts['lunch'] || 0) + 1;
    else if (hour >= 18 && hour <= 20) mealTimeConflicts['dinner'] = (mealTimeConflicts['dinner'] || 0) + 1;
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
    
    // Show sample events
    const sampleEvents = events.slice(0, 3);
    sampleEvents.forEach(event => {
      const eventSummary = event.s || event.summary || 'Untitled';
      summary += `  • ${eventSummary}\n`;
    });
    
    if (events.length > 3) summary += `  • ... and ${events.length - 3} more\n`;
    summary += '\n';
  });

  // Time patterns
  summary += "TIME PREFERENCES:\n";
  Object.entries(timePatterns).forEach(([time, count]) => {
    summary += `- ${time}: ${count} events\n`;
  });
  
  // Day patterns
  summary += "\nDAY PREFERENCES:\n";
  Object.entries(dayPatterns).forEach(([day, count]) => {
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
