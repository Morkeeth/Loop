import type { FlashPersona } from '@/types/setup';
import type { PersonaProfile } from '@/types/persona';

const interestsFromString = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/** Convert flash persona to full PersonaProfile shape for recommendations API */
export function flashPersonaToPersonaProfile(flash: FlashPersona): PersonaProfile {
  const interests = interestsFromString(flash.interests);
  return {
    id: 'flash',
    userId: 'flash',
    generatedAt: new Date().toISOString(),
    professional: {
      jobTitle: flash.work || 'Professional',
      industry: 'tech',
      workPattern: 'flexible',
      meetingFrequency: 'medium',
      workLocation: 'hybrid',
      workHours: { start: '09:00', end: '18:00' },
    },
    education: { isStudent: false },
    interests: {
      hobbies: interests,
      sports: interests,
      recurringActivities: [],
      entertainment: interests,
    },
    social: {
      frequentContacts: [],
      socialEventFrequency: 'medium',
      socialPreferences: [],
    },
    schedule: {
      wakeTime: '07:00',
      sleepTime: '23:00',
      busyPeriods: [],
      freeTimeSlots: [],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    location: {
      primaryLocation: flash.city,
      travelPatterns: [],
      frequentLocations: [flash.city],
    },
    lifestyle: {
      exerciseRoutine: [],
      diningPreferences: [],
      entertainmentChoices: [],
      healthHabits: [],
    },
    personality: {
      traits: flash.vibe ? [flash.vibe] : [],
      communicationStyle: 'direct',
      productivityStyle: 'flexible',
      stressIndicators: [],
    },
    confidence: { overall: 0.9, professional: 0.8, social: 0.8, lifestyle: 0.9 },
  };
}

/** For display: persona object with profile (dashboard expects this shape) */
export function flashPersonaToDisplayPersona(flash: FlashPersona) {
  const interests = interestsFromString(flash.interests);
  return {
    profile: {
      home_base: { city: flash.city, country: 'Unknown' },
      primary_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      interests_tags: interests,
      role_type: flash.work || 'Professional',
      field: flash.work || 'Tech',
    },
    flash: true,
  };
}
