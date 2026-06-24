import { readFile } from 'node:fs/promises';

const manifestPath = process.argv[2];

if (!manifestPath) {
  throw new Error('Usage: node scripts/render-bootstrap.mjs <manifest.json>');
}

const raw = await readFile(manifestPath, 'utf8');
const manifest = JSON.parse(raw);

assertManifest(manifest);

console.log(
  JSON.stringify(
    {
      action: 'render-bootstrap-planned',
      project: manifest.project,
      accountId: manifest.account_id,
      services: Object.keys(manifest.services),
      envGroups: Object.keys(manifest.env_groups),
    },
    null,
    2,
  ),
);

function assertManifest(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Render manifest must be an object.');
  }

  if (typeof value.account_id !== 'string' || !value.account_id.trim()) {
    throw new Error('Render manifest is missing account_id.');
  }

  if (typeof value.project !== 'string' || !value.project.trim()) {
    throw new Error('Render manifest is missing project.');
  }

  if (!value.services || typeof value.services !== 'object') {
    throw new Error('Render manifest is missing services.');
  }

  if (!value.env_groups || typeof value.env_groups !== 'object') {
    throw new Error('Render manifest is missing env_groups.');
  }
}

// This file is the reconciliation boundary for Render-specific API work.
// Terraform generates the desired state manifest here.
