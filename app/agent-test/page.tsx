"use client";

import { useState } from 'react';

export default function AgentTest() {
  const [agentData, setAgentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAgentCreation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/digest/agent/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          digestId: 'test-agent-' + Date.now(),
          digestContent: 'Good morning! This is a test digest for agent creation. Your week looks busy with several meetings and events.',
          persona: {
            name: 'Test User',
            working_style: 'Productive and organized',
            communication_preference: 'Direct and efficient',
            meeting_patterns: 'Regular business hours',
            energy_levels: 'High energy in mornings',
            focus_areas: 'Work, personal development, health',
            social_preferences: 'Balanced social and solo time',
            learning_style: 'Hands-on and practical',
            stress_indicators: 'Over-scheduling, lack of breaks',
            optimal_conditions: 'Quiet environment, clear goals',
            time_management: 'Structured and organized',
            collaboration_style: 'Team-oriented',
            decision_making: 'Data-driven and analytical',
            feedback_preference: 'Constructive and specific',
            work_life_balance: 'Clear boundaries between work and personal time'
          },
          calendarData: [
            {
              s: 'Team Meeting',
              st: '2025-09-28T10:00:00+02:00',
              et: '2025-09-28T11:00:00+02:00',
              loc: 'Conference Room A'
            },
            {
              s: 'Lunch with Client',
              st: '2025-09-28T12:30:00+02:00',
              et: '2025-09-28T14:00:00+02:00',
              loc: 'Downtown Restaurant'
            },
            {
              s: 'Project Review',
              st: '2025-09-28T15:00:00+02:00',
              et: '2025-09-28T16:30:00+02:00',
              loc: 'Office'
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create agent');
      }

      const result = await response.json();
      setAgentData(result);
      console.log('Agent created successfully:', result);
    } catch (error) {
      console.error('Agent creation failed:', error);
      alert('Agent creation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const testCalendarEvent = () => {
    if (!agentData) {
      alert('Please create an agent first');
      return;
    }

    const eventDescription = `🤖 Chat with Marcel: ${agentData.agentUrl}

Good morning! This is a test digest for agent creation. Your week looks busy with several meetings and events.

🎧 Listen To Your Digest: /digest/audio/test-agent-123

Your personalized morning brief with Marcel AI assistant ready to chat!`;

    console.log('Calendar Event Description:');
    console.log(eventDescription);
    
    // Copy to clipboard
    navigator.clipboard.writeText(eventDescription);
    alert('Calendar event description copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Agent Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Agent Creation</h2>
          <button
            onClick={testAgentCreation}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating Agent...' : 'Create Test Agent'}
          </button>
        </div>

        {agentData && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Agent Created Successfully!</h2>
            <div className="space-y-2">
              <p><strong>Agent ID:</strong> {agentData.agentId}</p>
              <p><strong>Agent URL:</strong> <a href={agentData.agentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{agentData.agentUrl}</a></p>
            </div>
            
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Agent Interface:</h3>
              <iframe
                src={agentData.agentUrl}
                style={{ 
                  width: '100%', 
                  height: '500px', 
                  border: '1px solid #ccc', 
                  borderRadius: '8px'
                }}
                allow="camera; microphone; fullscreen"
                allowFullScreen
                title="Marcel AI Assistant"
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Calendar Event</h2>
          <button
            onClick={testCalendarEvent}
            disabled={!agentData}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Generate Calendar Event Description
          </button>
          <p className="text-sm text-gray-600 mt-2">
            This will generate the calendar event description with the agent link and copy it to clipboard.
          </p>
        </div>
      </div>
    </div>
  );
}
