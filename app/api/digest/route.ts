import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storeDigest } from '@/lib/digest-storage';

import { DigestContext } from '@/types/digest-context';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { digestContext, promptTemplate, personaText, recentCalendarJson } = await request.json();
    console.log('Received digest request:', {
      hasDigestContext: !!digestContext,
      hasPersona: !!digestContext?.persona,
      hasCalendarTrends: !!digestContext?.calendarTrends,
      personaKeys: digestContext?.persona ? Object.keys(digestContext.persona) : []
    });

    if (!digestContext?.persona && (!personaText || !recentCalendarJson || !promptTemplate)) {
      return NextResponse.json(
        { error: 'Provide either digestContext.persona or explicit personaText + recentCalendarJson + promptTemplate' },
        { status: 400 }
      );
    }

    const resolvedPersonaText = personaText || JSON.stringify(digestContext.persona, null, 2);
    const resolvedRecentJson = recentCalendarJson || JSON.stringify(digestContext.recent_calendar_json ?? [], null, 2);
    const resolvedPromptTemplate = promptTemplate || `Run the Sunday digest.

Persona description:
{{persona_text}}

Recent Calendar JSON:
{{recent_calendar_json}}`;

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Read the digest prompt
    const digestPromptPath = path.join(process.cwd(), 'digest-prompt.md');
    console.log('Reading digest prompt from:', digestPromptPath);
    
    if (!fs.existsSync(digestPromptPath)) {
      console.error('Digest prompt file not found:', digestPromptPath);
      return NextResponse.json(
        { error: 'Digest prompt file not found' },
        { status: 500 }
      );
    }
    
    const systemPrompt = fs.readFileSync(digestPromptPath, 'utf8');
    console.log('Digest prompt loaded, length:', systemPrompt.length);

    // Create user prompt with digest context
    const promptBody = resolvedPromptTemplate
      .replace('{{persona_text}}', resolvedPersonaText)
      .replace('{{recent_calendar_json}}', resolvedRecentJson);

    const userPrompt = `You are Loop Radio. Follow digest-prompt.md instructions exactly.

${promptBody}`;

    console.log('User prompt size:', userPrompt.length, 'characters');
    console.log('System prompt size:', systemPrompt.length, 'characters');

    console.log('Attempting to generate digest with gpt-4o...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    console.log('OpenAI response received');

    const outputText = response.choices[0]?.message?.content || '';

    if (!outputText || !outputText.trim()) {
      throw new Error('No text output returned from GPT-4o response');
    }

    console.log('Digest generated successfully, length:', outputText.length);

    // Generate unique ID for this digest
    const digestId = uuidv4();
    
    // Create digest record for audio generation
    const digestRecord = {
      id: digestId,
      content: outputText,
      createdAt: new Date().toISOString(),
    };

    // Store digest record using the digest storage
    try {
      storeDigest(digestId, outputText);
      console.log('Digest stored successfully with ID:', digestId);
    } catch (error) {
      console.error('Failed to store digest record:', error);
    }

    return NextResponse.json({
      content: outputText,
      digestId,
      audioUrl: `/digest/audio/${digestId}`,
      usage: (response as any).usage,
      metadata: {
        reasoning: (response as any).reasoning,
        includes: (response as any).included,
      },
    });

  } catch (error) {
    console.error('Digest generation error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate digest',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
