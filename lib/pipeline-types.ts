// Shared types and constants for the pipeline dashboard and its components

export type StepStatus = 'pending' | 'active' | 'complete' | 'error';

export type PipelineStepId = 'calendar' | 'persona' | 'discover' | 'event';

export interface PipelineStep {
  id: PipelineStepId;
  title: string;
  description: string;
  status: StepStatus;
  error?: string | null;
}

export interface CalendarPayload {
  success: boolean;
  events: any[];
  minified: any[];
  insights: string[];
  timeframe: { start: string; end: string } | null;
  count: number;
  monthsBack: number;
}

export interface DiscoveredEvent {
  event_title: string;
  venue: string;
  address: string;
  date: string;
  time: string;
  end_time: string;
  description: string;
  url: string;
  category: string;
  why_this: string;
}

export const STEP_DESCRIPTIONS: Record<PipelineStepId, string[]> = {
  calendar: [
    'Pulling the last six months from Google Calendar',
    'Analyzing your event patterns',
    'Counting meetings, calls, and appointments',
    'Mapping your schedule rhythms',
  ],
  persona: [
    'Summarising your rhythms, rituals, and working style',
    'Detecting your work patterns and preferences',
    'Understanding your city, interests, and vibe',
    'Building your unique profile',
  ],
  discover: [
    'Searching the web for events in your city',
    'Matching events to your interests and vibe',
    'Filtering for something truly special',
    'Found something — checking the details',
    'Curating your one magical event',
  ],
  event: [
    'Adding the event to your calendar',
    'Setting the date and time',
    'Including all the details',
    'Scheduled via Google Calendar API',
  ],
};
