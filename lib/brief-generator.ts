import OpenAI from 'openai';
import { MorningBrief, PersonaProfile, ProcessedEvent } from '@/types/brief';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class BriefGenerator {
  private persona: PersonaProfile;
  private events: ProcessedEvent[];
  private userId: string;

  constructor(persona: PersonaProfile, events: ProcessedEvent[], userId: string) {
    this.persona = persona;
    this.events = events;
    this.userId = userId;
  }

  async generateBrief(): Promise<MorningBrief> {
    try {
      const prompt = this.buildBriefPrompt();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that creates personalized morning briefings. 
            Based on the user's persona and calendar events, generate a comprehensive daily brief 
            including weather, personalized news, opportunities, discoveries, and reminders.
            
            IMPORTANT: Return ONLY a valid JSON object. Do not include any explanatory text, markdown, or other formatting. 
            The response must start with { and end with }.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Extract JSON from the response (AI sometimes includes explanatory text)
      let jsonContent = content;
      
      // Try to find JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      const briefData = JSON.parse(jsonContent);
      
      // Add metadata
      const brief: MorningBrief = {
        ...briefData,
        id: `brief_${this.userId}_${Date.now()}`,
        userId: this.userId,
        date: new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
      };

      return brief;

    } catch (error) {
      console.error('Error generating brief:', error);
      throw error;
    }
  }

  private buildBriefPrompt(): string {
    const todayEvents = this.events.filter(event => {
      const eventDate = event.start.dateTime ? 
        new Date(event.start.dateTime).toISOString().split('T')[0] :
        event.start.date;
      const today = new Date().toISOString().split('T')[0];
      return eventDate === today;
    });

    const upcomingEvents = this.events.filter(event => {
      const eventDate = event.start.dateTime ? 
        new Date(event.start.dateTime) :
        new Date(event.start.date!);
      return eventDate > new Date();
    }).slice(0, 10); // Next 10 events

    return `Generate a personalized morning brief for today based on this data:

User Persona:
${JSON.stringify(this.persona, null, 2)}

Today's Events (${todayEvents.length}):
${JSON.stringify(todayEvents.map(e => ({
  summary: e.summary,
  start: e.start.dateTime || e.start.date,
  duration: e.duration,
  category: e.category.type
})), null, 2)}

Upcoming Events:
${JSON.stringify(upcomingEvents.map(e => ({
  summary: e.summary,
  start: e.start.dateTime || e.start.date,
  category: e.category.type
})), null, 2)}

Generate a comprehensive morning brief including:
1. Weather information (mock data for now)
2. Personalized news based on their profession/interests
3. Today's opportunities based on free time slots
4. Discover section with relevant events/activities
5. Reminders for important upcoming events
6. Personalized greeting and motivational message

Make it relevant, actionable, and personalized to their lifestyle and interests.`;
  }
}
