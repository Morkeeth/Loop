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

export default function SetupPage() {
  const router = useRouter();
  const [archetype, setArchetype] = useState<ArchetypeAnswers>(INITIAL_ARCHETYPE);
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
        if (parsed.archetype) setArchetype(parsed.archetype);
        if (parsed.openaiApiKey) setOpenaiKey(parsed.openaiApiKey);
        if (parsed.icalUrl) setIcalUrl(parsed.icalUrl);
      }
    } catch (_) {}
  }, []);

  const setArchetypeField = (field: keyof ArchetypeAnswers, value: string) => {
    setArchetype((a) => ({ ...a, [field]: value }));
  };

  const answeredCount = (archetype.city.trim() ? 1 : 0) + ARCHETYPE_QUESTIONS.filter((q) => archetype[q.id]).length;
  const totalQuestions = ARCHETYPE_QUESTIONS.length + 1; // +1 for city
  const allAnswered = answeredCount === totalQuestions;

  const handleFindEvent = async () => {
    if (!allAnswered) return;
    setIsSearching(true);
    setError('');
    setDiscoveredEvent(null);

    // Save setup to localStorage
    const setup: LoopSetup = {
      archetype,
      cadence: 'manual',
      completedAt: new Date().toISOString(),
    };
    if (openaiKey.trim()) setup.openaiApiKey = openaiKey.trim();
    if (icalUrl.trim()) setup.icalUrl = icalUrl.trim();
    localStorage.setItem(LOOP_SETUP_KEY, JSON.stringify(setup));

    try {
      // Build a profile from archetype answers
      const { archetypeToLoopProfile } = await import('@/lib/archetype-profile');
      const profile = archetypeToLoopProfile(archetype);

      // Build a minimal persona object the API expects
      const minimalPersona = {
        interests: {
          hobbies: [] as string[],
          sports: [] as string[],
          entertainment: [] as string[],
          recurringActivities: [],
        },
        professional: { industry: 'unknown' },
        location: { primaryLocation: archetype.city },
        personality: {},
        lifestyle: {},
      };

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: minimalPersona,
          calendarEvents: [],
          userLocation: {
            city: archetype.city,
            country: '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
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
      // Extract event from nested response: { recommendations: [{ recommendations: [event] }] }
      const event = data.recommendations?.[0]?.recommendations?.[0] || data.recommendations?.[0] || data.event;
      if (event && (event.title || event.event_title)) {
        // Normalize field names
        setDiscoveredEvent({
          event_title: event.title || event.event_title,
          venue: event.location || event.venue,
          date: event.date,
          time: event.start_time || event.time,
          description: event.description,
          why_this: event.why || event.why_this || event.description,
          cost: event.cost,
          url: event.source_url || event.link || event.url,
        });
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        throw new Error('No events found — try a different city or tweak your answers');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-20 backdrop-blur-md bg-white/80 border-b border-black/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6" viewBox="0 0 23.5703 21.5332" fill="black">
                <path d="M7.61523 7.28711C9.63867 7.28711 11.2656 5.64648 11.2656 3.63672C11.2656 1.62695 9.63867 0 7.61523 0C5.60547 0 3.97852 1.62695 3.97852 3.63672C3.97852 5.64648 5.60547 7.28711 7.61523 7.28711ZM7.61523 5.30469C6.69922 5.30469 5.94727 4.55273 5.94727 3.63672C5.94727 2.7207 6.69922 1.96875 7.61523 1.96875C8.54492 1.96875 9.29688 2.7207 9.29688 3.63672C9.29688 4.55273 8.54492 5.30469 7.61523 5.30469ZM15.5996 7.28711C17.6094 7.28711 19.2363 5.64648 19.2363 3.63672C19.2363 1.62695 17.6094 0 15.5996 0C13.5898 0 11.9492 1.62695 11.9492 3.63672C11.9492 5.64648 13.5898 7.28711 15.5996 7.28711ZM15.5996 5.30469C14.6836 5.30469 13.9316 4.55273 13.9316 3.63672C13.9316 2.7207 14.6836 1.96875 15.5996 1.96875C16.5156 1.96875 17.2676 2.7207 17.2676 3.63672C17.2676 4.55273 16.5156 5.30469 15.5996 5.30469ZM3.65039 14.4102C5.66016 14.4102 7.28711 12.7695 7.28711 10.7598C7.28711 8.75 5.66016 7.10938 3.65039 7.10938C1.62695 7.10938 0 8.75 0 10.7598C0 12.7695 1.62695 14.4102 3.65039 14.4102ZM3.65039 12.4277C2.7207 12.4277 1.96875 11.6758 1.96875 10.7598C1.96875 9.84375 2.7207 9.0918 3.65039 9.0918C4.56641 9.0918 5.31836 9.84375 5.31836 10.7598C5.31836 11.6758 4.56641 12.4277 3.65039 12.4277ZM19.5781 14.4102C21.5879 14.4102 23.2148 12.7695 23.2148 10.7598C23.2148 8.75 21.5879 7.10938 19.5781 7.10938C17.5684 7.10938 15.9277 8.75 15.9277 10.7598C15.9277 12.7695 17.5684 14.4102 19.5781 14.4102ZM19.5781 12.4277C18.6484 12.4277 17.8965 11.6758 17.8965 10.7598C17.8965 9.84375 18.6484 9.0918 19.5781 9.0918C20.4941 9.0918 21.2461 9.84375 21.2461 10.7598C21.2461 11.6758 20.4941 12.4277 19.5781 12.4277ZM7.61523 21.5332C9.63867 21.5332 11.2656 19.9062 11.2656 17.8965C11.2656 15.8867 9.63867 14.2461 7.61523 14.2461C5.60547 14.2461 3.97852 15.8867 3.97852 17.8965C3.97852 19.9062 5.60547 21.5332 7.61523 21.5332ZM7.61523 19.5645C6.69922 19.5645 5.94727 18.8125 5.94727 17.8965C5.94727 16.9805 6.69922 16.2285 7.61523 16.2285C8.54492 16.2285 9.29688 16.9805 9.29688 17.8965C9.29688 18.8125 8.54492 19.5645 7.61523 19.5645ZM15.5996 21.5332C17.6094 21.5332 19.2363 19.9062 19.2363 17.8965C19.2363 15.8867 17.6094 14.2461 15.5996 14.2461C13.5898 14.2461 11.9492 15.8867 11.9492 17.8965C11.9492 19.9062 13.5898 21.5332 15.5996 21.5332ZM15.5996 19.5645C14.6836 19.5645 13.9316 18.8125 13.9316 17.8965C13.9316 16.9805 14.6836 16.2285 15.5996 16.2285C16.5156 16.2285 17.2676 16.9805 17.2676 17.8965C17.2676 18.8125 16.5156 19.5645 15.5996 19.5645Z" />
              </svg>
              <span className="text-xl font-bold">Loop</span>
            </div>
            {allAnswered && !isSearching && !discoveredEvent && (
              <span className="text-xs text-gray-400">{answeredCount}/{totalQuestions}</span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center pt-24 px-6 pb-16">
        <div className="w-full max-w-md">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100 rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all duration-500"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>

          <h1 className="text-2xl font-bold mb-1">Tell us who you are</h1>
          <p className="text-sm text-gray-500 mb-8">
            10 questions. 15 seconds. We'll find your perfect event.
          </p>

          <div className="space-y-6">
            {/* City */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Your city</label>
              <input
                type="text"
                value={archetype.city}
                onChange={(e) => setArchetypeField('city', e.target.value)}
                placeholder="Amsterdam, Paris, New York..."
                className="w-full px-4 py-3 text-base border-2 border-black/15 focus:border-black focus:outline-none transition-colors"
              />
            </div>

            {/* Questions */}
            {ARCHETYPE_QUESTIONS.map((q) => (
              <div key={q.id}>
                <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">{q.label}</label>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setArchetypeField(q.id, opt)}
                      className={`px-4 py-2.5 text-sm font-medium border-2 transition-all ${
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

          {/* Find my event button */}
          <div className={`mt-10 transition-all duration-500 ${allAnswered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            {!discoveredEvent && (
              <>
                <button
                  onClick={handleFindEvent}
                  disabled={isSearching}
                  className="w-full py-4 text-lg font-bold bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Finding your event...
                    </span>
                  ) : (
                    'Find my event →'
                  )}
                </button>

                {/* Optional extras toggle */}
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
                      <p className="text-[10px] text-gray-400 mt-1">
                        Connect calendar for smarter picks. Works with Apple, Outlook, Google.
                      </p>
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
                      <p className="text-[10px] text-gray-400 mt-1">
                        Free by default. Add your key for GPT-5 recommendations.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="mt-4 p-4 border-2 border-red-200 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Discovered event result */}
          {discoveredEvent && (
            <div ref={resultRef} className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="border-2 border-black p-6">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Your event this week</p>
                <h2 className="text-2xl font-bold mb-2">{discoveredEvent.event_title || discoveredEvent.title}</h2>
                {(discoveredEvent.venue || discoveredEvent.location) && (
                  <p className="text-sm text-gray-600 mb-1">{discoveredEvent.venue || discoveredEvent.location}</p>
                )}
                {(discoveredEvent.date || discoveredEvent.time) && (
                  <p className="text-sm text-gray-500 mb-4">
                    {discoveredEvent.date}{discoveredEvent.time ? ` at ${discoveredEvent.time}` : ''}
                  </p>
                )}
                {(discoveredEvent.description || discoveredEvent.why_this) && (
                  <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                    {discoveredEvent.why_this || discoveredEvent.description}
                  </p>
                )}
                {(discoveredEvent.cost || discoveredEvent.price) && (
                  <p className="text-xs text-gray-500 mb-4">{discoveredEvent.cost || discoveredEvent.price}</p>
                )}
                {discoveredEvent.url && (
                  <a
                    href={discoveredEvent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm font-medium underline hover:no-underline mb-4"
                  >
                    View details
                  </a>
                )}

                <div className="flex gap-3 mt-4 pt-4 border-t border-black/10">
                  <button
                    onClick={handleFindEvent}
                    disabled={isSearching}
                    className="flex-1 py-3 text-sm font-bold border-2 border-black text-black bg-white hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                  >
                    {isSearching ? 'Searching...' : 'Find another'}
                  </button>
                  <button
                    onClick={handleGoToDashboard}
                    className="flex-1 py-3 text-sm font-bold bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors"
                  >
                    Go to dashboard
                  </button>
                </div>
              </div>

              <p className="text-center mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="text-xs text-gray-400 hover:text-black transition-colors"
                >
                  Connect Google Calendar for better picks →
                </button>
              </p>
            </div>
          )}

          {!discoveredEvent && !allAnswered && (
            <p className="mt-10 text-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-sm text-gray-400 hover:text-black transition-colors"
              >
                ← Back to home
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
