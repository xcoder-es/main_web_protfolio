export const leadTypes = ['contact', 'project'] as const;
export type LeadType = (typeof leadTypes)[number];

export const leadStatuses = [
  'new',
  'reviewing',
  'qualified',
  'contacted',
  'won',
  'lost',
  'archived',
  'spam',
] as const;
export type LeadStatus = (typeof leadStatuses)[number];
export type LeadId = string;

export type ContactDetails = Readonly<{
  name: string;
  email: string;
  phone?: string;
  company?: string;
}>;

export type ProjectBrief = Readonly<{
  projectType: string;
  summary: string;
  desiredOutcome?: string;
  budgetRange?: string;
  timeline?: string;
}>;

export type LeadSource = Readonly<{
  language: 'en' | 'es';
  pageUrl: string;
  idempotencyKey: string;
}>;

export type Lead = Readonly<{
  id: LeadId;
  type: LeadType;
  status: LeadStatus;
  contact: ContactDetails;
  message: string;
  project?: ProjectBrief;
  source: LeadSource;
  submittedAt: Date;
  updatedAt: Date;
}>;

const allowedTransitions: Readonly<Record<LeadStatus, readonly LeadStatus[]>> = {
  new: ['reviewing', 'qualified', 'contacted', 'archived', 'spam'],
  reviewing: ['qualified', 'contacted', 'lost', 'archived', 'spam'],
  qualified: ['contacted', 'won', 'lost', 'archived'],
  contacted: ['won', 'lost', 'archived'],
  won: ['archived'],
  lost: ['archived'],
  archived: [],
  spam: [],
};

export class LeadDomainError extends Error {
  public constructor(
    public readonly code: 'INVALID_LEAD_TRANSITION',
    message: string,
  ) {
    super(message);
    this.name = 'LeadDomainError';
  }
}

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  return from === to || allowedTransitions[from].includes(to);
}

export function assertLeadTransition(from: LeadStatus, to: LeadStatus): void {
  if (!canTransitionLead(from, to)) {
    throw new LeadDomainError(
      'INVALID_LEAD_TRANSITION',
      `Lead status cannot change from ${from} to ${to}.`,
    );
  }
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (leadStatuses as readonly string[]).includes(value);
}

export function isLeadType(value: string): value is LeadType {
  return (leadTypes as readonly string[]).includes(value);
}
