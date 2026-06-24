import { readFile } from 'node:fs/promises';

const manifestPath = process.argv[2];

if (!manifestPath) {
  throw new Error('Usage: node scripts/render-bootstrap.mjs <manifest.json>');
}

const raw = await readFile(manifestPath, 'utf8');
const manifest = JSON.parse(raw);

assertManifest(manifest);

const apiKey = process.env.RENDER_API_KEY?.trim();
if (!apiKey) {
  throw new Error('RENDER_API_KEY is required.');
}

const client = createRenderClient(apiKey);

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

await reconcileEnvironmentGroups(client, manifest.env_groups);
await reconcileServiceVariables(client, manifest.services);

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

function createRenderClient(apiKey) {
  const baseUrl = 'https://api.render.com/v1';

  return {
    async request(path, init = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          ...(init.headers ?? {}),
        },
      });

      if (response.ok) {
        return response.status === 204 ? null : await response.json();
      }

      const body = await response.text();
      throw new Error(`Render API ${response.status} ${response.statusText}: ${body}`);
    },
  };
}

async function reconcileEnvironmentGroups(client, envGroups) {
  const existing = await client.request('/env-groups');
  const byName = new Map((existing ?? []).map((group) => [group.name, group]));

  for (const [name, envVars] of Object.entries(envGroups)) {
    const payload = {
      name,
      envVars: Object.entries(envVars).map(([key, value]) => ({
        key,
        value,
      })),
    };

    const match = byName.get(name);
    if (match?.id) {
      await client.request(`/env-groups/${match.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      continue;
    }

    await client.request('/env-groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

async function reconcileServiceVariables(client, services) {
  const existing = await client.request('/services');
  const byName = new Map((existing ?? []).map((service) => [service.name, service]));

  for (const [name, service] of Object.entries(services)) {
    const match = byName.get(name);
    if (!match?.id) {
      throw new Error(`Render service ${name} was not found. Create it from render.yaml first.`);
    }

    const envVars = Object.entries(service.env ?? {}).map(([key, value]) => ({
      key,
      value,
    }));

    await client.request(`/services/${match.id}/env-vars`, {
      method: 'PUT',
      body: JSON.stringify(envVars),
    });
  }
}
