'use client';

interface PersonaPanelProps {
  persona: any | null;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function PersonaPanel({ persona, onGenerate, isGenerating }: PersonaPanelProps) {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Persona Snapshot</h2>
          <p className="text-sm text-gray-500">
            Build a structured profile once the full calendar history is ready.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="rounded border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
        >
          {isGenerating ? 'Calling GPT‑5…' : 'Generate Persona'}
        </button>
      </header>

      {persona ? (
        <div className="space-y-5">
          <p className="rounded border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800 shadow-sm">
            {persona.persona_summary_120}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Profile</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Role Type</dt>
                  <dd>{persona.profile?.role_type || 'unknown'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Field</dt>
                  <dd>{persona.profile?.field || 'unknown'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Home Base</dt>
                  <dd>
                    {persona.profile?.home_base?.city || 'unknown'}, {persona.profile?.home_base?.country || 'unknown'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Timezone</dt>
                  <dd>{persona.profile?.primary_timezone || 'unknown'}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Rhythm</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Day Start</dt>
                  <dd>{persona.profile?.typical_day_start_local || 'unknown'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Day End</dt>
                  <dd>{persona.profile?.typical_day_end_local || 'unknown'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Quiet Hours</dt>
                  <dd>{persona.profile?.quiet_hours || 'unknown'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500"> Signals </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {persona.profile?.interests_tags?.length ? (
                persona.profile.interests_tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">Not enough signals yet.</span>
              )}
            </div>
          </div>

          <details className="rounded border border-gray-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-900">
              Raw Persona JSON
            </summary>
            <pre className="max-h-[420px] overflow-auto bg-gray-950/95 p-4 text-xs text-emerald-100">
{JSON.stringify(persona, null, 2)}
            </pre>
          </details>
        </div>
      ) : (
        <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
          Run the persona synthesis once the events have finished loading.
        </div>
      )}
    </section>
  );
}

