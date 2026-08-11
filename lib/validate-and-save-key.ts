import type { KeyValidity, Provider } from './types';
import { setApiKey, setKeyValidity } from './storage';

export async function saveAndValidateKey(
  provider: Provider,
  apiKey: string,
  validateKey: (apiKey: string) => Promise<KeyValidity>,
): Promise<KeyValidity> {
  await setApiKey(provider, apiKey);
  const validity = await validateKey(apiKey);
  await setKeyValidity(provider, validity);
  return validity;
}
