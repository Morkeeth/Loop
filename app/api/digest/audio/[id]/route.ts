import { NextRequest, NextResponse } from 'next/server';
import { getDigest } from '@/lib/digest-storage';

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
