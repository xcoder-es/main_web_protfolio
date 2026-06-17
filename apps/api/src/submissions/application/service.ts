import type { ContactSubmission, ProjectRequestSubmission } from '@carlos-pinto/contracts';

import type { LeadActor, LeadSubmissionResult } from '../../leads/application/service.js';
import type { SubmissionNotificationCoordinator } from '../../notifications/application/submission-coordinator.js';
import type { LeadRepository } from '../../persistence/application/ports.js';
import type { SubmissionGuard } from '../../spam/application/submission-guard.js';

export type PublicSubmissionContext = Readonly<{
  actor: LeadActor;
  remoteIp?: string;
}>;

type Dependencies = Readonly<{
  leads: LeadRepository;
  submissions: SubmissionNotificationCoordinator;
  guard: SubmissionGuard;
}>;

export class PublicSubmissionService {
  public constructor(private readonly dependencies: Dependencies) {}

  public submitContact(
    submission: ContactSubmission,
    context: PublicSubmissionContext,
  ): Promise<LeadSubmissionResult> {
    return this.submit(
      submission.metadata.idempotencyKey,
      () =>
        this.dependencies.guard.verify({
          startedAt: submission.metadata.startedAt,
          honeypot: submission.antiSpam?.website,
          turnstileToken: submission.antiSpam?.turnstileToken,
          remoteIp: context.remoteIp,
          action: 'contact',
        }),
      () => this.dependencies.submissions.submitContact(submission, context.actor),
    );
  }

  public submitProject(
    submission: ProjectRequestSubmission,
    context: PublicSubmissionContext,
  ): Promise<LeadSubmissionResult> {
    return this.submit(
      submission.metadata.idempotencyKey,
      () =>
        this.dependencies.guard.verify({
          startedAt: submission.metadata.startedAt,
          honeypot: submission.antiSpam?.website,
          turnstileToken: submission.antiSpam?.turnstileToken,
          remoteIp: context.remoteIp,
          action: 'project-request',
        }),
      () => this.dependencies.submissions.submitProject(submission, context.actor),
    );
  }

  private async submit(
    idempotencyKey: string,
    verify: () => Promise<void>,
    persist: () => Promise<LeadSubmissionResult>,
  ): Promise<LeadSubmissionResult> {
    const existing = await this.dependencies.leads.findByIdempotencyKey(idempotencyKey);
    if (existing) return { lead: existing, created: false };

    try {
      await verify();
    } catch (error) {
      const concurrent = await this.dependencies.leads.findByIdempotencyKey(idempotencyKey);
      if (concurrent) return { lead: concurrent, created: false };
      throw error;
    }

    return persist();
  }
}
