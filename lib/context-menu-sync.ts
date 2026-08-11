import type { StoredSettings } from './types';

export const MENU_ITEM_ID = 'is-it-slop';

export function isMenuEnabled(settings: StoredSettings): boolean {
  return settings.keyValidity[settings.activeProvider] === 'valid';
}
