import type {
  SpamVerificationInput,
  SpamVerificationResult,
  SpamVerifier,
} from '../application/ports.js';

export class DisabledSpamVerifier implements SpamVerifier {
  public async verify(_input: SpamVerificationInput): Promise<SpamVerificationResult> {
    return { status: 'disabled' };
  }
}
