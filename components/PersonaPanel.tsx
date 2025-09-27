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
          <h2 className="text-lg font-semibold text-black uppercase tracking-wide">Persona Snapshot</h2>
          <p className="text-sm text-gray-600">
            Build a structured profile once the full calendar history is ready.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="minimal-button"
        >
          {isGenerating ? 'Calling GPT‑5…' : 'Generate Persona'}
        </button>
      </header>

      {persona ? (
        <div className="space-y-5">
          <p className="border border-black bg-white p-4 text-sm leading-relaxed text-black">
            {persona.persona_summary_120}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-black bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Profile</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Role Type</dt>
                  <dd className="text-black">{persona.profile?.role_type || 'unknown'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Field</dt>
                  <dd className="text-black">{persona.profile?.field || 'unknown'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Home Base</dt>
                  <dd className="text-black">
                    {persona.profile?.home_base?.city || 'unknown'}, {persona.profile?.home_base?.country || 'unknown'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Timezone</dt>
                  <dd className="text-black">{persona.profile?.primary_timezone || 'unknown'}</dd>
                </div>
              </dl>
            </div>

            <div className="border border-black bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Rhythm</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Day Start</dt>
                  <dd className="text-black">{persona.profile?.typical_day_start_local || 'unknown'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Day End</dt>
                  <dd className="text-black">{persona.profile?.typical_day_end_local || 'unknown'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Quiet Hours</dt>
                  <dd className="text-black">{persona.profile?.quiet_hours || 'unknown'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="border border-black bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600"> Signals </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {persona.profile?.interests_tags?.length ? (
                persona.profile.interests_tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="border border-black bg-white px-3 py-1 text-xs font-medium text-black uppercase tracking-wide"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-600">Not enough signals yet.</span>
              )}
            </div>
          </div>

          <details className="border border-black bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-black uppercase tracking-wide">
              Raw Persona JSON
            </summary>
            <pre className="max-h-[420px] overflow-auto bg-black p-4 text-xs text-white">
{JSON.stringify(persona, null, 2)}
            </pre>
          </details>
        </div>
      ) : (
        <div className="border border-black bg-white p-10 text-center text-sm text-gray-600">
          Run the persona synthesis once the events have finished loading.
        </div>
      )}
    </section>
  );
}

