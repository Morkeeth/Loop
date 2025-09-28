import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { storeDigest } from '@/lib/digest-storage';

export async function POST(request: NextRequest) {
  try {
    const { personaText, recentCalendarJson, promptTemplate } = await request.json();

    console.log('Generating mock digest...');

    // Generate a mock digest for testing
    const mockDigest = `🎙️ Last week you had a productive time with focused work sessions and some exciting events. The highlight was definitely the Paris AI Hackathon where you sharpened your skills and expanded your network. You maintained good work-life balance with about 10 hours of focused work.

Looking ahead, Wednesday looks like your busiest day with follow-up tasks from the hackathon. Thursday evening appears free for relaxation or personal projects. Consider polishing your hackathon demo into a shareable repository and writing a brief post about your experience.

Global tech news: Judge approves $1.5B Anthropic settlement, marking another milestone in AI development.

That's the broadcast. Enjoy your evening, recharge well, and we'll catch up next Sunday.`;

    const digestId = uuidv4();
    
    const result = {
      digestId,
      content: mockDigest,
      audioUrl: `/digest/audio/${digestId}`,
      createdAt: new Date().toISOString(),
    };

    console.log('Mock digest generated successfully');

    // Persist digest so the audio page `/digest/audio/[id]` can retrieve it
    try {
      storeDigest(digestId, mockDigest);
    } catch (e) {
      console.warn('Failed to store mock digest (audio page may not load):', e);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Digest generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate digest',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
