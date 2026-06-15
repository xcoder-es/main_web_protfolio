import type { ContactSubmission, ProjectRequestSubmission } from '@carlos-pinto/contracts';

import type {
  LeadActor,
  LeadSubmissionResult,
  LeadsService,
} from '../../leads/application/service.js';
import type { NotificationsService } from './service.js';

export class SubmissionNotificationCoordinator {
  public constructor(
    private readonly leads: LeadsService,
    private readonly notifications: NotificationsService,
  ) {}

  public async submitContact(
    submission: ContactSubmission,
    actor: LeadActor,
  ): Promise<LeadSubmissionResult> {
    const result = await this.leads.submitContact(submission, actor);
    await this.notifyBestEffort(result);
    return result;
  }

  public async submitProject(
    submission: ProjectRequestSubmission,
    actor: LeadActor,
  ): Promise<LeadSubmissionResult> {
    const result = await this.leads.submitProject(submission, actor);
    await this.notifyBestEffort(result);
    return result;
  }

  private async notifyBestEffort(result: LeadSubmissionResult): Promise<void> {
    if (!result.created) return;
    try {
      const notification = await this.notifications.enqueueForLead(result.lead);
      await this.notifications.dispatchBestEffort(notification.id);
    } catch {
      // The saved lead is authoritative even if notification persistence is unavailable.
    }
  }
}
