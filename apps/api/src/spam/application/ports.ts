export type SpamVerificationAction = 'contact' | 'project-request';

export type SpamVerificationInput = Readonly<{
  token?: string;
  remoteIp?: string;
  action: SpamVerificationAction;
}>;

export type SpamVerificationResult = Readonly<{
  status: 'verified' | 'rejected' | 'disabled' | 'unavailable';
  action?: string;
  hostname?: string;
  errorCodes?: readonly string[];
}>;

export interface SpamVerifier {
  verify(input: SpamVerificationInput): Promise<SpamVerificationResult>;
}
