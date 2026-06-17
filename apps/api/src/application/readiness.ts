export type ServiceProbeResult = {
  name: string;
  ok: boolean;
  required: boolean;
  state: 'ready' | 'disabled' | 'unavailable';
};

export type ServiceCheck = ServiceProbeResult & {
  checkedAt: string;
  latencyMs: number;
};

export interface ServiceProbe {
  readonly name?: string;
  readonly required?: boolean;
  run(): Promise<ServiceProbeResult>;
}

export type ReadinessReport = Readonly<{
  ready: boolean;
  generatedAt: string;
  durationMs: number;
  checks: readonly ServiceCheck[];
}>;

type ReadinessOptions = Readonly<{
  now?: () => Date;
  measure?: () => number;
}>;

export async function checkServices(
  probes: readonly ServiceProbe[],
  options: ReadinessOptions = {},
): Promise<ReadinessReport> {
  const now = options.now ?? (() => new Date());
  const measure = options.measure ?? (() => performance.now());
  const startedAt = measure();
  const checks = await Promise.all(
    probes.map(async (probe, index): Promise<ServiceCheck> => {
      const probeStartedAt = measure();
      try {
        const result = await probe.run();
        return {
          ...result,
          checkedAt: now().toISOString(),
          latencyMs: elapsed(measure, probeStartedAt),
        };
      } catch {
        return {
          name: probe.name ?? `probe-${index + 1}`,
          ok: false,
          required: probe.required ?? true,
          state: 'unavailable',
          checkedAt: now().toISOString(),
          latencyMs: elapsed(measure, probeStartedAt),
        };
      }
    }),
  );

  return {
    ready: checks.every((check) => !check.required || check.ok),
    generatedAt: now().toISOString(),
    durationMs: elapsed(measure, startedAt),
    checks,
  };
}

function elapsed(measure: () => number, startedAt: number): number {
  return Math.max(0, Math.round((measure() - startedAt) * 100) / 100);
}
