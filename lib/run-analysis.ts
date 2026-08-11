import type { Provider, SlopVerdict, StoredSettings } from './types';
import type { ProviderClient } from './providers/types';

const MAX_SELECTION_LENGTH = 8000;

export interface AnalysisDeps {
  getSettings: () => Promise<StoredSettings>;
  getCriteria: () => Promise<string>;
  providers: Record<Provider, ProviderClient>;
}

export type AnalysisResult =
  | { type: 'result'; verdict: SlopVerdict }
  | { type: 'error'; message: string };

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
};

export async function runAnalysis(
  selectionText: string,
  deps: AnalysisDeps,
): Promise<AnalysisResult> {
  const trimmed = selectionText.trim();
  if (!trimmed) {
    return { type: 'error', message: 'No text was selected.' };
  }

  const settings = await deps.getSettings();
  const provider = settings.activeProvider;
  const apiKey = settings.apiKeys[provider];
  const validity = settings.keyValidity[provider];

  if (!apiKey || validity !== 'valid') {
    return {
      type: 'error',
      message: `Set up a valid ${PROVIDER_LABELS[provider]} API key in the extension's settings to use this.`,
    };
  }

  const truncated = trimmed.slice(0, MAX_SELECTION_LENGTH);
  const criteria = await deps.getCriteria();
  const client = deps.providers[provider];

  try {
    const verdict = await client.evaluateText(apiKey, truncated, criteria);
    return { type: 'result', verdict };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { type: 'error', message: `Couldn't analyze the text: ${message}` };
  }
}
