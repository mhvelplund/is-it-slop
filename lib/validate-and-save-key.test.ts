import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { saveAndValidateKey } from './validate-and-save-key';
import { getSettings } from './storage';

describe('saveAndValidateKey', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('stores the key and records a valid result', async () => {
    const validity = await saveAndValidateKey('anthropic', 'sk-good', async () => 'valid');
    expect(validity).toBe('valid');
    const settings = await getSettings();
    expect(settings.apiKeys.anthropic).toBe('sk-good');
    expect(settings.keyValidity.anthropic).toBe('valid');
  });

  it('records an invalid result without discarding the stored key', async () => {
    await saveAndValidateKey('anthropic', 'sk-bad', async () => 'invalid');
    const settings = await getSettings();
    expect(settings.apiKeys.anthropic).toBe('sk-bad');
    expect(settings.keyValidity.anthropic).toBe('invalid');
  });

  it('passes the given API key to the validator', async () => {
    let received = '';
    await saveAndValidateKey('openai', 'sk-openai-key', async (key) => {
      received = key;
      return 'valid';
    });
    expect(received).toBe('sk-openai-key');
  });
});
