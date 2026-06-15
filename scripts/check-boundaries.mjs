import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const root = new URL('../', import.meta.url);
const apiSource = new URL('../apps/api/src/', import.meta.url);
const forbiddenImports = ['fastify', '@supabase/', '@clerk/', 'resend', '@paypal/', 'turnstile', 'render'];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    if (entry.isFile() && ['.ts', '.tsx'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

let files = [];
try {
  files = await walk(apiSource);
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') process.exit(0);
  throw error;
}

const violations = [];
for (const file of files) {
  const normalized = file.split(sep).join('/');
  const isInnerLayer = normalized.includes('/domain/') || normalized.includes('/application/');
  if (!isInnerLayer) continue;
  const source = await readFile(file, 'utf8');
  for (const token of forbiddenImports) {
    if (source.includes(`from '${token}`) || source.includes(`from \"${token}`)) {
      violations.push(`${relative(root, file)} imports forbidden dependency ${token}`);
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('Architecture boundaries are valid.');
await import('./check-provider-docs.mjs');
