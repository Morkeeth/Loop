import { NextRequest, NextResponse } from 'next/server';
import { getUser, getCurrentEvent, getEventHistory, getCategoryPreferences } from '@/lib/kv-store';

export async function GET(request: NextRequest) {
  const userId = request.cookies.get('loop_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [currentEvent, eventHistory, categoryPreferences] = await Promise.all([
      getCurrentEvent(userId),
      getEventHistory(userId),
      getCategoryPreferences(userId),
    ]);

    return NextResponse.json({
      hasPersona: Boolean(user.persona),
      persona: user.persona || null,
      city: user.city || null,
      tags: user.tags || [],
      currentEvent: currentEvent || null,
      eventHistory: eventHistory || [],
      categoryPreferences,
      lastEventAt: user.last_event_at || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load state', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
