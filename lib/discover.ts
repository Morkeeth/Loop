import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  buildSearchPrompt,
  buildPickPrompt,
  buildSingleShotPrompt,
  buildPersonaBlock,
  buildFeedbackBlock,
} from './prompts';

// ─── Step 3: Verify URL ─────────────────────────────────────────

async function verifyUrl(url: string): Promise<boolean> {
  if (!url || url.length < 10) return false;
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    return res.status < 400;
  } catch {
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
        headers: { 'Range': 'bytes=0-0' },
      });
      return res.status < 400;
    } catch {
      return false;
    }
  }
}

// ─── Shared helpers ─────────────────────────────────────────────

export function getDateRange() {
  const today = new Date();
  const daysUntilSunday = (7 - today.getDay()) % 7;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  const weekEnd = new Date(nextSunday);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return `${nextSunday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
}

export function parseJsonFromText(text: string): any {
  let clean = text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const arrayMatch = clean.match(/\[[\s\S]*\]/);
  if (arrayMatch) return JSON.parse(arrayMatch[0]);
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) return JSON.parse(objMatch[0]);
  return JSON.parse(clean);
}

// ─── Provider clients ───────────────────────────────────────────

function getOpenRouterClient() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseURL: 'https://openrouter.ai/api/v1',
  });
}

async function searchWithPerplexity(prompt: string): Promise<any[]> {
  const client = getOpenRouterClient();
  const response = await client.chat.completions.create({
    model: 'perplexity/sonar-pro',
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from Perplexity');
  const parsed = parseJsonFromText(content);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function pickWithOpenAI(prompt: string): Promise<any> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');
  return parseJsonFromText(content);
}

// ─── Legacy single-shot providers (for user-provided keys) ──────

export async function discoverWithOpenAI(prompt: string, apiKey: string, model: string) {
  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.create({
    model,
    tools: [{ type: 'web_search_preview' }],
    input: prompt,
  });

  const content = response.output_text;
  if (!content) throw new Error('No response from OpenAI');
  return parseJsonFromText(content);
}

export async function discoverWithAnthropic(prompt: string, apiKey: string, model: string) {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('No text response from Anthropic');
  return parseJsonFromText(content.text);
}

export async function discoverWithPerplexity(prompt: string, apiKey: string, model: string) {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.perplexity.ai',
  });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from Perplexity');
  return parseJsonFromText(content);
}

// ─── Main discovery function ────────────────────────────────────

export async function discoverEvent(persona: any, options?: {
  provider?: string;
  apiKey?: string;
  model?: string;
  feedback?: { liked: string[]; disliked: string[]; preferredCategories?: string[]; avoidCategories?: string[] };
}) {
  const city = persona.profile?.home_base?.city || 'your city';
  const dateRange = getDateRange();
  const { provider, apiKey: userApiKey, model: userModel } = options || {};

  // If user provides their own API key, use legacy single-shot flow
  if (userApiKey && provider) {
    const prompt = buildSingleShotPrompt(city, dateRange, persona);
    let event;
    if (provider === 'anthropic') {
      event = await discoverWithAnthropic(prompt, userApiKey, userModel || 'claude-sonnet-4-6');
    } else if (provider === 'perplexity') {
      event = await discoverWithPerplexity(prompt, userApiKey, userModel || 'sonar-pro');
    } else {
      event = await discoverWithOpenAI(prompt, userApiKey, userModel || 'gpt-4o');
    }
    return { event, dateRange };
  }

  // ─── Multi-step discovery (default) ─────────────────────────

  // Step 1: Perplexity via OpenRouter finds 5 candidates (real-time web search)
  const searchPrompt = buildSearchPrompt(city, dateRange);

  let candidates: any[];
  if (process.env.OPENROUTER_API_KEY) {
    candidates = await searchWithPerplexity(searchPrompt);
  } else {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const response = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: searchPrompt,
    });
    const content = response.output_text;
    if (!content) throw new Error('No candidates found');
    const parsed = parseJsonFromText(content);
    candidates = Array.isArray(parsed) ? parsed : [parsed];
  }

  if (!candidates.length) throw new Error('No event candidates found');

  // Step 2: GPT-4o picks the best match for this person
  const pickPrompt = buildPickPrompt(
    JSON.stringify(candidates, null, 2),
    persona,
    city,
    dateRange,
    options?.feedback,
  );
  const event = await pickWithOpenAI(pickPrompt);

  // Step 3: Verify date is within target range
  if (event.date) {
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksOut = new Date(today);
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 21);

    if (eventDate < today || eventDate > twoWeeksOut) {
      for (const candidate of candidates) {
        if (candidate.date) {
          const candDate = new Date(candidate.date);
          if (candDate >= today && candDate <= twoWeeksOut) {
            Object.assign(event, candidate);
            event._date_swapped = true;
            break;
          }
        }
      }
      if (!event._date_swapped) {
        event._date_unverified = true;
      }
    }
  }

  // Step 4: Verify the URL is real
  const urlValid = await verifyUrl(event.url);
  if (!urlValid) {
    for (const candidate of candidates) {
      if (candidate.url !== event.url && await verifyUrl(candidate.url)) {
        event.url = candidate.url;
        event._url_swapped = true;
        break;
      }
    }
    if (!event._url_swapped) {
      event._url_unverified = true;
    }
  }

  return { event, dateRange, candidateCount: candidates.length };
}
