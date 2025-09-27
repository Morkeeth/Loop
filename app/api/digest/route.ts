import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

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

    // Call OpenAI with web browsing capabilities (GPT-4o-mini first for higher token limits, then fallback)
    let response;
    const models = ['gpt-4o-mini', 'gpt-4o']; // Start with GPT-4o-mini for higher token limits
    
    for (const model of models) {
      try {
        console.log(`Attempting to generate digest with ${model}...`);
        
        // Use different parameters based on model
        const requestParams: any = {
          model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
        };

        // Set parameters for all models
        requestParams.max_tokens = 4000;
        requestParams.temperature = 0.7;

        response = await openai.chat.completions.create(requestParams);
        
        console.log(`Successfully generated digest with ${model}`);
        break; // Success, exit the loop
        
      } catch (openaiError: any) {
        console.log(`Failed with ${model}:`, openaiError.message);
        console.log(`Error details:`, {
          code: openaiError.code,
          type: openaiError.type,
          param: openaiError.param,
          status: openaiError.status,
          fullError: openaiError
        });
        
        if (openaiError.code === 'context_length_exceeded' || 
            openaiError.code === 'model_not_found' ||
            openaiError.code === 'unsupported_parameter' ||
            openaiError.code === 'unsupported_value' ||
            openaiError.code === 'rate_limit_exceeded' ||
            openaiError.message.includes('not available') ||
            openaiError.message.includes('not supported') ||
            openaiError.message.includes('Request too large')) {
          console.log(`Model ${model} not available or parameter issue, trying next model...`);
          continue; // Try next model
        } else {
          throw openaiError; // Re-throw if it's not a model availability issue
        }
      }
    }
    
    if (!response) {
      throw new Error('All models failed to generate digest');
    }
    
    console.log('OpenAI response received');

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('Digest generated successfully, length:', content.length);

    return NextResponse.json({
      content: content,
      usage: response.usage
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
