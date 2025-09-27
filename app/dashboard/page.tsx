'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { DataSection } from '@/components/DataSection';
import { DigestPanel } from '@/components/DigestPanel';
import { InsightsBanner } from '@/components/InsightsBanner';
import { PersonaPanel } from '@/components/PersonaPanel';

type TabId = 'events' | 'persona' | 'digest';

interface CalendarPayload {
  events: any[];
  minified: any[];
  insights: string[];
  timeframe: { start: string; end: string } | null;
  count: number;
  monthsBack: number;
}

export default function Dashboard() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('events');
  const [calendarPayload, setCalendarPayload] = useState<CalendarPayload | null>(null);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightTick, setInsightTick] = useState(0);
  const [persona, setPersona] = useState<any | null>(null);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showMinified, setShowMinified] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get access token from URL params (from OAuth callback)
    const token = searchParams.get('access_token');
    const userEmail = searchParams.get('user_email');
    const userName = searchParams.get('user_name');
    const authError = searchParams.get('error');

    if (authError) {
      setError(`Authentication failed: ${authError}`);
      return;
    }

    if (token) {
      setAccessToken(token);
      // Store user info in localStorage for demo purposes
      if (userEmail) {
        localStorage.setItem('userEmail', userEmail);
      }
      if (userName) {
        localStorage.setItem('userName', userName);
      }
      // Store access token in localStorage (in production, use secure storage)
      localStorage.setItem('accessToken', token);
      
      // Clean up URL by removing the token parameters
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('access_token');
      cleanUrl.searchParams.delete('refresh_token');
      cleanUrl.searchParams.delete('user_email');
      cleanUrl.searchParams.delete('user_name');
      window.history.replaceState({}, '', cleanUrl.toString());
    } else {
      // Check if we have a stored access token
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        setAccessToken(storedToken);
      } else {
        // No token available, redirect to login
        router.push('/');
      }
    }
  }, [searchParams, router]);

  const handleSignOut = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    router.push('/');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="minimal-button"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const fetchCalendar = useCallback(async () => {
    if (!accessToken) return;

    try {
      setIsLoadingCalendar(true);
      setIsLoadingInsights(true);

      const response = await fetch(
        `/api/calendar?accessToken=${encodeURIComponent(accessToken)}&monthsBack=6&insights=true`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          window.location.href = '/';
          return;
        }

        throw new Error(errorData.message || `Failed to fetch calendar data: ${response.status}`);
      }

      const payload = await response.json();
      setCalendarPayload(payload);
      setInsightTick((tick) => tick + 1);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar data');
    } finally {
      setIsLoadingCalendar(false);
      setIsLoadingInsights(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    fetchCalendar();
  }, [accessToken, fetchCalendar]);

  const handleGeneratePersona = useCallback(async () => {
    if (!calendarPayload) return;

    try {
      setIsGeneratingPersona(true);
      const response = await fetch('/api/persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendarData: {
            now_iso: new Date().toISOString(),
            default_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            calendars: [{ id: 'primary', summary: 'Primary Calendar' }],
            events: calendarPayload.minified,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Failed to generate persona');
      }

      const data = await response.json();
      setPersona(data);
      setActiveTab('persona');
    } catch (err) {
      console.error('Persona generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate persona');
    } finally {
      setIsGeneratingPersona(false);
    }
  }, [calendarPayload]);

  const handleGenerateDigest = useCallback(async () => {
    if (!persona || !calendarPayload) {
      setActiveTab('persona');
      return;
    }

    try {
      setIsGeneratingDigest(true);

      const response = await fetch('/api/digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personaText: JSON.stringify(persona, null, 2),
          recentCalendarJson: JSON.stringify(calendarPayload.minified, null, 2),
          promptTemplate: 'Run the Sunday digest.\n\nPersona description:\n{{persona_text}}\n\nRecent Calendar JSON:\n{{recent_calendar_json}}',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Failed to generate digest');
      }

      const data = await response.json();
      setDigest(typeof data === 'string' ? data : data.content || null);
      setActiveTab('digest');
    } catch (err) {
      console.error('Digest generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate digest');
    } finally {
      setIsGeneratingDigest(false);
    }
  }, [persona, calendarPayload]);

  const handleCreateCalendarEvent = useCallback(async () => {
    if (!digest || !accessToken) return;

    try {
      setIsCreatingEvent(true);

      // Calculate next Sunday at 15:00
      const now = new Date();
      const daysUntilSunday = (7 - now.getDay()) % 7;
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
      nextSunday.setHours(15, 0, 0, 0);

      const eventData = {
        summary: 'Circling Back',
        location: 'by Loop',
        description: digest,
        start: {
          dateTime: nextSunday.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(nextSunday.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          eventData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create calendar event');
      }

      const result = await response.json();
      console.log('Calendar event created:', result);
      
      // Show success message (you could add a toast notification here)
      alert('Calendar event created successfully!');
      
    } catch (err) {
      console.error('Calendar event creation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create calendar event');
    } finally {
      setIsCreatingEvent(false);
    }
  }, [digest, accessToken]);

  const tabItems: Array<{ id: TabId; label: string }> = useMemo(
    () => [
      { id: 'events', label: 'Calendar JSON' },
      { id: 'persona', label: 'Persona' },
      { id: 'digest', label: 'Sunday Digest' },
    ],
    [],
  );

  const renderTab = () => {
    if (!calendarPayload) {
      return (
        <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
          Loading calendar history…
        </div>
      );
    }

    switch (activeTab) {
      case 'events':
        return (
          <DataSection
            title="Calendar Events"
            description={
              calendarPayload.timeframe
                ? `Showing ${calendarPayload.count} events between ${new Date(calendarPayload.timeframe.start).toLocaleDateString()} and ${new Date(calendarPayload.timeframe.end).toLocaleDateString()}`
                : undefined
            }
            json={calendarPayload.events}
            minified={calendarPayload.minified}
            isMinified={showMinified}
            onToggleMinified={() => setShowMinified((value) => !value)}
          />
        );
      case 'persona':
        return (
          <PersonaPanel
            persona={persona}
            onGenerate={handleGeneratePersona}
            isGenerating={isGeneratingPersona}
          />
        );
      case 'digest':
        return (
          <DigestPanel 
            digest={digest} 
            isGenerating={isGeneratingDigest} 
            onGenerate={handleGenerateDigest}
            onCreateEvent={handleCreateCalendarEvent}
            isCreatingEvent={isCreatingEvent}
          />
        );
      default:
        return null;
    }
  };

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Loading...</h2>
          <p className="text-gray-600">Setting up your calendar access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Loop Labs</h1>
            <p className="text-xs uppercase tracking-wide text-gray-400">Calendar intelligence sandbox</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCalendar}
              className="text-sm text-gray-600 hover:text-black"
            >
              Refresh
            </button>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-black"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {calendarPayload ? (
          <InsightsBanner insights={calendarPayload.insights} isLoading={isLoadingInsights} key={insightTick} />
        ) : null}

        <nav className="flex flex-wrap gap-2">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-900 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="min-h-[420px] space-y-6">
          {isLoadingCalendar ? (
            <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
              Fetching the last six months from Google Calendar…
            </div>
          ) : (
            renderTab()
          )}
        </section>
      </main>
    </div>
  );
}
