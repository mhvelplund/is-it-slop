import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  getSettings,
  setApiKey,
  setKeyValidity,
  setActiveProvider,
  getCriteriaCache,
  setCriteriaCache,
  DEFAULT_SETTINGS,
} from './storage';

describe('storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns default settings when nothing is stored', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('setApiKey stores the key and marks it unverified', async () => {
    const settings = await setApiKey('anthropic', 'sk-test-123');
    expect(settings.apiKeys.anthropic).toBe('sk-test-123');
    expect(settings.keyValidity.anthropic).toBe('unverified');
    expect(await getSettings()).toEqual(settings);
  });

  it('setApiKey preserves the other provider key', async () => {
    await setApiKey('anthropic', 'sk-anthropic');
    const settings = await setApiKey('openai', 'sk-openai');
    expect(settings.apiKeys).toEqual({ anthropic: 'sk-anthropic', openai: 'sk-openai' });
  });

  it('setKeyValidity updates only the given provider', async () => {
    await setApiKey('anthropic', 'sk-test');
    const settings = await setKeyValidity('anthropic', 'valid');
    expect(settings.keyValidity.anthropic).toBe('valid');
  });

  it('setActiveProvider switches the active provider', async () => {
    const settings = await setActiveProvider('openai');
    expect(settings.activeProvider).toBe('openai');
  });

  it('criteria cache round-trips and defaults to null', async () => {
    expect(await getCriteriaCache()).toBeNull();
    await setCriteriaCache({ criteriaText: 'some criteria', fetchedAt: 123 });
    expect(await getCriteriaCache()).toEqual({ criteriaText: 'some criteria', fetchedAt: 123 });
  });
});
