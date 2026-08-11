import { z } from 'zod';

export const slopVerdictSchema = z.object({
  verdict: z.enum(['likely_ai', 'likely_human', 'unclear']),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  matchedCriteria: z.array(z.string()),
});

export function buildSystemPrompt(criteria: string): string {
  return [
    'You are a careful, skeptical text analyst. Decide whether a piece of text was likely written by an AI language model or by a human, using the criteria below (drawn from Wikipedia\'s "Signs of AI writing" guide).',
    'Be conservative: humans are often bad at this, and a confident false positive is worse than an "unclear" verdict. Only report high confidence when multiple concrete signals are present in the text itself.',
    '',
    '--- SIGNS OF AI WRITING ---',
    criteria,
    '--- END SIGNS OF AI WRITING ---',
  ].join('\n');
}

export function buildUserPrompt(text: string): string {
  return `Evaluate whether the following text is likely AI-generated:\n\n"""\n${text}\n"""`;
}
