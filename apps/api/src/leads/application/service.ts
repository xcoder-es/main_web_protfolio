import type {
  Clock,
  ContactSubmission,
  IdGenerator,
  ProjectRequestSubmission,
} from '@carlos-pinto/contracts';

import type {
  AuditEventRepository,
  LeadNoteRepository,
  LeadRepository,
  UnitOfWork,
} from '../../persistence/application/ports.js';
import type {
  AuditEventRecord,
  LeadNoteRecord,
  LeadRecord,
} from '../../persistence/application/records.js';
import {
  assertLeadTransition,
  isLeadStatus,
  isLeadType,
  LeadDomainError,
  type LeadStatus,
  type LeadType,
} from '../domain/model.js';
import { LeadApplicationError } from './errors.js';

export type LeadActor = Readonly<{
  type: 'visitor' | 'administrator' | 'system';
  id?: string;
  correlationId: string;
}>;

export type LeadListFilter = Readonly<{
  status?: string;
  type?: string;
  search?: string;
}>;

export type LeadDetails = Readonly<{
  lead: LeadRecord;
  notes: readonly LeadNoteRecord[];
  audit: readonly AuditEventRecord[];
}>;

export type LeadSubmissionResult = Readonly<{
  lead: LeadRecord;
  created: boolean;
}>;

type Dependencies = Readonly<{
  leads: LeadRepository;
  notes: LeadNoteRepository;
  audit: AuditEventRepository;
  unitOfWork: UnitOfWork;
  clock: Clock;
  ids: IdGenerator;
}>;

export class LeadsService {
  public constructor(private readonly dependencies: Dependencies) {}

  public async submitContact(
    submission: ContactSubmission,
    actor: LeadActor,
  ): Promise<LeadSubmissionResult> {
    return this.submit(
      submission.metadata.idempotencyKey,
      () => {
        const now = this.dependencies.clock.now();
        return {
          id: this.dependencies.ids.generate(),
          leadType: 'contact',
          status: 'new',
          idempotencyKey: submission.metadata.idempotencyKey,
          name: submission.name,
          email: submission.email.toLowerCase(),
          ...(submission.phone ? { phone: submission.phone } : {}),
          subject: submission.subject,
          message: submission.message,
          language: submission.metadata.language,
          pageUrl: submission.metadata.pageUrl,
          consentedAt: now,
          submittedAt: now,
          createdAt: now,
          updatedAt: now,
        } satisfies LeadRecord;
      },
      actor,
    );
  }

  public async submitProject(
    submission: ProjectRequestSubmission,
    actor: LeadActor,
  ): Promise<LeadSubmissionResult> {
    return this.submit(
      submission.metadata.idempotencyKey,
      () => {
        const now = this.dependencies.clock.now();
        return {
          id: this.dependencies.ids.generate(),
          leadType: 'project',
          status: 'new',
          idempotencyKey: submission.metadata.idempotencyKey,
          name: submission.name,
          email: submission.email.toLowerCase(),
          ...(submission.company ? { company: submission.company } : {}),
          projectType: submission.projectType,
          message: submission.summary,
          budgetRange: submission.budgetRange,
          timeline: submission.timeline,
          language: submission.metadata.language,
          pageUrl: submission.metadata.pageUrl,
          consentedAt: now,
          submittedAt: now,
          createdAt: now,
          updatedAt: now,
        } satisfies LeadRecord;
      },
      actor,
    );
  }

  public async getLead(id: string): Promise<LeadDetails> {
    const lead = await this.requireLead(id);
    const [notes, audit] = await Promise.all([
      this.dependencies.notes.listByLeadId(id),
      this.dependencies.audit.listByEntity('lead', id),
    ]);
    return { lead, notes, audit };
  }

  public async listLeads(filter: LeadListFilter = {}): Promise<readonly LeadRecord[]> {
    const status = filter.status;
    const type = filter.type;
    if (status && !isLeadStatus(status)) {
      throw new LeadApplicationError('INVALID_LEAD_FILTER', 'Unknown lead status.', 400, {
        status: ['Unknown lead status.'],
      });
    }
    if (type && !isLeadType(type)) {
      throw new LeadApplicationError('INVALID_LEAD_FILTER', 'Unknown lead type.', 400, {
        type: ['Unknown lead type.'],
      });
    }

    const search = filter.search?.trim().toLowerCase();
    const leads = await this.dependencies.leads.list();
    return leads
      .filter((lead) => !status || lead.status === status)
      .filter((lead) => !type || lead.leadType === type)
      .filter((lead) => {
        if (!search) return true;
        return [lead.name, lead.email, lead.company, lead.subject, lead.message]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(search));
      })
      .sort((left, right) => right.submittedAt.getTime() - left.submittedAt.getTime());
  }

  public async changeStatus(
    id: string,
    status: LeadStatus,
    actor: LeadActor,
  ): Promise<LeadRecord> {
    return this.dependencies.unitOfWork.execute(async () => {
      const lead = await this.requireLead(id);
      try {
        assertLeadTransition(lead.status, status);
      } catch (error) {
        if (error instanceof LeadDomainError) {
          throw new LeadApplicationError(error.code, error.message, 409);
        }
        throw error;
      }

      if (lead.status === status) return lead;
      const now = this.dependencies.clock.now();
      const updated: LeadRecord = {
        ...lead,
        status,
        ...(status === 'archived' ? { archivedAt: now } : {}),
        updatedAt: now,
      };
      await this.dependencies.leads.update(updated);
      await this.writeAudit(actor, 'lead.status_changed', id, {
        previousStatus: lead.status,
        status,
      });
      return updated;
    });
  }

  public async addNote(
    id: string,
    body: string,
    actor: LeadActor & Readonly<{ id: string }>,
  ): Promise<LeadNoteRecord> {
    const normalized = body.trim();
    if (normalized.length < 2 || normalized.length > 4000) {
      throw new LeadApplicationError('INVALID_LEAD_NOTE', 'Lead note is invalid.', 400, {
        body: ['A note must contain between 2 and 4000 characters.'],
      });
    }

    return this.dependencies.unitOfWork.execute(async () => {
      await this.requireLead(id);
      const now = this.dependencies.clock.now();
      const note: LeadNoteRecord = {
        id: this.dependencies.ids.generate(),
        leadId: id,
        body: normalized,
        authorPrincipalId: actor.id,
        createdAt: now,
      };
      await this.dependencies.notes.insert(note);
      await this.writeAudit(actor, 'lead.note_added', id, { noteId: note.id });
      return note;
    });
  }

  public archive(id: string, actor: LeadActor): Promise<LeadRecord> {
    return this.changeStatus(id, 'archived', actor);
  }

  public markSpam(id: string, actor: LeadActor): Promise<LeadRecord> {
    return this.changeStatus(id, 'spam', actor);
  }

  public async exportCsv(filter: LeadListFilter = {}): Promise<string> {
    const rows = await this.listLeads(filter);
    const headers = ['id', 'type', 'status', 'name', 'email', 'company', 'submittedAt'];
    return [
      headers.join(','),
      ...rows.map((lead) =>
        [
          lead.id,
          lead.leadType,
          lead.status,
          lead.name,
          lead.email,
          lead.company ?? '',
          lead.submittedAt.toISOString(),
        ]
          .map(csvCell)
          .join(','),
      ),
    ].join('\n');
  }

  private async submit(
    idempotencyKey: string,
    create: () => LeadRecord,
    actor: LeadActor,
  ): Promise<LeadSubmissionResult> {
    const existing = await this.dependencies.leads.findByIdempotencyKey(idempotencyKey);
    if (existing) return { lead: existing, created: false };

    return this.dependencies.unitOfWork.execute(async () => {
      const secondCheck = await this.dependencies.leads.findByIdempotencyKey(idempotencyKey);
      if (secondCheck) return { lead: secondCheck, created: false };
      const lead = create();
      await this.dependencies.leads.insert(lead);
      await this.writeAudit(actor, 'lead.submitted', lead.id, {
        leadType: lead.leadType,
        status: lead.status,
      });
      return { lead, created: true };
    });
  }

  private async requireLead(id: string): Promise<LeadRecord> {
    const lead = await this.dependencies.leads.getById(id);
    if (!lead) {
      throw new LeadApplicationError('LEAD_NOT_FOUND', 'Lead was not found.', 404);
    }
    return lead;
  }

  private async writeAudit(
    actor: LeadActor,
    action: string,
    leadId: string,
    metadata: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const event: AuditEventRecord = {
      id: this.dependencies.ids.generate(),
      actorType: actor.type,
      ...(actor.id ? { actorId: actor.id } : {}),
      action,
      entityType: 'lead',
      entityId: leadId,
      correlationId: actor.correlationId,
      metadata,
      createdAt: this.dependencies.clock.now(),
    };
    await this.dependencies.audit.insert(event);
  }
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
