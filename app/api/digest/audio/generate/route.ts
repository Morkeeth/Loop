import { NextRequest, NextResponse } from 'next/server';
import { cleanContentForSpeech } from '@/lib/content-cleaner';

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

    // Clean content for speech-to-text (remove all non-readable elements)
    console.log('Original content length:', content.length);
    console.log('Original content preview:', content.substring(0, 200) + '...');
    
    const cleanContent = cleanContentForSpeech(content);

    console.log('Cleaned content length:', cleanContent.length);
    console.log('Cleaned content preview:', cleanContent.substring(0, 200) + '...');

    // Validate that we have content after cleaning
    if (!cleanContent || cleanContent.trim().length === 0) {
      console.error('No readable content remaining after cleaning');
      return NextResponse.json(
        { error: 'No readable content found for audio generation' },
        { status: 400 }
      );
    }

    // Check content length (ElevenLabs has limits)
    const maxLength = 5000; // Conservative limit for ElevenLabs
    if (cleanContent.length > maxLength) {
      console.warn(`Content too long (${cleanContent.length} chars), truncating to ${maxLength}`);
      const truncatedContent = cleanContent.substring(0, maxLength) + '...';
      console.log('Using truncated content for audio generation');
      
      // Add French accent tag to the truncated content
      const contentWithFrenchAccent = `[French accent] [warmly] ${truncatedContent}`;
      
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
        console.error('ElevenLabs API error (truncated content):', {
          status: audioResponse.status,
          statusText: audioResponse.statusText,
          error: errorText
        });
        
        let errorMessage = 'Failed to generate audio from ElevenLabs';
        if (audioResponse.status === 401) {
          errorMessage = 'ElevenLabs API key is invalid or expired';
        } else if (audioResponse.status === 429) {
          errorMessage = 'ElevenLabs API rate limit exceeded, please try again later';
        } else if (audioResponse.status === 400) {
          errorMessage = 'Invalid request to ElevenLabs API - content may be too long or invalid';
        } else if (audioResponse.status >= 500) {
          errorMessage = 'ElevenLabs API server error, please try again later';
        }
        
        return NextResponse.json(
          { error: errorMessage, details: errorText },
          { status: 500 }
        );
      }

      // Convert audio response to base64 for storage
      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

      return NextResponse.json({
        audioUrl: audioDataUrl,
        digestId,
        truncated: true,
        originalLength: cleanContent.length,
        truncatedLength: truncatedContent.length
      });
    }

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
      console.error('ElevenLabs API error:', {
        status: audioResponse.status,
        statusText: audioResponse.statusText,
        error: errorText
      });
      
      // Provide more specific error messages based on status codes
      let errorMessage = 'Failed to generate audio from ElevenLabs';
      if (audioResponse.status === 401) {
        errorMessage = 'ElevenLabs API key is invalid or expired';
      } else if (audioResponse.status === 429) {
        errorMessage = 'ElevenLabs API rate limit exceeded, please try again later';
      } else if (audioResponse.status === 400) {
        errorMessage = 'Invalid request to ElevenLabs API - content may be too long or invalid';
      } else if (audioResponse.status >= 500) {
        errorMessage = 'ElevenLabs API server error, please try again later';
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorText },
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
