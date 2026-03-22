/**
 * snapshot-bootstrap.ts
 *
 * Build-time script that fetches /bootstrap?slim=true from the running
 * backend and writes the response to public/bootstrap-snapshot.json.
 *
 * First visit renders from this snapshot while the live fetch happens
 * in the background, giving <200ms perceived load time.
 *
 * Usage:
 *   bun run scripts/snapshot-bootstrap.ts
 *   # or with a custom API URL:
 *   API_URL=https://api.gambit.io bun run scripts/snapshot-bootstrap.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const OUTPUT = new URL('../public/bootstrap-snapshot.json', import.meta.url).pathname;

async function main() {
  console.log(`[snapshot] Fetching bootstrap from ${API_URL}/bootstrap?slim=true`);

  const res = await fetch(`${API_URL}/bootstrap?slim=true`);
  if (!res.ok) {
    throw new Error(`API returned ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  const data = json.data ?? json; // handle envelope or raw

  const snapshot = {
    generatedAt: new Date().toISOString(),
    data,
  };

  const { writeFileSync } = await import('fs');
  const { resolve, dirname } = await import('path');

  const outPath = resolve(dirname(new URL(import.meta.url).pathname), '..', 'public', 'bootstrap-snapshot.json');
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2));

  const sizeKb = (Buffer.byteLength(JSON.stringify(snapshot)) / 1024).toFixed(1);
  console.log(`[snapshot] Written ${sizeKb} KB to public/bootstrap-snapshot.json`);
  console.log(`[snapshot] Generated at ${snapshot.generatedAt}`);
}

main().catch((err) => {
  console.error('[snapshot] Failed:', err.message);
  process.exit(1);
});
