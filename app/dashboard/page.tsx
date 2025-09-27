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
      <div className="border-b border-black px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8" viewBox="0 0 23.5703 21.5332" fill="black">
              <path d="M7.61523 7.28711C9.63867 7.28711 11.2656 5.64648 11.2656 3.63672C11.2656 1.62695 9.63867 0 7.61523 0C5.60547 0 3.97852 1.62695 3.97852 3.63672C3.97852 5.64648 5.60547 7.28711 7.61523 7.28711ZM7.61523 5.30469C6.69922 5.30469 5.94727 4.55273 5.94727 3.63672C5.94727 2.7207 6.69922 1.96875 7.61523 1.96875C8.54492 1.96875 9.29688 2.7207 9.29688 3.63672C9.29688 4.55273 8.54492 5.30469 7.61523 5.30469ZM15.5996 7.28711C17.6094 7.28711 19.2363 5.64648 19.2363 3.63672C19.2363 1.62695 17.6094 0 15.5996 0C13.5898 0 11.9492 1.62695 11.9492 3.63672C11.9492 5.64648 13.5898 7.28711 15.5996 7.28711ZM15.5996 5.30469C14.6836 5.30469 13.9316 4.55273 13.9316 3.63672C13.9316 2.7207 14.6836 1.96875 15.5996 1.96875C16.5156 1.96875 17.2676 2.7207 17.2676 3.63672C17.2676 4.55273 16.5156 5.30469 15.5996 5.30469ZM3.65039 14.4102C5.66016 14.4102 7.28711 12.7695 7.28711 10.7598C7.28711 8.75 5.66016 7.10938 3.65039 7.10938C1.62695 7.10938 0 8.75 0 10.7598C0 12.7695 1.62695 14.4102 3.65039 14.4102ZM3.65039 12.4277C2.7207 12.4277 1.96875 11.6758 1.96875 10.7598C1.96875 9.84375 2.7207 9.0918 3.65039 9.0918C4.56641 9.0918 5.31836 9.84375 5.31836 10.7598C5.31836 11.6758 4.56641 12.4277 3.65039 12.4277ZM19.5781 14.4102C21.5879 14.4102 23.2148 12.7695 23.2148 10.7598C23.2148 8.75 21.5879 7.10938 19.5781 7.10938C17.5684 7.10938 15.9277 8.75 15.9277 10.7598C15.9277 12.7695 17.5684 14.4102 19.5781 14.4102ZM19.5781 12.4277C18.6484 12.4277 17.8965 11.6758 17.8965 10.7598C17.8965 9.84375 18.6484 9.0918 19.5781 9.0918C20.4941 9.0918 21.2461 9.84375 21.2461 10.7598C21.2461 11.6758 20.4941 12.4277 19.5781 12.4277ZM7.61523 21.5332C9.63867 21.5332 11.2656 19.9062 11.2656 17.8965C11.2656 15.8867 9.63867 14.2461 7.61523 14.2461C5.60547 14.2461 3.97852 15.8867 3.97852 17.8965C3.97852 19.9062 5.60547 21.5332 7.61523 21.5332ZM7.61523 19.5645C6.69922 19.5645 5.94727 18.8125 5.94727 17.8965C5.94727 16.9805 6.69922 16.2285 7.61523 16.2285C8.54492 16.2285 9.29688 16.9805 9.29688 17.8965C9.29688 18.8125 8.54492 19.5645 7.61523 19.5645ZM15.5996 21.5332C17.6094 21.5332 19.2363 19.9062 19.2363 17.8965C19.2363 15.8867 17.6094 14.2461 15.5996 14.2461C13.5898 14.2461 11.9492 15.8867 11.9492 17.8965C11.9492 19.9062 13.5898 21.5332 15.5996 21.5332ZM15.5996 19.5645C14.6836 19.5645 13.9316 18.8125 13.9316 17.8965C13.9316 16.9805 14.6836 16.2285 15.5996 16.2285C16.5156 16.2285 17.2676 16.9805 17.2676 17.8965C17.2676 18.8125 16.5156 19.5645 15.5996 19.5645Z"/>
            </svg>
            <div>
              <h1 className="text-lg font-semibold text-black">Loop Labs</h1>
              <p className="text-xs uppercase tracking-wide text-gray-600">Calendar intelligence sandbox</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-black uppercase tracking-wide"
          >
            Sign Out
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {calendarPayload ? (
          <InsightsBanner 
            insights={calendarPayload.insights} 
            isLoading={isLoadingInsights} 
            eventCount={calendarPayload.count}
            key={insightTick} 
          />
        ) : null}

        <nav className="flex flex-wrap gap-0 border border-black">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-r border-black px-6 py-3 text-sm font-medium transition uppercase tracking-wide ${
                activeTab === tab.id
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              } ${tab.id === tabItems[tabItems.length - 1].id ? 'border-r-0' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="min-h-[420px] space-y-6">
          {isLoadingCalendar ? (
            <div className="border border-black bg-white p-10 text-center text-sm text-black">
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
