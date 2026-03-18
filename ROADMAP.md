# Loop — Production Roadmap

## P0 — Launch blockers

### Google OAuth verification
- [x] Privacy policy page with correct scopes and data usage
- [x] Terms of service page
- [x] "How it works" section on landing page
- [x] Messaging consistency (weekly event, not daily briefing)
- [ ] Submit for Google OAuth verification via Google Cloud Console
- [ ] Respond to any Google review feedback
- [ ] Move from "Testing" to "Published" in consent screen

### Notifications — the retention mechanism
Without notifications, the weekly cron job finds events that nobody sees.
- [x] Dedicated "Loop" calendar — events land in their own subscribable calendar on the user's Google account, with native Google Calendar notifications
- [ ] Optional: email digest when weekly event is discovered (Resend/Postmark)
- [ ] Optional: push notifications via web push API

### Free tier — curated city events
- [x] Luma scraper — parses `luma.com/{city}` __NEXT_DATA__ for events
- [x] Shotgun scraper — HTML + JSON extraction from `shotgun.live/en/cities/{slug}`
- [x] GPT-4o-mini curation — picks best 3-5 from scraped candidates
- [x] City events cache in Redis — `city:{name}:{weekKey}` with 10-day TTL
- [x] `GET /api/city-events?city=X` — serves cached events, scrapes on cold start
- [x] Weekly cron — `/api/cron/city-events` runs Monday 7AM UTC for all active cities
- [x] Explore page redesigned — shows curated picks, upsell to pro
- [x] `user.plan` field on LoopUser — ready for payment gating (`free` | `pro`)
- [ ] Lemon Squeezy / Stripe integration — payment checkout + webhook
- [ ] Gate `/api/discover` behind `pro` plan (free users see city picks only)
- [ ] Add more event sources (Eventbrite, Dice, RA)

## P1 — Core product quality

### Event feedback loop
- [x] Thumbs up/down UI on discovered events
- [x] Feedback stored in Redis per user
- [x] Feed feedback history into discovery prompt ("they liked X, disliked Y")
- [x] Track category preferences over time (aggregated in `getCategoryPreferences()`, fed into discovery prompt)
- [ ] Surface feedback stats in persona page

### Consolidate discovery endpoints
- [x] Setup page now uses `/api/discover` (same multi-step flow as dashboard)
- [x] One `discoverEvent()` function, one endpoint for all paths
- [x] Deleted `/api/recommendations/route.ts` (543 lines) + removed dead `calculateFreeTimeSlotsForRecommendations`

### Analytics
- [ ] Add PostHog or Mixpanel
- [ ] Track: signup → scan complete → persona built → event found → event attended
- [ ] Track: feedback up/down ratio, category distribution
- [ ] Funnel: landing → auth → dashboard → reveal (measure drop-off at each step)

### Event verification
- [x] URL HEAD check exists in `lib/discover.ts`
- [x] Date verification — validates event is within 3-week window, swaps with valid candidate if out of range
- [ ] Add content check (fetch page, confirm event name appears)
- [ ] Flag hallucinated events before showing to user

## P2 — User experience

### Returning user experience
- [x] Server-side: `/api/user/state` checks Redis for existing persona + this week's event
- [x] If found: dashboard skips directly to reveal phase
- [x] "Rescan calendar" button as explicit refresh action
- [x] Events persisted to Redis (`saveDiscoveredEvent`) from both dashboard and cron
- [x] "Past Loops" — event history view showing all previously discovered events
- [x] "Find new event" button to manually trigger re-discovery from reveal phase

### Progressive permissions
- [ ] Start with calendar read-only scope
- [ ] Only request write scope when user taps "Add to calendar"
- [ ] Reduces trust barrier on first auth

### Explore page improvements
- [x] Auto-detect city via IP geolocation
- [x] CTA to connect Google Calendar after seeing value
- [ ] Share event link (social proof / viral loop)
- [ ] "Find another" maintains discovered events as a scrollable list

## P3 — Infrastructure

### Migrate to Supabase Postgres
Redis works but is fragile for user data:
- [ ] Create users table in Supabase Postgres
- [ ] Create feedback table
- [ ] Create discovered_events table (history)
- [ ] Migrate kv-store functions to Supabase client
- [ ] Keep Redis for rate limiting and caching only

### Testing
- [ ] Integration tests for cron job (mock calendar + verify event creation)
- [ ] Unit tests for persona generation prompt parsing
- [ ] Unit tests for discovery flow (candidate parsing, URL verification)
- [ ] E2E test: landing → auth → dashboard → reveal (Playwright)

### Twitter/X enrichment
- [ ] Wire up `twitter-enrichment.ts` in the auth callback
- [ ] Merge Twitter bio signals into persona on login
- [ ] Use Twitter interests to improve discovery prompts
- [ ] Handle users who only connect Twitter (no calendar) — use archetype flow

### Cron job hardening
- [ ] Exponential backoff on token refresh failures
- [ ] Alert (email/Slack) when cron skips users
- [ ] Per-user rate limiting on API calls
- [ ] Dead letter queue for failed discoveries

## Done (this session)

- [x] Removed `/loop` page (duplicate of dashboard, 532 lines)
- [x] Removed `/api/magic-event` (duplicate of discover, 187 lines)
- [x] Removed `/api/persona/artifact` (only used by /loop, 106 lines)
- [x] Removed unused `next-auth` dependency
- [x] Fixed messaging: "daily briefing" → "weekly event discovery" across all pages
- [x] Updated privacy policy and terms of service
- [x] Cleaned up explore page fake email capture
- [x] Added event feedback API endpoint + thumbs up/down UI
- [x] Wired feedback history into discovery prompts (pick step uses liked/disliked signals)
- [x] Dedicated "Loop" calendar — events go to their own calendar instead of primary, Google handles notifications natively
- [x] Cron job also uses Loop calendar + feedback signals
- [x] Net: ~1,000 lines deleted, cleaner codebase
- [x] Returning user experience — server state hydration via `/api/user/state`, skip-to-reveal fast path
- [x] Event persistence to Redis — `StoredEvent` type, save/get/history functions in `kv-store.ts`
- [x] Setup page consolidated to use `/api/discover` (same backend as dashboard)
- [x] `PROJECT.md` — complete project overview (stack, architecture, key files, flows, env vars)
- [x] Deleted `/api/recommendations/route.ts` (543 lines of dead code) + `calculateFreeTimeSlotsForRecommendations`
- [x] Date verification in discovery — rejects events outside 3-week window, swaps with valid candidate
- [x] Category preference tracking — `getCategoryPreferences()` aggregates feedback, fed into discovery + cron
- [x] "Find new event" button — re-triggers discovery from reveal phase without rescanning calendar
- [x] "Past Loops" history view — browse all previously discovered events in dashboard
- [x] Updated README API endpoints
- [x] Free tier: Luma + Shotgun scrapers → GPT-4o-mini curation → Redis cache
- [x] `GET /api/city-events` endpoint + weekly city cron job
- [x] Explore page redesigned: curated city picks with upsell
- [x] `user.plan` field (`free` | `pro`) ready for payment gating
- [x] `node-html-parser` dependency for Shotgun scraping
