import { checkServices, type ServiceProbe } from '../../application/readiness.js';
import type { AuditEventRepository } from '../../persistence/application/ports.js';
import type { AuditEventRecord } from '../../persistence/application/records.js';

export type AdministratorDiagnostics = Readonly<{
  ready: boolean;
  generatedAt: string;
  checks: readonly Readonly<{
    name: string;
    state: 'ready' | 'disabled' | 'unavailable';
    required: boolean;
  }>[];
}>;

export type AuditFilter = Readonly<{
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
}>;

type Dependencies = Readonly<{
  probes: readonly ServiceProbe[];
  audit: AuditEventRepository;
  now?: () => Date;
}>;

export class AdministratorOverviewService {
  private readonly now: () => Date;

  public constructor(private readonly dependencies: Dependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  public async diagnostics(): Promise<AdministratorDiagnostics> {
    const result = await checkServices(this.dependencies.probes);
    return {
      ready: result.ready,
      generatedAt: this.now().toISOString(),
      checks: result.checks.map((check) => ({
        name: check.name,
        state: check.state,
        required: check.required,
      })),
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
