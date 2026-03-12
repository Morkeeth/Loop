import type { ArchetypeAnswers } from '@/types/setup';
import type { PersonaProfile } from '@/types/persona';

/** Build LOOP PROFILE text from archetype answers for the recommendations API */
export function archetypeToLoopProfile(a: ArchetypeAnswers): string {
  const signals: string[] = [];

  // Machine
  if (a.machine === 'M1/M2/M3') signals.push('builder signal');
  if (a.machine === 'Linux btw') signals.push('technical, independent');

  // Substance
  if (a.substance === 'Shrooms') signals.push('high openness');
  if (a.substance === 'Coffee is enough') signals.push('optimization-focused');
  if (a.substance === 'Alcohol') signals.push('social, experience-seeking');
  if (a.substance === 'Water') signals.push('discipline, clarity');

  // Epstein
  if (a.epstein === "Didn't kill himself") signals.push('low institutional trust');
  if (a.epstein === 'I think about it too much') signals.push('high openness, pattern-seeking');
  if (a.epstein === "I don't think about it") signals.push('pragmatic, forward-focused');

  // Sport
  if (a.sport === 'Running') signals.push('discipline, solo, metrics-driven');
  if (a.sport === 'Gym') signals.push('structure, progress-oriented');
  if (a.sport === 'Tennis') signals.push('competitive, social');
  if (a.sport === 'Chess counts') signals.push('strategic, depth over breadth');
  if (a.sport === 'I watch') signals.push('observer, culture consumer');

  // Era
  if (a.era === 'Building') signals.push('high agency');
  if (a.era === 'Healing') signals.push('recovery, intentional');
  if (a.era === 'Coasting') signals.push('content, low friction');
  if (a.era === 'Spiraling (productively)') signals.push('mentally restless');

  // Discovery
  if (a.discovery === 'Twitter/X') signals.push('early-adopter, signal-seeking');
  if (a.discovery === 'Group chat') signals.push('tribe, insider');
  if (a.discovery === 'TikTok') signals.push('algorithm-native');
  if (a.discovery === "I post, don't consume") signals.push('creator, opinionated');

  // Music
  if (a.music === 'Electronic') signals.push('club nights, festivals, late-night events');
  if (a.music === 'Hip-hop/R&B') signals.push('concerts, block parties, culture events');
  if (a.music === 'Indie/Alternative') signals.push('dive bars, small venues, DIY shows');
  if (a.music === 'Classical/Jazz') signals.push('gallery openings, concerts, intimate performances');
  if (a.music === "Whatever's on") signals.push('genre-agnostic, open to anything');

  // Friday
  if (a.friday === 'House party') signals.push('social, group events, spontaneous');
  if (a.friday === 'Nice dinner') signals.push('curated, quality over quantity');
  if (a.friday === 'Live show') signals.push('experience-driven, live events');
  if (a.friday === 'Solo night in') signals.push('intimate, quiet events, recharge');
  if (a.friday === "Something I haven't tried") signals.push('experimental, novelty-seeking');

  // Budget
  if (a.budget === 'Free or die') signals.push('free events only, community-driven');
  if (a.budget === 'Under 30\u20AC') signals.push('budget-conscious, accessible events');
  if (a.budget === 'Treat myself') signals.push('willing to spend, premium experiences');
  if (a.budget === 'Money is fake') signals.push('no cost filter, experience over price');

  const traits = [...new Set(signals)];
  const profileTraits = traits.length > 0 ? traits.join('. ') : 'Open to discovery';

  let summary = '';
  if (a.era === 'Building' || a.machine === 'M1/M2/M3') summary += 'High agency. ';
  if (a.epstein === "Didn't kill himself") summary += 'Skeptical of institutions. ';
  if (['Running', 'Gym'].includes(a.sport)) summary += 'Physically disciplined. ';
  if (a.era === 'Spiraling (productively)' || a.substance === 'Shrooms') summary += 'Mentally restless. ';
  summary += `Wants to feel like they found something, not that something found them. `;
  summary += `Surface events that feel underground, earned, slightly ahead of the curve. `;
  summary += `Skip anything with a logo wall or a ticket price ending in 99.`;

  return `AGE: ${a.age}
MACHINE: ${a.machine}${a.machine === 'M1/M2/M3' ? ' (builder signal)' : ''}
SUBSTANCE: ${a.substance}
ERA: ${a.era}
EPSTEIN: ${a.epstein}${a.epstein === "Didn't kill himself" ? ' (high openness, low institutional trust)' : ''}
SPORT: ${a.sport}${a.sport === 'Running' ? ' (discipline, solo, metrics-driven)' : ''}
DISCOVERY: ${a.discovery}
MUSIC: ${a.music}
FRIDAY: ${a.friday}
BUDGET: ${a.budget}

LOOP PROFILE:
${summary}`;
}

/** Convert archetype to full PersonaProfile for recommendations API */
export function archetypeToPersonaProfile(a: ArchetypeAnswers): PersonaProfile {
  const sportInterests = a.sport === 'I watch' ? ['events', 'culture'] : [a.sport.toLowerCase()];
  const interests = [
    a.sport,
    a.era.toLowerCase(),
    a.discovery.replace('/', '').toLowerCase(),
    a.substance.toLowerCase(),
    a.music ? a.music.toLowerCase() : '',
    a.friday ? a.friday.toLowerCase() : '',
  ].filter(Boolean);

  return {
    id: 'archetype',
    userId: 'archetype',
    generatedAt: new Date().toISOString(),
    professional: {
      jobTitle: a.era === 'Building' ? 'Builder' : 'Professional',
      industry: a.machine === 'M1/M2/M3' ? 'tech' : 'unknown',
      workPattern: 'flexible',
      meetingFrequency: 'medium',
      workLocation: 'hybrid',
      workHours: { start: '09:00', end: '18:00' },
    },
    education: { isStudent: false },
    interests: {
      hobbies: interests,
      sports: sportInterests,
      recurringActivities: [],
      entertainment: [...interests, ...(a.music ? [a.music.toLowerCase()] : []), ...(a.budget ? [a.budget.toLowerCase()] : [])],
    },
    social: {
      frequentContacts: [],
      socialEventFrequency: a.friday === 'Solo night in' ? 'low' : a.friday === 'House party' ? 'high' : 'medium',
      socialPreferences: a.friday === 'House party' ? ['group events', 'social'] : a.friday === 'Solo night in' ? ['intimate', 'quiet'] : a.friday === "Something I haven't tried" ? ['experimental', 'novelty'] : [],
    },
    schedule: {
      wakeTime: '07:00',
      sleepTime: '23:00',
      busyPeriods: [],
      freeTimeSlots: [],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    location: {
      primaryLocation: a.city || 'your city',
      travelPatterns: [],
      frequentLocations: [a.city || 'your city'],
    },
    lifestyle: {
      exerciseRoutine: a.sport !== 'I watch' ? [a.sport] : [],
      diningPreferences: [],
      entertainmentChoices: [],
      healthHabits: [],
    },
    personality: {
      traits: [a.era, a.substance],
      communicationStyle: 'direct',
      productivityStyle: 'flexible',
      stressIndicators: [],
    },
    confidence: { overall: 0.45, professional: 0.3, social: 0.4, lifestyle: 0.5 },
  };
}
