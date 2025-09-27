import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { digestId, content } = await request.json();

    if (!digestId || !content) {
      return NextResponse.json(
        { error: 'Digest ID and content are required' },
        { status: 400 }
      );
    }

    // Check if ElevenLabs API key is configured
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Generate audio using ElevenLabs
    const audioResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/kENkNtk0xyzG09WW40xE', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: content,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
    });

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error('ElevenLabs API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate audio from ElevenLabs' },
        { status: 500 }
      );
    }

    // Convert audio response to base64 for storage
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Update digest with audio URL
    // In production, you'd store this in a database
    // For now, we'll return the data URL directly
    return NextResponse.json({
      audioUrl: audioDataUrl,
      digestId,
    });

  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
