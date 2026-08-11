// lib/providers/prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt, slopVerdictSchema } from './prompt';

describe('buildSystemPrompt', () => {
  it('embeds the criteria text between markers', () => {
    const prompt = buildSystemPrompt('CRITERION: uses em dashes excessively');
    expect(prompt).toContain('CRITERION: uses em dashes excessively');
    expect(prompt).toContain('SIGNS OF AI WRITING');
  });
});

describe('buildUserPrompt', () => {
  it('wraps the text to evaluate', () => {
    const prompt = buildUserPrompt('Some selected text.');
    expect(prompt).toContain('Some selected text.');
  });
});

describe('slopVerdictSchema', () => {
  it('accepts a well-formed verdict', () => {
    const result = slopVerdictSchema.safeParse({
      verdict: 'likely_ai',
      confidence: 82,
      reasoning: 'Overuses "delve" and em dashes.',
      matchedCriteria: ['AI vocabulary'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid verdict label', () => {
    const result = slopVerdictSchema.safeParse({
      verdict: 'definitely_ai',
      confidence: 82,
      reasoning: 'x',
      matchedCriteria: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects confidence outside 0-100', () => {
    const result = slopVerdictSchema.safeParse({
      verdict: 'unclear',
      confidence: 150,
      reasoning: 'x',
      matchedCriteria: [],
    });
    expect(result.success).toBe(false);
  });
});
