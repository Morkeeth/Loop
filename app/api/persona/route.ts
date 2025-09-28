import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { calendarData } = await request.json();
    console.log('Received calendar data:', JSON.stringify(calendarData, null, 2));

    if (!calendarData) {
      return NextResponse.json(
        { error: 'Calendar data required' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Read the system prompt from the markdown file
    const systemPromptPath = path.join(process.cwd(), 'loop-system-prompt.md');
    console.log('Reading system prompt from:', systemPromptPath);
    
    if (!fs.existsSync(systemPromptPath)) {
      console.error('System prompt file not found:', systemPromptPath);
      return NextResponse.json(
        { error: 'System prompt file not found' },
        { status: 500 }
      );
    }
    
    const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');
    console.log('System prompt loaded, length:', systemPrompt.length);
    
    // Clean the system prompt - remove markdown formatting for better AI processing
    const cleanSystemPrompt = systemPrompt
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/#+\s*/g, '')
      .replace(/\*\*/g, '')
      .trim();

    // Call OpenAI GPT-4o with the system prompt and calendar data (larger context window)
    console.log('Calling OpenAI API...');
    console.log('Calendar data size:', JSON.stringify(calendarData).length, 'characters');
    console.log('System prompt size:', cleanSystemPrompt.length, 'characters');
    
    // Check context length for GPT-4o (128k tokens)
    const totalContentLength = cleanSystemPrompt.length + JSON.stringify(calendarData).length;
    const estimatedTokens = Math.ceil(totalContentLength / 4);
    console.log(`Estimated token usage: ${estimatedTokens}`);
    
    if (estimatedTokens > 100000) { // Conservative limit for GPT-4o
      console.warn(`High token usage detected (${estimatedTokens}), consider reducing calendar data`);
    }
    
    let response;
    try {
      console.log('Making OpenAI request with model:', process.env.OPENAI_PERSONA_MODEL || 'gpt-4o');
      console.log('System prompt preview:', cleanSystemPrompt.substring(0, 200) + '...');
      console.log('User content preview:', JSON.stringify(calendarData).substring(0, 200) + '...');
      
      response = await openai.chat.completions.create({
        model: process.env.OPENAI_PERSONA_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: cleanSystemPrompt
          },
          {
            role: 'user',
            content: JSON.stringify(calendarData)
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });
    } catch (openaiError: any) {
      if (openaiError.code === 'insufficient_quota') {
        console.log('OpenAI quota exceeded, using fallback persona...');
        // Return a fallback persona when quota is exceeded
        return NextResponse.json({
          persona: {
            name: "Default User",
            working_style: "Productive professional",
            communication_preference: "Direct and efficient",
            meeting_patterns: "Regular business hours",
            energy_levels: "High energy in mornings",
            focus_areas: "Work, personal development, health",
            social_preferences: "Balanced social and solo time",
            learning_style: "Hands-on and practical",
            stress_indicators: "Over-scheduling, lack of breaks",
            optimal_conditions: "Quiet environment, clear goals",
            time_management: "Structured and organized",
            collaboration_style: "Team-oriented",
            decision_making: "Data-driven and analytical",
            feedback_preference: "Constructive and specific",
            work_life_balance: "Clear boundaries between work and personal time"
          },
          isFallback: true,
          error: "OpenAI quota exceeded. Using default persona.",
          originalError: openaiError.message
        });
      }
      
      if (openaiError.code === 'context_length_exceeded') {
        console.log('Context length exceeded with GPT-4o, trying with GPT-4o-mini...');
        // Try with GPT-4o-mini as fallback
        response = await openai.chat.completions.create({
          model: process.env.OPENAI_PERSONA_FALLBACK_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: cleanSystemPrompt
            },
            {
              role: 'user',
              content: JSON.stringify(calendarData)
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        });
      } else if (openaiError.status === 429) {
        console.error('OpenAI API quota exceeded (429 error)');
        throw new Error('OpenAI API quota exceeded. Please check your billing details and try again later.');
      } else {
        throw openaiError;
      }
    }
    
    console.log('OpenAI response received');
    console.log('Response structure:', JSON.stringify(response, null, 2));

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('No content in OpenAI response');
      console.error('Response choices:', response.choices);
      console.error('Response usage:', response.usage);
      throw new Error(`No response content from OpenAI. Response: ${JSON.stringify(response)}`);
    }

    // Extract JSON from the response
    let jsonContent = content.trim();
    
    // Remove any markdown code blocks
    jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to find JSON object in the response
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
    
    console.log('Extracted JSON content:', jsonContent.substring(0, 200) + '...');

    // Parse the JSON response
    let persona;
    try {
      persona = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', content);
      console.error('Processed content:', jsonContent);
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    return NextResponse.json(persona);

  } catch (error) {
    console.error('Persona generation error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate persona',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
