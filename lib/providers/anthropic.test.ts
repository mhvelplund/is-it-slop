import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockList = vi.fn();
const mockParse = vi.fn();

class FakeAuthenticationError extends Error {}
class FakePermissionDeniedError extends Error {}

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    models = { list: mockList };
    messages = { parse: mockParse };
    constructor(_opts: unknown) {}
    static AuthenticationError = FakeAuthenticationError;
    static PermissionDeniedError = FakePermissionDeniedError;
  }
  return { default: MockAnthropic };
});

vi.mock('@anthropic-ai/sdk/helpers/zod', () => ({
  zodOutputFormat: (_schema: unknown) => ({ type: 'json_schema' }),
}));

const { anthropicProvider } = await import('./anthropic');

describe('anthropicProvider.validateKey', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockParse.mockReset();
  });

  it('returns valid when the API call succeeds', async () => {
    mockList.mockResolvedValue({ data: [] });
    expect(await anthropicProvider.validateKey('key')).toBe('valid');
  });

  it('returns invalid on an authentication error', async () => {
    mockList.mockRejectedValue(new FakeAuthenticationError('bad key'));
    expect(await anthropicProvider.validateKey('key')).toBe('invalid');
  });

  it('returns invalid on a permission-denied error', async () => {
    mockList.mockRejectedValue(new FakePermissionDeniedError('no access'));
    expect(await anthropicProvider.validateKey('key')).toBe('invalid');
  });

  it('returns unverified on a network error', async () => {
    mockList.mockRejectedValue(new Error('network down'));
    expect(await anthropicProvider.validateKey('key')).toBe('unverified');
  });
});

describe('anthropicProvider.evaluateText', () => {
  it('returns the parsed verdict', async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        verdict: 'likely_ai',
        confidence: 80,
        reasoning: 'Uses "delve" and em dashes excessively.',
        matchedCriteria: ['AI vocabulary', 'em dashes'],
      },
    });
    const result = await anthropicProvider.evaluateText('key', 'some text', 'criteria text');
    expect(result.verdict).toBe('likely_ai');
    expect(result.confidence).toBe(80);
  });

  it('throws when no parsed output is returned', async () => {
    mockParse.mockResolvedValue({ parsed_output: null });
    await expect(anthropicProvider.evaluateText('key', 'text', 'criteria')).rejects.toThrow();
  });
});
