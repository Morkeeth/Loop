'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoopSetup, LOOP_SETUP_KEY, ARCHETYPE_QUESTIONS, type ArchetypeAnswers } from '@/types/setup';

const CADENCE_OPTIONS: { value: LoopSetup['cadence']; label: string }[] = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'manual', label: 'Only when I run it' },
];

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
  const [step, setStep] = useState<1 | 2>(1);
  const [archetype, setArchetype] = useState<ArchetypeAnswers>(INITIAL_ARCHETYPE);
  const [openaiKey, setOpenaiKey] = useState('');
  const [cadence, setCadence] = useState<LoopSetup['cadence']>('weekly');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [icalUrl, setIcalUrl] = useState('');
  const [isConnectingTwitter, setIsConnectingTwitter] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOOP_SETUP_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LoopSetup;
        if (parsed.archetype) setArchetype(parsed.archetype);
        if (parsed.cadence) setCadence(parsed.cadence);
        if (parsed.openaiApiKey) setOpenaiKey(parsed.openaiApiKey);
        if (parsed.icalUrl) setIcalUrl(parsed.icalUrl);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get('step');
    if (stepParam === '2') setStep(2);
  }, []);

  const setArchetypeField = (field: keyof ArchetypeAnswers, value: string) => {
    setArchetype((a) => ({ ...a, [field]: value }));
  };

  const allAnswered = archetype.city.trim() && ARCHETYPE_QUESTIONS.every((q) => archetype[q.id]);

  const handlePersonaNext = () => {
    if (!allAnswered) return;
    setStep(2);
  };

  const handleGoogleConnect = async () => {
    setIsConnectingGoogle(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/setup?step=2')}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Auth error:', err);
      setIsConnectingGoogle(false);
    }
  };

  const handleTwitterConnect = async () => {
    setIsConnectingTwitter(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/setup?step=2')}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Auth error:', err);
      setIsConnectingTwitter(false);
    }
  };

  const handleFinish = () => {
    const setup: LoopSetup = {
      archetype,
      cadence,
      completedAt: new Date().toISOString(),
    };
    if (openaiKey.trim()) setup.openaiApiKey = openaiKey.trim();
    if (icalUrl.trim()) setup.icalUrl = icalUrl.trim();
    localStorage.setItem(LOOP_SETUP_KEY, JSON.stringify(setup));
    if (icalUrl.trim()) {
      router.push(`/dashboard?icalUrl=${encodeURIComponent(icalUrl.trim())}`);
    } else {
      router.push('/dashboard');
    }
  };
  const hasSupabase = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

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
            <span className="text-sm text-gray-500">Setup</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center pt-24 px-6 pb-12">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <div className="flex gap-2 mb-10">
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                step >= 1 ? 'bg-black' : 'bg-gray-200'
              }`}
            />
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                step >= 2 ? 'bg-black' : 'bg-gray-200'
              }`}
            />
          </div>

          {step === 1 ? (
            <>
              <h1 className="text-xl font-bold mb-1">Who are you (actually)</h1>
              <p className="text-xs text-gray-500 mb-6">
                15 seconds. Big dumb honest questions. Cambridge Analytica had 5 — we have 10.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">City</label>
                  <input
                    type="text"
                    value={archetype.city}
                    onChange={(e) => setArchetypeField('city', e.target.value)}
                    placeholder="Paris"
                    className="w-full px-3 py-2.5 text-lg border-2 border-black/20 focus:border-black focus:outline-none transition-colors"
                  />
                </div>
                {ARCHETYPE_QUESTIONS.map((q) => (
                  <div key={q.id}>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">{q.label}</label>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setArchetypeField(q.id, opt)}
                          className={`px-4 py-3 text-base font-medium border-2 transition-all ${
                            archetype[q.id] === opt
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-black border-black/20 hover:border-black/50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className={`mt-8 transition-opacity duration-300 ${allAnswered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={handlePersonaNext}
                  className="w-full py-4 text-lg font-bold bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors"
                >
                  Loop me in →
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-3">
                  Cambridge Analytica used 5 data points. We used 10. You&apos;re welcome.
                </p>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">Connect & schedule</h1>
              <p className="text-gray-600 mb-8">
                Connect your calendar and choose how often Loop runs.
              </p>

              <div className="space-y-4">
                {hasSupabase ? (
                  <div>
                    <label className="block text-sm font-medium mb-2">Google Calendar</label>
                    <button
                      onClick={handleGoogleConnect}
                      disabled={isConnectingGoogle}
                      className="google-button w-full justify-center disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>{isConnectingGoogle ? 'Connecting...' : 'Connect Google Calendar'}</span>
                    </button>
                    <div className="mt-3">
                      <button
                        onClick={handleTwitterConnect}
                        disabled={isConnectingTwitter}
                        className="w-full justify-center flex items-center gap-2 px-4 py-2.5 border-2 border-black text-black bg-white hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        <span>{isConnectingTwitter ? 'Connecting...' : 'Connect X (Twitter)'}</span>
                      </button>
                      <p className="text-xs text-gray-500 mt-1.5">
                        We&apos;ll use your interests to personalize recommendations
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-600">
                    Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
                  </p>
                )}

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Or paste your iCal URL</label>
                  <input
                    type="url"
                    value={icalUrl}
                    onChange={(e) => setIcalUrl(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/ical/..."
                    className="w-full px-3 py-2.5 text-sm border-2 border-black/20 focus:border-black focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Works with Apple Calendar, Outlook, Google Calendar, or any .ics feed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    OpenAI API key <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-... — leave blank for cheap tier (gpt-4o-mini)"
                    className="minimal-input w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Free by default. Add your key for better model (gpt-5).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Run recommendations</label>
                  <div className="flex flex-col gap-2">
                    {CADENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCadence(opt.value)}
                        className={`px-4 py-3 rounded-none border text-left text-sm transition-colors ${
                          cadence === opt.value
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 hover:border-black'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {cadence !== 'manual' && (
                    <p className="text-xs text-gray-500 mt-2">
                      Weekly runs coming soon — for now use &quot;Run&quot; in the dashboard.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="minimal-button-secondary flex-1"
                >
                  Back
                </button>
                <button onClick={handleFinish} className="minimal-button flex-1">
                  Start Loop
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-8 text-center">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-black underline"
          >
            ← Back to home
          </button>
        </p>
      </main>
    </div>
  );
}
