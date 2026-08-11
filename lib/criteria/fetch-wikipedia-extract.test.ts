import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWikipediaExtract } from './fetch-wikipedia-extract';

describe('fetchWikipediaExtract', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the extract text from a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        query: { pages: { '12345': { extract: 'Signs of AI writing include...' } } },
      }),
    } as Response);

    const result = await fetchWikipediaExtract();
    expect(result).toBe('Signs of AI writing include...');
  });

  it('throws when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503 } as Response);
    await expect(fetchWikipediaExtract()).rejects.toThrow('503');
  });

  it('throws when the response has no extract', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ query: { pages: {} } }),
    } as Response);
    await expect(fetchWikipediaExtract()).rejects.toThrow();
  });
});
