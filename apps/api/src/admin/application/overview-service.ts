import { checkServices, type ServiceProbe } from '../../application/readiness.js';
import type { AuditEventRepository } from '../../persistence/application/ports.js';
import type { AuditEventRecord } from '../../persistence/application/records.js';
import type { RetentionRule } from '../../security/retention-policy.js';

export type AdministratorDiagnostics = Readonly<{
  ready: boolean;
  generatedAt: string;
  durationMs: number;
  checks: readonly Readonly<{
    name: string;
    state: 'ready' | 'disabled' | 'unavailable';
    required: boolean;
    latencyMs: number;
    checkedAt: string;
  }>[];
  release: Readonly<{
    service: string;
    version: string;
    environment: 'development' | 'test' | 'production';
    commitSha?: string;
    deploymentId?: string;
  }>;
  controls: Readonly<{
    requestLogging: 'metadata-only';
    publicErrors: 'sanitized';
    openApi: 'enabled' | 'disabled';
    webhookStorage: 'summary-only';
    secrets: 'runtime-only';
  }>;
  retention: readonly RetentionRule[];
}>;

export type AuditFilter = Readonly<{
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
}>;

type OperationalProfile = Readonly<{
  service: string;
  version: string;
  environment: 'development' | 'test' | 'production';
  openApiEnabled: boolean;
  commitSha?: string;
  deploymentId?: string;
  retention: readonly RetentionRule[];
}>;

type Dependencies = Readonly<{
  probes: readonly ServiceProbe[];
  audit: AuditEventRepository;
  profile: OperationalProfile;
  now?: () => Date;
}>;

export class AdministratorOverviewService {
  private readonly now: () => Date;

  public constructor(private readonly dependencies: Dependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  public async diagnostics(): Promise<AdministratorDiagnostics> {
    const result = await checkServices(this.dependencies.probes, { now: this.now });
    const profile = this.dependencies.profile;
    return {
      ready: result.ready,
      generatedAt: result.generatedAt,
      durationMs: result.durationMs,
      checks: result.checks.map((check) => ({
        name: check.name,
        state: check.state,
        required: check.required,
        latencyMs: check.latencyMs,
        checkedAt: check.checkedAt,
      })),
      release: {
        service: profile.service,
        version: profile.version,
        environment: profile.environment,
        ...(profile.commitSha ? { commitSha: profile.commitSha.slice(0, 12) } : {}),
        ...(profile.deploymentId ? { deploymentId: profile.deploymentId } : {}),
      },
      controls: {
        requestLogging: 'metadata-only',
        publicErrors: 'sanitized',
        openApi: profile.openApiEnabled ? 'enabled' : 'disabled',
        webhookStorage: 'summary-only',
        secrets: 'runtime-only',
      },
      retention: profile.retention,
    };
  }

  public async auditTimeline(filter: AuditFilter = {}): Promise<readonly AuditEventRecord[]> {
    const limit = normalizeLimit(filter.limit);
    const entityType = filter.entityType?.trim();
    const entityId = filter.entityId?.trim();
    const action = filter.action?.trim().toLowerCase();

    const events =
      entityType && entityId
        ? await this.dependencies.audit.listByEntity(entityType, entityId)
        : await this.dependencies.audit.list();

    return [...events]
      .filter((event) => !entityType || event.entityType === entityType)
      .filter((event) => !entityId || event.entityId === entityId)
      .filter((event) => !action || event.action.toLowerCase().includes(action))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, limit);
  }
}

function normalizeLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(250, Math.max(1, Math.trunc(value ?? 100)));
}
