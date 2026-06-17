import { describe, expect, it } from 'vitest';

import { TurnstileSpamVerifier } from '../../src/spam/adapters/turnstile-spam-verifier.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('TurnstileSpamVerifier', () => {
  it('sends the token and remote IP to Siteverify and validates action and hostname', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const request = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), ...(init ? { init } : {}) });
      return jsonResponse({
        success: true,
        action: 'contact',
        hostname: 'portfolio.example.com',
      });
    }) as typeof fetch;
    const verifier = new TurnstileSpamVerifier({
      secretKey: 'secret-key',
      allowedHostnames: ['portfolio.example.com'],
      siteverifyUrl: 'https://turnstile.example.test/siteverify',
      fetch: request,
    });

    const result = await verifier.verify({
      token: 'challenge-token',
      remoteIp: '203.0.113.10',
      action: 'contact',
    });

    expect(result).toEqual({
      status: 'verified',
      action: 'contact',
      hostname: 'portfolio.example.com',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://turnstile.example.test/siteverify');
    const body = new URLSearchParams(String(calls[0]?.init?.body));
    expect(body.get('secret')).toBe('secret-key');
    expect(body.get('response')).toBe('challenge-token');
    expect(body.get('remoteip')).toBe('203.0.113.10');
  });

  it('rejects missing tokens, action mismatches and unknown hostnames', async () => {
    const missing = new TurnstileSpamVerifier({
      secretKey: 'secret-key',
      allowedHostnames: ['portfolio.example.com'],
      fetch: (async () => jsonResponse({ success: true })) as typeof fetch,
    });
    expect(await missing.verify({ action: 'contact' })).toMatchObject({
      status: 'rejected',
      errorCodes: ['missing-input-response'],
    });

    const actionMismatch = new TurnstileSpamVerifier({
      secretKey: 'secret-key',
      allowedHostnames: ['portfolio.example.com'],
      fetch: (async () =>
        jsonResponse({
          success: true,
          action: 'project-request',
          hostname: 'portfolio.example.com',
        })) as typeof fetch,
    });
    expect(
      await actionMismatch.verify({ token: 'token', action: 'contact' }),
    ).toMatchObject({ status: 'rejected', errorCodes: ['action-mismatch'] });

    const hostnameMismatch = new TurnstileSpamVerifier({
      secretKey: 'secret-key',
      allowedHostnames: ['portfolio.example.com'],
      fetch: (async () =>
        jsonResponse({ success: true, action: 'contact', hostname: 'attacker.example' })) as typeof fetch,
    });
    expect(
      await hostnameMismatch.verify({ token: 'token', action: 'contact' }),
    ).toMatchObject({ status: 'rejected', errorCodes: ['hostname-mismatch'] });
  });

  it('returns controlled unavailable results for network and provider failures', async () => {
    const networkFailure = new TurnstileSpamVerifier({
      secretKey: 'secret-key',
      allowedHostnames: [],
      fetch: (async () => Promise.reject(new Error('offline'))) as typeof fetch,
    });
    expect(
      await networkFailure.verify({ token: 'token', action: 'contact' }),
    ).toMatchObject({ status: 'unavailable' });

    const providerFailure = new TurnstileSpamVerifier({
      secretKey: 'secret-key',
      allowedHostnames: [],
      fetch: (async () => jsonResponse({}, 503)) as typeof fetch,
    });
    expect(
      await providerFailure.verify({ token: 'token', action: 'contact' }),
    ).toMatchObject({ status: 'unavailable', errorCodes: ['provider-http-503'] });
  });
});
