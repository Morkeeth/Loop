'use client';

interface DigestPanelProps {
  digest: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onCreateEvent?: () => void;
  isCreatingEvent?: boolean;
}

export function DigestPanel({ digest, isGenerating, onGenerate, onCreateEvent, isCreatingEvent }: DigestPanelProps) {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black uppercase tracking-wide">Sunday Digest</h2>
          <p className="text-sm text-gray-600">
            Use the `digest-prompt.md` template with the persona and recent calendar JSON.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="minimal-button"
        >
          {isGenerating ? 'Writing digest…' : 'Run Sunday Digest'}
        </button>
      </header>

      {digest ? (
        <article className="space-y-4">
          <div className="border border-black bg-white p-6 text-sm leading-relaxed text-black">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-black">
{digest}
            </pre>
          </div>
          
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

