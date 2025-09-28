/**
 * Test function to demonstrate the new diverse calendar enhancement
 * Shows how the system now suggests public events, social activities, and personal activities
 */

export function testDiverseCalendarEnhancement() {
  const mockPersona = {
    name: "Alex",
    city: "Paris",
    interests: ["technology", "fitness", "cooking", "reading"],
    collaborators: ["Sarah", "Mike", "Emma"],
    preferred_voice: "casual and friendly"
  };

  const mockCalendarData = [
    {
      summary: "Morning workout",
      start: { dateTime: "2025-09-30T07:00:00+02:00" },
      end: { dateTime: "2025-09-30T08:00:00+02:00" }
    },
    {
      summary: "Team meeting",
      start: { dateTime: "2025-09-30T10:00:00+02:00" },
      end: { dateTime: "2025-09-30T11:00:00+02:00" }
    },
    {
      summary: "Coffee with Sarah",
      start: { dateTime: "2025-09-30T15:00:00+02:00" },
      end: { dateTime: "2025-09-30T16:00:00+02:00" }
    }
  ];

  console.log('=== DIVERSE CALENDAR ENHANCEMENT TEST ===');
  console.log('Persona:', JSON.stringify(mockPersona, null, 2));
  console.log('Current Calendar:', JSON.stringify(mockCalendarData, null, 2));
  
  console.log('\n=== EXPECTED SUGGESTION TYPES ===');
  console.log('1. PUBLIC EVENTS (via web search):');
  console.log('   - "Paris Tech Meetup - AI & Machine Learning"');
  console.log('   - "Cooking Workshop: French Pastries"');
  console.log('   - "Book Club: Science Fiction Discussion"');
  
  console.log('\n2. SOCIAL ACTIVITIES:');
  console.log('   - "Football with Mike and friends"');
  console.log('   - "Study group with Emma"');
  console.log('   - "Cooking dinner with Sarah"');
  
  console.log('\n3. PERSONAL/SOLO ACTIVITIES:');
  console.log('   - "Self-study: Advanced React patterns"');
  console.log('   - "Morning run in Parc des Buttes-Chaumont"');
  console.log('   - "Reading time: Latest tech articles"');
  console.log('   - "Cooking new recipe: Homemade pasta"');
  
  console.log('\n=== REASON EXAMPLES ===');
  console.log('PUBLIC EVENT: "Perfect opportunity to network with local tech professionals"');
  console.log('SOCIAL ACTIVITY: "Great way to stay active and catch up with friends"');
  console.log('PERSONAL ACTIVITY: "Dedicated time to focus on your learning goals"');
  
  return {
    persona: mockPersona,
    calendarData: mockCalendarData,
    expectedTypes: ['public_events', 'social_activities', 'personal_activities']
  };
}
