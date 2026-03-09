'use client';

import { useState, useEffect } from 'react';

const PROVIDERS = [
  { id: 'default', label: 'Default (server)', models: [] },
  { id: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o3-mini'] },
  { id: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001'] },
  { id: 'perplexity', label: 'Perplexity', models: ['sonar-pro', 'sonar'] },
];

interface ModelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModelSettings({ isOpen, onClose }: ModelSettingsProps) {
  const [provider, setProvider] = useState('default');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setProvider(localStorage.getItem('loopModelProvider') || 'default');
    setApiKey(localStorage.getItem('loopModelApiKey') || '');
    setModel(localStorage.getItem('loopModelName') || '');
  }, [isOpen]);

  const handleSave = () => {
    if (provider === 'default') {
      localStorage.removeItem('loopModelProvider');
      localStorage.removeItem('loopModelApiKey');
      localStorage.removeItem('loopModelName');
    } else {
      localStorage.setItem('loopModelProvider', provider);
      localStorage.setItem('loopModelApiKey', apiKey);
      localStorage.setItem('loopModelName', model);
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const selectedProvider = PROVIDERS.find(p => p.id === provider);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-black bg-white p-6 shadow-lg space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Model Settings</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-black text-xl leading-none">&times;</button>
        </div>

        <p className="text-xs text-gray-500">
          Bring your own API key to use heavier models for event discovery. Your key stays in your browser — never sent to our server.
        </p>

        {/* Provider */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Provider</label>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setProvider(p.id); setModel(p.models[0] || ''); }}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  provider === p.id
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {provider !== 'default' && (
          <>
            {/* API Key */}
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-xs font-semibold uppercase tracking-wide text-gray-500">API Key</label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : 'pplx-...'}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-mono focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Model</label>
              <div className="flex flex-wrap gap-2">
                {selectedProvider?.models.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-mono transition-colors ${
                      model === m
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="minimal-button w-full"
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}
