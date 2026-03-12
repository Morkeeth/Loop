import type { PersonaProfile } from '@/types/persona';

/**
 * Twitter/X profile data from Supabase user_metadata.
 * Supabase stores Twitter profile info when users sign in via Twitter OAuth.
 */
export interface TwitterProfile {
  user_name?: string;        // @handle
  full_name?: string;        // display name
  avatar_url?: string;
  description?: string;      // bio
  location?: string;         // self-reported location
  provider_id?: string;
  // Extended fields Supabase may include
  [key: string]: any;
}

interface TwitterSignals {
  interests: string[];
  traits: string[];
  industry: string | null;
  location: string | null;
  socialStyle: string;
  bio: string | null;
}

/** Known interest keywords mapped from bio text */
const INTEREST_PATTERNS: Record<string, string[]> = {
  'tech': ['tech', 'software', 'developer', 'engineer', 'code', 'coding', 'programming', 'ai', 'ml', 'data', 'web3', 'crypto', 'blockchain', 'saas', 'devops', 'frontend', 'backend', 'fullstack'],
  'design': ['design', 'designer', 'ux', 'ui', 'figma', 'creative', 'art director', 'graphic'],
  'startup': ['founder', 'startup', 'entrepreneur', 'ceo', 'cto', 'co-founder', 'building', 'yc', 'vc', 'investor'],
  'fitness': ['fitness', 'gym', 'running', 'runner', 'marathon', 'crossfit', 'lifting', 'yoga', 'athlete'],
  'music': ['music', 'musician', 'producer', 'dj', 'singer', 'songwriter', 'beats', 'vinyl'],
  'art': ['art', 'artist', 'painter', 'gallery', 'creative', 'photography', 'photographer', 'film', 'filmmaker'],
  'food': ['food', 'foodie', 'chef', 'cooking', 'restaurant', 'wine', 'coffee'],
  'travel': ['travel', 'traveler', 'nomad', 'exploring', 'wanderlust', 'expat'],
  'writing': ['writer', 'writing', 'author', 'journalist', 'editor', 'content', 'blog', 'newsletter', 'substack'],
  'gaming': ['gaming', 'gamer', 'esports', 'twitch', 'streamer'],
  'finance': ['finance', 'trading', 'investing', 'fintech', 'defi', 'markets'],
  'science': ['science', 'research', 'phd', 'neuroscience', 'biology', 'physics', 'chemistry'],
  'fashion': ['fashion', 'style', 'streetwear', 'vintage'],
  'politics': ['politics', 'policy', 'activism', 'advocacy'],
};

/** Personality trait patterns from bio language */
const TRAIT_PATTERNS: Record<string, string[]> = {
  'builder': ['building', 'making', 'shipping', 'creating', 'maker', 'hacker'],
  'contrarian': ['contrarian', 'skeptic', 'against', 'unpopular', 'hot takes'],
  'community-oriented': ['community', 'collective', 'organizer', 'host', 'curator'],
  'introspective': ['learning', 'growing', 'thinking', 'curious', 'exploring ideas'],
  'ambitious': ['ambitious', 'hustling', 'grinding', 'obsessed', 'relentless'],
  'creative': ['creative', 'dreamer', 'storyteller', 'visionary', 'imagination'],
  'analytical': ['data', 'analytics', 'systems', 'optimization', 'metrics'],
  'social': ['connector', 'networking', 'people', 'introductions', 'social'],
};

/** Industry detection from bio */
const INDUSTRY_PATTERNS: Record<string, string[]> = {
  'tech': ['tech', 'software', 'saas', 'ai', 'ml', 'web3', 'developer', 'engineer'],
  'finance': ['finance', 'fintech', 'banking', 'trading', 'vc', 'investing'],
  'media': ['media', 'journalism', 'content', 'publishing', 'newsletter'],
  'design': ['design', 'ux', 'ui', 'branding', 'creative agency'],
  'healthcare': ['health', 'medical', 'biotech', 'pharma', 'wellness'],
  'education': ['education', 'teaching', 'edtech', 'professor', 'academic'],
  'entertainment': ['entertainment', 'film', 'music', 'gaming', 'media'],
  'consulting': ['consulting', 'advisory', 'strategy', 'mckinsey', 'bcg'],
};

/**
 * Extract structured signals from a Twitter bio and profile.
 */
function extractSignals(profile: TwitterProfile): TwitterSignals {
  const bio = (profile.description || '').toLowerCase();
  const name = (profile.full_name || '').toLowerCase();
  const handle = (profile.user_name || '').toLowerCase();

  // Extract interests
  const interests: Set<string> = new Set();
  for (const [interest, keywords] of Object.entries(INTEREST_PATTERNS)) {
    if (keywords.some(kw => bio.includes(kw) || handle.includes(kw))) {
      interests.add(interest);
    }
  }

  // Extract traits
  const traits: Set<string> = new Set();
  for (const [trait, keywords] of Object.entries(TRAIT_PATTERNS)) {
    if (keywords.some(kw => bio.includes(kw))) {
      traits.add(trait);
    }
  }

  // Detect industry
  let industry: string | null = null;
  for (const [ind, keywords] of Object.entries(INDUSTRY_PATTERNS)) {
    if (keywords.some(kw => bio.includes(kw))) {
      industry = ind;
      break;
    }
  }

  // Infer social style from bio length and content
  let socialStyle = 'moderate';
  if (bio.length > 120) socialStyle = 'expressive';
  if (bio.length < 30 && bio.length > 0) socialStyle = 'minimal';
  if (bio.includes('dm') || bio.includes('connect') || bio.includes('collab')) socialStyle = 'open-networker';
  if (!bio) socialStyle = 'private';

  // Location from Twitter profile
  const location = profile.location || null;

  return {
    interests: [...interests],
    traits: [...traits],
    industry,
    location,
    socialStyle,
    bio: profile.description || null,
  };
}

/**
 * Merge Twitter signals into an existing PersonaProfile.
 * Twitter data supplements but doesn't override calendar-derived data.
 */
export function enrichPersonaWithTwitter(
  persona: PersonaProfile,
  twitterProfile: TwitterProfile
): PersonaProfile {
  const signals = extractSignals(twitterProfile);

  // Merge interests (deduplicate)
  const mergedHobbies = [...new Set([...persona.interests.hobbies, ...signals.interests])];
  const mergedEntertainment = [...new Set([...persona.interests.entertainment, ...signals.interests])];

  // Merge traits
  const mergedTraits = [...new Set([...persona.personality.traits, ...signals.traits])];

  // Use Twitter industry only if persona doesn't have one
  const industry = persona.professional.industry || signals.industry || undefined;

  // Use Twitter location as fallback
  const primaryLocation = persona.location.primaryLocation === 'your city'
    ? (signals.location || persona.location.primaryLocation)
    : persona.location.primaryLocation;

  const frequentLocations = signals.location && !persona.location.frequentLocations.includes(signals.location)
    ? [...persona.location.frequentLocations, signals.location]
    : persona.location.frequentLocations;

  // Merge social preferences
  const socialPrefs = [...new Set([...persona.social.socialPreferences, signals.socialStyle])];

  // Boost confidence slightly when we have Twitter data
  const confidenceBoost = 0.1;

  return {
    ...persona,
    professional: {
      ...persona.professional,
      industry,
    },
    interests: {
      ...persona.interests,
      hobbies: mergedHobbies,
      entertainment: mergedEntertainment,
    },
    social: {
      ...persona.social,
      socialPreferences: socialPrefs,
    },
    location: {
      ...persona.location,
      primaryLocation,
      frequentLocations,
    },
    personality: {
      ...persona.personality,
      traits: mergedTraits,
    },
    confidence: {
      overall: Math.min(1, persona.confidence.overall + confidenceBoost),
      professional: Math.min(1, persona.confidence.professional + (signals.industry ? confidenceBoost : 0)),
      social: Math.min(1, persona.confidence.social + confidenceBoost),
      lifestyle: Math.min(1, persona.confidence.lifestyle + (signals.interests.length > 2 ? confidenceBoost : 0.05)),
    },
  };
}

/**
 * Build a text profile summary from Twitter data for the recommendations API.
 * Similar to archetypeToLoopProfile but from Twitter signals.
 */
export function twitterToLoopProfile(twitterProfile: TwitterProfile): string {
  const signals = extractSignals(twitterProfile);

  const lines: string[] = [];

  if (twitterProfile.user_name) lines.push(`HANDLE: @${twitterProfile.user_name}`);
  if (twitterProfile.description) lines.push(`BIO: ${twitterProfile.description}`);
  if (signals.location) lines.push(`LOCATION: ${signals.location}`);
  if (signals.interests.length) lines.push(`INTERESTS: ${signals.interests.join(', ')}`);
  if (signals.traits.length) lines.push(`TRAITS: ${signals.traits.join(', ')}`);
  if (signals.industry) lines.push(`INDUSTRY: ${signals.industry}`);
  lines.push(`SOCIAL STYLE: ${signals.socialStyle}`);

  lines.push('');
  lines.push('TWITTER PROFILE ENRICHMENT:');
  lines.push('This user connected their X/Twitter account. Use their bio, interests, and social signals to find events they would genuinely share or talk about on their timeline. Surface events that match their identity, not just their schedule.');

  return lines.join('\n');
}

/**
 * Extract TwitterProfile from Supabase session user_metadata.
 */
export function extractTwitterProfile(userMetadata: Record<string, any>): TwitterProfile | null {
  // Supabase stores Twitter data in user_metadata when provider is twitter
  if (!userMetadata) return null;

  const profile: TwitterProfile = {
    user_name: userMetadata.user_name || userMetadata.preferred_username || undefined,
    full_name: userMetadata.full_name || userMetadata.name || undefined,
    avatar_url: userMetadata.avatar_url || userMetadata.picture || undefined,
    description: userMetadata.description || userMetadata.bio || undefined,
    location: userMetadata.location || undefined,
    provider_id: userMetadata.provider_id || userMetadata.sub || undefined,
  };

  // Only return if we have at least a username or bio
  if (!profile.user_name && !profile.description) return null;

  return profile;
}
