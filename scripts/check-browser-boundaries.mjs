import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = new URL('../', import.meta.url);
const webSource = new URL('../apps/web/src/', import.meta.url);
const forbiddenTokens = [
  '@carlos-pinto/config/private-runtime',
  'packages/config/src/private-runtime',
  'SUPABASE_SECRET',
  'CLERK_SECRET',
  'RESEND_API_KEY',
  'PAYPAL_CLIENT_SECRET',
  'TURNSTILE_SECRET',
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    if (entry.isFile() && ['.ts', '.tsx', '.astro'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

const violations = [];
for (const file of await walk(webSource)) {
  const source = await readFile(file, 'utf8');
  for (const token of forbiddenTokens) {
    if (source.includes(token)) violations.push(`${relative(root, file)} contains forbidden token ${token}`);
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('Browser configuration boundaries are valid.');
