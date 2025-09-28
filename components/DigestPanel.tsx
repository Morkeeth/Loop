'use client';

import { ProgressLogs } from './ProgressLogs';

interface DigestPanelProps {
  digest: string | null;
  digestId?: string;
  audioUrl?: string;
  isGenerating: boolean;
  onGenerate: () => void;
  onCreateEvent?: () => void;
  isCreatingEvent?: boolean;
  requestData?: {
    personaText: string;
    recentCalendarJson: string;
    promptTemplate: string;
  };
  onDigestComplete?: (result: any) => void;
  onTestDigest?: () => void;
  persona?: any | null;
}

export function DigestPanel({ digest, digestId, audioUrl, isGenerating, onGenerate, onCreateEvent, isCreatingEvent, requestData, onDigestComplete, onTestDigest, persona }: DigestPanelProps) {
  console.log('🟠 DIGEST PANEL RENDERED');
  console.log('🟠 onTestDigest:', !!onTestDigest);
  console.log('🟠 digest:', !!digest);
  console.log('🟠 isGenerating:', isGenerating);
  
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black uppercase tracking-wide">Sunday Digest</h2>
          <p className="text-sm text-gray-600">
            Use the `digest-prompt.md` template with the persona and recent calendar JSON.
          </p>
        </div>
        <div className="flex gap-3">
          {onTestDigest && (
            <button
              type="button"
              onClick={onTestDigest}
              disabled={isGenerating || !persona}
              className="minimal-button-secondary"
            >
              Test Digest
            </button>
          )}
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !persona}
            className="minimal-button"
          >
            {isGenerating ? 'Generating digest…' : 'Run Sunday Digest'}
          </button>
        </div>
      </header>

      {/* Persona Required Notice */}
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
                You need to generate your persona first before running the Sunday digest. 
                Go to the <strong>Persona</strong> tab to create your personalized profile.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Progress Logs */}
      {isGenerating && requestData && (
        <div className="border border-gray-300 bg-white p-6">
          <h3 className="text-md font-semibold text-black mb-4">Generating Digest...</h3>
          <ProgressLogs 
            isActive={isGenerating}
            requestData={requestData}
            onComplete={(result) => {
              onDigestComplete?.(result);
            }}
            onError={(error) => {
              console.error('Digest generation error:', error);
            }}
          />
        </div>
      )}

      {digest ? (
        <article className="space-y-4">
          <div className="border border-black bg-white p-6 text-sm leading-relaxed text-black">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-black">
{digest}
            </pre>
          </div>
          
          {/* Secondary Audio Link */}
          {audioUrl && (
            <div className="flex justify-center">
              <a
                href={audioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                Listen to Audio Version
              </a>
            </div>
          )}
          
          {onCreateEvent && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCreateEvent}
                disabled={isCreatingEvent}
                className="minimal-button-secondary"
              >
                {isCreatingEvent ? 'Creating Event…' : 'Add to Calendar'}
              </button>
            </div>
          )}
        </article>
      ) : (
        <div className="border border-black bg-white p-10 text-center text-sm text-gray-600">
          Generate the persona first, then run the Sunday digest with the persona + recent events.
        </div>
      )}
    </section>
  );
}

