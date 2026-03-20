// ═══════════════════════════════════════════════════════════════════
// Loop — All AI prompts in one place
//
// Edit here to change the vibe, criteria, tone, or output format.
// Every prompt used by the app lives in this file. Nothing is hidden.
// ═══════════════════════════════════════════════════════════════════

// ─── Shared constants ───────────────────────────────────────────

export const EVENT_CATEGORIES = 'music | art | food | tech | wellness | sport | social | culture | nightlife | other';

export const CATEGORY_POOLS = [
  ['live jazz', 'vinyl listening session', 'intimate DJ set', 'open mic night', 'acoustic session in a bookshop'],
  ['supper club', 'pop-up dinner', 'natural wine tasting', 'fermentation workshop', 'secret kitchen'],
  ['gallery opening', 'print fair', 'artist studio open day', 'zine launch', 'ceramics workshop'],
  ['rooftop yoga', 'breathwork circle', 'cold water dip meetup', 'sunrise run crew', 'sound bath'],
  ['stand-up at a bar', 'drag brunch', 'pub quiz with a twist', 'karaoke at a dive bar', 'silent disco'],
  ['film screening in a courtyard', 'poetry slam', 'book club meetup', 'storytelling night', 'documentary premiere'],
  ['flea market', 'vintage pop-up', 'makers market', 'plant swap', 'record fair'],
  ['dance class', 'afrobeats night', 'salsa social', 'voguing workshop', 'cumbia night'],
];

export function getRandomSuggestions(): string {
  const shuffled = [...CATEGORY_POOLS].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 3).map(pool => pool[Math.floor(Math.random() * pool.length)]);
  return picks.join(', ');
}

// ─── What we reject everywhere ──────────────────────────────────

const REJECT_LIST = `expos, conventions, marathons, restaurants just being open, museums with months-long exhibitions, tourist attractions, anything at a convention center, corporate conferences, trade shows`;

const PREFER_LIST = `intimate live music, pop-up dinners, workshops, gallery openings, DJ sets at small bars, comedy nights, courtyard screenings, run clubs, wine tastings, makers markets, film screenings, poetry slams, book clubs, listening sessions`;

// ─── Tone guide ─────────────────────────────────────────────────

const TONE = `Write like you're texting your best friend at 6pm asking if they're free tonight. Casual, warm, specific. Not marketing copy.`;

// ═══════════════════════════════════════════════════════════════════
// 1. FREE TIER — City event curation
//    Used by: lib/scrapers/curate.ts
//    Input: raw scraped events from Luma + Shotgun
//    Output: 3-5 curated picks with descriptions
// ═══════════════════════════════════════════════════════════════════

export function buildCurationPrompt(city: string, eventsJson: string): string {
  return `You are Loop's city editor for ${city}. You have a batch of events happening soon. Pick the 3-5 most interesting, surprising, or niche ones — the kind of thing a cool local friend would text you about.

EVENTS:
${eventsJson}

WHAT TO PICK:
- Prefer: ${PREFER_LIST}
- Reject: ${REJECT_LIST}, corporate meetups, generic networking

TONE:
- ${TONE}
- whyGo should be one punchy line that makes someone stop scrolling

Return JSON array only:
[
  {
    "title": "Exact event name from the list",
    "venue": "Venue name",
    "address": "Full address",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "endTime": "HH:MM",
    "url": "Event URL",
    "imageUrl": null,
    "description": "2-3 sentences, casual and warm",
    "category": "${EVENT_CATEGORIES}",
    "source": "luma, shotgun, eventbrite, or dice",
    "whyGo": "One punchy line"
  }
]`;
}

// ═══════════════════════════════════════════════════════════════════
// 2. PRO TIER — Perplexity search step
//    Used by: lib/discover.ts (multi-step flow, step 1)
//    Input: city + date range
//    Output: 5 real event candidates from the web
// ═══════════════════════════════════════════════════════════════════

export function buildSearchPrompt(city: string, dateRange: string): string {
  return `Find 5 niche, underground, or hidden-gem events happening in ${city} during ${dateRange}.

SEARCH STRATEGY:
- Search "${city} events ${dateRange}" on: shotgun.live, dice.fm, ra.co, billetto, eventbrite small venues
- Search specific neighborhoods and small venues in ${city}
- Look for: ${PREFER_LIST}
- Think along the lines of: ${getRandomSuggestions()}

RULES — every event MUST have:
- A specific date and time during ${dateRange}
- A real venue with a real street address
- A working URL (direct event page, ticket link, or venue page — NOT a city guide)
- Under 500 attendees — no ${REJECT_LIST}

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
    "category": "${EVENT_CATEGORIES}",
    "one_liner": "One sentence pitch"
  }
]`;
}

// ═══════════════════════════════════════════════════════════════════
// 3. PRO TIER — GPT-4o pick step
//    Used by: lib/discover.ts (multi-step flow, step 2)
//    Input: 5 candidates + user persona + feedback history
//    Output: the ONE best event for this specific person
// ═══════════════════════════════════════════════════════════════════

export function buildPersonaBlock(persona: any, city: string): string {
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

export function buildFeedbackBlock(feedback?: { liked: string[]; disliked: string[]; preferredCategories?: string[]; avoidCategories?: string[] }): string {
  if (!feedback || (!feedback.liked.length && !feedback.disliked.length && !feedback.preferredCategories?.length && !feedback.avoidCategories?.length)) return '';
  const lines: string[] = ['\nPAST FEEDBACK (use this to pick better):'];
  if (feedback.liked.length) lines.push(`Loved: ${feedback.liked.join(', ')}`);
  if (feedback.disliked.length) lines.push(`Not into: ${feedback.disliked.join(', ')}`);
  if (feedback.preferredCategories?.length) lines.push(`Preferred categories: ${feedback.preferredCategories.join(', ')}`);
  if (feedback.avoidCategories?.length) lines.push(`Avoid categories: ${feedback.avoidCategories.join(', ')}`);
  return lines.join('\n');
}

export function buildPickPrompt(
  candidates: string,
  persona: any,
  city: string,
  dateRange: string,
  feedback?: { liked: string[]; disliked: string[]; preferredCategories?: string[]; avoidCategories?: string[] },
): string {
  const personaBlock = buildPersonaBlock(persona, city);
  const feedbackBlock = buildFeedbackBlock(feedback);
  const hasRichPersona = !!persona.persona_summary_120 && persona.profile?.fitness_tags?.length > 0;

  return `You are choosing ONE event for someone to attend this week. You have 5 candidates — pick the one that would make them say "how did you even find this?"

${personaBlock}
${feedbackBlock}

CANDIDATES:
${candidates}

PICK THE BEST ONE. Consider:
- How well it matches their interests and lifestyle
- How unique and surprising it is (not something they'd find on Google in 5 seconds)
- Whether the date/time works for ${dateRange}
${hasRichPersona ? '- Reference something specific from their life in why_this' : '- Explain why this is the most exciting option'}
${feedbackBlock ? '- IMPORTANT: Lean toward categories they liked, avoid categories they disliked' : ''}

VARIETY: Do NOT default to yoga, wellness, or afrobeats. Surprise them.

TONE: ${TONE}

Return JSON only — the single best event:
{
  "event_title": "The actual event name as listed",
  "venue": "Venue name",
  "address": "Full street address",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "end_time": "HH:MM",
  "description": "2-3 sentences. ${TONE}",
  "url": "Direct link to the event page or ticket page",
  "category": "${EVENT_CATEGORIES}",
  "why_this": "One sentence on why THIS event for THIS person"
}`;
}

// ═══════════════════════════════════════════════════════════════════
// 4. BYO KEY — Single-shot discovery prompt
//    Used by: lib/discover.ts (legacy flow for user-provided API keys)
//    Input: city + date range + persona
//    Output: one event (search + pick in a single call)
// ═══════════════════════════════════════════════════════════════════

export function buildSingleShotPrompt(city: string, dateRange: string, persona: any): string {
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

REJECT: ${REJECT_LIST}

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
  "description": "2-3 sentences. ${TONE}",
  "url": "Direct event/ticket URL",
  "category": "${EVENT_CATEGORIES}",
  "why_this": "One sentence on why this event for this person"
}`;
}

// ═══════════════════════════════════════════════════════════════════
// 5. CALENDAR INSIGHTS — Mini commentary during scan
//    Used by: lib/calendar-service.ts
//    Input: summarized calendar events
//    Output: 3 witty one-liners about the user
// ═══════════════════════════════════════════════════════════════════

export const INSIGHT_PROMPT = `You are Loop's mini commentator. Generate 3 short energetic insights about a user's identity inferred from calendar events. Be witty but kind.

Rules:
- Output a JSON array of strings (no markdown, no explanations).
- Each string ≤ 120 characters.
- Reference patterns, hobbies, or routines visible in the events.
- Avoid sensitive topics (health, politics, religion, demographics).
- If signals are weak, acknowledge light data.
`;
