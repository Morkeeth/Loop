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
          <h2 className="text-lg font-semibold text-gray-900">Sunday Digest</h2>
          <p className="text-sm text-gray-500">
            Use the `digest-prompt.md` template with the persona and recent calendar JSON.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="rounded border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
        >
          {isGenerating ? 'Writing digest…' : 'Run Sunday Digest'}
        </button>
      </header>

      {digest ? (
        <article className="space-y-4">
          <div className="rounded border border-gray-200 bg-white p-6 text-sm leading-relaxed text-gray-800 shadow-sm">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-900">
{digest}
            </pre>
          </div>
          
          {onCreateEvent && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCreateEvent}
                disabled={isCreatingEvent}
                className="rounded border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
              >
                {isCreatingEvent ? 'Creating Event…' : 'Add to Calendar'}
              </button>
            </div>
          )}
        </article>
      ) : (
        <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
          Generate the persona first, then run the Sunday digest with the persona + recent events.
        </div>
      )}
    </section>
  );
}

