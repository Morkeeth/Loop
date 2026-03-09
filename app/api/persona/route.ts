import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { rateLimit } from '@/lib/rate-limit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  // Rate limit: 5 persona builds per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const limit = rateLimit(ip, { maxRequests: 5, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }

  try {
    const { calendarData } = await request.json();

    if (!calendarData) {
      return NextResponse.json({ error: 'Calendar data required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const systemPromptPath = path.join(process.cwd(), 'loop-system-prompt.md');
    if (!fs.existsSync(systemPromptPath)) {
      return NextResponse.json({ error: 'System prompt file not found' }, { status: 500 });
    }

    const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');
    const cleanSystemPrompt = systemPrompt
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/#+\s*/g, '')
      .replace(/\*\*/g, '')
      .trim();

    let response;
    try {
      response = await openai.chat.completions.create({
        model: process.env.OPENAI_PERSONA_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: cleanSystemPrompt },
          { role: 'user', content: JSON.stringify(calendarData) },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });
    } catch (openaiError: any) {
      if (openaiError.code === 'insufficient_quota') {
        return NextResponse.json({
          persona_summary_120: 'Calendar connected — we need a working API key to build your persona.',
          profile: {},
          isFallback: true,
          error: 'OpenAI quota exceeded.',
        });
      }

      if (openaiError.code === 'context_length_exceeded') {
        response = await openai.chat.completions.create({
          model: process.env.OPENAI_PERSONA_FALLBACK_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: cleanSystemPrompt },
            { role: 'user', content: JSON.stringify(calendarData) },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        });
      } else if (openaiError.status === 429) {
        throw new Error('OpenAI API quota exceeded. Please try again later.');
      } else {
        throw openaiError;
      }
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    let jsonContent = content.trim()
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '');

    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonContent = jsonMatch[0];

    const persona = JSON.parse(jsonContent);
    return NextResponse.json(persona);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to generate persona',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
