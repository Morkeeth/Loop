'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { DashboardHeader } from '@/components/DashboardHeader';
import {
  getCachedPersona, setCachedPersona,
  getCachedDiscover, setCachedDiscover, clearDiscoverCache,
} from '@/lib/cache';
import { categorizeEvents, scoreArchetypes } from '@/lib/archetypes';
import type { Archetype } from '@/lib/archetypes';
import type { CalendarPayload, DiscoveredEvent } from '@/lib/pipeline-types';

const SEARCH_MESSAGES = [
  'Searching niche venues...',
  'Checking pop-ups and one-offs...',
  'Filtering for something special...',
  'Almost there...',
];

function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  type Phase = 'init' | 'scanning' | 'persona' | 'searching' | 'reveal' | 'error';
  const [phase, setPhase] = useState<Phase>('init');
  const [loadingMessage, setLoadingMessage] = useState('');

  // Scanning animation state
  const [scannedEvents, setScannedEvents] = useState<string[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [scanComplete, setScanComplete] = useState(false);

  // Data
  const [persona, setPersona] = useState<any | null>(null);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [editedCity, setEditedCity] = useState('');
  const [newTag, setNewTag] = useState('');
  const [discoveredEvent, setDiscoveredEvent] = useState<DiscoveredEvent | null>(null);
  const [calendarEvent, setCalendarEvent] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const isRunningRef = useRef(false);
  const hasRunRef = useRef(false);

  const retryWithBackoff = useCallback(async (fn: () => Promise<any>, maxRetries = 3) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try { return await fn(); }
      catch (error) {
        if (error instanceof Error && (error.message.includes('429') || error.message.includes('Rate limit')) && attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }
        throw error;
      }
    }
  }, []);

  // --- Auth check via cookie ---
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setErrorMessage(`Authentication failed: ${errorParam}`);
      setPhase('error');
      setAuthChecked(true);
      return;
    }

    fetch('/api/auth/session')
      .then(res => {
        if (res.ok) {
          setAuthenticated(true);
        } else {
          router.push('/');
        }
      })
      .catch(() => router.push('/'))
      .finally(() => setAuthChecked(true));
  }, [searchParams, router]);

  // --- Animate scanning events ---
  const animateScan = useCallback((events: any[]) => {
    return new Promise<void>((resolve) => {
      const titles = events
        .map((e: any) => e.s || e.summary || '')
        .filter(Boolean)
        .slice(0, 60);

      setEventCount(events.length);
      let i = 0;

      const interval = setInterval(() => {
        if (i < titles.length) {
          setScannedEvents(prev => [...prev.slice(-4), titles[i]]);
          i++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, 80);
    });
  }, []);

  // --- Build persona ---
  const buildPersona = useCallback(async (force = false) => {
    if (!authenticated || isRunningRef.current) return;

    // Check full cache
    if (!force) {
      const cachedP = getCachedPersona();
      const cachedD = getCachedDiscover();
      if (cachedD && cachedP) {
        setPersona(cachedP);
        setDiscoveredEvent(cachedD.event);
        setCalendarEvent(cachedD.calendarEvent || null);
        setupEditableFields(cachedP);
        if (cachedP._archetypes) setArchetypes(cachedP._archetypes);
        setPhase('reveal');
        return;
      }
      if (cachedP) {
        setPersona(cachedP);
        setupEditableFields(cachedP);
        if (cachedP._archetypes) setArchetypes(cachedP._archetypes);
        setPhase('persona');
        return;
      }
    }

    isRunningRef.current = true;
    setPhase('scanning');
    setScannedEvents([]);
    setScanComplete(false);
    setArchetypes([]);

    try {
      // Fetch calendar — token is in the cookie, server reads it automatically
      const calRes = await fetch('/api/calendar?monthsBack=6&insights=true');
      if (!calRes.ok) {
        if (calRes.status === 401 || calRes.status === 403) {
          router.push('/');
          return;
        }
        const err = await calRes.json().catch(() => ({}));
        throw new Error(err.error || `Calendar error (${calRes.status})`);
      }
      const calendar: CalendarPayload = await calRes.json();
      if (!calendar.minified?.length) throw new Error('No calendar events found.');

      // Animate scanning + categorize locally
      await animateScan(calendar.minified);
      const signals = categorizeEvents(calendar.minified);
      const scored = scoreArchetypes(signals);
      setArchetypes(scored);
      setScanComplete(true);

      // Pause to let user see archetypes
      await new Promise(r => setTimeout(r, 1500));

      // Build AI persona
      const personaData = await retryWithBackoff(async () => {
        const res = await fetch('/api/persona', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarData: {
              now_iso: new Date().toISOString(),
              default_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              calendars: [{ id: 'primary', summary: 'Primary Calendar' }],
              events: calendar.minified,
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.details || 'Failed to build persona');
        }
        return res.json();
      });

      personaData._archetypes = scored;
      setPersona(personaData);
      setCachedPersona(personaData);
      setupEditableFields(personaData);
      setPhase('persona');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      setPhase('error');
    } finally {
      isRunningRef.current = false;
    }
  }, [authenticated, router, retryWithBackoff, animateScan]);

  function setupEditableFields(p: any) {
    setEditedCity(p.profile?.home_base?.city || '');
    setEditedTags([
      ...(p.profile?.interests_tags || []),
      ...(p.profile?.fitness_tags || []),
      ...(p.profile?.local_event_interests || []),
    ].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i));
  }

  // --- Find event ---
  const findEvent = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setPhase('searching');
    clearDiscoverCache();

    let msgIndex = 0;
    setLoadingMessage(SEARCH_MESSAGES[0]);
    const msgInterval = setInterval(() => {
      msgIndex = Math.min(msgIndex + 1, SEARCH_MESSAGES.length - 1);
      setLoadingMessage(SEARCH_MESSAGES[msgIndex]);
    }, 3500);

    try {
      const tweakedPersona = {
        ...persona,
        profile: {
          ...(persona?.profile || {}),
          home_base: { city: editedCity, country: persona?.profile?.home_base?.country || 'unknown' },
          interests_tags: editedTags,
          local_event_interests: editedTags,
        },
      };

      const modelConfig = typeof window !== 'undefined' ? {
        provider: localStorage.getItem('loopModelProvider') || undefined,
        apiKey: localStorage.getItem('loopModelApiKey') || undefined,
        model: localStorage.getItem('loopModelName') || undefined,
      } : {};

      const discovered: DiscoveredEvent = await retryWithBackoff(async () => {
        const res = await fetch('/api/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona: tweakedPersona, ...modelConfig }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.details || 'Failed to discover event');
        }
        return (await res.json()).event;
      });
      setDiscoveredEvent(discovered);

      // Schedule on calendar (POST reads cookie for token)
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const start = new Date(`${discovered.date}T${discovered.time}:00`);
        const end = new Date(`${discovered.date}T${discovered.end_time || discovered.time}:00`);
        if (end <= start) end.setTime(start.getTime() + 2 * 3600000);

        const desc = [discovered.description, '', discovered.why_this, '', discovered.url ? `Details: ${discovered.url}` : '', '', 'Found by Loop'].filter(Boolean).join('\n');
        const eventRes = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventData: {
              summary: discovered.event_title,
              location: discovered.address || discovered.venue,
              description: desc,
              start: { dateTime: start.toISOString(), timeZone: tz },
              end: { dateTime: end.toISOString(), timeZone: tz },
            },
          }),
        });
        if (eventRes.ok) {
          const result = await eventRes.json();
          setCalendarEvent(result.event);
          setCachedDiscover(discovered, result.event);
        }
      } catch {
        setCachedDiscover(discovered);
      }
      setPhase('reveal');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      setPhase('error');
    } finally {
      clearInterval(msgInterval);
      isRunningRef.current = false;
    }
  }, [persona, editedCity, editedTags, retryWithBackoff]);

  // Auto-start
  useEffect(() => {
    if (!authenticated || !authChecked || hasRunRef.current) return;
    hasRunRef.current = true;
    buildPersona();
  }, [authenticated, authChecked, buildPersona]);

  const removeTag = (tag: string) => setEditedTags(prev => prev.filter(t => t !== tag));
  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (t && !editedTags.includes(t)) setEditedTags(prev => [...prev, t]);
    setNewTag('');
  };

  // ===================== RENDERS =====================

  // Scanning — the visual calendar analysis
  if (phase === 'init' || phase === 'scanning') {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-md space-y-8">
            {eventCount > 0 && (
              <p className="text-xs text-center uppercase tracking-widest text-gray-400">
                {eventCount} events found
              </p>
            )}

            <div className="h-40 flex flex-col justify-end overflow-hidden">
              {scannedEvents.map((title, i) => (
                <p
                  key={`${title}-${i}`}
                  className="text-sm text-gray-400 truncate transition-opacity duration-200"
                  style={{ opacity: i === scannedEvents.length - 1 ? 1 : 0.3 + (i / scannedEvents.length) * 0.4 }}
                >
                  {title}
                </p>
              ))}
              {scannedEvents.length === 0 && (
                <p className="text-sm text-gray-400">Reading your calendar...</p>
              )}
            </div>

            {archetypes.length > 0 && (
              <div className="space-y-3">
                {archetypes.slice(0, 5).map((a, i) => (
                  <div key={a.id} className="space-y-1" style={{ animationDelay: `${i * 150}ms` }}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wide">{a.label}</span>
                      <span className="text-gray-400">{a.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full transition-all duration-1000 ease-out"
                        style={{ width: scanComplete ? `${a.score}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {scanComplete && (
              <p className="text-xs text-center text-gray-400 animate-pulse">Building your profile...</p>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Searching
  if (phase === 'searching') {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="space-y-6 text-center max-w-md">
            <div className="mx-auto h-1 w-32 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full bg-black rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-lg text-gray-500 font-light">{loadingMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <DashboardHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-semibold">Couldn't make it work</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">{errorMessage}</p>
          <button type="button" onClick={() => buildPersona(true)} className="mt-6 minimal-button">Try again</button>
        </div>
      </div>
    );
  }

  // Persona reveal + edit
  if (phase === 'persona' && persona) {
    const profile = persona.profile || {};
    const summary = persona.persona_summary_120 || '';

    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />

        <main className="mx-auto flex max-w-2xl flex-col px-6 pt-24 pb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Based on {eventCount || 'your'} calendar events
          </p>
          <h1 className="text-3xl font-bold mb-8">This is you</h1>

          <div className="space-y-8">
            {archetypes.length > 0 && (
              <div className="space-y-3">
                {archetypes.slice(0, 5).map((a) => (
                  <div key={a.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold uppercase tracking-wide">{a.label}</span>
                        <span className="text-gray-400 ml-2 font-normal normal-case">{a.description}</span>
                      </div>
                      <span className="text-gray-400 ml-4 tabular-nums">{a.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: `${a.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {summary && (
              <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">City</label>
              <input
                type="text"
                value={editedCity}
                onChange={(e) => setEditedCity(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {profile.role_type && profile.role_type !== 'unknown' && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Role</p>
                  <p>{profile.role_type}{profile.field ? ` · ${profile.field}` : ''}</p>
                </div>
              )}
              {profile.weekend_social_load && profile.weekend_social_load !== 'unknown' && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Weekend energy</p>
                  <p className="capitalize">{profile.weekend_social_load}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Interests — tap to remove, type to add</p>
              <div className="flex flex-wrap gap-2">
                {editedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="rounded-full border border-black bg-black text-white px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-800 transition-colors"
                  >
                    {tag}
                    <span className="text-white/50">×</span>
                  </button>
                ))}
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="+ add"
                  className="rounded-full border border-dashed border-gray-300 px-3.5 py-1.5 text-xs w-20 focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={findEvent}
              disabled={!editedCity.trim() || editedTags.length === 0}
              className="minimal-button w-full py-3 text-base disabled:opacity-40"
            >
              Find my event
            </button>
          </div>
        </main>
      </div>
    );
  }

  // The Reveal
  if (phase === 'reveal' && discoveredEvent) {
    const city = editedCity || persona?.profile?.home_base?.city;

    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />

        <main className="mx-auto flex max-w-2xl flex-col px-6 pt-24 pb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            {city ? `This week in ${city}` : 'This week'}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-8">{discoveredEvent.event_title}</h1>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">When</p>
                <p className="font-medium">
                  {new Date(discoveredEvent.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {' at '}{discoveredEvent.time}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Where</p>
                <p className="font-medium">{discoveredEvent.venue}</p>
                <p className="text-gray-500 text-xs">{discoveredEvent.address}</p>
              </div>
            </div>

            <div className="border-l-2 border-black pl-4 py-1">
              <p className="text-base text-gray-800 leading-relaxed">{discoveredEvent.description}</p>
            </div>

            <p className="text-sm italic text-gray-500">{discoveredEvent.why_this}</p>

            {calendarEvent && (
              <p className="text-xs text-gray-400">Added to your calendar.</p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {discoveredEvent.url && (
                <a href={discoveredEvent.url} target="_blank" rel="noopener noreferrer"
                  className="minimal-button inline-flex items-center gap-2">
                  Get tickets / details
                </a>
              )}
              {calendarEvent?.htmlLink && (
                <a href={calendarEvent.htmlLink} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide hover:border-black transition-colors">
                  View in Calendar
                </a>
              )}
            </div>

            <div className="pt-8 border-t border-gray-100 mt-8">
              <button
                type="button"
                onClick={() => { setDiscoveredEvent(null); setCalendarEvent(null); setPhase('persona'); }}
                className="text-sm text-gray-400 hover:text-black transition-colors"
              >
                Not feeling it? Tweak & retry →
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Dashboard />
    </Suspense>
  );
}
