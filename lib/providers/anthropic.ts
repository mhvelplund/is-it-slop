import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ProviderClient } from './types';
import type { SlopVerdict } from '../types';
import { slopVerdictSchema, buildSystemPrompt, buildUserPrompt } from './prompt';

const MODEL = 'claude-haiku-4-5';

function makeClient(apiKey: string): Anthropic {
  // Calling directly from the browser is normally blocked by the SDK
  // because an exposed key on a public web page is dangerous. Here the key
  // belongs to the person running this extension, lives only in their own
  // browser storage, and is sent only to Anthropic's API - so it's safe to
  // opt in for this bring-your-own-key use case.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export const anthropicProvider: ProviderClient = {
  async validateKey(apiKey) {
    try {
      await makeClient(apiKey).models.list();
      return 'valid';
    } catch (error) {
      if (
        error instanceof Anthropic.AuthenticationError ||
        error instanceof Anthropic.PermissionDeniedError
      ) {
        return 'invalid';
      }
      return 'unverified';
    }
  },

  async evaluateText(apiKey, text, criteria) {
    const client = makeClient(apiKey);
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: buildSystemPrompt(criteria),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: buildUserPrompt(text) }],
      output_config: {
        format: zodOutputFormat(slopVerdictSchema),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new Error('Anthropic did not return a parseable verdict.');
    }
    return parsed satisfies SlopVerdict;
  },
};
