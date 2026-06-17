import { describe, expect, it } from 'vitest';

import { loadApiRuntimeConfig } from '../../src/infrastructure/config.js';

describe('operational security configuration', () => {
  it('keeps OpenAPI private by default in production and reads Render release metadata', () => {
    const config = loadApiRuntimeConfig({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://portfolio.example.com',
      RENDER_SERVICE_NAME: 'portfolio-api',
      RENDER_SERVICE_ID: 'srv-production-01',
      RENDER_GIT_COMMIT: '0123456789abcdef0123456789abcdef01234567',
    });

    expect(config.operational).toMatchObject({
      openApiEnabled: false,
      serviceName: 'portfolio-api',
      commitSha: '0123456789abcdef0123456789abcdef01234567',
      deploymentId: 'srv-production-01',
    });
    expect(config.operational?.retention).toHaveLength(8);
  });

  it('allows explicit documentation and retention overrides', () => {
    const config = loadApiRuntimeConfig({
      NODE_ENV: 'test',
      OPENAPI_ENABLED: 'false',
      LEAD_RETENTION_DAYS: '365',
      SPAM_LEAD_RETENTION_DAYS: '14',
      OPERATIONAL_LOG_RETENTION_DAYS: '7',
    });

    expect(config.operational?.openApiEnabled).toBe(false);
    expect(config.operational?.retention.find((rule) => rule.domain === 'leads')?.days).toBe(365);
    expect(config.operational?.retention.find((rule) => rule.domain === 'spamLeads')?.days).toBe(
      14,
    );
    expect(
      config.operational?.retention.find((rule) => rule.domain === 'operationalLogs')?.days,
    ).toBe(7);
  });

  it('rejects malformed release metadata and retention windows', () => {
    expect(() =>
      loadApiRuntimeConfig({
        NODE_ENV: 'test',
        COMMIT_SHA: 'not-a-commit',
      }),
    ).toThrow('hexadecimal');
    expect(() =>
      loadApiRuntimeConfig({
        NODE_ENV: 'test',
        SERVICE_NAME: 'service name with spaces',
      }),
    ).toThrow('unsupported characters');
    expect(() =>
      loadApiRuntimeConfig({
        NODE_ENV: 'test',
        AUDIT_EVENT_RETENTION_DAYS: '0',
      }),
    ).toThrow('AUDIT_EVENT_RETENTION_DAYS');
  });
});
