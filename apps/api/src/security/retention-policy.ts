export const retentionDomains = [
  'leads',
  'spamLeads',
  'leadNotes',
  'notifications',
  'paymentRecords',
  'webhookSummaries',
  'auditEvents',
  'operationalLogs',
] as const;

export type RetentionDomain = (typeof retentionDomains)[number];

export type RetentionRule = Readonly<{
  domain: RetentionDomain;
  days: number;
  trigger: string;
  minimumData: string;
  enforcement: 'manual-review';
}>;

export type RetentionOverrides = Partial<Readonly<Record<RetentionDomain, number>>>;

const defaults: Readonly<Record<RetentionDomain, Omit<RetentionRule, 'domain' | 'days'>>> = {
  leads: {
    trigger: 'last activity or closure',
    minimumData: 'contact details, enquiry context, consent and status only',
    enforcement: 'manual-review',
  },
  spamLeads: {
    trigger: 'spam classification',
    minimumData: 'fields required to investigate abuse and prevent duplicates',
    enforcement: 'manual-review',
  },
  leadNotes: {
    trigger: 'parent lead disposal',
    minimumData: 'administrator-authored operational notes',
    enforcement: 'manual-review',
  },
  notifications: {
    trigger: 'terminal delivery state',
    minimumData: 'recipient, delivery state, provider reference and failure code',
    enforcement: 'manual-review',
  },
  paymentRecords: {
    trigger: 'final payment state',
    minimumData: 'agreed amount, currency, provider references and reconciliation history',
    enforcement: 'manual-review',
  },
  webhookSummaries: {
    trigger: 'webhook processing completion',
    minimumData: 'provider event ID, event type, verification state and related references',
    enforcement: 'manual-review',
  },
  auditEvents: {
    trigger: 'event creation',
    minimumData: 'actor reference, action, target, correlation ID and non-sensitive metadata',
    enforcement: 'manual-review',
  },
  operationalLogs: {
    trigger: 'log creation',
    minimumData: 'route template, status, duration, error code and correlation ID',
    enforcement: 'manual-review',
  },
};

const defaultDays: Readonly<Record<RetentionDomain, number>> = {
  leads: 730,
  spamLeads: 30,
  leadNotes: 730,
  notifications: 180,
  paymentRecords: 2190,
  webhookSummaries: 180,
  auditEvents: 730,
  operationalLogs: 30,
};

export function createRetentionPolicy(overrides: RetentionOverrides = {}): readonly RetentionRule[] {
  return retentionDomains.map((domain) => {
    const days = overrides[domain] ?? defaultDays[domain];
    if (!Number.isSafeInteger(days) || days <= 0) {
      throw new Error(`Retention days for ${domain} must be a positive integer`);
    }
    return { domain, days, ...defaults[domain] };
  });
}
