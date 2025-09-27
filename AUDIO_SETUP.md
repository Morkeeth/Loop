# Environment Setup for Audio Digest Feature

To enable the audio digest feature with ElevenLabs text-to-speech, you need to add the following environment variables to your `.env.local` file:

```env
# ElevenLabs API Configuration
ELEVENLABS_API_KEY=sk_ca8cf3d9322103f3b698189985e2113f1a8825439218100a

# Next.js Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## How to add these variables:

1. Create or edit the `.env.local` file in your project root
2. Add the variables above
3. Restart your development server (`npm run dev`)

## Features enabled:

- ✅ Unique digest subpages at `/digest/audio/[id]`
- ✅ Text-to-speech generation using Marcel's French accent
- ✅ Big play button for audio playback
- ✅ Audio link in digest panel after generation

The audio digest feature is now fully integrated and ready to use!
