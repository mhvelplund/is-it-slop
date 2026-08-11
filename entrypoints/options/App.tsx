// entrypoints/options/App.tsx
import { useEffect, useRef, useState } from 'react';
import type { KeyValidity, Provider, StoredSettings } from '@/lib/types';
import { DEFAULT_SETTINGS, getSettings, setActiveProvider } from '@/lib/storage';
import { getProvider } from '@/lib/providers';
import { saveAndValidateKey } from '@/lib/validate-and-save-key';

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: 'Anthropic (Claude Haiku)',
  openai: 'OpenAI (GPT-5.6 Luna)',
};

const VALIDATION_DEBOUNCE_MS = 800;

function StatusIndicator({ validity }: { validity: KeyValidity | undefined }) {
  if (validity === 'valid') return <span style={{ color: '#2e7d32' }}>✓ Valid</span>;
  if (validity === 'invalid') return <span style={{ color: '#c62828' }}>✗ Invalid</span>;
  if (validity === 'unverified') {
    return <span style={{ color: '#757575' }}>Couldn't verify — will retry</span>;
  }
  return <span style={{ color: '#757575' }}>—</span>;
}

export default function App() {
  const [settings, setSettings] = useState<StoredSettings>(DEFAULT_SETTINGS);
  const [keyInput, setKeyInput] = useState('');
  const [validating, setValidating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    void getSettings().then((loaded) => {
      setSettings(loaded);
      setKeyInput(loaded.apiKeys[loaded.activeProvider] ?? '');
    });
  }, []);

  async function runValidation(provider: Provider, apiKey: string) {
    if (!apiKey) return;
    setValidating(true);
    const validity = await saveAndValidateKey(provider, apiKey, (key) =>
      getProvider(provider).validateKey(key),
    );
    setValidating(false);
    setSettings((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [provider]: apiKey },
      keyValidity: { ...prev.keyValidity, [provider]: validity },
    }));
  }

  function scheduleValidation(provider: Provider, apiKey: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runValidation(provider, apiKey);
    }, VALIDATION_DEBOUNCE_MS);
  }

  async function handleProviderChange(provider: Provider) {
    const updated = await setActiveProvider(provider);
    setSettings(updated);
    setKeyInput(updated.apiKeys[provider] ?? '');
  }

  function handleKeyChange(value: string) {
    setKeyInput(value);
    scheduleValidation(settings.activeProvider, value);
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void runValidation(settings.activeProvider, keyInput);
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 480 }}>
      <h1>Is It Slop? — Settings</h1>

      <label style={{ display: 'block', marginBottom: 16 }}>
        Provider
        <select
          style={{ display: 'block', marginTop: 4 }}
          value={settings.activeProvider}
          onChange={(event) => void handleProviderChange(event.target.value as Provider)}
        >
          {(Object.keys(PROVIDER_LABELS) as Provider[]).map((provider) => (
            <option key={provider} value={provider}>
              {PROVIDER_LABELS[provider]}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'block' }}>
        API key
        <input
          type="password"
          style={{ display: 'block', marginTop: 4, width: '100%' }}
          value={keyInput}
          onChange={(event) => handleKeyChange(event.target.value)}
          onBlur={handleBlur}
        />
        <div style={{ marginTop: 4 }}>
          {validating ? (
            <span>Validating…</span>
          ) : (
            <StatusIndicator validity={settings.keyValidity[settings.activeProvider]} />
          )}
        </div>
      </label>
    </div>
  );
}
