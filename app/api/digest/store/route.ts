import { NextRequest, NextResponse } from 'next/server';
import { storeDigest } from '@/lib/digest-storage';

export async function POST(request: NextRequest) {
  try {
    const { digestId, content, audioUrl } = await request.json();
    
    if (!digestId || !content) {
      return NextResponse.json(
        { error: 'Digest ID and content are required' },
        { status: 400 }
      );
    }
    
    storeDigest(digestId, content, audioUrl);
    
    return NextResponse.json({
      success: true,
      digestId,
      message: 'Digest stored successfully'
    });
  } catch (error) {
    console.error('Error storing digest:', error);
    return NextResponse.json(
      { error: 'Failed to store digest' },
      { status: 500 }
    );
  }
}
