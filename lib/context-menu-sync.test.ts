import { describe, it, expect } from 'vitest';
import { isMenuEnabled } from './context-menu-sync';
import { DEFAULT_SETTINGS } from './storage';
import type { StoredSettings } from './types';

describe('isMenuEnabled', () => {
  it('is false by default (no key configured)', () => {
    expect(isMenuEnabled(DEFAULT_SETTINGS)).toBe(false);
  });

  it('is true when the active provider has a valid key', () => {
    const settings: StoredSettings = {
      activeProvider: 'anthropic',
      apiKeys: { anthropic: 'sk-test' },
      keyValidity: { anthropic: 'valid' },
    };
    expect(isMenuEnabled(settings)).toBe(true);
  });

  it('is false when the active provider key is invalid', () => {
    const settings: StoredSettings = {
      activeProvider: 'anthropic',
      apiKeys: { anthropic: 'sk-test' },
      keyValidity: { anthropic: 'invalid' },
    };
    expect(isMenuEnabled(settings)).toBe(false);
  });

  it('ignores the validity of the inactive provider', () => {
    const settings: StoredSettings = {
      activeProvider: 'openai',
      apiKeys: { anthropic: 'sk-test', openai: 'sk-other' },
      keyValidity: { anthropic: 'valid', openai: 'unverified' },
    };
    expect(isMenuEnabled(settings)).toBe(false);
  });
});
