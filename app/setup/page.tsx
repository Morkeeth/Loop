'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LoopSetup, LOOP_SETUP_KEY, ARCHETYPE_QUESTIONS, type ArchetypeAnswers } from '@/types/setup';

const INITIAL_ARCHETYPE: ArchetypeAnswers = {
  city: '',
  age: '',
  machine: '',
  substance: '',
  era: '',
  epstein: '',
  sport: '',
  discovery: '',
  music: '',
  friday: '',
  budget: '',
};

// Pre-built archetypes — pick one and go
const QUICK_ARCHETYPES = [
  {
    id: 'techbro',
    emoji: '💻',
    name: 'The Tech Bro',
    vibe: 'Startup talks, crypto meetups, biohacking',
    answers: {
      age: '26–35', machine: 'M1/M2/M3', substance: 'Coffee is enough',
      era: 'Building', epstein: "Didn't kill himself", sport: 'Gym',
      discovery: 'Twitter/X', music: 'Electronic', friday: 'Nice dinner', budget: 'Treat myself',
    },
  },
  {
    id: 'creativechaos',
    emoji: '🎨',
    name: 'Creative Chaos',
    vibe: 'Gallery openings, DIY shows, weird workshops',
    answers: {
      age: '26–35', machine: 'M1/M2/M3', substance: 'Shrooms',
      era: 'Spiraling (productively)', epstein: 'I think about it too much', sport: 'Chess counts',
      discovery: "I post, don't consume", music: 'Indie/Alternative', friday: "Something I haven't tried", budget: 'Under 30€',
    },
  },
  {
    id: 'maincharacter',
    emoji: '✨',
    name: 'Main Character',
    vibe: 'Rooftop parties, concerts, immersive experiences',
    answers: {
      age: '18–25', machine: 'iPad somehow', substance: 'Alcohol',
      era: 'Coasting', epstein: "I don't think about it", sport: 'I watch',
      discovery: 'TikTok', music: 'Hip-hop/R&B', friday: 'House party', budget: 'Money is fake',
    },
  },
  {
    id: 'optimizer',
    emoji: '📊',
    name: 'The Optimizer',
    vibe: 'Marathons, productivity meetups, silent retreats',
    answers: {
      age: '26–35', machine: 'M1/M2/M3', substance: 'Water',
      era: 'Building', epstein: "I don't think about it", sport: 'Running',
      discovery: 'Twitter/X', music: "Whatever's on", friday: 'Solo night in', budget: 'Free or die',
    },
  },
  {
    id: 'culturevulture',
    emoji: '🎭',
    name: 'Culture Vulture',
    vibe: 'Jazz clubs, film screenings, book launches',
    answers: {
      age: '36+', machine: 'M1/M2/M3', substance: 'Coffee is enough',
      era: 'Coasting', epstein: "I don't think about it", sport: 'Tennis',
      discovery: 'Group chat', music: 'Classical/Jazz', friday: 'Live show', budget: 'Treat myself',
    },
  },
  {
    id: 'undergroundking',
    emoji: '🌙',
    name: 'Underground',
    vibe: 'Warehouse raves, pop-ups, secret supper clubs',
    answers: {
      age: '18–25', machine: 'Linux btw', substance: 'Shrooms',
      era: 'Spiraling (productively)', epstein: "Didn't kill himself", sport: 'I watch',
      discovery: 'Group chat', music: 'Electronic', friday: "Something I haven't tried", budget: 'Under 30€',
    },
  },
];

type Mode = 'pick' | 'quiz' | 'searching' | 'result';

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('pick');
  const [archetype, setArchetype] = useState<ArchetypeAnswers>(INITIAL_ARCHETYPE);
  const [city, setCity] = useState('');
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredEvent, setDiscoveredEvent] = useState<any>(null);
  const [error, setError] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const [icalUrl, setIcalUrl] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOOP_SETUP_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LoopSetup;
        if (parsed.archetype) {
          setArchetype(parsed.archetype);
          if (parsed.archetype.city) setCity(parsed.archetype.city);
        }
        if (parsed.openaiApiKey) setOpenaiKey(parsed.openaiApiKey);
        if (parsed.icalUrl) setIcalUrl(parsed.icalUrl);
      }
    } catch (_) {}
  }, []);

  const setArchetypeField = (field: keyof ArchetypeAnswers, value: string) => {
    setArchetype((a) => ({ ...a, [field]: value }));
  };

  const answeredCount = (archetype.city.trim() ? 1 : 0) + ARCHETYPE_QUESTIONS.filter((q) => archetype[q.id]).length;
  const totalQuestions = ARCHETYPE_QUESTIONS.length + 1;
  const allAnswered = answeredCount === totalQuestions;

  const handlePickArchetype = (arch: typeof QUICK_ARCHETYPES[0]) => {
    setSelectedArchetypeId(arch.id);
    setArchetype({ ...arch.answers, city });
  };

  const handleFindEvent = async (overrideArchetype?: ArchetypeAnswers) => {
    const answers = overrideArchetype || archetype;
    const userCity = answers.city || city;
    if (!userCity.trim()) {
      setError('Enter your city first');
      return;
    }

    setMode('searching');
    setIsSearching(true);
    setError('');
    setDiscoveredEvent(null);

    const finalAnswers = { ...answers, city: userCity };

    // Save to localStorage
    const setup: LoopSetup = {
      archetype: finalAnswers,
      cadence: 'manual',
      completedAt: new Date().toISOString(),
    };
    if (openaiKey.trim()) setup.openaiApiKey = openaiKey.trim();
    if (icalUrl.trim()) setup.icalUrl = icalUrl.trim();
    localStorage.setItem(LOOP_SETUP_KEY, JSON.stringify(setup));

    try {
      const { archetypeToLoopProfile } = await import('@/lib/archetype-profile');
      const profile = archetypeToLoopProfile(finalAnswers);

      const minimalPersona = {
        interests: { hobbies: [] as string[], sports: [] as string[], entertainment: [] as string[], recurringActivities: [] },
        professional: { industry: 'unknown' },
        location: { primaryLocation: userCity },
        personality: {},
        lifestyle: {},
      };

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: minimalPersona,
          calendarEvents: [],
          userLocation: { city: userCity, country: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          currentDate: new Date().toISOString(),
          archetypeProfile: profile,
          userApiKey: openaiKey.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const event = data.recommendations?.[0]?.recommendations?.[0] || data.recommendations?.[0] || data.event;
      if (event && (event.title || event.event_title)) {
        setDiscoveredEvent({
          event_title: event.title || event.event_title,
          venue: event.location || event.venue,
          date: event.date,
          time: event.start_time || event.time,
          description: event.description,
          why_this: event.why || event.why_this || event.description,
          cost: event.cost,
          url: event.source_url || event.link || event.url,
          vibe: event.vibe,
          category: event.category,
        });
        setMode('result');
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        throw new Error('No events found — try a different city');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setMode('pick');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-20 backdrop-blur-md bg-white/80 border-b border-black/10">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/')} className="flex items-center space-x-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 23.5703 21.5332" fill="black">
                <path d="M7.61523 7.28711C9.63867 7.28711 11.2656 5.64648 11.2656 3.63672C11.2656 1.62695 9.63867 0 7.61523 0C5.60547 0 3.97852 1.62695 3.97852 3.63672C3.97852 5.64648 5.60547 7.28711 7.61523 7.28711ZM7.61523 5.30469C6.69922 5.30469 5.94727 4.55273 5.94727 3.63672C5.94727 2.7207 6.69922 1.96875 7.61523 1.96875C8.54492 1.96875 9.29688 2.7207 9.29688 3.63672C9.29688 4.55273 8.54492 5.30469 7.61523 5.30469ZM15.5996 7.28711C17.6094 7.28711 19.2363 5.64648 19.2363 3.63672C19.2363 1.62695 17.6094 0 15.5996 0C13.5898 0 11.9492 1.62695 11.9492 3.63672C11.9492 5.64648 13.5898 7.28711 15.5996 7.28711ZM15.5996 5.30469C14.6836 5.30469 13.9316 4.55273 13.9316 3.63672C13.9316 2.7207 14.6836 1.96875 15.5996 1.96875C16.5156 1.96875 17.2676 2.7207 17.2676 3.63672C17.2676 4.55273 16.5156 5.30469 15.5996 5.30469ZM3.65039 14.4102C5.66016 14.4102 7.28711 12.7695 7.28711 10.7598C7.28711 8.75 5.66016 7.10938 3.65039 7.10938C1.62695 7.10938 0 8.75 0 10.7598C0 12.7695 1.62695 14.4102 3.65039 14.4102ZM3.65039 12.4277C2.7207 12.4277 1.96875 11.6758 1.96875 10.7598C1.96875 9.84375 2.7207 9.0918 3.65039 9.0918C4.56641 9.0918 5.31836 9.84375 5.31836 10.7598C5.31836 11.6758 4.56641 12.4277 3.65039 12.4277ZM19.5781 14.4102C21.5879 14.4102 23.2148 12.7695 23.2148 10.7598C23.2148 8.75 21.5879 7.10938 19.5781 7.10938C17.5684 7.10938 15.9277 8.75 15.9277 10.7598C15.9277 12.7695 17.5684 14.4102 19.5781 14.4102ZM19.5781 12.4277C18.6484 12.4277 17.8965 11.6758 17.8965 10.7598C17.8965 9.84375 18.6484 9.0918 19.5781 9.0918C20.4941 9.0918 21.2461 9.84375 21.2461 10.7598C21.2461 11.6758 20.4941 12.4277 19.5781 12.4277ZM7.61523 21.5332C9.63867 21.5332 11.2656 19.9062 11.2656 17.8965C11.2656 15.8867 9.63867 14.2461 7.61523 14.2461C5.60547 14.2461 3.97852 15.8867 3.97852 17.8965C3.97852 19.9062 5.60547 21.5332 7.61523 21.5332ZM7.61523 19.5645C6.69922 19.5645 5.94727 18.8125 5.94727 17.8965C5.94727 16.9805 6.69922 16.2285 7.61523 16.2285C8.54492 16.2285 9.29688 16.9805 9.29688 17.8965C9.29688 18.8125 8.54492 19.5645 7.61523 19.5645ZM15.5996 21.5332C17.6094 21.5332 19.2363 19.9062 19.2363 17.8965C19.2363 15.8867 17.6094 14.2461 15.5996 14.2461C13.5898 14.2461 11.9492 15.8867 11.9492 17.8965C11.9492 19.9062 13.5898 21.5332 15.5996 21.5332ZM15.5996 19.5645C14.6836 19.5645 13.9316 18.8125 13.9316 17.8965C13.9316 16.9805 14.6836 16.2285 15.5996 16.2285C16.5156 16.2285 17.2676 16.9805 17.2676 17.8965C17.2676 18.8125 16.5156 19.5645 15.5996 19.5645Z" />
              </svg>
              <span className="text-lg sm:text-xl font-bold">Loop</span>
            </button>
            {mode === 'quiz' && (
              <button onClick={() => setMode('pick')} className="text-xs text-gray-400 hover:text-black">
                ← Back to archetypes
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center pt-20 sm:pt-24 px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="w-full max-w-lg">

          {/* ===== PICK MODE: Archetype cards ===== */}
          {mode === 'pick' && (
            <>
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Pick your archetype</h1>
                <p className="text-sm sm:text-base text-gray-500">
                  One tap. We'll find your perfect event.
                </p>
              </div>

              {/* City input */}
              <div className="mb-6">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Your city (Amsterdam, Paris, NYC...)"
                  className="w-full px-4 py-3.5 text-base sm:text-lg font-medium text-center border-2 border-black/15 focus:border-black focus:outline-none transition-colors"
                />
              </div>

              {/* Archetype grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                {QUICK_ARCHETYPES.map((arch) => (
                  <button
                    key={arch.id}
                    onClick={() => handlePickArchetype(arch)}
                    className={`text-left p-4 sm:p-5 border-2 transition-all active:scale-[0.98] ${
                      selectedArchetypeId === arch.id
                        ? 'border-black bg-black text-white'
                        : 'border-black/15 hover:border-black/40'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl block mb-2">{arch.emoji}</span>
                    <span className="text-sm sm:text-base font-bold block mb-1">{arch.name}</span>
                    <span className={`text-[11px] sm:text-xs leading-tight ${
                      selectedArchetypeId === arch.id ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {arch.vibe}
                    </span>
                  </button>
                ))}
              </div>

              {/* Find event button */}
              <div className={`transition-all duration-300 ${selectedArchetypeId && city.trim() ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                <button
                  onClick={() => handleFindEvent()}
                  className="w-full py-4 text-base sm:text-lg font-bold bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors"
                >
                  Find my event →
                </button>
              </div>

              {/* Or customize */}
              <div className="text-center mt-6 space-y-2">
                <button
                  onClick={() => setMode('quiz')}
                  className="text-sm text-gray-400 hover:text-black transition-colors"
                >
                  None of these? Build your own →
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 border-2 border-red-200 bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}
            </>
          )}

          {/* ===== QUIZ MODE: Full 10-question quiz ===== */}
          {mode === 'quiz' && (
            <>
              {/* Progress bar */}
              <div className="h-1 bg-gray-100 rounded-full mb-6 sm:mb-8 overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all duration-500"
                  style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold mb-1">Build your profile</h1>
              <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
                10 questions. 15 seconds. Be honest.
              </p>

              <div className="space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Your city</label>
                  <input
                    type="text"
                    value={archetype.city}
                    onChange={(e) => { setArchetypeField('city', e.target.value); setCity(e.target.value); }}
                    placeholder="Amsterdam, Paris, New York..."
                    className="w-full px-4 py-3 text-base border-2 border-black/15 focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                {ARCHETYPE_QUESTIONS.map((q) => (
                  <div key={q.id}>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">{q.label}</label>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setArchetypeField(q.id, opt)}
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-2 transition-all active:scale-[0.97] ${
                            archetype[q.id] === opt
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-black border-black/15 hover:border-black/40'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Find event */}
              <div className={`mt-8 sm:mt-10 transition-all duration-500 ${allAnswered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <button
                  onClick={() => handleFindEvent()}
                  className="w-full py-4 text-base sm:text-lg font-bold bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors"
                >
                  Find my event →
                </button>

                <button
                  type="button"
                  onClick={() => setShowExtras(!showExtras)}
                  className="block mx-auto mt-4 text-xs text-gray-400 hover:text-black transition-colors"
                >
                  {showExtras ? 'Hide options' : 'Advanced options'}
                </button>

                {showExtras && (
                  <div className="mt-4 space-y-4 border-t border-black/10 pt-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">iCal URL (optional)</label>
                      <input
                        type="url"
                        value={icalUrl}
                        onChange={(e) => setIcalUrl(e.target.value)}
                        placeholder="https://calendar.google.com/calendar/ical/..."
                        className="w-full px-3 py-2.5 text-sm border-2 border-black/15 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">OpenAI key (optional)</label>
                      <input
                        type="password"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-... for premium model"
                        className="w-full px-3 py-2.5 text-sm border-2 border-black/15 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 border-2 border-red-200 bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}
            </>
          )}

          {/* ===== SEARCHING MODE ===== */}
          {mode === 'searching' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="relative mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Searching {city}...</h2>
              <p className="text-sm text-gray-500 max-w-xs">
                Finding the one event you shouldn't miss this week
              </p>
            </div>
          )}

          {/* ===== RESULT MODE ===== */}
          {mode === 'result' && discoveredEvent && (
            <div ref={resultRef}>
              <div className="text-center mb-6 sm:mb-8">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">Your event this week</p>
                <h1 className="text-2xl sm:text-3xl font-bold">The One.</h1>
              </div>

              <div className="border-2 border-black p-5 sm:p-8">
                {discoveredEvent.vibe && (
                  <span className="inline-block px-3 py-1 text-[10px] uppercase tracking-wider font-bold bg-black text-white mb-4">
                    {discoveredEvent.vibe}
                  </span>
                )}

                <h2 className="text-xl sm:text-2xl font-bold mb-3">{discoveredEvent.event_title}</h2>

                {discoveredEvent.venue && (
                  <p className="text-sm text-gray-600 mb-1">{discoveredEvent.venue}</p>
                )}

                {(discoveredEvent.date || discoveredEvent.time) && (
                  <p className="text-sm text-gray-500 mb-4">
                    {discoveredEvent.date}{discoveredEvent.time ? ` · ${discoveredEvent.time}` : ''}
                    {discoveredEvent.cost && discoveredEvent.cost !== 'unknown' ? ` · ${discoveredEvent.cost}` : ''}
                  </p>
                )}

                {discoveredEvent.why_this && (
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-5">
                    {discoveredEvent.why_this}
                  </p>
                )}

                {discoveredEvent.url && (
                  <a
                    href={discoveredEvent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 text-sm font-bold bg-black text-white hover:bg-white hover:text-black border-2 border-black transition-colors mb-4"
                  >
                    Get tickets / RSVP
                  </a>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setMode('pick'); setDiscoveredEvent(null); }}
                  className="flex-1 py-3.5 text-sm font-bold border-2 border-black text-black bg-white hover:bg-black hover:text-white transition-colors"
                >
                  Try again
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 py-3.5 text-sm font-bold bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors"
                >
                  Full dashboard
                </button>
              </div>

              <p className="text-center mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="text-xs text-gray-400 hover:text-black transition-colors"
                >
                  Connect Google Calendar for even better picks →
                </button>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
