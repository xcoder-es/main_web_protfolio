import { readFileSync } from 'node:fs';

export function loadWorkspaceEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  let source;

  try {
    source = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return env;
    }
    throw error;
  }

  for (const line of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;

    const name = trimmed.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || env[name] !== undefined) continue;
    env[name] = parseValue(trimmed.slice(separator + 1).trim());
  }

  return env;
}

function parseValue(value) {
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    const inner = value.slice(1, -1);
    return quote === '"' ? inner.replaceAll('\\n', '\n').replaceAll('\\"', '"') : inner;
  }
  return value;
}
