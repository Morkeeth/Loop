'use client';

import { MorningBrief as MorningBriefType } from '@/types/brief';

interface MorningBriefProps {
  brief: MorningBriefType | null;
}

export default function MorningBrief({ brief }: MorningBriefProps) {
  // Handle null brief
  if (!brief) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📰</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Morning Brief</h2>
          <p className="text-gray-500">Brief generation is still in progress...</p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.8) return 'text-green-600 bg-green-100';
    if (relevance >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">{brief.greeting?.personalized || 'Good morning!'}</h1>
        <p className="text-blue-100 text-lg">{brief.greeting?.motivationalMessage || 'Have a great day!'}</p>
        <div className="mt-4 flex items-center">
          <span className="text-sm text-blue-200">Today's mood: </span>
          <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium capitalize">
            {brief.greeting?.mood || 'energetic'}
          </span>
        </div>
      </div>

      {/* Weather */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-2xl mr-3">🌤️</span>
          Weather in {brief.weather?.location || 'Your Location'}
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900">{brief.weather?.temperature || '72'}°F</div>
            <div className="text-gray-600">{brief.weather?.description || 'Partly cloudy'}</div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Humidity: {brief.weather?.humidity || '50'}%</div>
            <div>Wind: {brief.weather?.windSpeed || '5'} mph</div>
          </div>
        </div>
      </div>

      {/* News */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-2xl mr-3">📰</span>
          News That Matters to You
        </h2>
        
        {brief.news?.industryNews?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Industry News</h3>
            <div className="space-y-3">
              {brief.news.industryNews.map((article, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-gray-900">{article.title}</h4>
                  <p className="text-gray-600 text-sm mt-1">{article.summary}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getRelevanceColor(article.relevance)}`}>
                      {Math.round(article.relevance * 100)}% relevant
                    </span>
                    {article.url && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Read more →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {brief.news?.hobbyNews?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Hobby & Interest News</h3>
            <div className="space-y-3">
              {brief.news.hobbyNews.map((article, index) => (
                <div key={index} className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium text-gray-900">{article.title}</h4>
                  <p className="text-gray-600 text-sm mt-1">{article.summary}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getRelevanceColor(article.relevance)}`}>
                      {Math.round(article.relevance * 100)}% relevant
                    </span>
                    {article.url && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer" 
                         className="text-green-600 hover:text-green-800 text-sm font-medium">
                        Read more →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Today's Opportunities */}
      {brief.opportunities?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-3">🎯</span>
            Today's Opportunities
          </h2>
          <div className="space-y-4">
            {brief.opportunities.map((opportunity, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{opportunity.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{opportunity.description}</p>
                    <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                      <span>⏰ {opportunity.timeSlot}</span>
                      {opportunity.location && <span>📍 {opportunity.location}</span>}
                      <span className="capitalize">🏷️ {opportunity.type}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getRelevanceColor(opportunity.relevance)}`}>
                      {Math.round(opportunity.relevance * 100)}% match
                    </span>
                    {opportunity.actionRequired && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                        Action Required
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discover */}
      {brief.discover?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-3">🌟</span>
            Discover
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {brief.discover.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-sm text-gray-500">
                    <div>📅 {item.date}</div>
                    <div>📍 {item.location}</div>
                    <div>🏷️ {item.category}</div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 rounded-full text-xs ${getRelevanceColor(item.relevance)}`}>
                      {Math.round(item.relevance * 100)}% match
                    </span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" 
                         className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                        Learn more →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminders */}
      {brief.reminders?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-3">⏰</span>
            Reminders
          </h2>
          <div className="space-y-3">
            {brief.reminders.map((reminder, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                <div className="flex items-center">
                  <span className="text-lg mr-3">
                    {reminder.type === 'meeting' ? '🤝' : 
                     reminder.type === 'deadline' ? '📋' : 
                     reminder.type === 'health' ? '🏥' : '📝'}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900">{reminder.title}</h3>
                    <p className="text-sm text-gray-500">⏰ {reminder.time}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(reminder.priority)}`}>
                  {reminder.priority} priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
