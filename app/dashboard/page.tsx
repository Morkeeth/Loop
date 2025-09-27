'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PersonaDisplay from '@/components/PersonaDisplay';
import MorningBrief from '@/components/MorningBrief';
import LoadingScreen from '@/components/LoadingScreen';
import { PersonaProfile } from '@/types/persona';
import { MorningBrief as MorningBriefType } from '@/types/brief';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [persona, setPersona] = useState<PersonaProfile | null>(null);
  const [brief, setBrief] = useState<MorningBriefType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated (in a real app, you'd check session/token)
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      router.push('/');
      return;
    }

    // Fetch calendar events and generate persona/brief
    const initializeDashboard = async () => {
      try {
        // For demo purposes, we'll use mock data
        // In a real app, you'd fetch from Google Calendar API
        const mockEvents = generateMockEvents();
        
        // Simulate the loading process
        setIsLoading(true);
        
        // The LoadingScreen component will handle the actual API calls
        // For now, we'll just show the loading screen
        setTimeout(() => {
          setIsLoading(false);
          // Set mock data for demo
          setPersona(generateMockPersona());
          setBrief(generateMockBrief());
        }, 3000);

      } catch (error) {
        console.error('Dashboard initialization error:', error);
        setError('Failed to load dashboard data');
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [router]);

  const handleLoadingComplete = (personaData: PersonaProfile | null, briefData: MorningBriefType | null) => {
    setPersona(personaData);
    setBrief(briefData);
    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} userId="demo-user" events={[]} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-shadow"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Loop</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome back! 👋
            </span>
            <button 
              onClick={() => router.push('/')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Daily Loop</h1>
          <p className="text-gray-600">Personalized insights and opportunities for today</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Morning Brief - Takes up 2 columns */}
          <div className="lg:col-span-2">
            {brief && <MorningBrief brief={brief} />}
          </div>

          {/* Persona Display - Takes up 1 column */}
          <div className="lg:col-span-1">
            {persona && <PersonaDisplay persona={persona} />}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left">
              <div className="text-2xl mb-2">📅</div>
              <h3 className="font-semibold text-gray-900">Add Event</h3>
              <p className="text-sm text-gray-600">Create a new calendar event</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left">
              <div className="text-2xl mb-2">🔄</div>
              <h3 className="font-semibold text-gray-900">Refresh Brief</h3>
              <p className="text-sm text-gray-600">Update your daily briefing</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left">
              <div className="text-2xl mb-2">⚙️</div>
              <h3 className="font-semibold text-gray-900">Settings</h3>
              <p className="text-sm text-gray-600">Customize your preferences</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock data generators for demo purposes
function generateMockEvents() {
  return [
    {
      id: '1',
      summary: 'Team Standup',
      category: { type: 'work', confidence: 0.9, keywords: ['standup', 'team'] },
      duration: 30,
      participants: ['john@company.com', 'jane@company.com'],
      isRecurring: true,
      locationType: 'virtual'
    },
    {
      id: '2',
      summary: 'Gym Session',
      category: { type: 'health', confidence: 0.8, keywords: ['gym', 'fitness'] },
      duration: 60,
      participants: [],
      isRecurring: true,
      locationType: 'venue'
    }
  ];
}

function generateMockPersona(): PersonaProfile {
  return {
    id: 'persona_demo_1',
    userId: 'demo-user',
    generatedAt: new Date().toISOString(),
    professional: {
      jobTitle: 'Software Engineer',
      industry: 'Technology',
      workPattern: 'morning',
      meetingFrequency: 'medium',
      workLocation: 'hybrid',
      workHours: { start: '09:00', end: '17:00' }
    },
    education: {
      isStudent: false,
      fieldOfStudy: undefined,
      classSchedule: [],
      academicLevel: undefined
    },
    interests: {
      hobbies: ['Reading', 'Photography', 'Cooking'],
      sports: ['Running', 'Tennis'],
      recurringActivities: ['Gym', 'Coffee meetings'],
      entertainment: ['Movies', 'Concerts']
    },
    social: {
      frequentContacts: ['john@company.com', 'jane@company.com'],
      socialEventFrequency: 'medium',
      relationshipStatus: 'single',
      socialPreferences: ['Small groups', 'Outdoor activities']
    },
    schedule: {
      wakeTime: '07:00',
      sleepTime: '23:00',
      busyPeriods: ['09:00-12:00', '14:00-17:00'],
      freeTimeSlots: ['12:00-14:00', '18:00-23:00'],
      timeZone: 'PST'
    },
    location: {
      primaryLocation: 'San Francisco, CA',
      travelPatterns: ['Weekend trips'],
      frequentLocations: ['Office', 'Gym', 'Coffee shops']
    },
    lifestyle: {
      exerciseRoutine: ['Morning runs', 'Evening gym'],
      diningPreferences: ['Healthy', 'International cuisine'],
      entertainmentChoices: ['Movies', 'Live music'],
      healthHabits: ['Regular exercise', 'Meditation']
    },
    personality: {
      traits: ['Organized', 'Social', 'Health-conscious'],
      communicationStyle: 'Direct',
      productivityStyle: 'Morning person',
      stressIndicators: ['Back-to-back meetings']
    },
    confidence: {
      overall: 0.85,
      professional: 0.9,
      social: 0.8,
      lifestyle: 0.85
    }
  };
}

function generateMockBrief(): MorningBriefType {
  return {
    id: 'brief_demo_1',
    userId: 'demo-user',
    date: new Date().toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    weather: {
      location: 'San Francisco, CA',
      temperature: 72,
      condition: 'Partly Cloudy',
      description: 'Perfect weather for outdoor activities',
      icon: '⛅',
      humidity: 65,
      windSpeed: 8
    },
    news: {
      industryNews: [
        {
          title: 'New AI Framework Released',
          summary: 'Latest developments in machine learning frameworks',
          url: 'https://example.com',
          relevance: 0.9
        }
      ],
      hobbyNews: [
        {
          title: 'Photography Workshop This Weekend',
          summary: 'Learn advanced techniques from professionals',
          url: 'https://example.com',
          relevance: 0.8
        }
      ],
      localNews: []
    },
    opportunities: [
      {
        title: 'Coffee Chat with Team',
        description: 'Perfect time for informal team bonding',
        timeSlot: '12:00-13:00',
        location: 'Local Coffee Shop',
        type: 'meeting',
        relevance: 0.85,
        actionRequired: false
      }
    ],
    discover: [
      {
        title: 'Tech Meetup: AI & ML',
        description: 'Network with fellow developers',
        date: 'Tomorrow',
        location: 'Downtown SF',
        category: 'Professional',
        relevance: 0.9,
        url: 'https://example.com'
      }
    ],
    reminders: [
      {
        title: 'Team Standup',
        time: '09:00',
        priority: 'high',
        type: 'meeting'
      }
    ],
    greeting: {
      personalized: 'Good morning! Ready to tackle another productive day?',
      mood: 'energetic',
      motivationalMessage: 'Your calendar shows you\'re a morning person - perfect time to tackle your most important tasks!'
    }
  };
}
