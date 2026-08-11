export type Provider = 'anthropic' | 'openai';

export type KeyValidity = 'valid' | 'invalid' | 'unverified';

export interface StoredSettings {
  activeProvider: Provider;
  apiKeys: Partial<Record<Provider, string>>;
  keyValidity: Partial<Record<Provider, KeyValidity>>;
}

export interface CriteriaCache {
  criteriaText: string;
  fetchedAt: number; // epoch ms
}

export type SlopVerdictLabel = 'likely_ai' | 'likely_human' | 'unclear';

export interface SlopVerdict {
  verdict: SlopVerdictLabel;
  confidence: number; // 0-100
  reasoning: string;
  matchedCriteria: string[];
}
