import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const CATEGORY_POOLS = [
  ['live jazz', 'vinyl listening session', 'intimate DJ set', 'open mic night', 'acoustic session in a bookshop'],
  ['supper club', 'pop-up dinner', 'natural wine tasting', 'fermentation workshop', 'secret kitchen'],
  ['gallery opening', 'print fair', 'artist studio open day', 'zine launch', 'ceramics workshop'],
  ['rooftop yoga', 'breathwork circle', 'cold water dip meetup', 'sunrise run crew', 'sound bath'],
  ['stand-up at a bar', 'drag brunch', 'pub quiz with a twist', 'karaoke at a dive bar', 'silent disco'],
  ['film screening in a courtyard', 'poetry slam', 'book club meetup', 'storytelling night', 'documentary premiere'],
  ['flea market', 'vintage pop-up', 'makers market', 'plant swap', 'record fair'],
  ['dance class', 'afrobeats night', 'salsa social', 'voguing workshop', 'cumbia night'],
];

function getRandomSuggestions(): string {
  const shuffled = [...CATEGORY_POOLS].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 3).map(pool => pool[Math.floor(Math.random() * pool.length)]);
  return picks.join(', ');
}

function buildPersonaBlock(persona: any, city: string): string {
  const profile = persona.profile || {};
  const lines: string[] = [];
  if (persona.persona_summary_120) lines.push(persona.persona_summary_120);
  if (profile.field) lines.push(`Works in: ${profile.field}`);
  if (profile.fitness_tags?.length) lines.push(`Fitness: ${profile.fitness_tags.join(', ')}`);
  if (profile.venues_frequented?.length) lines.push(`Frequents: ${profile.venues_frequented.join(', ')}`);
  if (profile.core_social_circle?.length) lines.push(`Close circle: ${profile.core_social_circle.join(', ')}`);
  if (profile.weekend_social_load) lines.push(`Weekend social energy: ${profile.weekend_social_load}`);
  if (profile.local_event_interests?.length) lines.push(`Into: ${profile.local_event_interests.join(', ')}`);
  if (profile.interests_tags?.length) lines.push(`Interests: ${profile.interests_tags.join(', ')}`);

  return lines.length > 0
    ? `WHO THEY ARE:\n${lines.join('\n')}`
    : `We don't know much about this person yet — just that they're in ${city} and curious.`;
}

// ─── Step 1: Search for candidates ──────────────────────────────

function buildSearchPrompt(city: string, dateRange: string): string {
  return `Find 5 niche, underground, or hidden-gem events happening in ${city} during ${dateRange}.

SEARCH STRATEGY:
- Search "${city} events ${dateRange}" on: shotgun.live, dice.fm, ra.co, billetto, eventbrite small venues
- Search specific neighborhoods and small venues in ${city}
- Look for: pop-up dinners, listening sessions, gallery openings, intimate workshops, DJ sets at small bars, comedy nights, courtyard screenings, run clubs, wine tastings
- Think along the lines of: ${getRandomSuggestions()}

RULES — every event MUST have:
- A specific date and time during ${dateRange}
- A real venue with a real street address
- A working URL (direct event page, ticket link, or venue page — NOT a city guide)
- Under 500 attendees — no expos, festivals, marathons, conventions, or tourist attractions

Return a JSON array of exactly 5 events, no commentary:
[
  {
    "event_title": "The actual event name",
    "venue": "Venue name",
    "address": "Full street address",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "end_time": "HH:MM",
    "url": "Direct event/ticket URL",
    "category": "music | art | food | tech | wellness | sport | social | culture | other",
    "one_liner": "One sentence pitch"
  }
]`;
}

// ─── Step 2: Pick the best match ────────────────────────────────

function buildPickPrompt(candidates: string, persona: any, city: string, dateRange: string): string {
  const personaBlock = buildPersonaBlock(persona, city);
  const hasRichPersona = !!persona.persona_summary_120 && persona.profile?.fitness_tags?.length > 0;

  return `You are choosing ONE event for someone to attend this week. You have 5 candidates — pick the one that would make them say "how did you even find this?"

${personaBlock}

CANDIDATES:
${candidates}

PICK THE BEST ONE. Consider:
- How well it matches their interests and lifestyle
- How unique and surprising it is (not something they'd find on Google in 5 seconds)
- Whether the date/time works for ${dateRange}
${hasRichPersona ? '- Reference something specific from their life in why_this' : '- Explain why this is the most exciting option'}

VARIETY: Do NOT default to yoga, wellness, or afrobeats. Surprise them.

Return JSON only — the single best event:
{
  "event_title": "The actual event name as listed",
  "venue": "Venue name",
  "address": "Full street address",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "end_time": "HH:MM",
  "description": "2-3 sentences. Sell it like you're texting your best friend at 6pm asking if they're free tonight.",
  "url": "Direct link to the event page or ticket page",
  "category": "music | art | food | tech | wellness | sport | social | culture | other",
  "why_this": "One sentence on why THIS event for THIS person"
}`;
}

// ─── Step 3: Verify URL ─────────────────────────────────────────

async function verifyUrl(url: string): Promise<boolean> {
  if (!url || url.length < 10) return false;
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    // Accept any 2xx or 3xx — some ticket sites return 3xx
    return res.status < 400;
  } catch {
    // HEAD might be blocked, try GET
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
        headers: { 'Range': 'bytes=0-0' }, // minimal download
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
  // Try array first, then object
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

// ─── Legacy single-shot prompt (for user-provided keys) ─────────

export function buildPrompt(city: string, dateRange: string, persona: any) {
  const personaBlock = buildPersonaBlock(persona, city);
  const hasRichPersona = !!persona.persona_summary_120 && persona.profile?.fitness_tags?.length > 0;

  return `You are the friend who ALWAYS knows about the one thing happening in the city that nobody else has found yet.

Your job: find ONE event in ${city} during ${dateRange}.

${personaBlock}

WHAT MAKES AN EVENT MAGICAL (all must be true):
- It's NICHE — under 500 people, not a mass event, not a trade show, not a marathon
- It has a SPECIFIC date and time during ${dateRange} — not an ongoing exhibition
- It's at a REAL venue with a real address
- Working URL — direct event page or ticket link, NOT a generic city guide
- You'd be genuinely EXCITED to text this to a friend

REJECT: expos, conventions, marathons, restaurants just being open, museums with months-long exhibitions, tourist attractions, anything at a convention center

VARIETY: Do NOT default to yoga, wellness, or afrobeats. Think: ${getRandomSuggestions()}

${hasRichPersona ? 'Pick the ONE that connects to their specific life.' : 'Pick the ONE most exciting, unexpected event.'}

Return JSON only:
{
  "event_title": "The actual event name",
  "venue": "Venue name",
  "address": "Full street address",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "end_time": "HH:MM",
  "description": "2-3 sentences selling it like a text to your best friend.",
  "url": "Direct event/ticket URL",
  "category": "music | art | food | tech | wellness | sport | social | culture | other",
  "why_this": "One sentence on why this event for this person"
}`;
}

// ─── Main discovery function ────────────────────────────────────

export async function discoverEvent(persona: any, options?: {
  provider?: string;
  apiKey?: string;
  model?: string;
}) {
  const city = persona.profile?.home_base?.city || 'your city';
  const dateRange = getDateRange();
  const { provider, apiKey: userApiKey, model: userModel } = options || {};

  // If user provides their own API key, use legacy single-shot flow
  if (userApiKey && provider) {
    const prompt = buildPrompt(city, dateRange, persona);
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
    // Fallback: use OpenAI web search if no OpenRouter key
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
  );
  const event = await pickWithOpenAI(pickPrompt);

  // Step 3: Verify the URL is real
  const urlValid = await verifyUrl(event.url);
  if (!urlValid) {
    // Try verifying other candidates' URLs and swap if needed
    for (const candidate of candidates) {
      if (candidate.url !== event.url && await verifyUrl(candidate.url)) {
        event.url = candidate.url;
        event._url_swapped = true;
        break;
      }
    }
    // If still no valid URL, mark it but don't fail
    if (!event._url_swapped) {
      event._url_unverified = true;
    }
  }

  return { event, dateRange, candidateCount: candidates.length };
}
