import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { discoverEvent } from '@/lib/discover';
import { updateUser, getFeedback, getCategoryPreferences, saveDiscoveredEvent, type StoredEvent } from '@/lib/kv-store';

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

    // Load past feedback to improve picks
    const userId = request.cookies.get('loop_user_id')?.value;
    let feedbackSignals: { liked: string[]; disliked: string[]; preferredCategories?: string[]; avoidCategories?: string[] } | undefined;
    if (userId) {
      try {
        const [history, catPrefs] = await Promise.all([
          getFeedback(userId),
          getCategoryPreferences(userId),
        ]);
        if (history.length > 0) {
          feedbackSignals = {
            liked: history.filter(f => f.feedback === 'up').map(f => `${f.eventTitle} (${f.category})`).slice(0, 10),
            disliked: history.filter(f => f.feedback === 'down').map(f => `${f.eventTitle} (${f.category})`).slice(0, 10),
          };
        }
        // Add category preferences from aggregated feedback
        const sorted = Object.entries(catPrefs).sort(([, a], [, b]) => b.net - a.net);
        const preferred = sorted.filter(([, v]) => v.net > 0).map(([k]) => k);
        const avoid = sorted.filter(([, v]) => v.net < 0).map(([k]) => k);
        if (preferred.length || avoid.length) {
          feedbackSignals = feedbackSignals || { liked: [], disliked: [] };
          feedbackSignals.preferredCategories = preferred;
          feedbackSignals.avoidCategories = avoid;
        }
      } catch {}
    }

    const result = await discoverEvent(persona, {
      provider,
      apiKey: userApiKey,
      model: userModel,
      feedback: feedbackSignals,
    });

    // Persist event to Redis for returning user experience
    if (userId && result.event) {
      const e = result.event;
      const stored: StoredEvent = {
        event_title: e.event_title || e.title || '',
        venue: e.venue || '',
        address: e.address || '',
        date: e.date || '',
        time: e.time || e.start_time || '',
        end_time: e.end_time || '',
        description: e.description || '',
        url: e.url || e.link || '',
        category: e.category || '',
        why_this: e.why_this || e.why || '',
        discovered_at: '',
        week_key: '',
      };
      Promise.all([
        saveDiscoveredEvent(userId, stored),
        updateUser(userId, { last_event_at: new Date().toISOString() }),
      ]).catch(() => {});
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to discover event', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
