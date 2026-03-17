# Loop — One magical event, every week

Loop is a serendipity engine disguised as a calendar app. It connects to your Google Calendar, reads 3–6 months of events to build an AI-powered persona, then searches the real web for one niche event per week you'd never find on your own — and drops it into your calendar.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (React 19, TypeScript 5.9) |
| Styling | Tailwind CSS 4, Framer Motion |
| Auth | Supabase Auth (Google OAuth, Twitter/X OAuth) |
| Database | Upstash Redis (user profiles, personas, feedback) |
| AI — Persona | OpenAI GPT-4o (calendar → personality profile) |
| AI — Discovery | OpenAI GPT-5 + web search (find real events) |
| AI — Search | Perplexity via OpenRouter (candidate sourcing) |
| Deployment | Vercel (auto-deploy from main) |
| Cron | Vercel Cron — weekly discovery (Monday 9 AM UTC) |

## Architecture

```
Landing (/) → Google OAuth → Dashboard (/dashboard)
                                ├── Fast path: check server state → skip to reveal if this week's event exists
                                ├── Phase 1: Scan calendar (6 months, 2500 events max)
                                ├── Phase 2: Build persona (GPT-4o)
                                ├── Phase 3: Discover event (multi-step: Perplexity search → GPT-4o pick → URL verify)
                                ├── Phase 4: Reveal + add to "Loop" calendar + feedback
                                └── Phase 5: History — browse past discovered events

Setup (/setup) → Archetype quiz (no auth needed) → /api/discover → Event reveal
Explore (/explore) → Auto-detect city → /api/discover → Event reveal (no auth needed)
```

## Key files

| File | What it does |
|------|-------------|
| `app/dashboard/page.tsx` | Main authenticated pipeline (scan → persona → search → reveal) |
| `app/setup/page.tsx` | No-auth archetype picker + quiz |
| `app/explore/page.tsx` | No-auth auto-detect-city event finder |
| `components/LandingHero.tsx` | Landing page with Google/Twitter OAuth |
| `lib/discover.ts` | Multi-step discovery: Perplexity candidates → GPT-4o pick → URL verify |
| `lib/kv-store.ts` | Redis user store, event history, feedback, category preferences |
| `lib/archetypes.ts` | Calendar event categorization + archetype scoring |
| `lib/calendar-service.ts` | Google Calendar API client, Loop calendar creation |
| `lib/cache.ts` | Browser localStorage cache (persona 7d, events weekly) |
| `app/api/discover/route.ts` | Discovery endpoint (rate-limited, persists to Redis, feedback-aware) |
| `app/api/user/state/route.ts` | Returns server-side persona + current event (returning user fast path) |
| `app/api/persona/route.ts` | Persona generation from calendar data |
| `app/api/cron/discover/route.ts` | Weekly automated discovery for all users |
| `app/api/feedback/route.ts` | Event feedback (thumbs up/down) |

## Auth flow

1. User clicks "Connect Google Calendar" → Supabase OAuth → Google consent screen
2. Callback exchanges code for session → cookies set (access_token, refresh_token, user_id)
3. Dashboard checks `/api/auth/session` → refreshes token if expired
4. Dashboard checks `/api/user/state` → if persona + this week's event exist, skips pipeline
5. Calendar API calls use cookie-based token (server-side)
6. User profile, persona, discovered events, and feedback persisted to Upstash Redis

## Discovery flow (multi-step)

1. **Search** — Perplexity (via OpenRouter) finds 5 real event candidates in user's city
2. **Pick** — GPT-4o selects the best match based on persona
3. **Date check** — Validates event is within next 3 weeks; swaps with valid candidate if not
4. **URL verify** — HEAD/GET request to event URL confirms it's live
5. **Fallback** — If URL dead, swaps with a verified candidate URL
5. **Calendar** — Creates event in dedicated "Loop" calendar via Google Calendar API (auto-created on first use)

## Environment variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
CRON_SECRET=

# Optional
OPENROUTER_API_KEY=          # For Perplexity search step
OPENAI_RECOMMENDATIONS_MODEL_DEFAULT=gpt-4o-mini-search-preview
OPENAI_RECOMMENDATIONS_MODEL=gpt-5
OPENAI_PERSONA_MODEL=gpt-4o
```
