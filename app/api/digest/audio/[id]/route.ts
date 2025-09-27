import { NextRequest, NextResponse } from 'next/server';
import { getDigest, storeDigest } from '@/lib/digest-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: digestId } = await params;
    const digest = getDigest(digestId);

    if (!digest) {
      return NextResponse.json(
        { error: 'Digest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(digest);
  } catch (error) {
    console.error('Error fetching digest:', error);
    return NextResponse.json(
      { error: 'Failed to fetch digest' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: digestId } = await params;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    storeDigest(digestId, content);

    return NextResponse.json({
      id: digestId,
      content,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating digest:', error);
    return NextResponse.json(
      { error: 'Failed to create digest' },
      { status: 500 }
    );
  }
}
