# Loop App Setup Guide

## Overview

Loop is an AI-powered calendar intelligence platform that analyzes your Google Calendar data to create personalized personas and deliver tailored daily briefings.

## Prerequisites

- Node.js 18+ installed
- Google Cloud Console project with Calendar API enabled
- OpenAI API key
- Git (optional, for version control)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# If cloning from git
git clone <repository-url>
cd loop-app

# Install dependencies
npm install
```

### 2. Environment Configuration

1. Copy the environment template:
```bash
cp env.example .env.local
```

2. Fill in your API keys in `.env.local`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### 3. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Set authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback` (for development)
   - `https://yourdomain.com/api/auth/callback` (for production)
6. Copy the Client ID and Client Secret to your `.env.local` file

### 4. OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add the key to your `.env.local` file
4. Ensure you have credits in your OpenAI account

### 5. Run the Application

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`

## Features Implemented

### ✅ Core Features
- **Landing Page**: Beautiful hero section with Google OAuth integration
- **Authentication**: Google OAuth 2.0 with calendar permissions
- **Calendar Integration**: Fetches and processes calendar events
- **AI Persona Generation**: Creates detailed user profiles using GPT-4
- **Loading Screen**: Engaging loading experience with AI commentary
- **Morning Brief**: Personalized daily briefings with news, weather, and opportunities
- **Dashboard**: Complete user interface for viewing persona and brief

### 🔧 Technical Implementation
- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Authentication**: Google OAuth 2.0 with secure token handling
- **AI Integration**: OpenAI GPT-4 for persona generation, GPT-4-mini for loading comments
- **Calendar API**: Google Calendar integration with event categorization
- **Responsive Design**: Mobile-friendly interface
- **Error Handling**: Comprehensive error states and loading indicators

## API Endpoints

- `POST /api/auth/google` - Google OAuth authentication
- `GET /api/calendar` - Fetch calendar events
- `POST /api/calendar` - Create calendar events
- `POST /api/persona` - Generate user persona
- `POST /api/brief` - Generate morning brief

## File Structure

```
loop-app/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   └── page.tsx          # Landing page
├── components/            # React components
│   ├── LandingHero.tsx   # Landing page hero
│   ├── LoadingScreen.tsx # Loading experience
│   ├── PersonaDisplay.tsx # Persona visualization
│   └── MorningBrief.tsx  # Brief display
├── lib/                   # Utility libraries
│   ├── google-auth.ts    # Google authentication
│   ├── calendar-service.ts # Calendar operations
│   ├── persona-generator.ts # AI persona generation
│   └── brief-generator.ts # AI brief generation
├── types/                 # TypeScript definitions
│   ├── calendar.ts       # Calendar types
│   ├── persona.ts       # Persona types
│   └── brief.ts         # Brief types
└── public/               # Static assets
```

## Usage

1. **Landing Page**: Visit the homepage to see the product overview
2. **Authentication**: Click "Connect Your Calendar" to sign in with Google
3. **Loading**: Watch the AI analyze your calendar with witty commentary
4. **Dashboard**: View your personalized persona and morning brief
5. **Daily Use**: Return daily for updated briefings and insights

## Development

### Adding New Features

1. **New API Routes**: Add to `app/api/` directory
2. **New Components**: Add to `components/` directory
3. **New Types**: Add to `types/` directory
4. **New Services**: Add to `lib/` directory

### Testing

```bash
# Run type checking
npm run build

# Start development server
npm run dev
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Heroku
- AWS Amplify

## Troubleshooting

### Common Issues

1. **Google OAuth Error**: Check client ID and redirect URI
2. **OpenAI API Error**: Verify API key and credits
3. **Calendar Access Denied**: Ensure calendar permissions are granted
4. **Build Errors**: Check TypeScript types and imports

### Debug Mode

Set `NODE_ENV=development` to enable detailed error messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub

---

**Happy coding! 🚀**
