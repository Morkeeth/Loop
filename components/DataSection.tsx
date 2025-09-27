'use client';

import { useMemo } from 'react';

interface DataSectionProps {
  title: string;
  description?: string;
  json: unknown;
  minified?: unknown;
  isMinified?: boolean;
  onToggleMinified?: () => void;
}

export function DataSection({
  title,
  description,
  json,
  minified,
  isMinified = false,
  onToggleMinified,
}: DataSectionProps) {
  const content = useMemo(() => {
    if (isMinified && minified) {
      return JSON.stringify(minified, null, 2);
    }
    return JSON.stringify(json, null, 2);
  }, [json, minified, isMinified]);

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-900">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          ) : null}
        </div>
        {minified ? (
          <button
            type="button"
            onClick={onToggleMinified}
            className="text-xs font-medium text-gray-600 underline-offset-2 hover:text-black hover:underline"
          >
            {isMinified ? 'Show Full JSON' : 'Show Minified' }
          </button>
        ) : null}
      </header>

      <div className="overflow-hidden rounded border border-gray-200 bg-gray-950/95 text-emerald-100 shadow-sm">
        <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-relaxed tracking-tight">
          {content}
        </pre>
      </div>
    </section>
  );
}

