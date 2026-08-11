import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { setCriteriaCache } from '../storage';
import * as fetcher from './fetch-wikipedia-extract';
import { getCriteria } from './get-criteria';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('getCriteria', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('returns the cached value without fetching when fresh', async () => {
    const fetchSpy = vi.spyOn(fetcher, 'fetchWikipediaExtract');
    await setCriteriaCache({ criteriaText: 'cached criteria', fetchedAt: 1000 });

    const result = await getCriteria(1000 + DAY_MS - 1);

    expect(result).toBe('cached criteria');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches and updates the cache when stale', async () => {
    vi.spyOn(fetcher, 'fetchWikipediaExtract').mockResolvedValue('fresh criteria');
    await setCriteriaCache({ criteriaText: 'old criteria', fetchedAt: 0 });

    const result = await getCriteria(DAY_MS + 1);

    expect(result).toBe('fresh criteria');
  });

  it('falls back to stale cache when the fetch fails', async () => {
    vi.spyOn(fetcher, 'fetchWikipediaExtract').mockRejectedValue(new Error('offline'));
    await setCriteriaCache({ criteriaText: 'stale but usable', fetchedAt: 0 });

    const result = await getCriteria(DAY_MS + 1);

    expect(result).toBe('stale but usable');
  });

  it('falls back to the bundled snapshot when there is no cache and the fetch fails', async () => {
    vi.spyOn(fetcher, 'fetchWikipediaExtract').mockRejectedValue(new Error('offline'));

    const result = await getCriteria(0);

    expect(result.length).toBeGreaterThan(0);
  });
});
