import type { LeadId } from './model.js';

export type LeadNote = Readonly<{
  id: string;
  leadId: LeadId;
  body: string;
  authorPrincipalId: string;
  createdAt: Date;
}>;
