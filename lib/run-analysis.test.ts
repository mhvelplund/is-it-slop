import { describe, it, expect } from 'vitest';
import { runAnalysis } from './run-analysis';
import type { StoredSettings, SlopVerdict } from './types';
import type { ProviderClient } from './providers/types';

const VALID_SETTINGS: StoredSettings = {
  activeProvider: 'anthropic',
  apiKeys: { anthropic: 'sk-valid' },
  keyValidity: { anthropic: 'valid' },
};

const SAMPLE_VERDICT: SlopVerdict = {
  verdict: 'likely_ai',
  confidence: 90,
  reasoning: 'Heavy use of AI-typical phrasing.',
  matchedCriteria: ['AI vocabulary'],
};

function makeDeps(overrides: {
  settings?: StoredSettings;
  criteria?: string;
  evaluateText?: ProviderClient['evaluateText'];
}) {
  const settings = overrides.settings ?? VALID_SETTINGS;
  const criteria = overrides.criteria ?? 'criteria text';
  const evaluateText =
    overrides.evaluateText ?? (async () => SAMPLE_VERDICT satisfies SlopVerdict);

  return {
    getSettings: async () => settings,
    getCriteria: async () => criteria,
    providers: {
      anthropic: { validateKey: async () => 'valid' as const, evaluateText },
      openai: { validateKey: async () => 'valid' as const, evaluateText },
    },
  };
}

describe('runAnalysis', () => {
  it('returns an error for empty/whitespace selections', async () => {
    const result = await runAnalysis('   ', makeDeps({}));
    expect(result).toEqual({ type: 'error', message: 'No text was selected.' });
  });

  it('returns an error when there is no valid key for the active provider', async () => {
    const settings: StoredSettings = {
      activeProvider: 'anthropic',
      apiKeys: {},
      keyValidity: {},
    };
    const result = await runAnalysis('Some text', makeDeps({ settings }));
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toContain('Anthropic');
    }
  });

  it('returns the verdict on success', async () => {
    const result = await runAnalysis('Some text to check', makeDeps({}));
    expect(result).toEqual({ type: 'result', verdict: SAMPLE_VERDICT });
  });

  it('truncates selection text to 8000 characters before calling the provider', async () => {
    const longText = 'a'.repeat(9000);
    let receivedText = '';
    const evaluateText: ProviderClient['evaluateText'] = async (_key, text) => {
      receivedText = text;
      return SAMPLE_VERDICT;
    };
    await runAnalysis(longText, makeDeps({ evaluateText }));
    expect(receivedText.length).toBe(8000);
  });

  it('wraps a provider error into an error result', async () => {
    const evaluateText: ProviderClient['evaluateText'] = async () => {
      throw new Error('rate limited');
    };
    const result = await runAnalysis('Some text', makeDeps({ evaluateText }));
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toContain('rate limited');
    }
  });
});
