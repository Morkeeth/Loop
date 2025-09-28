import OpenAI from 'openai';
import { PersonaProfile, PersonaInsights, LoadingComment } from '@/types/persona';
import { ProcessedEvent } from '@/types/calendar';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class PersonaGenerator {
  private events: ProcessedEvent[];
  private userId: string;

  constructor(events: ProcessedEvent[], userId: string) {
    this.events = events;
    this.userId = userId;
  }

  async generatePersona(): Promise<PersonaProfile> {
    try {
      const prompt = this.buildPersonaPrompt();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes calendar data to create detailed persona profiles. 
            Analyze the provided calendar events and extract insights about the person's professional life, 
            education, interests, social patterns, schedule patterns, location, lifestyle, and personality traits.
            
            IMPORTANT: Return ONLY a valid JSON object. Do not include any explanatory text, markdown, or other formatting. 
            The response must start with { and end with }.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
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

      // Parse the JSON response
      const personaData = JSON.parse(jsonContent);
      
      // Add metadata
      const persona: PersonaProfile = {
        ...personaData,
        id: `persona_${this.userId}_${Date.now()}`,
        userId: this.userId,
        generatedAt: new Date().toISOString(),
      };

      return persona;

    } catch (error) {
      console.error('Error generating persona:', error);
      throw error;
    }
  }

  async generateLoadingComments(): Promise<LoadingComment[]> {
    try {
      const prompt = this.buildLoadingCommentsPrompt();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a witty AI assistant that makes entertaining comments while analyzing someone's calendar. 
            Generate 5-8 humorous, light-hearted comments about patterns you notice in their calendar data. 
            Be playful but not offensive. Comments should be about 1-2 sentences each.
            
            IMPORTANT: Return ONLY a valid JSON array. Do not include any explanatory text, markdown, or other formatting.
            Each object should have: {"text": "comment text", "category": "professional|personal|social|lifestyle|general"}
            Example: [{"text": "You're quite the meeting master!", "category": "professional"}]`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Extract JSON from the response (AI sometimes includes markdown formatting)
      let jsonContent = content;
      
      // Remove markdown code blocks if present
      jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to find JSON array in the response
      const jsonMatch = jsonContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      try {
        const comments = JSON.parse(jsonContent);
        return comments.map((comment: any, index: number) => ({
          ...comment,
          id: `comment_${this.userId}_${index}`,
          timestamp: new Date().toISOString(),
        }));
      } catch (parseError) {
        console.error('Failed to parse loading comments JSON:', parseError);
        console.error('Raw content:', content);
        console.error('Processed content:', jsonContent);
        
        // Return fallback comments if JSON parsing fails
        return this.getFallbackComments();
      }

    } catch (error) {
      console.error('Error generating loading comments:', error);
      // Return fallback comments
      return this.getFallbackComments();
    }
  }

  private buildPersonaPrompt(): string {
    const eventSummary = this.events.map(event => ({
      summary: event.summary,
      category: event.category.type,
      duration: event.duration,
      participants: event.participants.length,
      location: event.location,
      start: event.start.dateTime || event.start.date,
      isRecurring: event.isRecurring,
    }));

    return `Analyze this calendar data and create a detailed persona profile:

Calendar Events (${this.events.length} events):
${JSON.stringify(eventSummary, null, 2)}

Extract insights about:
1. Professional life (job patterns, meeting frequency, work hours)
2. Education (student status, class schedules)
3. Personal interests (hobbies, recurring activities)
4. Social patterns (frequent contacts, social events)
5. Schedule patterns (wake/sleep times, busy periods)
6. Location patterns (primary location, travel)
7. Lifestyle indicators (exercise, dining, entertainment)
8. Personality traits (communication style, productivity patterns)

Return a JSON object with realistic, data-driven insights. Use confidence scores (0-1) for each section.`;
  }

  private buildLoadingCommentsPrompt(): string {
    const eventTypes = this.events.reduce((acc, event) => {
      acc[event.category.type] = (acc[event.category.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recurringEvents = this.events.filter(e => e.isRecurring);
    const longEvents = this.events.filter(e => e.duration > 120); // > 2 hours
    const socialEvents = this.events.filter(e => e.category.type === 'social');

    return `Generate witty comments about this person's calendar patterns:

Event Types: ${JSON.stringify(eventTypes)}
Recurring Events: ${recurringEvents.length}
Long Events (>2h): ${longEvents.length}
Social Events: ${socialEvents.length}

Sample events:
${this.events.slice(0, 10).map(e => `${e.summary} (${e.category.type}, ${e.duration}min)`).join('\n')}

Generate 5-8 humorous comments about what you notice. Be playful and specific!`;
  }

  private getFallbackComments(): LoadingComment[] {
    return [
      {
        id: `comment_${this.userId}_fallback_1`,
        text: "Analyzing your calendar patterns... 📅",
        category: 'general',
        timestamp: new Date().toISOString(),
      },
      {
        id: `comment_${this.userId}_fallback_2`,
        text: "Looking for interesting insights... 🔍",
        category: 'general',
        timestamp: new Date().toISOString(),
      },
      {
        id: `comment_${this.userId}_fallback_3`,
        text: "Almost done creating your persona! ⚡",
        category: 'general',
        timestamp: new Date().toISOString(),
      },
    ];
  }
}
