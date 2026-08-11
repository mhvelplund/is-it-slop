const WIKIPEDIA_API_URL =
  'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=Wikipedia:Signs_of_AI_writing&format=json&origin=*';

interface WikipediaQueryResponse {
  query?: {
    pages?: Record<string, { extract?: string }>;
  };
}

export async function fetchWikipediaExtract(): Promise<string> {
  const response = await fetch(WIKIPEDIA_API_URL);
  if (!response.ok) {
    throw new Error(`Wikipedia API responded with ${response.status}`);
  }
  const data = (await response.json()) as WikipediaQueryResponse;
  const pages = data.query?.pages;
  const extract = pages ? Object.values(pages)[0]?.extract : undefined;
  if (!extract) {
    throw new Error('Wikipedia API response did not contain page text.');
  }
  return extract;
}
