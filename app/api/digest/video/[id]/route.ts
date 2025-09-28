import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for video records (in production, use a database)
const videoStorage = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const videoRecord = await request.json();
    
    if (!videoRecord.id || !videoRecord.videoUrl) {
      return NextResponse.json(
        { error: 'Invalid video record' },
        { status: 400 }
      );
    }

    // Store the video record
    videoStorage.set(videoRecord.id, videoRecord);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Video storage error:', error);
    return NextResponse.json(
      { error: 'Failed to store video record' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const videoRecord = videoStorage.get(videoId);
    
    if (!videoRecord) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(videoRecord);
  } catch (error) {
    console.error('Video retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve video' },
      { status: 500 }
    );
  }
}
