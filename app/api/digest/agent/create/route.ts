import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { digestContent, persona, calendarData, digestId } = await request.json();

    if (!digestContent || !persona || !calendarData || !digestId) {
      return NextResponse.json(
        { error: 'Digest content, persona, calendar data, and digest ID are required' },
        { status: 400 }
      );
    }

    // Check if Beyond Presence API key is configured
    const apiKey = process.env.BEYOND_PRESENCE_API_KEY;
    if (!apiKey) {
      console.error('Beyond Presence API key not found in environment variables');
      return NextResponse.json(
        { error: 'Beyond Presence API key not configured. Please add BEYOND_PRESENCE_API_KEY to your .env file.' },
        { status: 500 }
      );
    }

    console.log('Creating Beyond Presence agent...');

    // Best-effort: remove any existing agents with the same display name to avoid duplicates
    const TARGET_AGENT_NAME = 'Marcel - Personal Assistant';
    try {
      const listResp = await fetch('https://api.bey.dev/v1/agents', {
        headers: { 'x-api-key': apiKey },
      });
      if (listResp.ok) {
        const listData = await listResp.json();
        const duplicates = Array.isArray(listData)
          ? listData.filter((a: any) => a?.name === TARGET_AGENT_NAME)
          : Array.isArray(listData.items)
            ? listData.items.filter((a: any) => a?.name === TARGET_AGENT_NAME)
            : [];
        for (const agent of duplicates) {
          if (!agent?.id) continue;
          try {
            const delResp = await fetch(`https://api.bey.dev/v1/agents/${agent.id}`, {
              method: 'DELETE',
              headers: { 'x-api-key': apiKey },
            });
            if (delResp.status === 204) {
              console.log('Deleted duplicate agent:', agent.id);
            } else {
              console.warn('Failed to delete duplicate agent', agent.id, delResp.status);
            }
          } catch (e) {
            console.warn('Error deleting duplicate agent', agent.id, e);
          }
        }
      } else {
        console.warn('Could not list agents, skipping duplicate cleanup:', listResp.status, listResp.statusText);
      }
    } catch (e) {
      console.warn('List/delete agents step failed, continuing:', e);
    }

    // Create system prompt for the agent (keep it concise to stay under 10k limit)
    // Include a compact context summary so the agent reliably has the brief/persona/calendar context
    const summarizePersona = () => {
      try {
        const keys = Object.keys(persona || {}).slice(0, 12);
        const small: any = {};
        for (const k of keys) {
          const v = (persona as any)[k];
          small[k] = typeof v === 'string' ? v.slice(0, 400) : v;
        }
        return JSON.stringify(small).slice(0, 1500);
      } catch {
        return '';
      }
    };

    const summarizeCalendar = () => {
      try {
        const events = Array.isArray(calendarData) ? calendarData : [];
        const recent = events
          .filter((e: any) => e?.st || e?.startTime)
          .sort((a: any, b: any) => new Date(b.st || b.startTime).getTime() - new Date(a.st || a.startTime).getTime())
          .slice(0, 12)
          .map((e: any) => {
            const s = new Date(e.st || e.startTime).toISOString();
            const en = e.et || e.endTime ? new Date(e.et || e.endTime).toISOString() : '';
            return `- ${e.s || e.summary || 'Untitled'} (${s}${en ? ' -> ' + en : ''})`;
          })
          .join('\n');
        return recent.slice(0, 1800);
      } catch {
        return '';
      }
    };

    const contextSummaryParts = [
      'Context Summary:',
      persona ? `Persona: ${summarizePersona()}` : '',
      calendarData ? `Recent Calendar (most recent first):\n${summarizeCalendar()}` : '',
      'Use this context to answer follow-up questions after reading the brief.',
    ].filter(Boolean);

    let systemPrompt = `You are Marcel, a personal AI assistant who acts as a mix of a radio host and personal secretary.

Your role:
- Be conversational, warm, and engaging like a radio host
- Provide helpful insights about the user's schedule and personal patterns
- Answer questions about their calendar, upcoming events, and personal preferences
- Offer suggestions and recommendations based on their persona
- Be supportive and encouraging

You have access to the user's Sunday brief, persona summary, and recent calendar events. When the user asks about their schedule, brief, or personal data, you can reference this information to provide personalized assistance.

Guidelines:
- Always be helpful and positive
- Reference specific events or patterns when relevant
- Ask follow-up questions to engage the user
- Provide actionable advice when appropriate
- Keep responses conversational and not too formal
- Focus on being a supportive personal assistant
- If asked about specific data, explain that you have access to their Sunday brief and calendar information`;

    const contextSummary = contextSummaryParts.join('\n');
    // Keep room under the 10k limit
    const MAX_SYSTEM_PROMPT = 9500;
    if (systemPrompt.length + 2 + contextSummary.length <= MAX_SYSTEM_PROMPT) {
      systemPrompt = `${systemPrompt}\n\n${contextSummary}`;
    } else {
      // Append a trimmed version if too long
      const remaining = Math.max(0, MAX_SYSTEM_PROMPT - systemPrompt.length - 2);
      systemPrompt = `${systemPrompt}\n\n${contextSummary.slice(0, remaining)}`;
    }

    console.log('System prompt length:', systemPrompt.length);

    // Create greeting that explicitly starts with the Sunday brief
    const MAX_GREETING_CHARS = 1000;
    const header = "Here's your Sunday brief:\n";
    const continueTail = "\n\nShould I continue?";

    function buildGreetingWithinLimit(): string {
      // 1) Try header + full brief
      let candidate = `${header}${digestContent}`;
      if (candidate.length <= MAX_GREETING_CHARS) {
        return candidate;
      }

      // 2) Truncate brief with header and add prompt to continue
      const maxBriefLen = MAX_GREETING_CHARS - header.length - continueTail.length;
      const safeLen = Math.max(0, maxBriefLen);
      const truncated = digestContent.slice(0, safeLen);
      return `${header}${truncated}${continueTail}`;
    }

    const greeting = buildGreetingWithinLimit();
    console.log('Greeting length:', greeting.length);

    // Store agent data separately to avoid prompt length limits
    // We'll use the Beyond Presence agent ID after creation
    
    // Create agent using Beyond Presence API
    const agentResponse = await fetch('https://api.bey.dev/v1/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        name: 'Marcel - Personal Assistant',
        avatar_id: '212a6207-50b8-470a-8c19-71b38b06850b', // Harrison avatar
        system_prompt: systemPrompt,
        language: 'en-US',
        greeting: greeting,
        max_session_length_minutes: 30,
        capabilities: [],
        llm: {
          type: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.7
        }
      }),
    });

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error('Beyond Presence agent creation error:', {
        status: agentResponse.status,
        statusText: agentResponse.statusText,
        error: errorText
      });
      return NextResponse.json(
        { error: 'Failed to create agent with Beyond Presence', details: errorText },
        { status: 500 }
      );
    }

    const agentData = await agentResponse.json();
    console.log('Agent created successfully:', agentData);

    // Generate PDF knowledge file
    let pdfData = null;
    try {
      const pdfResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/digest/agent/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona,
          calendarData,
          digestContent,
        }),
      });

      if (pdfResponse.ok) {
        pdfData = await pdfResponse.json();
        console.log('PDF knowledge file generated successfully');
      } else {
        console.warn('Failed to generate PDF knowledge file');
      }
    } catch (error) {
      console.warn('Error generating PDF knowledge file:', error);
    }

    // Store agent data using the Beyond Presence agent ID
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/digest/agent/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentData.id,
          digestContent,
          persona,
          calendarData,
          pdfData,
        }),
      });
      console.log('Agent data stored successfully for agent:', agentData.id);
    } catch (error) {
      console.warn('Failed to store agent data:', error);
    }

    // Generate agent URL
    const agentUrl = `https://bey.chat/${agentData.id}`;

    // Store agent metadata
    const agentRecord = {
      id: agentData.id,
      digestId,
      agentUrl,
      name: agentData.name,
      avatarId: agentData.avatar_id,
      createdAt: new Date().toISOString(),
      digestContent,
      persona,
      calendarData
    };

    return NextResponse.json({
      success: true,
      agentId: agentData.id,
      agentUrl,
      digestId,
      metadata: agentRecord,
    });

  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
