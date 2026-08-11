import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchWikipediaExtract } from '../lib/criteria/fetch-wikipedia-extract';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const extract = await fetchWikipediaExtract();
  const outputPath = join(__dirname, '../lib/criteria/fallback-snapshot.txt');
  writeFileSync(outputPath, extract, 'utf-8');
  console.log(`Wrote ${extract.length} characters to ${outputPath}`);
}

main().catch((error) => {
  console.error('Failed to fetch criteria snapshot:', error);
  process.exit(1);
});
