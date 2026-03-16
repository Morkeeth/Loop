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

## P1 — Core product quality

### Event feedback loop
- [x] Thumbs up/down UI on discovered events
- [x] Feedback stored in Redis per user
- [x] Feed feedback history into discovery prompt ("they liked X, disliked Y")
- [ ] Track category preferences over time (e.g., loves music, skips wellness)
- [ ] Surface feedback stats in persona page

### Consolidate discovery endpoints
Three endpoints do overlapping things:
- `/api/discover` — multi-step (Perplexity + GPT-4o pick + URL verify)
- `/api/recommendations` — single-shot GPT-5 web search (free/premium split)
- Remove the duplication: one `discoverEvent()` function, one endpoint
- Setup page and Dashboard should use the same backend path

### Analytics
- [ ] Add PostHog or Mixpanel
- [ ] Track: signup → scan complete → persona built → event found → event attended
- [ ] Track: feedback up/down ratio, category distribution
- [ ] Funnel: landing → auth → dashboard → reveal (measure drop-off at each step)

### Event verification
- [x] URL HEAD check exists in `lib/discover.ts`
- [ ] Add date verification (is the event actually this week?)
- [ ] Add content check (fetch page, confirm event name appears)
- [ ] Flag hallucinated events before showing to user

## P2 — User experience

### Returning user experience
Currently the dashboard re-runs the full pipeline on every visit unless localStorage has cached data.
- [ ] Server-side: check Redis for existing persona + this week's event
- [ ] If found: skip directly to reveal phase
- [ ] Show "Refresh persona" and "Find new event" as explicit actions
- [ ] New phase: "history" — show past discovered events

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
