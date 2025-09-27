'use client';

import { PersonaProfile } from '@/types/persona';

interface PersonaDisplayProps {
  persona: PersonaProfile | null;
}

export default function PersonaDisplay({ persona }: PersonaDisplayProps) {
  // Handle null persona
  if (!persona) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🧠</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Your Persona</h2>
          <p className="text-gray-500">Persona generation is still in progress...</p>
        </div>
      </div>
    );
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Persona</h2>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(persona.confidence.overall)}`}>
          {getConfidenceLabel(persona.confidence.overall)} Confidence
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Professional Life */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-blue-600 text-sm">💼</span>
            </span>
            Professional Life
          </h3>
          <div className="space-y-2 text-sm">
            {persona.professional.jobTitle && (
              <p><span className="font-medium">Role:</span> {persona.professional.jobTitle}</p>
            )}
            {persona.professional.industry && (
              <p><span className="font-medium">Industry:</span> {persona.professional.industry}</p>
            )}
            <p><span className="font-medium">Work Pattern:</span> {persona.professional.workPattern}</p>
            <p><span className="font-medium">Meeting Frequency:</span> {persona.professional.meetingFrequency}</p>
            <p><span className="font-medium">Location:</span> {persona.professional.workLocation}</p>
          </div>
        </div>

        {/* Schedule Patterns */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-purple-600 text-sm">⏰</span>
            </span>
            Schedule Patterns
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Wake Time:</span> {persona.schedule.wakeTime}</p>
            <p><span className="font-medium">Sleep Time:</span> {persona.schedule.sleepTime}</p>
            <p><span className="font-medium">Time Zone:</span> {persona.schedule.timeZone}</p>
            {persona.schedule.busyPeriods.length > 0 && (
              <p><span className="font-medium">Busy Periods:</span> {persona.schedule.busyPeriods.join(', ')}</p>
            )}
          </div>
        </div>

        {/* Interests & Hobbies */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-green-600 text-sm">🎯</span>
            </span>
            Interests & Hobbies
          </h3>
          <div className="space-y-2 text-sm">
            {persona.interests.hobbies.length > 0 && (
              <div>
                <span className="font-medium">Hobbies:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {persona.interests.hobbies.map((hobby, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      {hobby}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {persona.interests.sports.length > 0 && (
              <div>
                <span className="font-medium">Sports:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {persona.interests.sports.map((sport, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {sport}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Social Patterns */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-orange-600 text-sm">👥</span>
            </span>
            Social Patterns
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Social Frequency:</span> {persona.social.socialEventFrequency}</p>
            {persona.social.relationshipStatus && (
              <p><span className="font-medium">Relationship:</span> {persona.social.relationshipStatus}</p>
            )}
            {persona.social.frequentContacts.length > 0 && (
              <p><span className="font-medium">Frequent Contacts:</span> {persona.social.frequentContacts.length} people</p>
            )}
          </div>
        </div>
      </div>

      {/* Lifestyle Indicators */}
      {(persona.lifestyle.exerciseRoutine.length > 0 || persona.lifestyle.diningPreferences.length > 0) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
            <span className="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-pink-600 text-sm">🌟</span>
            </span>
            Lifestyle Indicators
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {persona.lifestyle.exerciseRoutine.length > 0 && (
              <div>
                <span className="font-medium text-sm">Exercise Routine:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {persona.lifestyle.exerciseRoutine.map((exercise, index) => (
                    <span key={index} className="px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs">
                      {exercise}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {persona.lifestyle.diningPreferences.length > 0 && (
              <div>
                <span className="font-medium text-sm">Dining Preferences:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {persona.lifestyle.diningPreferences.map((preference, index) => (
                    <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      {preference}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personality Traits */}
      {persona.personality.traits.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
            <span className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-indigo-600 text-sm">🧠</span>
            </span>
            Personality Traits
          </h3>
          <div className="flex flex-wrap gap-2">
            {persona.personality.traits.map((trait, index) => (
              <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
