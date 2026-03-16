import { NextRequest, NextResponse } from 'next/server';
import { saveFeedback, getFeedback, type EventFeedback } from '@/lib/kv-store';

export async function POST(request: NextRequest) {
  const userId = request.cookies.get('loop_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { eventTitle, category, feedback } = await request.json();

    if (!eventTitle || !feedback || !['up', 'down'].includes(feedback)) {
      return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });
    }

    const entry: EventFeedback = {
      userId,
      eventTitle,
      category: category || 'unknown',
      feedback,
      timestamp: new Date().toISOString(),
    };

    await saveFeedback(userId, entry);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const userId = request.cookies.get('loop_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const feedback = await getFeedback(userId);
    return NextResponse.json({ feedback });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
