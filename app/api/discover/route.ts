import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { discoverEvent } from '@/lib/discover';
import { updateUser } from '@/lib/kv-store';

export async function POST(request: NextRequest) {
  // Rate limit: 5 discover calls per minute per IP (this is the expensive one)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const limit = rateLimit(ip, { maxRequests: 5, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { persona, provider, apiKey: userApiKey, model: userModel } = body;

    if (!persona) {
      return NextResponse.json({ error: 'Persona data required' }, { status: 400 });
    }

    const result = await discoverEvent(persona, {
      provider,
      apiKey: userApiKey,
      model: userModel,
    });

    // Track last event discovery time in KV
    const userId = request.cookies.get('loop_user_id')?.value;
    if (userId) {
      updateUser(userId, { last_event_at: new Date().toISOString() }).catch(() => {});
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to discover event', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
