'use client';

interface SuggestedEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  reason: string;
  selected: boolean;
}

interface AutoPopulatePanelProps {
  persona: any | null;
  calendarPayload: any | null;
  accessToken: string | null;
  onGenerate: () => void;
  onAddToCalendar: () => void;
  onUndo: () => void;
  isGenerating: boolean;
  isAddingToCalendar: boolean;
  isUndoing: boolean;
  suggestions: SuggestedEvent[];
  onToggleSuggestion: (id: string) => void;
  autoAdded?: boolean;
}

export function SuggestPanel({
  persona,
  calendarPayload,
  accessToken,
  onGenerate,
  onAddToCalendar,
  onUndo,
  isGenerating,
  isAddingToCalendar,
  isUndoing,
  suggestions,
  onToggleSuggestion,
  autoAdded = false
}: AutoPopulatePanelProps) {
  const selectedCount = suggestions.filter(s => s.selected).length;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black uppercase tracking-wide">Enhance Calendar</h2>
          <p className="text-sm text-gray-600">
            {autoAdded 
              ? `✅ ${suggestions.length} events automatically added to your calendar!`
              : 'Generate suggested events for the next 4 weeks based on your persona and calendar patterns.'
            }
          </p>
        </div>
        <div className="flex gap-2">
          {!autoAdded && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating || !persona || !calendarPayload}
              className="minimal-button"
            >
              {isGenerating ? 'Generating…' : 'Generate Suggestions'}
            </button>
          )}
          {suggestions.length > 0 && (
            <>
              {!autoAdded && (
                <button
                  type="button"
                  onClick={onAddToCalendar}
                  disabled={isAddingToCalendar || selectedCount === 0 || !accessToken}
                  className="minimal-button-secondary"
                >
                  {isAddingToCalendar ? 'Adding…' : `Add to Calendar (${selectedCount})`}
                </button>
              )}
              <button
                type="button"
                onClick={onUndo}
                disabled={isUndoing || !accessToken}
                className="minimal-button-secondary"
              >
                {isUndoing ? 'Removing…' : `Remove All Events (${suggestions.length})`}
              </button>
            </>
          )}
        </div>
      </header>

      {!persona ? (
        <div className="border border-black bg-white p-10 text-center text-sm text-gray-600">
          Generate your persona first to enable auto-populate suggestions.
        </div>
      ) : !calendarPayload ? (
        <div className="border border-black bg-white p-10 text-center text-sm text-gray-600">
          Load your calendar data first to enable auto-populate suggestions.
        </div>
      ) : suggestions.length === 0 ? (
        <div className="border border-black bg-white p-10 text-center text-sm text-gray-600">
          Click "Generate Suggestions" to see personalized event recommendations for the next 4 weeks.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-black bg-white p-6">
            <h3 className="text-sm font-semibold text-black mb-4 uppercase tracking-wide">
              {autoAdded ? 'Added Events' : 'Suggested Events'} ({suggestions.length})
            </h3>
            {autoAdded && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  ✅ All events have been automatically added to your "Loop – Autoplan" calendar.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`p-4 border rounded transition-colors ${
                    autoAdded 
                      ? 'border-green-300 bg-green-50'
                      : suggestion.selected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {autoAdded ? (
                          <span className="text-green-600">✅</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={suggestion.selected}
                            onChange={() => onToggleSuggestion(suggestion.id)}
                            className="rounded"
                          />
                        )}
                        <h4 className="font-medium text-black">{suggestion.title}</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {suggestion.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {new Date(suggestion.startTime).toLocaleDateString()} at{' '}
                        {new Date(suggestion.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {' - '}
                        {new Date(suggestion.endTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-gray-500">{suggestion.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
