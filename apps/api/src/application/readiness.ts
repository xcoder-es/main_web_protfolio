export type ServiceCheck = {
  name: string;
  ok: boolean;
  required: boolean;
  state: 'ready' | 'disabled' | 'unavailable';
};

export interface ServiceProbe {
  run(): Promise<ServiceCheck>;
}

export async function checkServices(probes: readonly ServiceProbe[]) {
  const checks = await Promise.all(probes.map((probe) => probe.run()));
  return {
    ready: checks.every((check) => !check.required || check.ok),
    checks,
  };
}
