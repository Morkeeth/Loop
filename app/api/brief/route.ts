import { NextRequest, NextResponse } from 'next/server';
import { BriefGenerator } from '@/lib/brief-generator';
import { PersonaProfile, ProcessedEvent } from '@/types/brief';

export async function POST(request: NextRequest) {
  try {
    const { persona, events, userId } = await request.json();

    if (!persona || !events || !userId) {
      return NextResponse.json(
        { error: 'Persona, events data, and userId required' },
        { status: 400 }
      );
    }

    const briefGenerator = new BriefGenerator(persona, events, userId);
    const brief = await briefGenerator.generateBrief();

    return NextResponse.json({
      success: true,
      brief
    });

  } catch (error) {
    console.error('Brief generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate morning brief' },
      { status: 500 }
    );
  }
}
