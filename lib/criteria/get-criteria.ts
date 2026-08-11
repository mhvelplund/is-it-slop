import { getCriteriaCache, setCriteriaCache } from '../storage';
import { fetchWikipediaExtract } from './fetch-wikipedia-extract';
import fallbackSnapshot from './fallback-snapshot.txt?raw';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function getCriteria(now: number = Date.now()): Promise<string> {
  const cached = await getCriteriaCache();
  if (cached && now - cached.fetchedAt < TWENTY_FOUR_HOURS_MS) {
    return cached.criteriaText;
  }

  try {
    const fresh = await fetchWikipediaExtract();
    await setCriteriaCache({ criteriaText: fresh, fetchedAt: now });
    return fresh;
  } catch {
    if (cached) {
      return cached.criteriaText;
    }
    return fallbackSnapshot;
  }
}
