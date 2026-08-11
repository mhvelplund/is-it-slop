import type { Provider, SlopVerdict } from './types';

export interface VerdictContent {
  label: string;
  confidenceText: string;
  reasoning: string;
  attribution: string;
}

const LABELS: Record<SlopVerdict['verdict'], string> = {
  likely_ai: 'Likely AI-generated',
  likely_human: 'Likely human-written',
  unclear: 'Unclear',
};

const ATTRIBUTIONS: Record<Provider, string> = {
  anthropic: 'via Claude Haiku',
  openai: 'via GPT-5.6 Luna',
};

export function renderVerdictContent(verdict: SlopVerdict, provider: Provider): VerdictContent {
  return {
    label: LABELS[verdict.verdict],
    confidenceText: `${Math.round(verdict.confidence)}% confidence`,
    reasoning: verdict.reasoning,
    attribution: ATTRIBUTIONS[provider],
  };
}
