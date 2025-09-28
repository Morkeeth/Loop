'use client';

import { useState, useEffect } from 'react';
import { LoadingComment } from '@/types/persona';

interface LoadingScreenProps {
  onComplete: (persona: any) => void;
  userId: string;
  events: any[];
}

export default function LoadingScreen({ onComplete, userId, events }: LoadingScreenProps) {
  const [currentComment, setCurrentComment] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('analyzing');

  const stages = [
    { name: 'analyzing', label: 'Analyzing your calendar...', duration: 2000 },
    { name: 'processing', label: 'Processing patterns...', duration: 3000 },
    { name: 'generating', label: 'Generating your persona...', duration: 4000 },
  ];

  // Generate simple comments based on calendar data
  const generateSimpleComments = (events: any[]) => {
    const comments = [];
    
    // Count different types of events
    const workEvents = events.filter(e => e.category?.type === 'work').length;
    const socialEvents = events.filter(e => e.category?.type === 'social').length;
    const healthEvents = events.filter(e => e.category?.type === 'health').length;
    const recurringEvents = events.filter(e => e.isRecurring).length;
    
    // Generate comments based on patterns
    if (workEvents > 10) {
      comments.push("Wow, you're quite the meeting master! 📅");
    }
    if (socialEvents > 5) {
      comments.push("I see you're quite the social butterfly! 🦋");
    }
    if (healthEvents > 3) {
      comments.push("Fitness enthusiast detected! 💪");
    }
    if (recurringEvents > 5) {
      comments.push("You love your routines, don't you? 🔄");
    }
    if (events.length > 20) {
      comments.push("Busy bee alert! Your calendar is packed! 🐝");
    }
    if (events.length < 5) {
      comments.push("Minimalist calendar detected! Less is more! ✨");
    }
    
    // Add some general witty comments
    comments.push("Let me decode your schedule patterns... 🔍");
    comments.push("Your calendar tells quite a story! 📖");
    comments.push("I'm learning your rhythm... 🎵");
    comments.push("Patterns emerging... almost there! ⚡");
    
    return comments;
  };

  useEffect(() => {
    let stageIndex = 0;
    let commentIndex = 0;
    let progressInterval: NodeJS.Timeout;
    let stageInterval: NodeJS.Timeout;
    let commentInterval: NodeJS.Timeout;

    const comments = generateSimpleComments(events);

    const startProcessing = async () => {
      // Cycle through comments
      commentInterval = setInterval(() => {
        if (commentIndex < comments.length) {
          setCurrentComment(comments[commentIndex]);
          commentIndex++;
        } else {
          commentIndex = 0; // Loop back
        }
      }, 2000);

      // Update progress
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            clearInterval(commentInterval);
            clearInterval(stageInterval);
            return 100;
          }
          return prev + 1;
        });
      }, 50);

      // Update stages
      stageInterval = setInterval(() => {
        if (stageIndex < stages.length - 1) {
          stageIndex++;
          setStage(stages[stageIndex].name);
        }
      }, 2000);

      // Start persona generation after a short delay
      setTimeout(async () => {
        try {
          const personaResponse = await fetch('/api/persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              calendarData: {
                now_iso: new Date().toISOString(),
                default_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                calendars: [{ id: 'primary', summary: 'Primary Calendar' }],
                events: events,
              },
            }),
          });

          if (personaResponse.ok) {
            const persona = await personaResponse.json();
            
            // Complete loading with persona
            setTimeout(() => {
              onComplete(persona);
            }, 1000);
          }
        } catch (error) {
          console.error('Persona generation error:', error);
          // Complete with mock data if persona fails
          setTimeout(() => {
            onComplete(null);
          }, 1000);
        }
      }, 3000);
    };

    startProcessing();

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (stageInterval) clearInterval(stageInterval);
      if (commentInterval) clearInterval(commentInterval);
    };
  }, [events, userId, onComplete]);

  const currentStage = stages.find(s => s.name === stage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col px-6">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-20 backdrop-blur-md bg-white/80 border-b border-black/10">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6" viewBox="0 0 23.5703 21.5332" fill="black">
              <path d="M7.61523 7.28711C9.63867 7.28711 11.2656 5.64648 11.2656 3.63672C11.2656 1.62695 9.63867 0 7.61523 0C5.60547 0 3.97852 1.62695 3.97852 3.63672C3.97852 5.64648 5.60547 7.28711 7.61523 7.28711ZM7.61523 5.30469C6.69922 5.30469 5.94727 4.55273 5.94727 3.63672C5.94727 2.7207 6.69922 1.96875 7.61523 1.96875C8.54492 1.96875 9.29688 2.7207 9.29688 3.63672C9.29688 4.55273 8.54492 5.30469 7.61523 5.30469ZM15.5996 7.28711C17.6094 7.28711 19.2363 5.64648 19.2363 3.63672C19.2363 1.62695 17.6094 0 15.5996 0C13.5898 0 11.9492 1.62695 11.9492 3.63672C11.9492 5.64648 13.5898 7.28711 15.5996 7.28711ZM15.5996 5.30469C14.6836 5.30469 13.9316 4.55273 13.9316 3.63672C13.9316 2.7207 14.6836 1.96875 15.5996 1.96875C16.5156 1.96875 17.2676 2.7207 17.2676 3.63672C17.2676 4.55273 16.5156 5.30469 15.5996 5.30469ZM3.65039 14.4102C5.66016 14.4102 7.28711 12.7695 7.28711 10.7598C7.28711 8.75 5.66016 7.10938 3.65039 7.10938C1.62695 7.10938 0 8.75 0 10.7598C0 12.7695 1.62695 14.4102 3.65039 14.4102ZM3.65039 12.4277C2.7207 12.4277 1.96875 11.6758 1.96875 10.7598C1.96875 9.84375 2.7207 9.0918 3.65039 9.0918C4.56641 9.0918 5.31836 9.84375 5.31836 10.7598C5.31836 11.6758 4.56641 12.4277 3.65039 12.4277ZM19.5781 14.4102C21.5879 14.4102 23.2148 12.7695 23.2148 10.7598C23.2148 8.75 21.5879 7.10938 19.5781 7.10938C17.5684 7.10938 15.9277 8.75 15.9277 10.7598C15.9277 12.7695 17.5684 14.4102 19.5781 14.4102ZM19.5781 12.4277C18.6484 12.4277 17.8965 11.6758 17.8965 10.7598C17.8965 9.84375 18.6484 9.0918 19.5781 9.0918C20.4941 9.0918 21.2461 9.84375 21.2461 10.7598C21.2461 11.6758 20.4941 12.4277 19.5781 12.4277ZM7.61523 21.5332C9.63867 21.5332 11.2656 19.9062 11.2656 17.8965C11.2656 15.8867 9.63867 14.2461 7.61523 14.2461C5.60547 14.2461 3.97852 15.8867 3.97852 17.8965C3.97852 19.9062 5.60547 21.5332 7.61523 21.5332ZM7.61523 19.5645C6.69922 19.5645 5.94727 18.8125 5.94727 17.8965C5.94727 16.9805 6.69922 16.2285 7.61523 16.2285C8.54492 16.2285 9.29688 16.9805 9.29688 17.8965C9.29688 18.8125 8.54492 19.5645 7.61523 19.5645ZM15.5996 21.5332C17.6094 21.5332 19.2363 19.9062 19.2363 17.8965C19.2363 15.8867 17.6094 14.2461 15.5996 14.2461C13.5898 14.2461 11.9492 15.8867 11.9492 17.8965C11.9492 19.9062 13.5898 21.5332 15.5996 21.5332ZM15.5996 19.5645C14.6836 19.5645 13.9316 18.8125 13.9316 17.8965C13.9316 16.9805 14.6836 16.2285 15.5996 16.2285C16.5156 16.2285 17.2676 16.9805 17.2676 17.8965C17.2676 18.8125 16.5156 19.5645 15.5996 19.5645Z"/>
            </svg>
            <span className="text-xl font-bold text-black">Loop</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center pt-20">
        <div className="max-w-2xl mx-auto text-center">

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-lg text-gray-600">{currentStage?.label}</p>
        </div>

        {/* Loading Animation */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Current Comment */}
        {currentComment && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🤖</span>
              </div>
            </div>
            <p className="text-lg text-gray-800 font-medium">
              {currentComment}
            </p>
            <div className="mt-4 flex justify-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Stage Indicators */}
        <div className="grid grid-cols-3 gap-4">
          {stages.map((stageItem, index) => (
            <div key={stageItem.name} className="text-center">
              <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold ${
                stageItem.name === stage 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                  : stages.findIndex(s => s.name === stage) > index
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {stages.findIndex(s => s.name === stage) > index ? '✓' : index + 1}
              </div>
              <p className={`text-xs ${
                stageItem.name === stage ? 'text-gray-900 font-semibold' : 'text-gray-500'
              }`}>
                {stageItem.label.split(' ')[0]}
              </p>
            </div>
          ))}
        </div>

          {/* Fun Facts */}
          <div className="mt-8 text-sm text-gray-500">
            <p>✨ Analyzing {events.length} calendar events</p>
            <p>🧠 Creating your unique persona profile</p>
          </div>
        </div>
      </div>
    </div>
  );
}
