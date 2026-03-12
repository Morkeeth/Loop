export interface FlashPersona {
  city: string;
  interests: string;
  work: string;
  building: string;
  vibe: string;
}

export interface ArchetypeAnswers {
  city: string;
  age: string;
  machine: string;
  substance: string;
  era: string;
  epstein: string;
  sport: string;
  discovery: string;
  music: string;
  friday: string;
  budget: string;
}

export interface LoopSetup {
  /** Legacy flash persona or new archetype */
  persona?: FlashPersona;
  archetype?: ArchetypeAnswers;
  openaiApiKey?: string;
  cadence: 'weekly' | 'biweekly' | 'manual';
  completedAt?: string;
  icalUrl?: string;
}

export const LOOP_SETUP_KEY = 'loopSetup';

export const ARCHETYPE_QUESTIONS = [
  { id: 'age' as const, label: 'Age', options: ['18–25', '26–35', '36+'] },
  { id: 'machine' as const, label: 'Your machine', options: ['M1/M2/M3', 'Windows', 'Linux btw', 'iPad somehow'] },
  { id: 'substance' as const, label: 'Your substance', options: ['Water', 'Alcohol', 'Shrooms', 'Coffee is enough'] },
  { id: 'era' as const, label: 'Your current era', options: ['Building', 'Healing', 'Coasting', 'Spiraling (productively)'] },
  { id: 'epstein' as const, label: 'Jeffrey Epstein', options: ['Killed himself', "Didn't kill himself", "I don't think about it", 'I think about it too much'] },
  { id: 'sport' as const, label: 'Your sport', options: ['Tennis', 'Running', 'Gym', 'Chess counts', 'I watch'] },
  { id: 'discovery' as const, label: 'How you find out about things', options: ['Twitter/X', 'Group chat', 'TikTok', "I post, don't consume"] },
  { id: 'music' as const, label: 'Your sound', options: ['Electronic', 'Hip-hop/R&B', 'Indie/Alternative', 'Classical/Jazz', "Whatever's on"] },
  { id: 'friday' as const, label: 'Ideal Friday night', options: ['House party', 'Nice dinner', 'Live show', 'Solo night in', "Something I haven't tried"] },
  { id: 'budget' as const, label: 'Event budget vibe', options: ['Free or die', 'Under 30\u20AC', 'Treat myself', 'Money is fake'] },
] as const;
