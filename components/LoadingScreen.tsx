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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-6">
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Loop</h1>
        </div>

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
  );
}
