import { readFile } from 'node:fs/promises';

const migrationFile = 'database/migrations/0001_initial_private_schema.sql';
const sql = (await readFile(migrationFile, 'utf8')).toLowerCase();

const requiredTables = [
  'leads',
  'lead_notes',
  'notifications',
  'notification_attempts',
  'payment_requests',
  'payment_events',
  'paypal_webhook_events',
  'audit_events',
];

const requiredFragments = [
  'create extension if not exists pgcrypto',
  'create or replace function public.set_updated_at()',
  'amount_minor bigint not null check (amount_minor > 0)',
  "currency text not null check (currency ~ '^[a-z]{3}$')",
  'idempotency_key text not null unique',
  'provider_event_id text not null unique',
  'payment_events_provider_event_unique',
  'notification_attempt_number_unique',
  'revoke all on table public.leads from anon, authenticated',
  'revoke all on table public.payment_requests from anon, authenticated',
];

const failures = [];

for (const table of requiredTables) {
  const createPattern = `create table if not exists public.${table}`;
  if (!sql.includes(createPattern)) failures.push(`Missing repeatable table definition: ${table}`);

  const rlsPattern = `alter table public.${table} enable row level security`;
  if (!sql.includes(rlsPattern)) failures.push(`Missing RLS enablement: ${table}`);

  const forcePattern = `alter table public.${table} force row level security`;
  if (!sql.includes(forcePattern)) failures.push(`Missing forced RLS: ${table}`);

  const revokePattern = `revoke all on table public.${table} from anon, authenticated`;
  if (!sql.includes(revokePattern)) failures.push(`Missing anonymous access revocation: ${table}`);
}

for (const fragment of requiredFragments) {
  if (!sql.includes(fragment)) failures.push(`Missing schema invariant: ${fragment}`);
}

if (/create\s+policy/i.test(sql)) {
  failures.push('Private schema migration must not create anonymous or authenticated RLS policies');
}

if (!sql.trimStart().startsWith('begin;') || !sql.trimEnd().endsWith('commit;')) {
  failures.push('Migration must execute inside an explicit transaction');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Database migration invariants are valid.');
