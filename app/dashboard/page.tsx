'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { generateMockDigest } from '@/lib/mock-digest';

import { AutoPopulatePanel } from '@/components/AutoPopulatePanel';
import { DataSection } from '@/components/DataSection';
import { DigestPanel } from '@/components/DigestPanel';
import { InsightsBanner } from '@/components/InsightsBanner';
import { PersonaPanel } from '@/components/PersonaPanel';

type TabId = 'events' | 'persona' | 'digest' | 'autopopulate' | 'auto-pipeline';

interface SuggestedEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  reason: string;
  selected: boolean;
}

interface CalendarPayload {
  events: any[];
  minified: any[];
  insights: string[];
  timeframe: { start: string; end: string } | null;
  count: number;
  monthsBack: number;
  requestedMonthsBack?: number;
}

function Dashboard() {
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
  const [digestId, setDigestId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [digestRequestData, setDigestRequestData] = useState<{
    personaText: string;
    recentCalendarJson: string;
    promptTemplate: string;
  } | null>(null);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showMinified, setShowMinified] = useState(true);
  
  // Auto-populate state
  const [suggestions, setSuggestions] = useState<SuggestedEvent[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  
  // Auto Pipeline states
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState<{
    digest: number;
    recommendations: number;
    calendar: number;
    audio: number;
  }>({ digest: 0, recommendations: 0, calendar: 0, audio: 0 });
  const [pipelineStatus, setPipelineStatus] = useState<string>('');
  
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

    setIsGeneratingDigest(true);
    setActiveTab('digest');

    const digestWindow = calendarPayload.minified;
    const requestData = {
      personaText: JSON.stringify(persona, null, 2),
      recentCalendarJson: JSON.stringify(digestWindow, null, 2),
      promptTemplate: 'Run the Sunday digest.\n\nPersona description:\n{{persona_text}}\n\nRecent Calendar JSON:\n{{recent_calendar_json}}',
    };

    setDigestRequestData(requestData);
  }, [persona, calendarPayload]);

  const handleDigestComplete = useCallback((result: any) => {
    setDigest(result.content);
    setDigestId(result.digestId);
    setAudioUrl(result.audioUrl);
    setIsGeneratingDigest(false);
    setDigestRequestData(null);
  }, []);

  const handleTestDigest = useCallback(async () => {
    try {
      const mockResult = generateMockDigest();
      
      // Store the mock digest via API
      const response = await fetch('/api/digest/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
          digestId: mockResult.digestId,
          content: mockResult.content,
          }),
        });

        if (!response.ok) {
        throw new Error('Failed to store test digest');
      }
      
      // Set the digest data
      setDigest(mockResult.content);
      setDigestId(mockResult.digestId);
      setAudioUrl(mockResult.audioUrl);
      setActiveTab('digest');
    } catch (error) {
      console.error('Error generating test digest:', error);
      setError('Failed to generate test digest');
    }
  }, []);

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

      // Format digest for calendar with proper link titles
      const formatDigestForCalendar = (content: string) => {
        return content
          .replace(/🎧 Listen To Your Digest: (\/digest\/audio\/[^\s]+)/g, '🎧 Listen To Your Digest: [Audio Version]($1)')
          .replace(/https?:\/\/[^\s]+/g, (url) => {
            // Extract domain for link title
            try {
              const domain = new URL(url).hostname.replace('www.', '');
              return `[${domain}](${url})`;
            } catch {
              return url; // Return original if URL parsing fails
            }
          });
      };

        const eventData = {
          summary: 'Circling Back',
          location: 'by Loop',
        description: formatDigestForCalendar(digest),
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

  // Auto-populate handlers
  const handleGenerateSuggestions = useCallback(async () => {
    if (!persona || !calendarPayload) return;

    try {
      setIsGeneratingSuggestions(true);
      
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          calendarEvents: calendarPayload.events,
          userLocation: {
            city: persona?.profile?.home_base?.city || 'San Francisco',
            country: persona?.profile?.home_base?.country || 'US',
            timezone: persona?.profile?.primary_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          currentDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (err) {
      console.error('Suggestion generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [persona, calendarPayload]);

  const handleAddToCalendar = useCallback(async () => {
    if (!accessToken || suggestions.length === 0) return;

    try {
      setIsAddingToCalendar(true);
      
      const response = await fetch('/api/autopopulate/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestions,
          accessToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add events to calendar');
      }

      const data = await response.json();
      alert(`Successfully added ${data.createdEvents} events to your calendar!`);
      setSuggestions([]); // Clear suggestions after adding
    } catch (err) {
      console.error('Add to calendar failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to add events to calendar');
    } finally {
      setIsAddingToCalendar(false);
    }
  }, [accessToken, suggestions]);

  const handleUndo = useCallback(async () => {
    if (!accessToken) return;

    try {
      setIsUndoing(true);
      console.log('Clearing generated suggestions...');
      
      // Clear the suggestions from the frontend
      setSuggestions([]);
      
      // Also delete any events that were added to the calendar
      const response = await fetch('/api/autopopulate/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Undo API error:', errorData);
        // Don't throw error here since we already cleared the suggestions
        console.log('Calendar cleanup failed, but suggestions cleared');
      } else {
        const data = await response.json();
        console.log('Undo response:', data);
        if (data.deletedEvents > 0) {
          alert(`Cleared suggestions and deleted ${data.deletedEvents} events from calendar`);
        } else {
          alert('Suggestions cleared');
        }
      }
    } catch (err) {
      console.error('Undo failed:', err);
      // Still clear suggestions even if calendar cleanup fails
      setSuggestions([]);
      alert('Suggestions cleared (calendar cleanup had issues)');
    } finally {
      setIsUndoing(false);
    }
  }, [accessToken]);

  const handleDeleteAllSuggestions = useCallback(async () => {
    if (!accessToken) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete ALL autopopulated events from your calendar? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    try {
      setIsUndoing(true);
      console.log('Deleting all autopopulated events...');
      
      const response = await fetch('/api/autopopulate/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete all API error:', errorData);
        throw new Error(errorData.error || 'Failed to delete all events');
      }

      const data = await response.json();
      console.log('Delete all response:', data);
      
      // Clear current suggestions from UI
      setSuggestions([]);
      
      alert(`Successfully deleted ${data.deletedEvents} autopopulated events from your calendar`);
    } catch (err) {
      console.error('Delete all failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete all events');
    } finally {
      setIsUndoing(false);
    }
  }, [accessToken]);

  const handleToggleSuggestion = useCallback((id: string) => {
    setSuggestions(prev => 
      prev.map(suggestion => 
        suggestion.id === id 
          ? { ...suggestion, selected: !suggestion.selected }
          : suggestion
      )
    );
  }, []);

  const handleRunAutoPipeline = useCallback(async () => {
    if (!accessToken || !persona || !calendarPayload) return;

    try {
      setIsRunningPipeline(true);
      setPipelineProgress({ digest: 0, recommendations: 0, calendar: 0, audio: 0 });
      setPipelineStatus('Starting Auto Pipeline...');

      let digestContent = '';
      let digestId = '';
      let recommendations: any[] = [];

      // Helper function to retry operations
      const retryOperation = async (operation: () => Promise<any>, operationName: string, maxRetries = 3): Promise<any> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            console.error(`${operationName} attempt ${attempt} failed:`, error);
            if (attempt === maxRetries) {
              throw error;
            }
            setPipelineStatus(`${operationName} failed (attempt ${attempt}), retrying...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
          }
        }
      };

      // Step 1: Try parallel execution first
      setPipelineStatus('Attempting parallel execution...');
      setPipelineProgress({ digest: 10, recommendations: 10, calendar: 0, audio: 0 });

      try {
        const digestPromise = fetch('/api/digest/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            digestContext: {
              persona: persona,
              recent_calendar_json: calendarPayload.events || []
            }
          }),
        });

        const recommendationsPromise = fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            persona: persona,
            calendarEvents: calendarPayload.events,
            userLocation: {
              city: persona?.profile?.home_base?.city || 'San Francisco',
              country: persona?.profile?.home_base?.country || 'US',
              timezone: persona?.profile?.primary_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            currentDate: new Date().toISOString(),
          }),
        });

        // Wait for both to complete
        const [digestResponse, recommendationsResponse] = await Promise.all([
          digestPromise,
          recommendationsPromise
        ]);

        if (!digestResponse.ok || !recommendationsResponse.ok) {
          throw new Error('Parallel execution failed');
        }

        setPipelineProgress({ digest: 50, recommendations: 50, calendar: 0, audio: 0 });
        setPipelineStatus('Parallel execution successful! Processing results...');

        // Process digest stream
        const digestReader = digestResponse.body?.getReader();
        if (digestReader) {
          while (true) {
            const { done, value } = await digestReader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.step === 'complete' && data.digestId) {
                    digestId = data.digestId;
                    digestContent = data.content || '';
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        }

        const recommendationsData = await recommendationsResponse.json();
        recommendations = recommendationsData.recommendations?.flatMap((week: any) => week.recommendations) || [];

        setPipelineProgress({ digest: 100, recommendations: 100, calendar: 0, audio: 0 });
        setPipelineStatus('Parallel execution completed successfully!');

      } catch (parallelError) {
        console.error('Parallel execution failed, falling back to sequential:', parallelError);
        setPipelineStatus('Parallel execution failed, trying sequential approach...');

        // Step 2: Sequential fallback
        setPipelineProgress({ digest: 0, recommendations: 0, calendar: 0, audio: 0 });

        // Generate digest first
        setPipelineStatus('Generating digest (sequential)...');
        setPipelineProgress({ digest: 25, recommendations: 0, calendar: 0, audio: 0 });

        await retryOperation(async () => {
          const digestResponse = await fetch('/api/digest/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              digestContext: {
                persona: persona,
                recent_calendar_json: calendarPayload.events || []
              }
            }),
          });

          if (!digestResponse.ok) {
            throw new Error(`Digest generation failed: ${digestResponse.status}`);
          }

          // Process digest stream
          const digestReader = digestResponse.body?.getReader();
          if (digestReader) {
            while (true) {
              const { done, value } = await digestReader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.step === 'complete' && data.digestId) {
                      digestId = data.digestId;
                      digestContent = data.content || '';
                    }
                  } catch (e) {
                    // Ignore parsing errors
                  }
                }
              }
            }
          }
        }, 'Digest Generation');

        setPipelineProgress({ digest: 100, recommendations: 0, calendar: 0, audio: 0 });
        setPipelineStatus('Digest generated successfully!');

        // Generate recommendations
        setPipelineStatus('Generating recommendations (sequential)...');
        setPipelineProgress({ digest: 100, recommendations: 25, calendar: 0, audio: 0 });

        try {
          await retryOperation(async () => {
            const recommendationsResponse = await fetch('/api/recommendations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                persona: persona,
                calendarEvents: calendarPayload.events,
                userLocation: {
                  city: persona?.profile?.home_base?.city || 'San Francisco',
                  country: persona?.profile?.home_base?.country || 'US',
                  timezone: persona?.profile?.primary_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                currentDate: new Date().toISOString(),
              }),
            });

            if (!recommendationsResponse.ok) {
              throw new Error(`Recommendations generation failed: ${recommendationsResponse.status}`);
            }

            const recommendationsData = await recommendationsResponse.json();
            recommendations = recommendationsData.recommendations?.flatMap((week: any) => week.recommendations) || [];
          }, 'Recommendations Generation');

          setPipelineProgress({ digest: 100, recommendations: 100, calendar: 0, audio: 0 });
          setPipelineStatus('Recommendations generated successfully!');

        } catch (recommendationsError) {
          console.error('Recommendations generation failed:', recommendationsError);
          setPipelineStatus('Recommendations generation failed, continuing with digest-only pipeline');
          recommendations = [];
        }
      }

      // Step 3: Add digest to calendar (with retry)
      setPipelineStatus('Adding digest to calendar...');
      setPipelineProgress({ digest: 100, recommendations: 100, calendar: 25, audio: 0 });

      try {
        await retryOperation(async () => {
          // Calculate next Sunday at 15:00
          const now = new Date();
          const daysUntilSunday = (7 - now.getDay()) % 7;
          const nextSunday = new Date(now);
          nextSunday.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
          nextSunday.setHours(15, 0, 0, 0);

          // Format digest for calendar
          const formatDigestForCalendar = (content: string) => {
            return content
              .replace(/🎧 Listen To Your Digest: (\/digest\/audio\/[^\s]+)/g, '🎧 Listen To Your Digest: [Audio Version]($1)')
              .replace(/https?:\/\/[^\s]+/g, (url) => {
                try {
                  const domain = new URL(url).hostname.replace('www.', '');
                  return `[${domain}](${url})`;
                } catch {
                  return url;
                }
              });
          };

          const digestEventData = {
            summary: 'Circling Back',
            location: 'by Loop',
            description: formatDigestForCalendar(digestContent),
            start: {
              dateTime: nextSunday.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
              dateTime: new Date(nextSunday.getTime() + 60 * 60 * 1000).toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          };

          const digestCalendarResponse = await fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken,
              eventData: digestEventData,
            }),
          });

          if (!digestCalendarResponse.ok) {
            throw new Error(`Failed to add digest to calendar: ${digestCalendarResponse.status}`);
          }
        }, 'Digest Calendar Addition');

        setPipelineProgress({ digest: 100, recommendations: 100, calendar: 50, audio: 0 });
        setPipelineStatus('Digest added to calendar successfully!');

      } catch (digestCalendarError) {
        console.error('Failed to add digest to calendar:', digestCalendarError);
        setPipelineStatus('Failed to add digest to calendar, continuing with recommendations');
      }

      // Step 4: Add recommendations to calendar (if any, with retry)
      if (recommendations.length > 0) {
        setPipelineStatus('Adding recommendations to calendar...');
        setPipelineProgress({ digest: 100, recommendations: 100, calendar: 75, audio: 0 });

        try {
          await retryOperation(async () => {
            const addToCalendarResponse = await fetch('/api/autopopulate/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accessToken,
                suggestions: recommendations.map((s: any) => ({ ...s, selected: true }))
              }),
            });

            if (!addToCalendarResponse.ok) {
              throw new Error(`Failed to add recommendations to calendar: ${addToCalendarResponse.status}`);
            }
          }, 'Recommendations Calendar Addition');

          setPipelineProgress({ digest: 100, recommendations: 100, calendar: 100, audio: 0 });
          setPipelineStatus('Recommendations added to calendar successfully!');

        } catch (recommendationsCalendarError) {
          console.error('Failed to add recommendations to calendar:', recommendationsCalendarError);
          setPipelineStatus('Failed to add recommendations to calendar, continuing with audio generation');
        }
      } else {
        setPipelineProgress({ digest: 100, recommendations: 100, calendar: 100, audio: 0 });
        setPipelineStatus('Skipping recommendations (none generated)');
      }

      // Step 5: Generate audio (with retry)
      setPipelineStatus('Generating audio...');
      setPipelineProgress({ digest: 100, recommendations: 100, calendar: 100, audio: 50 });

      try {
        await retryOperation(async () => {
          const audioResponse = await fetch('/api/digest/audio/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              digestId,
              content: digestContent
            }),
          });

          if (!audioResponse.ok) {
            const errorData = await audioResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Audio generation API error:', errorData);
            throw new Error(`Audio generation failed: ${audioResponse.status} - ${errorData.error || 'Unknown error'}`);
          }

          const audioResult = await audioResponse.json();
          console.log('Audio generation successful:', audioResult);
          return audioResult;
        }, 'Audio Generation');

        setPipelineProgress({ digest: 100, recommendations: 100, calendar: 100, audio: 100 });
        setPipelineStatus('Auto Pipeline completed successfully!');

        // Step 6: Navigate to audio page
        setTimeout(() => {
          router.push(`/digest/audio/${digestId}`);
        }, 2000);

      } catch (audioError) {
        console.error('Audio generation failed:', audioError);
        setPipelineStatus(`Audio generation failed: ${audioError instanceof Error ? audioError.message : 'Unknown error'}. Pipeline completed successfully otherwise.`);
        setPipelineProgress({ digest: 100, recommendations: 100, calendar: 100, audio: 100 });
        
        // Still navigate to digest page even if audio failed
        setTimeout(() => {
          router.push(`/digest/audio/${digestId}`);
        }, 2000);
      }

    } catch (err) {
      console.error('Auto Pipeline failed:', err);
      setPipelineStatus(`Auto Pipeline failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRunningPipeline(false);
    }
  }, [accessToken, persona, calendarPayload, router]);

  const tabItems: Array<{ id: TabId; label: string }> = useMemo(
    () => [
      { id: 'events', label: 'Calendar JSON' },
      { id: 'persona', label: 'Persona' },
      { id: 'digest', label: 'Sunday Digest' },
      { id: 'autopopulate', label: 'Suggest' },
      { id: 'auto-pipeline', label: 'Auto Pipeline' },
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
                ? `Showing ${calendarPayload.count} events between ${new Date(calendarPayload.timeframe.start).toLocaleDateString()} and ${new Date(calendarPayload.timeframe.end).toLocaleDateString()}${
                    calendarPayload.requestedMonthsBack && calendarPayload.monthsBack !== calendarPayload.requestedMonthsBack
                      ? ` (reduced from ${calendarPayload.requestedMonthsBack} to ${calendarPayload.monthsBack} months due to context limits)`
                      : ` (${calendarPayload.monthsBack} months of data)`
                  }`
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
            digestId={digestId || undefined}
            audioUrl={audioUrl || undefined}
            isGenerating={isGeneratingDigest} 
            onGenerate={handleGenerateDigest}
            onCreateEvent={handleCreateCalendarEvent}
            isCreatingEvent={isCreatingEvent}
            requestData={digestRequestData || undefined}
            onDigestComplete={handleDigestComplete}
            onTestDigest={handleTestDigest}
            persona={persona}
          />
        );
      case 'autopopulate':
        return (
          <AutoPopulatePanel
            persona={persona}
            calendarPayload={calendarPayload}
            accessToken={accessToken}
            onGenerate={handleGenerateSuggestions}
            onAddToCalendar={handleAddToCalendar}
            onUndo={handleUndo}
            onDeleteAll={handleDeleteAllSuggestions}
            isGenerating={isGeneratingSuggestions}
            isAddingToCalendar={isAddingToCalendar}
            isUndoing={isUndoing}
            suggestions={suggestions}
            onToggleSuggestion={handleToggleSuggestion}
          />
        );
      case 'auto-pipeline':
        return (
          <div className="space-y-6">
            <div className="border border-black bg-white p-6">
              <h2 className="text-lg font-semibold text-black uppercase tracking-wide mb-4">
                Auto Pipeline
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Run the complete Sunday digest and calendar enhancement pipeline automatically. 
                This will generate your digest, create personalized recommendations, add both the digest and recommendations to your calendar, 
                generate audio, and take you to the audio player. Tries parallel execution first, falls back to sequential if needed.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={handleRunAutoPipeline}
                  disabled={isRunningPipeline || !persona || !calendarPayload || !accessToken}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isRunningPipeline ? 'Running Auto Pipeline...' : 'Start Auto Pipeline'}
                </button>

                {isRunningPipeline && (
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-700">
                      {pipelineStatus}
                  </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Digest Generation</span>
                        <span className="text-sm font-medium">{pipelineProgress.digest}%</span>
                  </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pipelineProgress.digest}%` }}
                        />
                </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Recommendations</span>
                        <span className="text-sm font-medium">{pipelineProgress.recommendations}%</span>
                  </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pipelineProgress.recommendations}%` }}
                        />
          </div>
                    </div>

              <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Calendar Integration</span>
                        <span className="text-sm font-medium">{pipelineProgress.calendar}%</span>
              </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pipelineProgress.calendar}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Audio Generation</span>
                        <span className="text-sm font-medium">{pipelineProgress.audio}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pipelineProgress.audio}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!persona && (
                  <div className="border border-amber-300 bg-amber-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
          </div>
                      <div>
                        <h3 className="text-sm font-medium text-amber-800">Persona Required</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          You need to generate your persona first before using the Auto Pipeline. 
                          Go to the <strong>Persona</strong> tab to create your personalized profile.
                </p>
              </div>
          </div>
                  </div>
                )}

                {!calendarPayload && (
                  <div className="border border-blue-300 bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
                      <div>
                        <h3 className="text-sm font-medium text-blue-800">Calendar Data Required</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Load your calendar data first to enable the Auto Pipeline. 
                          The calendar data is automatically loaded when you visit the dashboard.
                        </p>
          </div>
                    </div>
                  </div>
                )}

                {!accessToken && (
                  <div className="border border-red-300 bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-red-800">Authentication Required</h3>
                        <p className="text-sm text-red-700 mt-1">
                          Calendar access is required for the Auto Pipeline. 
                          Please ensure you're properly authenticated with Google Calendar.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
        </div>
      </div>
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

export default function DashboardPage() {
      return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Loading Dashboard...</h2>
          <p className="text-gray-600">Setting up your calendar access...</p>
        </div>
      </div>
    }>
      <Dashboard />
    </Suspense>
  );
}
