import type {
  SpamVerificationInput,
  SpamVerificationResult,
  SpamVerifier,
} from '../application/ports.js';

type FetchLike = typeof fetch;

type TurnstileResponse = Readonly<{
  success?: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: readonly string[];
}>;

export type TurnstileSpamVerifierConfig = Readonly<{
  secretKey: string;
  allowedHostnames: readonly string[];
  siteverifyUrl?: string;
  timeoutMs?: number;
  fetch?: FetchLike;
}>;

export class TurnstileSpamVerifier implements SpamVerifier {
  private readonly request: FetchLike;
  private readonly siteverifyUrl: string;
  private readonly timeoutMs: number;

  public constructor(private readonly config: TurnstileSpamVerifierConfig) {
    this.request = config.fetch ?? fetch;
    this.siteverifyUrl =
      config.siteverifyUrl ?? 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    this.timeoutMs = config.timeoutMs ?? 8_000;
  }

  public async verify(input: SpamVerificationInput): Promise<SpamVerificationResult> {
    if (!input.token) {
      return { status: 'rejected', errorCodes: ['missing-input-response'] };
    }

    const form = new URLSearchParams({
      secret: this.config.secretKey,
      response: input.token,
    });
    if (input.remoteIp) form.set('remoteip', input.remoteIp);

    let response: Response;
    try {
      response = await this.request(this.siteverifyUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      return { status: 'unavailable', errorCodes: ['provider-unavailable'] };
    }

    if (!response.ok) {
      return { status: 'unavailable', errorCodes: [`provider-http-${response.status}`] };
    }

    let payload: TurnstileResponse;
    try {
      payload = (await response.json()) as TurnstileResponse;
    } catch {
      return { status: 'unavailable', errorCodes: ['invalid-provider-response'] };
    }

    const errorCodes = Array.isArray(payload['error-codes'])
      ? payload['error-codes'].filter((value): value is string => typeof value === 'string')
      : [];
    if (!payload.success) {
      return { status: 'rejected', errorCodes };
    }
    if (payload.action && payload.action !== input.action) {
      return { status: 'rejected', action: payload.action, errorCodes: ['action-mismatch'] };
    }
    if (
      this.config.allowedHostnames.length > 0 &&
      (!payload.hostname || !this.config.allowedHostnames.includes(payload.hostname))
    ) {
      return {
        status: 'rejected',
        ...(payload.hostname ? { hostname: payload.hostname } : {}),
        errorCodes: ['hostname-mismatch'],
      };
    }

    return {
      status: 'verified',
      ...(payload.action ? { action: payload.action } : {}),
      ...(payload.hostname ? { hostname: payload.hostname } : {}),
    };
  }
}
