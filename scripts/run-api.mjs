import { spawnSync } from 'node:child_process';

import { loadWorkspaceEnv } from './load-env.mjs';

const result = spawnSync(process.execPath, ['dist/main.js', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: loadWorkspaceEnv(),
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
