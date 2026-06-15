import type { ApiRuntimeConfig } from './infrastructure/config.js';
import type { ServiceProbe } from './application/readiness.js';

function capabilityProbe(name: string, enabled: boolean): ServiceProbe {
  return {
    async run() {
      if (!enabled) {
        return { name, ok: true, required: false, state: 'disabled' as const };
      }

      return { name, ok: false, required: true, state: 'unavailable' as const };
    },
  };
}

export type ApplicationDependencies = {
  probes: readonly ServiceProbe[];
};

export function createApplicationDependencies(config: ApiRuntimeConfig): ApplicationDependencies {
  return {
    probes: [
      capabilityProbe('persistence', config.features.persistence),
      capabilityProbe('identity', config.features.identity),
      capabilityProbe('notifications', config.features.notifications),
      capabilityProbe('payments', config.features.payments),
      capabilityProbe('spam-verification', config.features.spamVerification),
    ],
  };
}
