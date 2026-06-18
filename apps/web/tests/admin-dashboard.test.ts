import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

describe('mobile administrator dashboard', () => {
  it('renders every primary operational view and noindexes the private route', async () => {
    const [page, component] = await Promise.all([
      source('../src/pages/admin/index.astro'),
      source('../src/components/AdminDashboard.astro'),
    ]);

    expect(page).toContain('noindex, nofollow, noarchive');
    expect(component).toContain('data-admin-sign-in');
    expect(component).toContain('data-admin-shell');
    expect(component).toContain('data-admin-nav="overview"');
    expect(component).toContain('data-admin-nav="leads"');
    expect(component).toContain('data-admin-nav="notifications"');
    expect(component).toContain('data-admin-nav="payments"');
    expect(component).toContain('data-admin-nav="audit"');
    expect(component).toContain('data-payment-form');
    expect(component).toContain('data-lead-detail');
  });

  it('keeps inactive administrator panels out of the layout', async () => {
    const styles = await source('../src/styles/admin.css');

    expect(styles).toContain('.admin-root [hidden]');
    expect(styles).toContain('display: none !important');
  });

  it('keeps a dedicated desktop operations layout', async () => {
    const styles = await source('../src/styles/admin.css');

    expect(styles).toContain('@media (min-width: 1180px)');
    expect(styles).toContain('.admin-card-list');
    expect(styles).toContain('repeat(auto-fit, minmax(24rem, 1fr))');
    expect(styles).toContain('grid-template-columns: minmax(22rem, 0.82fr) minmax(36rem, 1.5fr)');
  });

  it('uses Clerk session tokens for every cross-origin administrator request', async () => {
    const [client, clerk] = await Promise.all([
      source('../src/admin/api-client.ts'),
      source('../src/admin/clerk-client.ts'),
    ]);

    expect(client).toContain('tokenProvider');
    expect(client).toContain("headers.set('authorization', `Bearer ${token}`)");
    expect(client).toContain('/api/admin/leads');
    expect(client).toContain('/api/admin/notifications');
    expect(client).toContain('/api/admin/payment-requests');
    expect(client).toContain('/api/admin/diagnostics');
    expect(client).toContain('/api/admin/audit');
    expect(clerk).toContain('@clerk/clerk-js@6/dist/clerk.browser.js');
    expect(clerk).toContain('data-clerk-publishable-key');
    expect(client).not.toContain('CLERK_SECRET_KEY');
  });

  it('covers the primary lead, delivery, payment and audit journey', async () => {
    const controller = await source('../src/scripts/admin-dashboard.ts');

    expect(controller).toContain('api.leadDetails');
    expect(controller).toContain('api.updateLeadStatus');
    expect(controller).toContain('api.addLeadNote');
    expect(controller).toContain('.exportLeads');
    expect(controller).toContain('api.retryNotification');
    expect(controller).toContain('api.createPayment');
    expect(controller).toContain('api.activatePayment');
    expect(controller).toContain('api.paymentEvents');
    expect(controller).toContain('navigator.share');
    expect(controller).toContain('api.audit');
    expect(controller).toContain('api.diagnostics');
  });

  it('provides one-handed mobile navigation and reduced-motion behaviour', async () => {
    const styles = await source('../src/styles/admin.css');

    expect(styles).toContain('@media (max-width: 820px)');
    expect(styles).toContain('position: fixed');
    expect(styles).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))');
    expect(styles).toContain('min-height: 3.9rem');
    expect(styles).toContain('env(safe-area-inset-bottom)');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
