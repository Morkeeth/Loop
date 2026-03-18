'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import type { CuratedCityEvent } from '@/lib/scrapers/types';

export default function ExplorePage() {
  const [city, setCity] = useState<string | null>(null);
  const [events, setEvents] = useState<CuratedCityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect city on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.city) {
            setCity(data.city);
            return;
          }
        }
      } catch {}

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
                const detected = data.address?.city || data.address?.town || data.address?.village;
                if (detected) { setCity(detected); return; }
              }
            } catch {}
            setLoading(false);
          },
          () => setLoading(false),
          { timeout: 5000 }
        );
      } else {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch city events once city is known
  useEffect(() => {
    if (!city) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/city-events?city=${encodeURIComponent(city)}`);
        if (!res.ok) throw new Error('Failed to load events');
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    })();
  }, [city]);

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-sm w-full space-y-8 text-center">
            {city && (
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{city}</p>
            )}
            <div className="relative h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-black rounded-full" style={{
                animation: 'searchBar 2s ease-in-out infinite',
              }} />
            </div>
            <p className="text-xl font-light text-gray-800">
              {city ? `Finding what's on in ${city}...` : 'Locating you...'}
            </p>
          </div>
        </div>
        <style jsx>{`
          @keyframes searchBar {
            0% { transform: translateX(-100%); width: 40%; }
            50% { transform: translateX(60%); width: 60%; }
            100% { transform: translateX(-100%); width: 40%; }
          }
        `}</style>
      </div>
    );
  }

  // --- No city ---
  if (!city) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-3xl font-bold">Where are you?</h1>
            <p className="text-sm text-gray-500">Type your city and we'll show you what's happening.</p>
            <input
              type="text"
              placeholder="Dublin, London, Paris..."
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

  // --- Error ---
  if (error) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <DashboardHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold">Couldn't load events</h1>
            <p className="text-sm text-gray-500">{error}</p>
            <button type="button" onClick={() => setCity(city)} className="minimal-button">Try again</button>
          </div>
        </main>
      </div>
    );
  }

  // --- Events list ---
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <DashboardHeader />

      <main className="mx-auto flex max-w-2xl flex-col px-6 pt-24 pb-16 w-full">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              This week in
            </p>
            <h1 className="text-4xl font-bold">{city}</h1>
          </div>
          <button
            type="button"
            onClick={() => { setCity(null); setEvents([]); }}
            className="text-sm text-gray-400 hover:text-black transition-colors"
          >
            Change city
          </button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-gray-400">No events found for {city} this week.</p>
            <p className="text-sm text-gray-300">We've added {city} to our radar — check back Monday.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {events.map((event, i) => (
              <article key={`${event.title}-${i}`} className="group">
                <div className="flex gap-5">
                  {event.imageUrl && (
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={event.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold leading-tight group-hover:underline">
                        {event.url ? (
                          <a href={event.url} target="_blank" rel="noopener noreferrer">{event.title}</a>
                        ) : event.title}
                      </h2>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {event.category && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {event.category}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-300 whitespace-nowrap">
                          {event.source}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mt-1">
                      {event.date && new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {event.time && ` at ${event.time}`}
                      {event.venue && ` · ${event.venue}`}
                    </p>

                    {event.description && (
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{event.description}</p>
                    )}

                    {event.whyGo && (
                      <p className="text-xs italic text-gray-400 mt-1.5">{event.whyGo}</p>
                    )}

                    {event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-black hover:underline mt-2 inline-block"
                      >
                        Get tickets →
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Upsell */}
        <div className="mt-16 pt-8 border-t border-gray-100 text-center space-y-3">
          <p className="text-sm text-gray-500">
            Want events picked just for <span className="font-semibold text-black">you</span>?
          </p>
          <a
            href="/"
            className="minimal-button inline-block"
          >
            Connect Google Calendar
          </a>
          <p className="text-xs text-gray-300">
            We read your calendar, build your persona, and find the one event you'd never discover on your own.
          </p>
        </div>
      </main>
    </div>
  );
}
