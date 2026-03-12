import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { persona, userApiKey } = await request.json();

    if (!persona) {
      return NextResponse.json(
        { error: 'Persona data required' },
        { status: 400 }
      );
    }

    const hasUserKey = Boolean(userApiKey?.trim());
    const apiKey = hasUserKey ? userApiKey.trim() : process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // User key gets premium model, app key gets cheap model
    const model = hasUserKey
      ? (process.env.OPENAI_PERSONA_MODEL || 'gpt-4o')
      : (process.env.OPENAI_PERSONA_FALLBACK_MODEL || 'gpt-4o-mini');

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a poetic observer of human patterns. Given structured persona data extracted from someone's Google Calendar, write a beautiful markdown personality artifact.

This is their mirror — a document that makes them feel deeply seen.

Structure it as:

# Your Loop

A one-line poetic opener.

## Who You Are
2-3 sentences capturing their professional identity and how they move through the world.

## Your Rhythms
Their daily patterns — when they rise, when they focus, when they rest. Written like observing a tide.

## What Moves You
Their interests, hobbies, sports, entertainment — what lights them up. Be specific to their data.

## Your Social World
How they connect — frequent contacts (first names only), social patterns, relationship dynamics.

## The Quiet Parts
Inferred personality traits, stress indicators, what they might not see about themselves. Be gentle but honest.

## Your Wishes
What you're reaching for — inferred from the gaps, the new things appearing on your calendar, the directions you're leaning. What does this person secretly want more of? What life are they building toward? Be bold but kind. These are the dreams between the lines.

## Your Week in One Breath
A single flowing sentence that captures a typical week from Monday to Sunday.

---

*Loop confidence: X% — based on N months of calendar data.*

RULES:
- Write in second person ("you")
- Be warm, specific, never generic
- Use the actual data — real hobbies, real patterns, real locations, real city
- The location matters — weave their city into the prose, it shapes who they are
- Keep it under 600 words total
- No bullet points — flowing prose only
- The markdown should be beautiful when rendered`
        },
        {
          role: 'user',
          content: JSON.stringify(persona)
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    return NextResponse.json({ markdown: content.trim() });

  } catch (error) {
    console.error('Artifact generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate personality artifact',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
