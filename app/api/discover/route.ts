import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

function buildPrompt(city: string, dateRange: string, persona: any) {
  const profile = persona.profile || {};
  const hasRichPersona = !!persona.persona_summary_120 && profile.fitness_tags?.length > 0;

  const lines: string[] = [];
  if (persona.persona_summary_120) lines.push(persona.persona_summary_120);
  if (profile.field) lines.push(`Works in: ${profile.field}`);
  if (profile.fitness_tags?.length) lines.push(`Fitness: ${profile.fitness_tags.join(', ')}`);
  if (profile.venues_frequented?.length) lines.push(`Frequents: ${profile.venues_frequented.join(', ')}`);
  if (profile.core_social_circle?.length) lines.push(`Close circle: ${profile.core_social_circle.join(', ')}`);
  if (profile.weekend_social_load) lines.push(`Weekend social energy: ${profile.weekend_social_load}`);
  if (profile.local_event_interests?.length) lines.push(`Into: ${profile.local_event_interests.join(', ')}`);
  if (profile.interests_tags?.length) lines.push(`Interests: ${profile.interests_tags.join(', ')}`);

  const personaBlock = lines.length > 0
    ? `WHO THEY ARE:\n${lines.join('\n')}`
    : `We don't know much about this person yet — just that they're in ${city} and curious. Find something universally exciting that a culturally-engaged local would love.`;

  return `You are the friend who ALWAYS knows about the one thing happening in the city that nobody else has found yet. Not the thing on the front page of Time Out. Not the expo at the convention center. The thing that makes someone say "how did you even find this?"

Your job: find ONE event in ${city} during ${dateRange}.

${personaBlock}

WHAT MAKES AN EVENT MAGICAL (all must be true):
- It's NICHE — under 500 people, not a mass event, not a trade show, not a marathon
- It's the kind of thing you'd only find on a small venue's Instagram, a local newsletter, or word of mouth
- It has a SPECIFIC date and time during ${dateRange} — not an ongoing exhibition
- It's at a REAL venue with a real address you can walk to
- The event should have a working URL — a direct event page, ticket link, or venue page. Not a generic city guide
- You'd be genuinely EXCITED to text this to a friend — if it sounds boring, keep searching

REJECT THESE (instant disqualification):
- Expos, trade fairs, conventions, salons, conferences
- Massive runs/marathons with 1,000+ participants
- Famous restaurants or bars just... being open (not a special event)
- Museum exhibitions that run for months
- Tourist attractions or "top 10 things to do in ${city}" content
- Anything at a convention center or expo hall
- Events you aren't confident are happening during ${dateRange}
- Generic "food festival" or "art fair" with 10,000+ attendees

WHERE TO SEARCH (in this order):
1. Search "${city} events ${dateRange}" on niche platforms — shotgun.live, dice.fm, ra.co, billetto, eventbrite small venues, local Instagram event aggregators
2. Search specific neighborhood venues in ${city} — independent galleries, natural wine bars, cultural centers, small music venues, community spaces
3. Look for: pop-up dinners, listening sessions, gallery vernissages, intimate workshops, DJ sets at small bars, comedy nights, courtyard screenings, run crew social events, wine tastings at caves
4. Cross-reference with the person's signals if available

${hasRichPersona ? 'Pick the ONE that connects to their specific life — reference their actual interests, not generic categories.' : 'Pick the ONE most exciting, unexpected event happening in the city.'}

Return JSON only — no commentary:
{
  "event_title": "The actual event name as listed",
  "venue": "Venue name",
  "address": "Full street address",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "end_time": "HH:MM",
  "description": "2-3 sentences. Sell it like you're texting your best friend at 6pm asking if they're free tonight.",
  "url": "Direct link to the event page or ticket page — NOT a generic city guide URL",
  "category": "music | art | food | tech | wellness | sport | social | culture | other",
  "why_this": "${hasRichPersona ? 'One sentence connecting this to something specific in their life' : 'One sentence on why this is the most exciting thing happening in the city this week'}"
}`;
}

function getDateRange() {
  const today = new Date();
  const daysUntilSunday = (7 - today.getDay()) % 7;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  const weekEnd = new Date(nextSunday);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return `${nextSunday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
}

function parseJsonFromText(text: string): any {
  let clean = text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) clean = match[0];
  return JSON.parse(clean);
}

async function discoverWithOpenAI(prompt: string, apiKey: string, model: string) {
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

async function discoverWithAnthropic(prompt: string, apiKey: string, model: string) {
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

async function discoverWithPerplexity(prompt: string, apiKey: string, model: string) {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { persona, provider, apiKey: userApiKey, model: userModel } = body;

    if (!persona) {
      return NextResponse.json({ error: 'Persona data required' }, { status: 400 });
    }

    const city = persona.profile?.home_base?.city || 'your city';
    const dateRange = getDateRange();
    const prompt = buildPrompt(city, dateRange, persona);

    let event;

    if (provider === 'anthropic' && userApiKey) {
      event = await discoverWithAnthropic(prompt, userApiKey, userModel || 'claude-sonnet-4-6');
    } else if (provider === 'perplexity' && userApiKey) {
      event = await discoverWithPerplexity(prompt, userApiKey, userModel || 'sonar-pro');
    } else if (provider === 'openai' && userApiKey) {
      event = await discoverWithOpenAI(prompt, userApiKey, userModel || 'gpt-4o');
    } else {
      event = await discoverWithOpenAI(prompt, process.env.OPENAI_API_KEY!, 'gpt-4o');
    }

    return NextResponse.json({ event, dateRange });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to discover event', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
