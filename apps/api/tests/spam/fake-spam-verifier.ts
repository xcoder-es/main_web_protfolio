import type {
  SpamVerificationInput,
  SpamVerificationResult,
  SpamVerifier,
} from '../../src/spam/application/ports.js';

export class FakeSpamVerifier implements SpamVerifier {
  public readonly calls: SpamVerificationInput[] = [];
  public result: SpamVerificationResult = { status: 'verified' };

  public async verify(input: SpamVerificationInput): Promise<SpamVerificationResult> {
    this.calls.push(input);
    return this.result;
  }
}
