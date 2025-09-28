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
  onDeleteAll: () => void;
  isGenerating: boolean;
  isAddingToCalendar: boolean;
  isUndoing: boolean;
  suggestions: SuggestedEvent[];
  onToggleSuggestion: (id: string) => void;
}

export function AutoPopulatePanel({
  persona,
  calendarPayload,
  accessToken,
  onGenerate,
  onAddToCalendar,
  onUndo,
  onDeleteAll,
  isGenerating,
  isAddingToCalendar,
  isUndoing,
  suggestions,
  onToggleSuggestion
}: AutoPopulatePanelProps) {
  const selectedCount = suggestions.filter(s => s.selected).length;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black uppercase tracking-wide">Suggest</h2>
          <p className="text-sm text-gray-600">
            Generate suggested events for the next 4 weeks based on your persona and calendar patterns.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !persona || !calendarPayload}
            className="minimal-button"
          >
            {isGenerating ? 'Generating…' : 'Generate Suggestions'}
          </button>
          {suggestions.length > 0 && (
            <>
              <button
                type="button"
                onClick={onAddToCalendar}
                disabled={isAddingToCalendar || selectedCount === 0 || !accessToken}
                className="minimal-button-secondary"
              >
                {isAddingToCalendar ? 'Adding…' : `Add to Calendar (${selectedCount})`}
              </button>
              <button
                type="button"
                onClick={onUndo}
                disabled={isUndoing || !accessToken}
                className="minimal-button-secondary"
              >
                {isUndoing ? 'Undoing…' : 'Undo'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Delete All Suggestions Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDeleteAll}
          disabled={isUndoing || !accessToken}
          className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUndoing ? 'Deleting…' : 'Delete All Suggestions'}
        </button>
      </div>

      {!persona ? (
        <div className="border border-amber-300 bg-amber-50 p-6 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-800">Persona Required</h3>
              <p className="text-sm text-amber-700 mt-1">
                You need to generate your persona first before using calendar enhancement. 
                Go to the <strong>Persona</strong> tab to create your personalized profile.
              </p>
            </div>
          </div>
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
              Suggested Events ({suggestions.length})
            </h3>
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`p-4 border rounded cursor-pointer transition-colors ${
                    suggestion.selected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onToggleSuggestion(suggestion.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={suggestion.selected}
                          onChange={() => onToggleSuggestion(suggestion.id)}
                          className="rounded"
                        />
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
