import { describe, it, expect } from 'vitest';
import { getProvider, providers } from './index';
import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';

describe('provider registry', () => {
  it('maps "anthropic" to the Anthropic provider', () => {
    expect(getProvider('anthropic')).toBe(anthropicProvider);
  });

  it('maps "openai" to the OpenAI provider', () => {
    expect(getProvider('openai')).toBe(openaiProvider);
  });

  it('exposes both providers on the registry object', () => {
    expect(providers.anthropic).toBe(anthropicProvider);
    expect(providers.openai).toBe(openaiProvider);
  });
});
