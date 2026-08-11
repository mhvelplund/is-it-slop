import type { Provider } from '../types';
import type { ProviderClient } from './types';
import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';

export const providers: Record<Provider, ProviderClient> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
};

export function getProvider(name: Provider): ProviderClient {
  return providers[name];
}
