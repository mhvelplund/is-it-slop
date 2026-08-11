import type { KeyValidity, SlopVerdict } from '../types';

export interface ProviderClient {
  validateKey(apiKey: string): Promise<KeyValidity>;
  evaluateText(apiKey: string, text: string, criteria: string): Promise<SlopVerdict>;
}
