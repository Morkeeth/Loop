import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storeDigest, updateDigestAudio } from '@/lib/digest-storage';

import { DigestContext } from '@/types/digest-context';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface LogEntry {
  step: string;
  message: string;
  timestamp: string;
  status: 'info' | 'success' | 'warning' | 'error';
  progress?: number;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (log: LogEntry) => {
        const data = `data: ${JSON.stringify(log)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        // Step 1: Parse request
        sendLog({
          step: 'parsing',
          message: 'Parsing digest request...',
          timestamp: new Date().toISOString(),
          status: 'info',
          progress: 5
        });

        const { digestContext, promptTemplate, personaText, recentCalendarJson } = await request.json();
        
        sendLog({
          step: 'validation',
          message: 'Validating request parameters...',
          timestamp: new Date().toISOString(),
          status: 'info',
          progress: 10
        });

        if (!digestContext?.persona && (!personaText || !recentCalendarJson || !promptTemplate)) {
          sendLog({
            step: 'validation',
            message: 'Missing required parameters',
            timestamp: new Date().toISOString(),
            status: 'error',
            progress: 10
          });
          controller.close();
          return;
        }

        // Step 2: Prepare data
        sendLog({
          step: 'preparation',
          message: 'Preparing persona and calendar data...',
          timestamp: new Date().toISOString(),
          status: 'info',
          progress: 15
        });

        const resolvedPersonaText = personaText || JSON.stringify(digestContext.persona, null, 2);
        const resolvedRecentJson = recentCalendarJson || JSON.stringify(digestContext.recent_calendar_json ?? [], null, 2);
        const resolvedPromptTemplate = promptTemplate || `Run the Sunday digest.

Persona description:
{{persona_text}}

Recent Calendar JSON:
{{recent_calendar_json}}`;

        // Step 3: Check API key
        sendLog({
          step: 'auth',
          message: 'Verifying OpenAI API key...',
          timestamp: new Date().toISOString(),
          status: 'info',
          progress: 20
        });

        if (!process.env.OPENAI_API_KEY) {
          sendLog({
            step: 'auth',
            message: 'OpenAI API key not configured',
            timestamp: new Date().toISOString(),
            status: 'error',
            progress: 20
          });
          controller.close();
          return;
        }

        sendLog({
          step: 'auth',
          message: 'API key verified successfully',
          timestamp: new Date().toISOString(),
          status: 'success',
          progress: 25
        });

        // Step 4: Load digest prompt
        sendLog({
          step: 'prompt',
          message: 'Loading digest prompt template...',
          timestamp: new Date().toISOString(),
          status: 'info',
          progress: 30
        });

        const digestPromptPath = path.join(process.cwd(), 'digest-prompt.md');
        
        if (!fs.existsSync(digestPromptPath)) {
          sendLog({
            step: 'prompt',
            message: 'Digest prompt file not found',
            timestamp: new Date().toISOString(),
            status: 'error',
            progress: 30
          });
          controller.close();
          return;
        }
        
        const systemPrompt = fs.readFileSync(digestPromptPath, 'utf8');
        
        sendLog({
          step: 'prompt',
          message: `Loaded prompt template (${systemPrompt.length} characters)`,
          timestamp: new Date().toISOString(),
          status: 'success',
          progress: 35
        });

        // Step 5: Build prompts
        sendLog({
          step: 'build',
          message: 'Building user prompt with persona and calendar data...',
          timestamp: new Date().toISOString(),
          status: 'info',
          progress: 40
        });

        const promptBody = resolvedPromptTemplate
          .replace('{{persona_text}}', resolvedPersonaText)
          .replace('{{recent_calendar_json}}', resolvedRecentJson);

        const userPrompt = `You are Loop Radio. Follow digest-prompt.md instructions exactly.

${promptBody}`;

        sendLog({
          step: 'build',
          message: `Built prompts - System: ${systemPrompt.length} chars, User: ${userPrompt.length} chars`,
          timestamp: new Date().toISOString(),
          status: 'success',
          progress: 45
        });

        // Step 6: Initialize GPT-5 request
        sendLog({
          step: 'gpt5',
          message: 'Initializing GPT-5 request with web search capabilities...',
          timestamp: new Date().toISOString(),
          status: 'info',
          progress: 50
        });

        // Step 7: Make API call
        sendLog({
          step: 'gpt5',
          message: 'Sending request to GPT-5 Responses API...',
          timestamp: new Date().toISOString(),
          status: 'info',
          progress: 60
        });

        const response = await openai.responses.create({
          model: 'gpt-5',
          input: [
            {
              role: 'developer',
              content: [
                {
                  type: 'input_text',
                  text: systemPrompt,
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: userPrompt,
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'text',
            },
            verbosity: 'medium',
          },
          reasoning: {
            effort: 'medium',
          },
          tools: [
            {
              type: 'web_search',
              user_location: {
                type: 'approximate',
              },
              search_context_size: 'medium',
            },
          ],
          store: true,
          include: ['reasoning.encrypted_content', 'web_search_call.action.sources'] as any,
        });

        sendLog({
          step: 'gpt5',
          message: 'GPT-5 response received, processing output...',
          timestamp: new Date().toISOString(),
          status: 'success',
          progress: 80
        });

        // Step 8: Process response
        sendLog({
          step: 'process',
          message: 'Extracting and validating digest content...',
          timestamp: new Date().toISOString(),
          status: 'info',
          progress: 85
        });

        const outputText =
          (response as any).output_text ||
          ((response as any).output
            ?.map((item: any) =>
              item.content
                ?.map((chunk: any) =>
                  typeof chunk.text === 'string'
                    ? chunk.text
                    : chunk.text?.value ?? ''
                )
                .join('')
            )
            .join(''));

        if (!outputText || !outputText.trim()) {
          sendLog({
            step: 'process',
            message: 'No text output returned from GPT-5 response',
            timestamp: new Date().toISOString(),
            status: 'error',
            progress: 85
          });
          controller.close();
          return;
        }

        sendLog({
          step: 'process',
          message: `Digest content extracted (${outputText.length} characters)`,
          timestamp: new Date().toISOString(),
          status: 'success',
          progress: 90
        });

        // Step 9: Generate unique ID and store
        sendLog({
          step: 'storage',
          message: 'Generating unique digest ID and storing record...',
          timestamp: new Date().toISOString(),
          status: 'info',
          progress: 95
        });

        const digestId = uuidv4();
        const audioUrl = `/digest/audio/${digestId}`;
        
        // Prepend audio link to the digest content
        const contentWithAudioLink = `🎧 Listen To Your Digest: ${audioUrl}

${outputText}`;
        
        const digestRecord = {
          id: digestId,
          content: contentWithAudioLink,
          createdAt: new Date().toISOString(),
        };

        try {
          storeDigest(digestId, contentWithAudioLink, audioUrl);

          sendLog({
            step: 'storage',
            message: 'Digest record stored successfully',
            timestamp: new Date().toISOString(),
            status: 'success',
            progress: 98
          });
        } catch (error) {
          sendLog({
            step: 'storage',
            message: 'Failed to store digest record (audio feature may not work)',
            timestamp: new Date().toISOString(),
            status: 'warning',
            progress: 98
          });
        }

        // Step 10: Complete
        sendLog({
          step: 'complete',
          message: 'Digest generation completed successfully!',
          timestamp: new Date().toISOString(),
          status: 'success',
          progress: 100
        });

        // Send final result
        const finalResult = {
          step: 'result',
          data: {
            content: contentWithAudioLink,
            digestId,
            audioUrl,
            usage: (response as any).usage,
            metadata: {
              reasoning: (response as any).reasoning,
              includes: (response as any).included,
            },
          },
          timestamp: new Date().toISOString(),
          status: 'success',
          progress: 100
        };

        const resultData = `data: ${JSON.stringify(finalResult)}\n\n`;
        controller.enqueue(encoder.encode(resultData));
        controller.close();

      } catch (error) {
        sendLog({
          step: 'error',
          message: `Digest generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          status: 'error',
          progress: 0
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
