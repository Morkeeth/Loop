# Loop - AI-Powered Calendar Intelligence Platform

## Project Overview

**Loop** is an intelligent calendar assistant that analyzes users' Google Calendar data to create personalized personas and deliver tailored daily briefings with relevant news, events, and activities.

## Core Value Proposition

Transform your calendar from a scheduling tool into a personalized life assistant that understands who you are and proactively enriches your daily experience with relevant information and opportunities.

## Technical Architecture

### Tech Stack
- **Frontend**: React/Next.js with TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Google OAuth 2.0
- **AI/ML**: OpenAI GPT-4 (persona synthesis) & GPT-4-mini (real-time comments)
- **Calendar Integration**: Google Calendar API
- **Research**: GPT with web search capabilities
- **Deployment**: Vercel/Netlify

## User Flow

```
1. Landing Page → 
2. Google OAuth Login → 
3. Calendar Permissions (Read/Write) → 
4. Data Processing & Loading Screen (with GPT-mini comments) → 
5. Persona Generation → 
6. Morning Brief Display → 
7. Calendar Event Creation
```

## Feature Specifications

### 1. Authentication & Permissions

**Requirements:**
- Google OAuth 2.0 implementation
- Request calendar read/write permissions
- Secure token storage
- Session management

**Google Calendar Scopes Needed:**
```
- https://www.googleapis.com/auth/calendar.readonly
- https://www.googleapis.com/auth/calendar.events
- https://www.googleapis.com/auth/userinfo.profile
```

### 2. Persona Synthesis Engine

**Data Points to Extract:**
- **Professional Life**: Job title, industry, work patterns, meeting frequency
- **Education**: Student status, field of study, class schedules
- **Personal Interests**: Hobbies, sports, recurring activities
- **Social Patterns**: Frequent contacts, social event frequency
- **Schedule Patterns**: Wake/sleep times, busy periods, free time
- **Location**: Primary location, travel patterns
- **Lifestyle Indicators**: Exercise routines, dining preferences, entertainment choices

**Processing Logic:**
```javascript
// Pseudo-code for persona generation
1. Fetch last 3-6 months of calendar events
2. Categorize events by type (work/personal/education/health/social)
3. Identify patterns and frequencies
4. Extract key entities (people, places, activities)
5. Generate persona summary using GPT-4
```

### 3. Loading Experience

**GPT-Mini Commentary During Processing:**
- "I see you're quite the tennis enthusiast! 🎾"
- "Looks like you're a night owl - lots of late evening meetings"
- "Tech bro detected - multiple standups and sprint reviews"
- "Damn, do you even lift? Found 47 gym sessions!"
- "Simp lord!!! - dinner dates every Friday"

### 4. Morning Brief Generation

**Content Components:**
1. **Personalized News**: Industry news, hobby-related updates
2. **Local Events**: Concerts, meetups, activities matching interests
3. **Weather**: Hyperlocal forecast for the day
4. **Suggestions**: New activities based on free time slots
5. **Reminders**: Upcoming important events

**Brief Structure:**
```markdown
Good morning [Name]! Here's your Loop for [Date]

📍 Weather in [Location]: [Forecast]

📰 News that matters to you:
- [Relevant news based on profession/interests]

🎯 Today's opportunities:
- [Event suggestions based on calendar gaps]

🌟 Discover:
- [New activities/events in your area]
```

### 5. Calendar Integration

**Auto-Event Creation:**
- Create "Morning Brief" recurring event
- Add suggested events as tentative
- Smart scheduling avoiding conflicts
- One-click event confirmation

## Data Privacy & Security

- Minimal data storage (only necessary tokens)
- Persona data encrypted at rest
- Clear data deletion policy
- GDPR compliance considerations
- Transparent data usage

## MVP Scope (Hackathon Version)

### Phase 1: Core Loop (Priority)
1. ✅ Google OAuth integration
2. ✅ Calendar read access
3. ✅ Basic persona generation
4. ✅ Simple morning brief
5. ✅ Loading screen with comments

### Phase 2: Enhanced Experience
1. ⏳ Calendar write functionality
2. ⏳ Event suggestions
3. ⏳ Weather integration
4. ⏳ News API integration

### Phase 3: Polish
1. ⏳ Refined UI/UX
2. ⏳ Persona refinement
3. ⏳ Social features
4. ⏳ Mobile responsiveness

## API Integrations Required

1. **Google Calendar API**
   - Authentication
   - Event fetching
   - Event creation

2. **OpenAI API**
   - GPT-4 for persona synthesis
   - GPT-4-mini for loading comments
   - GPT with search for research

3. **Optional APIs**
   - Weather API (OpenWeatherMap)
   - News API (NewsAPI or similar)
   - Events API (Eventbrite/Meetup)

## Initial Setup Prompt for Cursor

```
Create a Next.js TypeScript application called "Loop" that:

1. Sets up a landing page with a hero section explaining the product
2. Implements Google OAuth 2.0 authentication with calendar permissions
3. Creates a loading screen component that displays witty comments while processing
4. Builds a calendar data fetching service that retrieves the last 3 months of events
5. Implements a persona generation service that sends calendar data to GPT-4
6. Creates a morning brief display component showing personalized content
7. Uses Tailwind CSS for styling with a modern, clean design
8. Implements proper error handling and loading states

File structure:
/app
  /page.tsx (landing)
  /auth
    /callback/page.tsx
  /dashboard
    /page.tsx
  /api
    /auth/route.ts
    /calendar/route.ts
    /persona/route.ts
    /brief/route.ts
/components
  /LandingHero.tsx
  /LoadingScreen.tsx
  /PersonaDisplay.tsx
  /MorningBrief.tsx
  /CalendarAuth.tsx
/lib
  /google-auth.ts
  /calendar-service.ts
  /openai-service.ts
  /persona-generator.ts
/types
  /calendar.ts
  /persona.ts

Start with the landing page and Google OAuth setup.
```

## Environment Variables

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
OPENAI_API_KEY=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

## UI Components Needed

1. **Landing Page**
   - Hero with value prop
   - Feature showcase
   - CTA button "Connect Your Calendar"

2. **Auth Flow**
   - Google sign-in button
   - Permission request screen
   - Success confirmation

3. **Loading Screen**
   - Progress indicator
   - Animated comments from GPT-mini
   - Calendar scanning animation

4. **Dashboard**
   - Persona summary card
   - Morning brief section
   - Suggested events grid
   - Quick actions

5. **Settings**
   - Privacy controls
   - Notification preferences
   - Data management

## Success Metrics

- Time from auth to persona generation < 30 seconds
- Persona accuracy (user validation)
- Brief relevance score
- User engagement with suggested events
- Daily active users returning for brief

## Potential Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Calendar data variety | Robust parsing with fallbacks |
| API rate limits | Implement caching and queuing |
| Privacy concerns | Clear data policy, minimal storage |
| Persona accuracy | User feedback loop for improvement |
| Loading time | Progressive loading with engaging UI |

## Future Enhancements

- Multi-calendar support
- Team/family shared briefs
- Voice assistant integration
- Mobile app
- Calendar insights dashboard
- Productivity analytics
- AI scheduling assistant
- Integration with other productivity tools

## Development Timeline (Hackathon)

**Hour 1-2**: Setup & Authentication
- Next.js setup
- Google OAuth implementation
- Basic landing page

**Hour 3-4**: Calendar Integration
- Fetch calendar events
- Parse and structure data
- Basic data processing

**Hour 5-6**: AI Integration
- OpenAI setup
- Persona generation logic
- Loading screen with comments

**Hour 7-8**: Morning Brief
- Brief generation
- UI components
- Display logic

**Hour 9-10**: Polish & Deploy
- UI refinement
- Error handling
- Deployment
- Demo preparation

## Testing Checklist

- [ ] OAuth flow works smoothly
- [ ] Calendar data fetches correctly
- [ ] Persona generation is accurate
- [ ] Loading comments are entertaining
- [ ] Brief is relevant and useful
- [ ] UI is responsive
- [ ] Error states handled gracefully
- [ ] Data privacy maintained

---

## Quick Start Commands

```bash
# Setup
npx create-next-app@latest loop --typescript --tailwind --app
cd loop
npm install @react-oauth/google axios openai date-fns

# Environment setup
cp .env.example .env.local
# Add your API keys

# Development
npm run dev

# Build
npm run build
```

## Resources

- [Google Calendar API Docs](https://developers.google.com/calendar)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

*Remember: The goal is to make calendars intelligent and life more intentional. Keep it simple, make it magical.*