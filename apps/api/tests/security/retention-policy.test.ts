import { describe, expect, it } from 'vitest';

import {
  createRetentionPolicy,
  retentionDomains,
} from '../../src/security/retention-policy.js';

describe('minimum-data retention policy', () => {
  it('defines one explicit rule for every stored information domain', () => {
    const policy = createRetentionPolicy();

    expect(policy.map((rule) => rule.domain)).toEqual(retentionDomains);
    expect(policy).toHaveLength(8);
    expect(policy.every((rule) => rule.days > 0)).toBe(true);
    expect(policy.every((rule) => rule.enforcement === 'manual-review')).toBe(true);
    expect(policy.find((rule) => rule.domain === 'spamLeads')?.days).toBe(30);
    expect(policy.find((rule) => rule.domain === 'paymentRecords')?.days).toBe(2190);
    expect(policy.find((rule) => rule.domain === 'operationalLogs')?.minimumData).not.toContain(
      'body',
    );
  });

  it('accepts explicit environment overrides without mutating other defaults', () => {
    const policy = createRetentionPolicy({ leads: 365, operationalLogs: 14 });

    expect(policy.find((rule) => rule.domain === 'leads')?.days).toBe(365);
    expect(policy.find((rule) => rule.domain === 'operationalLogs')?.days).toBe(14);
    expect(policy.find((rule) => rule.domain === 'auditEvents')?.days).toBe(730);
  });

  it('rejects unsafe retention windows', () => {
    expect(() => createRetentionPolicy({ leads: 0 })).toThrow('positive integer');
    expect(() => createRetentionPolicy({ notifications: 1.5 })).toThrow('positive integer');
  });
});
