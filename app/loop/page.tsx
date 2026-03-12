'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { PersonaProfile } from '@/types/persona';
import { LOOP_SETUP_KEY } from '@/types/setup';

type LoopStep = 'connect' | 'personality' | 'magic' | 'complete';

export default function LoopPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<LoopStep>('connect');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data flowing through the loop
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [persona, setPersona] = useState<PersonaProfile | null>(null);
  const [artifactMarkdown, setArtifactMarkdown] = useState<string | null>(null);
  const [magicEvent, setMagicEvent] = useState<any>(null);
  const [calendarEvent, setCalendarEvent] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [eventAdded, setEventAdded] = useState(false);

  // Load saved API key from localStorage
  useEffect(() => {
    try {
      const setup = localStorage.getItem(LOOP_SETUP_KEY);
      if (setup) {
        const parsed = JSON.parse(setup);
        if (parsed.openaiApiKey) setUserApiKey(parsed.openaiApiKey);
      }
    } catch {}
  }, []);

  // Step 1: Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        setAccessToken(session.provider_token);
        setUserEmail(session.user?.email || null);
        setTimeout(() => setStep('personality'), 1200);
      }
    }
    checkAuth();
  }, [supabase]);

  const apiKeyParam = userApiKey.trim() || undefined;

  // Step 2: Generate personality artifact
  const generatePersonality = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch calendar events
      const calRes = await fetch(`/api/calendar?accessToken=${accessToken}&monthsBack=6`);
      if (!calRes.ok) {
        if (calRes.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch calendar');
      }
      const calData = await calRes.json();
      setCalendarEvents(calData.events || []);

      // Generate persona
      const personaRes = await fetch('/api/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarData: {
            events: calData.minified || [],
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            summary: {
              totalEvents: calData.count,
              monthsAnalyzed: 6,
              timeframe: calData.timeframe,
            },
          },
        }),
      });

      if (!personaRes.ok) throw new Error('Failed to generate persona');
      const personaData = await personaRes.json();
      setPersona(personaData);

      // Generate MD artifact
      const artifactRes = await fetch('/api/persona/artifact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: personaData, userApiKey: apiKeyParam }),
      });

      if (!artifactRes.ok) throw new Error('Failed to generate artifact');
      const artifactData = await artifactRes.json();
      setArtifactMarkdown(artifactData.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [accessToken, router, apiKeyParam]);

  useEffect(() => {
    if (step === 'personality' && accessToken && !artifactMarkdown) {
      generatePersonality();
    }
  }, [step, accessToken, artifactMarkdown, generatePersonality]);

  // Step 3: Find magic event
  const findMagicEvent = useCallback(async () => {
    if (!persona) return;
    setLoading(true);
    setError(null);

    try {
      const location = {
        city: persona.location?.primaryLocation || 'your city',
        country: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const res = await fetch('/api/magic-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          location,
          calendarEvents,
          currentDate: new Date().toISOString(),
          userApiKey: apiKeyParam,
        }),
      });

      if (!res.ok) throw new Error('Failed to find magic event');
      const data = await res.json();
      setMagicEvent(data.magicEvent);
      setCalendarEvent(data.calendarEvent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [persona, calendarEvents, apiKeyParam]);

  // Step 4: Add to calendar
  const addToCalendar = async () => {
    if (!accessToken || !calendarEvent) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          eventData: calendarEvent,
        }),
      });

      if (!res.ok) throw new Error('Failed to add event');
      setEventAdded(true);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Connect with Google OAuth
  const connectCalendar = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile',
        redirectTo: `${window.location.origin}/auth/callback?next=/loop`,
      },
    });
    if (error) setError(error.message);
  };

  // Connect with Twitter/X OAuth
  const connectTwitter = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/loop`,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      {/* Header */}
      <div className="fixed top-8 left-8">
        <span className="text-sm font-mono tracking-widest uppercase text-muted">LOOP</span>
      </div>

      {/* API Key toggle */}
      <div className="fixed top-8 right-8">
        <button
          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
          className="text-xs font-mono tracking-wider text-muted hover:text-black transition-colors"
        >
          {userApiKey ? 'YOUR KEY' : 'FREE TIER'}
        </button>
        <AnimatePresence>
          {showApiKeyInput && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-80"
            >
              <div className="minimal-card p-4">
                <p className="text-xs text-muted mb-2">
                  {userApiKey ? 'Premium models active' : 'Add your OpenAI key for premium models'}
                </p>
                <input
                  type="password"
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="minimal-input w-full text-xs font-mono"
                />
                <p className="text-xs text-muted mt-2">
                  Free: gpt-4o-mini &middot; Your key: gpt-4o
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {/* STEP 1: CONNECT */}
          {step === 'connect' && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {accessToken ? (
                <div>
                  <p className="text-sm font-mono tracking-widest uppercase text-muted mb-4">01 — CONNECT</p>
                  <h1 className="text-3xl font-light mb-2">Calendar connected</h1>
                  <p className="text-muted text-sm">{userEmail}</p>
                  <div className="mt-8 w-8 h-8 border border-black rounded-full flex items-center justify-center mx-auto">
                    <span className="text-xs">&#10003;</span>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-mono tracking-widest uppercase text-muted mb-4">01 — CONNECT</p>
                  <h1 className="text-3xl font-light mb-6">Connect your calendar</h1>
                  <p className="text-muted mb-12 max-w-md mx-auto">
                    Loop reads your calendar to understand who you are. Then finds one magical event, just for you, every week.
                  </p>
                  <button onClick={connectCalendar} className="google-button">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
                      <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                    </svg>
                    Connect Google Calendar
                  </button>
                  <button
                    onClick={connectTwitter}
                    className="mt-3 flex items-center gap-2 px-6 py-3 border border-black text-black bg-white hover:bg-black hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    or connect with X
                  </button>
                  <p className="text-xs text-muted mt-2">X data enriches your persona for better recommendations</p>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: PERSONALITY */}
          {step === 'personality' && (
            <motion.div
              key="personality"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-sm font-mono tracking-widest uppercase text-muted mb-4 text-center">02 — PERSONALITY</p>

              {loading && !artifactMarkdown && (
                <div className="text-center">
                  <h1 className="text-3xl font-light mb-6">Reading your calendar...</h1>
                  <p className="text-muted text-sm mb-8">Analyzing patterns. Finding who you are in the gaps between meetings.</p>
                  <div className="flex justify-center">
                    <div className="w-6 h-6 border border-black border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              )}

              {artifactMarkdown && (
                <div>
                  <h1 className="text-3xl font-light mb-8 text-center">Your personality artifact</h1>
                  <div className="minimal-card p-8 mb-8">
                    <div className="prose-artifact">
                      {artifactMarkdown.split('\n').map((line, i) => {
                        if (line.startsWith('# ')) {
                          return <h1 key={i} className="text-2xl font-light mb-4 mt-6 first:mt-0">{line.slice(2)}</h1>;
                        }
                        if (line.startsWith('## ')) {
                          return <h2 key={i} className="text-lg font-medium mt-8 mb-3 uppercase tracking-widest text-sm">{line.slice(3)}</h2>;
                        }
                        if (line.startsWith('---')) {
                          return <hr key={i} className="my-6 border-black/20" />;
                        }
                        if (line.startsWith('*') && line.endsWith('*')) {
                          return <p key={i} className="text-muted text-xs font-mono mt-4">{line.replace(/\*/g, '')}</p>;
                        }
                        if (line.trim() === '') {
                          return <div key={i} className="h-3" />;
                        }
                        return <p key={i} className="text-sm leading-relaxed mb-2">{line}</p>;
                      })}
                    </div>
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => { setStep('magic'); findMagicEvent(); }}
                      className="minimal-button"
                    >
                      Find my magic event
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center">
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                  <button onClick={generatePersonality} className="minimal-button-secondary">
                    Try again
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: MAGIC EVENT */}
          {step === 'magic' && (
            <motion.div
              key="magic"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-sm font-mono tracking-widest uppercase text-muted mb-4 text-center">03 — MAGIC</p>

              {loading && !magicEvent && (
                <div className="text-center">
                  <h1 className="text-3xl font-light mb-6">Searching for your moment...</h1>
                  <p className="text-muted text-sm mb-8">Scanning the real world for something that was made for you.</p>
                  <div className="flex justify-center">
                    <div className="w-6 h-6 border border-black border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              )}

              {magicEvent && (
                <div className="text-center">
                  <h1 className="text-3xl font-light mb-8">Your magic event</h1>

                  <div className="minimal-card p-8 mb-2 text-left">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="text-xs font-mono tracking-widest uppercase text-muted mb-2">{magicEvent.category}</p>
                        <h2 className="text-xl font-medium">{magicEvent.title}</h2>
                      </div>
                      <span className="text-2xl">&#10024;</span>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex gap-3 text-sm">
                        <span className="text-muted w-16 shrink-0 font-mono text-xs uppercase tracking-wider pt-0.5">When</span>
                        <span>{formatDate(magicEvent.date)} &middot; {magicEvent.start_time}–{magicEvent.end_time}</span>
                      </div>
                      <div className="flex gap-3 text-sm">
                        <span className="text-muted w-16 shrink-0 font-mono text-xs uppercase tracking-wider pt-0.5">Where</span>
                        <span>{magicEvent.location}</span>
                      </div>
                    </div>

                    <div className="border-t border-black/10 pt-4">
                      <p className="text-sm leading-relaxed">{magicEvent.why}</p>
                    </div>

                    {magicEvent.link && (
                      <a
                        href={magicEvent.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 text-xs font-mono text-muted underline"
                      >
                        Source ↗
                      </a>
                    )}
                  </div>

                  {magicEvent.vibe && (
                    <p className="text-xs font-mono text-muted mb-8 tracking-widest">
                      vibe: {magicEvent.vibe}
                    </p>
                  )}

                  <div className="flex gap-4 justify-center">
                    <button onClick={addToCalendar} className="minimal-button" disabled={loading}>
                      {loading ? 'Adding...' : 'Add to my calendar'}
                    </button>
                    <button onClick={findMagicEvent} className="minimal-button-secondary" disabled={loading}>
                      Find another
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center">
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                  <button onClick={findMagicEvent} className="minimal-button-secondary">
                    Try again
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: COMPLETE */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <p className="text-sm font-mono tracking-widest uppercase text-muted mb-4">04 — LOOP COMPLETE</p>

              <h1 className="text-4xl font-light mb-4">Loop complete.</h1>
              <p className="text-muted mb-2">
                <span className="font-medium text-black">{magicEvent?.title}</span> has been added to your calendar.
              </p>
              <p className="text-muted text-sm mb-12">See you next week.</p>

              <div className="w-16 h-16 border border-black rounded-full flex items-center justify-center mx-auto mb-12">
                <span className="text-xl">&#8635;</span>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setMagicEvent(null);
                    setCalendarEvent(null);
                    setEventAdded(false);
                    setStep('magic');
                    findMagicEvent();
                  }}
                  className="minimal-button-secondary"
                >
                  One more loop
                </button>
                <button onClick={() => router.push('/dashboard')} className="minimal-button-secondary">
                  Dashboard
                </button>
              </div>

              <p className="text-xs font-mono text-muted mt-16 tracking-wider">
                LOOP THROUGH YOUR CALENDAR. LOOP THROUGH YOUR LIFE.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Step indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
        {(['connect', 'personality', 'magic', 'complete'] as LoopStep[]).map((s, i) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              step === s ? 'bg-black scale-125' :
              (['connect', 'personality', 'magic', 'complete'].indexOf(step) > i ? 'bg-black/40' : 'bg-black/10')
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
