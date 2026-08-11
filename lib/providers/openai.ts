import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ProviderClient } from './types';
import type { SlopVerdict } from '../types';
import { slopVerdictSchema, buildSystemPrompt, buildUserPrompt } from './prompt';

const MODEL = 'gpt-5.6-luna';

function makeClient(apiKey: string): OpenAI {
  // See lib/providers/anthropic.ts for why dangerouslyAllowBrowser is safe
  // in this extension's bring-your-own-key model.
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

export const openaiProvider: ProviderClient = {
  async validateKey(apiKey) {
    try {
      await makeClient(apiKey).models.list();
      return 'valid';
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        return 'invalid';
      }
      return 'unverified';
    }
  },

  async evaluateText(apiKey, text, criteria) {
    const client = makeClient(apiKey);
    const response = await client.responses.parse({
      model: MODEL,
      input: [
        { role: 'system', content: buildSystemPrompt(criteria) },
        { role: 'user', content: buildUserPrompt(text) },
      ],
      text: {
        format: zodTextFormat(slopVerdictSchema, 'slop_verdict'),
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      throw new Error('OpenAI did not return a parseable verdict.');
    }
    return parsed satisfies SlopVerdict;
  },
};
