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
}

export function DigestPanel({ digest, digestId, audioUrl, isGenerating, onGenerate, onCreateEvent, isCreatingEvent, requestData, onDigestComplete, onTestDigest }: DigestPanelProps) {
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
              disabled={isGenerating}
              className="minimal-button-secondary"
            >
              Test Digest
            </button>
          )}
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="minimal-button"
          >
            {isGenerating ? 'Generating digest…' : 'Run Sunday Digest'}
          </button>
        </div>
      </header>

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

