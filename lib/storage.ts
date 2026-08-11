import { storage } from 'wxt/utils/storage';
import type { CriteriaCache, KeyValidity, Provider, StoredSettings } from './types';

export const DEFAULT_SETTINGS: StoredSettings = {
  activeProvider: 'anthropic',
  apiKeys: {},
  keyValidity: {},
};

const settingsItem = storage.defineItem<StoredSettings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

const criteriaCacheItem = storage.defineItem<CriteriaCache | null>('local:criteriaCache', {
  fallback: null,
});

export async function getSettings(): Promise<StoredSettings> {
  return settingsItem.getValue();
}

export async function setApiKey(provider: Provider, apiKey: string): Promise<StoredSettings> {
  const settings = await settingsItem.getValue();
  const updated: StoredSettings = {
    ...settings,
    apiKeys: { ...settings.apiKeys, [provider]: apiKey },
    keyValidity: { ...settings.keyValidity, [provider]: 'unverified' },
  };
  await settingsItem.setValue(updated);
  return updated;
}

export async function setKeyValidity(
  provider: Provider,
  validity: KeyValidity,
): Promise<StoredSettings> {
  const settings = await settingsItem.getValue();
  const updated: StoredSettings = {
    ...settings,
    keyValidity: { ...settings.keyValidity, [provider]: validity },
  };
  await settingsItem.setValue(updated);
  return updated;
}

export async function setActiveProvider(provider: Provider): Promise<StoredSettings> {
  const settings = await settingsItem.getValue();
  const updated: StoredSettings = { ...settings, activeProvider: provider };
  await settingsItem.setValue(updated);
  return updated;
}

export async function getCriteriaCache(): Promise<CriteriaCache | null> {
  return criteriaCacheItem.getValue();
}

export async function setCriteriaCache(cache: CriteriaCache): Promise<void> {
  await criteriaCacheItem.setValue(cache);
}
