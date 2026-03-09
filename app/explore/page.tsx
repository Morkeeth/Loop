'use client';

import { useState, useCallback, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import type { DiscoveredEvent } from '@/lib/pipeline-types';

const SEARCH_PHASES = [
  'Checking hidden venues...',
  'Scrolling local Instagram...',
  'Digging through small listings...',
  'Found some underground stuff...',
  'Picking the one you\'d actually go to...',
];

export default function ExplorePage() {
  const [city, setCity] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredEvent, setDiscoveredEvent] = useState<DiscoveredEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchPhase, setSearchPhase] = useState('');
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(true);

  // Auto-detect city on mount
  useEffect(() => {
    (async () => {
      try {
        // Try IP-based geolocation first (no permission needed)
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.city) {
            setCity(data.city);
            setDetectingLocation(false);
            return;
          }
        }
      } catch {}

      // Fallback: try browser geolocation
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`
              );
              if (res.ok) {
                const data = await res.json();
                const detectedCity = data.address?.city || data.address?.town || data.address?.village;
                if (detectedCity) {
                  setCity(detectedCity);
                  setDetectingLocation(false);
                  return;
                }
              }
            } catch {}
            setDetectingLocation(false);
          },
          () => setDetectingLocation(false),
          { timeout: 5000 }
        );
      } else {
        setDetectingLocation(false);
      }
    })();
  }, []);

  // Auto-search once city is detected
  useEffect(() => {
    if (city && !discoveredEvent && !isSearching && !error) {
      handleDiscover();
    }
  }, [city]);

  const handleDiscover = useCallback(async () => {
    if (!city || isSearching) return;

    setIsSearching(true);
    setError(null);
    setDiscoveredEvent(null);
    setShowEmailCapture(false);

    let phaseIndex = 0;
    setSearchPhase(SEARCH_PHASES[1]); // skip location phase since we already have it
    const phaseInterval = setInterval(() => {
      phaseIndex = Math.min(phaseIndex + 1, SEARCH_PHASES.length - 1);
      setSearchPhase(SEARCH_PHASES[phaseIndex]);
    }, 3500);

    try {
      // Rotate interests each request so we don't get the same event type
      const allInterests = ['culture', 'social', 'music', 'food', 'art', 'wellness', 'comedy', 'film', 'dance', 'vintage', 'craft', 'nightlife'];
      const shuffled = [...allInterests].sort(() => Math.random() - 0.5).slice(0, 5);

      const syntheticPersona = {
        persona_summary_120: `Someone living in ${city} looking for something interesting and unexpected to do this week.`,
        profile: {
          home_base: { city, country: 'unknown' },
          local_event_interests: shuffled,
          interests_tags: shuffled,
        },
      };

      const modelConfig = typeof window !== 'undefined' ? {
        provider: localStorage.getItem('loopModelProvider') || undefined,
        apiKey: localStorage.getItem('loopModelApiKey') || undefined,
        model: localStorage.getItem('loopModelName') || undefined,
      } : {};

      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: syntheticPersona, ...modelConfig }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.details || 'Failed to find an event');
      }

      const data = await response.json();
      setDiscoveredEvent(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      clearInterval(phaseInterval);
      setIsSearching(false);
    }
  }, [city, isSearching]);

  const handleSaveEmail = () => {
    if (!email.trim()) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('loopEmail', email.trim());
      localStorage.setItem('loopCity', city || '');
    }
    setEmailSaved(true);
  };

  // --- Detecting / Searching state ---
  if (detectingLocation || isSearching) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-sm w-full space-y-10 text-center">
            {city && (
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                {city}
              </p>
            )}

            <div className="space-y-3">
              <div className="relative h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-black rounded-full animate-search-bar" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xl font-light text-gray-800">
                {detectingLocation ? 'Locating you...' : searchPhase}
              </p>
              <p className="text-xs text-gray-400">
                This takes 10–20 seconds — we're searching real venues
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes searchBar {
            0% { transform: translateX(-100%); width: 40%; }
            50% { transform: translateX(60%); width: 60%; }
            100% { transform: translateX(-100%); width: 40%; }
          }
          .animate-search-bar {
            animation: searchBar 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // --- No city detected ---
  if (!city && !discoveredEvent) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-3xl font-bold">Where are you?</h1>
            <p className="text-sm text-gray-500">We couldn't detect your location. Type your city and we'll find something.</p>
            <input
              type="text"
              placeholder="Paris, London, New York..."
              className="w-full text-center text-xl font-light border-0 border-b-2 border-gray-200 py-3 focus:border-black focus:outline-none transition-colors placeholder:text-gray-300"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  setCity((e.target as HTMLInputElement).value.trim());
                }
              }}
              autoFocus
            />
          </div>
        </main>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold">Couldn't find anything</h1>
            <p className="text-sm text-gray-500">{error}</p>
            <button type="button" onClick={handleDiscover} className="minimal-button">Try again</button>
          </div>
        </main>
      </div>
    );
  }

  // --- Result state ---
  if (discoveredEvent) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />
        <main className="mx-auto flex max-w-2xl flex-col px-6 pt-24 pb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            This week in {city}
          </p>
          <h1 className="text-4xl font-bold leading-tight mb-6">{discoveredEvent.event_title}</h1>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
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
              {discoveredEvent.category && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Vibe</p>
                  <p className="font-medium">{discoveredEvent.category}</p>
                </div>
              )}
            </div>

            <div className="border-l-2 border-black pl-4">
              <p className="text-base text-gray-800 leading-relaxed">{discoveredEvent.description}</p>
            </div>

            <p className="text-sm italic text-gray-500">{discoveredEvent.why_this}</p>

            <div className="flex flex-wrap gap-3">
              {discoveredEvent.url && (
                <a href={discoveredEvent.url} target="_blank" rel="noopener noreferrer"
                  className="minimal-button inline-flex items-center gap-2">
                  Get tickets / details
                </a>
              )}
              <button
                type="button"
                onClick={() => { setDiscoveredEvent(null); handleDiscover(); }}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide hover:border-black transition-colors"
              >
                Find another
              </button>
            </div>

            {/* Email capture — only after seeing value */}
            {!showEmailCapture && !emailSaved && (
              <button
                type="button"
                onClick={() => setShowEmailCapture(true)}
                className="text-sm text-gray-400 hover:text-black transition-colors mt-4"
              >
                Get an event like this every week →
              </button>
            )}
            {showEmailCapture && !emailSaved && (
              <div className="mt-4 flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your email"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEmail()}
                  autoFocus
                />
                <button type="button" onClick={handleSaveEmail} className="minimal-button">
                  Subscribe
                </button>
              </div>
            )}
            {emailSaved && (
              <p className="text-sm text-gray-400 mt-4">
                You're in. One event, every week, for {city}.
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  return null;
}
