// lib/providers/openai.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockList = vi.fn();
const mockParse = vi.fn();

class FakeAuthenticationError extends Error {}

vi.mock('openai', () => {
  class MockOpenAI {
    models = { list: mockList };
    responses = { parse: mockParse };
    constructor(_opts: unknown) {}
    static AuthenticationError = FakeAuthenticationError;
  }
  return { default: MockOpenAI };
});

vi.mock('openai/helpers/zod', () => ({
  zodTextFormat: (_schema: unknown, name: string) => ({ type: 'json_schema', name }),
}));

const { openaiProvider } = await import('./openai');

describe('openaiProvider.validateKey', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockParse.mockReset();
  });

  it('returns valid when the API call succeeds', async () => {
    mockList.mockResolvedValue({ data: [] });
    expect(await openaiProvider.validateKey('key')).toBe('valid');
  });

  it('returns invalid on an authentication error', async () => {
    mockList.mockRejectedValue(new FakeAuthenticationError('bad key'));
    expect(await openaiProvider.validateKey('key')).toBe('invalid');
  });

  it('returns unverified on a network error', async () => {
    mockList.mockRejectedValue(new Error('network down'));
    expect(await openaiProvider.validateKey('key')).toBe('unverified');
  });
});

describe('openaiProvider.evaluateText', () => {
  it('returns the parsed verdict', async () => {
    mockParse.mockResolvedValue({
      output_parsed: {
        verdict: 'likely_human',
        confidence: 65,
        reasoning: 'Idiosyncratic phrasing and no AI-typical vocabulary.',
        matchedCriteria: [],
      },
    });
    const result = await openaiProvider.evaluateText('key', 'some text', 'criteria text');
    expect(result.verdict).toBe('likely_human');
    expect(result.confidence).toBe(65);
  });

  it('throws when no parsed output is returned', async () => {
    mockParse.mockResolvedValue({ output_parsed: null });
    await expect(openaiProvider.evaluateText('key', 'text', 'criteria')).rejects.toThrow();
  });
});
