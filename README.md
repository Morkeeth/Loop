# Loop

One magical event. Every week.

Loop reads your Google Calendar, understands your life, and finds the one niche event you shouldn't miss this week — then adds it straight to your calendar.

## How it works

1. **Connect Google Calendar** — OAuth 2.0 with offline refresh tokens
2. **Build your persona** — GPT-4o-mini analyzes your calendar patterns to understand who you are
3. **Discover your event** — Perplexity web search finds candidates, GPT-4o picks the best match for you, URL gets verified
4. **Add to calendar** — One tap and it's in your Google Calendar

## Tech Stack

- **Framework**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Google OAuth 2.0 with refresh token rotation
- **AI**: OpenAI GPT-4o / GPT-4o-mini, Perplexity sonar-pro (via OpenRouter)
- **Storage**: Upstash Redis
- **Hosting**: Vercel with cron jobs
- **Calendar**: Google Calendar API

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in your keys (see .env.example for details)
npm run dev
```

### Required env vars

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `GOOGLE_REDIRECT_URI` — OAuth callback URL
- `OPENAI_API_KEY` — Persona generation + event curation
- `OPENROUTER_API_KEY` — Perplexity web search for event discovery
- `CRON_SECRET` — Protects the weekly cron endpoint

## Project Structure

```
app/
├── api/
│   ├── auth/callback/    # Google OAuth callback
│   ├── auth/session/     # Session management + token refresh
│   ├── calendar/         # Calendar data fetching
│   ├── persona/          # Persona generation
│   ├── discover/         # Event discovery
│   ├── user/persona/     # Persist persona to KV
│   └── cron/discover/    # Weekly automated discovery
├── dashboard/            # Main app (persona + discover + add to cal)
├── explore/              # No-auth discovery flow
├── privacy/              # Privacy policy
├── terms/                # Terms of service
└── page.tsx              # Landing page
lib/
├── calendar-service.ts   # Google Calendar API wrapper
├── discover.ts           # Multi-step event discovery pipeline
├── google-auth.ts        # OAuth + refresh token helpers
└── kv-store.ts           # Upstash Redis user persistence
```

## Weekly Cron

Every Monday at 9am UTC, the cron job (`/api/cron/discover`) iterates all stored users, refreshes their tokens, discovers a personalized event, and adds it to their calendar.

## License

MIT
