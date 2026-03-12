# Loop - One Magical Event in Your Calendar

## Summary
Loop connects your Google Calendar to AI-powered web search. It learns your rhythms, interests, and free time, then finds exceptional events in your area and adds them directly to your calendar.

**One magical event in your calendar, powered by AI.**

## Connect Your Calendar

**Google Calendar** – Full integration: read events, add recommendations directly.  
**iCal / ICS feed** – Paste a public calendar URL (e.g. from Google Calendar’s “Secret address in iCal format”). Recommendations are downloaded as an ICS file to import.

## Key Features

### 🧠 **Persona Generation**
- GPT-4o analyzes your calendar patterns to create a unique personality profile
- Identifies work-life balance, social patterns, and lifestyle insights
- Powers personalized event recommendations

### 📅 **Smart Event Recommendations**
- GPT-5 with web search finds exceptional events in your area
- Conflict detection marks events that don't fit your schedule as placeholders
- Automatically adds compatible events to your calendar
- One magical event per week, verifiable source URLs from web search

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **AI**: OpenAI GPT-4o (persona), GPT-5 (recommendations with web search)
- **Authentication**: Google OAuth 2.0
- **Calendar**: Google Calendar API

## Get Started

1. **Clone and install**
   ```bash
   git clone https://github.com/Morkeeth/Loop.git
   cd loop-labs-main
   npm install
   ```

2. **Set up environment**
   ```bash
   cp env.example .env.local
   ```
   
   Add your API keys to `.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Run locally**
   ```bash
   npm run dev
   ```
   
   Open `http://localhost:3000` (or the port shown in terminal)

## API Endpoints

- `GET /api/calendar` - Fetch calendar events
- `POST /api/calendar` - Create single event
- `POST /api/calendar/events` - Bulk-add recommended events to calendar
- `POST /api/persona` - Generate AI persona from calendar
- `POST /api/recommendations` - Find exceptional events with GPT-5 web search

## User Flow

1. **Connect Calendar** - Secure Google OAuth authentication
2. **AI Analysis** - GPT-4o creates your personality profile from calendar patterns
3. **Smart Recommendations** - GPT-5 with web search finds exceptional events in your area
4. **Add to Calendar** - Compatible events are automatically added to your Google Calendar

## Project Structure

```
loop-labs-main/
├── app/
│   ├── api/
│   │   ├── auth/             # Google OAuth
│   │   ├── calendar/         # Calendar read & write
│   │   ├── persona/          # AI persona generation
│   │   └── recommendations/  # GPT-5 event recommendations
│   ├── dashboard/            # Main pipeline UI
│   └── page.tsx              # Landing page
├── components/
├── lib/
└── types/
```

## Privacy & Security

- Secure Google OAuth 2.0 authentication
- Calendar data processed for persona and recommendations only
- No data stored permanently
- API keys and credentials via `.env.local` (never commit)

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with Next.js, OpenAI, and Google Calendar API**
