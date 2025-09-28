import { NextRequest, NextResponse } from 'next/server';
import { storeDigest, updateDigestAudio } from '@/lib/digest-storage';

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

    // Clean content for speech-to-text (remove URLs and audio links)
    const cleanContent = content
      .replace(/🎧 Listen To Your Digest: \S+/g, '') // Remove audio link line
      .replace(/https?:\/\/[^\s]+/g, '') // Remove all URLs
      .replace(/\s+/g, ' ') // Clean up extra whitespace
      .trim();

    // Add French accent tag to the cleaned content for v3 alpha model
    const contentWithFrenchAccent = `[French accent] [warmly] ${cleanContent}`;

    // Generate audio using ElevenLabs with French accent voice
    const audioResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/sa2z6gEuOalzawBHvrCV', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: contentWithFrenchAccent,
        model_id: 'eleven_v3',
        voice_settings: {
          stability: 0.5,
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
    updateDigestAudio(digestId, audioDataUrl);

    storeDigest(digestId, content, audioDataUrl);

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
