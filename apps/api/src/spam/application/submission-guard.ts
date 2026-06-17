import type { Clock } from '@carlos-pinto/contracts';

import { PublicSubmissionError } from './errors.js';
import type { SpamVerificationAction, SpamVerifier } from './ports.js';

export type SubmissionGuardInput = Readonly<{
  startedAt: string;
  honeypot?: string;
  turnstileToken?: string;
  remoteIp?: string;
  action: SpamVerificationAction;
}>;

type Dependencies = Readonly<{
  verifier: SpamVerifier;
  clock: Clock;
  minimumCompletionMs: number;
  maximumCompletionMs: number;
}>;

export class SubmissionGuard {
  public constructor(private readonly dependencies: Dependencies) {}

  public async verify(input: SubmissionGuardInput): Promise<void> {
    if (input.honeypot?.trim()) {
      throw rejected();
    }

    const startedAt = new Date(input.startedAt);
    const elapsed = this.dependencies.clock.now().getTime() - startedAt.getTime();
    if (!Number.isFinite(elapsed) || elapsed < this.dependencies.minimumCompletionMs) {
      throw rejected();
    }
    if (elapsed > this.dependencies.maximumCompletionMs) {
      throw new PublicSubmissionError(
        'SUBMISSION_EXPIRED',
        'This form session expired. Refresh the page and try again.',
        400,
      );
    }

    const verification = await this.dependencies.verifier.verify({
      ...(input.turnstileToken ? { token: input.turnstileToken } : {}),
      ...(input.remoteIp ? { remoteIp: input.remoteIp } : {}),
      action: input.action,
    });

    if (verification.status === 'disabled' || verification.status === 'verified') return;
    if (verification.status === 'unavailable') {
      throw new PublicSubmissionError(
        'SPAM_VERIFICATION_UNAVAILABLE',
        'Verification is temporarily unavailable. Please try again.',
        503,
      );
    }
    throw new PublicSubmissionError(
      'SPAM_VERIFICATION_FAILED',
      'Verification failed. Refresh the challenge and try again.',
      400,
      { turnstileToken: ['Complete the verification challenge again.'] },
    );
  }
}

function rejected(): PublicSubmissionError {
  return new PublicSubmissionError(
    'SUBMISSION_REJECTED',
    'The submission could not be accepted.',
    400,
  );
}
