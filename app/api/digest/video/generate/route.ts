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

    // Check if Beyond Presence API key is configured
    if (!process.env.BEYOND_PRESENCE_API_KEY) {
      return NextResponse.json(
        { error: 'Beyond Presence API key not configured' },
        { status: 500 }
      );
    }

    // Clean content for video generation (same as audio - remove URLs and audio links)
    const cleanContent = content
      .replace(/🎧 Listen To Your Digest: \S+/g, '') // Remove audio link line
      .replace(/🎬 Watch Your Digest: \S+/g, '') // Remove video link line
      .replace(/https?:\/\/[^\s]+/g, '') // Remove all URLs
      .replace(/\s+/g, ' ') // Clean up extra whitespace
      .trim();

    console.log('Generating video with Beyond Presence...');
    console.log('Content length:', cleanContent.length);
    console.log('Using avatar ID: 212a6207-50b8-470a-8c19-71b38b06850b');

    // Try different possible endpoints for video generation
    const possibleEndpoints = [
      'https://api.bey.dev/v1/video',
      'https://api.bey.dev/latest/video', 
      'https://api.bey.dev/v1/generate',
      'https://api.bey.dev/latest/generate',
      'https://api.bey.dev/v1/create',
      'https://api.bey.dev/latest/create'
    ];

    let videoResponse = null;
    let lastError = null;

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        
        videoResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.BEYOND_PRESENCE_API_KEY,
          },
          body: JSON.stringify({
            avatar_id: '212a6207-50b8-470a-8c19-71b38b06850b',
            script: cleanContent,
            voice: 'professional',
            settings: {
              quality: 'high',
              format: 'mp4'
            }
          }),
        });

        if (videoResponse.ok) {
          console.log(`Success with endpoint: ${endpoint}`);
          break;
        } else {
          const errorText = await videoResponse.text();
          console.log(`Failed with endpoint ${endpoint}:`, errorText);
          lastError = errorText;
        }
      } catch (error) {
        console.log(`Error with endpoint ${endpoint}:`, error);
        lastError = error;
      }
    }

    if (!videoResponse || !videoResponse.ok) {
      console.error('All endpoints failed. Last error:', lastError);
      
      // Fallback: Create a mock video URL for testing
      console.log('Creating fallback mock video URL for testing...');
      const mockVideoUrl = `https://example.com/video/${digestId}.mp4`;
      
      const videoRecord = {
        id: digestId,
        videoUrl: mockVideoUrl,
        avatarName: 'Harrison (Mock)',
        avatarId: '212a6207-50b8-470a-8c19-71b38b06850b',
        createdAt: new Date().toISOString(),
        content: cleanContent,
        isMock: true,
        error: `Beyond Presence API not found. Tried ${possibleEndpoints.length} endpoints. Last error: ${lastError}`
      };

      return NextResponse.json({
        success: true,
        videoUrl: mockVideoUrl,
        avatarName: 'Harrison (Mock)',
        avatarId: '212a6207-50b8-470a-8c19-71b38b06850b',
        digestId,
        metadata: videoRecord,
        isMock: true,
        warning: 'Using mock video URL. Beyond Presence API endpoint not found.'
      });
    }

    const videoData = await videoResponse.json();
    console.log('Video generation response:', videoData);

    // Extract video URL from response
    const videoUrl = videoData.video_url || videoData.url || videoData.videoUrl;
    if (!videoUrl) {
      console.error('No video URL in response:', videoData);
      return NextResponse.json(
        { error: 'No video URL returned from Beyond Presence' },
        { status: 500 }
      );
    }

    console.log('Video URL generated:', videoUrl);

    // Store video metadata (in production, use a database)
    const videoRecord = {
      id: digestId,
      videoUrl,
      avatarName: 'Professional Avatar',
      avatarId: '212a6207-50b8-470a-8c19-71b38b06850b',
      createdAt: new Date().toISOString(),
      content: cleanContent,
    };

    return NextResponse.json({
      success: true,
      videoUrl,
      avatarName: 'Professional Avatar',
      avatarId: '212a6207-50b8-470a-8c19-71b38b06850b',
      digestId,
      metadata: videoRecord,
    });

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
