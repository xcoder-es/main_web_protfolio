import { readFile } from 'node:fs/promises';

const manifestPath = process.argv[2];

if (!manifestPath) {
  throw new Error('Usage: node scripts/render-bootstrap.mjs <manifest.json>');
}

const raw = await readFile(manifestPath, 'utf8');
const manifest = JSON.parse(raw);

console.log(
  JSON.stringify(
    {
      action: 'render-bootstrap-planned',
      project: manifest.project,
      accountId: manifest.account_id,
      services: Object.keys(manifest.services ?? {}),
      envGroups: Object.keys(manifest.env_groups ?? {}),
    },
    null,
    2,
  ),
);

// This script is intentionally a bootstrap boundary.
// It is the place to add the Render API calls for:
// - upserting environment groups
// - updating per-service environment variables
// - reconciling URLs after service creation
