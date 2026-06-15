import { readFile } from 'node:fs/promises';

const verificationDate = '2026-06-15';

const decisions = [
  ['docs/adr/0001-render-hosting.md', 'render.com'],
  ['docs/adr/0002-supabase-persistence.md', 'supabase.com'],
  ['docs/adr/0003-clerk-administrator-identity.md', 'clerk.com'],
  ['docs/adr/0004-resend-notifications.md', 'resend.com'],
  ['docs/adr/0005-paypal-payments.md', 'paypal.com'],
  ['docs/adr/0006-turnstile-spam-verification.md', 'cloudflare.com'],
];

const failures = [];

function requireText(content, expected, file) {
  if (!content.includes(expected)) failures.push(`${file} must include: ${expected}`);
}

for (const [file, officialDomain] of decisions) {
  const content = await readFile(file, 'utf8');
  requireText(content, '- Status: Accepted', file);
  requireText(content, `- Date: ${verificationDate}`, file);
  requireText(content, officialDomain, file);
  requireText(content, '## Replacement seam', file);
  requireText(content.toLowerCase(), 'failure behaviour', file);
}

const baselineFile = 'docs/providers/verified-provider-baseline-2026-06-15.md';
const baseline = await readFile(baselineFile, 'utf8');
requireText(baseline, `**Verification date:** ${verificationDate}`, baselineFile);
for (const provider of ['Render', 'Supabase', 'Clerk', 'Resend', 'PayPal', 'Cloudflare Turnstile']) {
  requireText(baseline, `## ${provider}`, baselineFile);
}

const runbookFile = 'docs/operations/mobile-admin-provider-setup.md';
const runbook = await readFile(runbookFile, 'utf8');
requireText(runbook, 'mobile phones, tablets, laptops and desktop browsers', runbookFile);
for (const provider of [
  'Supabase',
  'Clerk',
  'Resend',
  'Cloudflare Turnstile',
  'PayPal sandbox',
  'Render Blueprint',
]) {
  requireText(runbook, `## ${provider}`, runbookFile);
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Provider decision documentation is complete and internally consistent.');
await import('./check-browser-boundaries.mjs');
await import('./check-database-schema.mjs');
