import { NextRequest, NextResponse } from 'next/server';
import { PersonaGenerator } from '@/lib/persona-generator';
import { ProcessedEvent } from '@/types/calendar';

export async function POST(request: NextRequest) {
  try {
    const { events, userId } = await request.json();

    if (!events || !userId) {
      return NextResponse.json(
        { error: 'Events data and userId required' },
        { status: 400 }
      );
    }

    const personaGenerator = new PersonaGenerator(events, userId);
    
    // Generate persona only (loading comments are now generated locally)
    const persona = await personaGenerator.generatePersona();

    return NextResponse.json({
      success: true,
      persona
    });

  } catch (error) {
    console.error('Persona generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate persona' },
      { status: 500 }
    );
  }
}
