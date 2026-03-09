import { NextRequest, NextResponse } from 'next/server';
import { updateUser } from '@/lib/kv-store';

export async function POST(request: NextRequest) {
  const userId = request.cookies.get('loop_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { persona, city, tags, timezone } = await request.json();

    const updated = await updateUser(userId, {
      ...(persona ? { persona } : {}),
      ...(city ? { city } : {}),
      ...(tags ? { tags } : {}),
      ...(timezone ? { timezone } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save persona' }, { status: 500 });
  }
}
