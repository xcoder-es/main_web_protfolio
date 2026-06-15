import { randomUUID } from 'node:crypto';

import type { Clock, IdGenerator } from '@carlos-pinto/contracts';

import type { ServiceProbe } from './application/readiness.js';
import type { ApiRuntimeConfig } from './infrastructure/config.js';
import { LeadsService } from './leads/application/service.js';
import { InMemoryPersistence } from './persistence/adapters/in-memory/in-memory-persistence.js';

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
  leads: LeadsService;
};

export type ApplicationOverrides = Readonly<{
  persistence?: InMemoryPersistence;
  clock?: Clock;
  ids?: IdGenerator;
}>;

export function createApplicationDependencies(
  config: ApiRuntimeConfig,
  overrides: ApplicationOverrides = {},
): ApplicationDependencies {
  const persistence = overrides.persistence ?? new InMemoryPersistence();
  const clock: Clock = overrides.clock ?? { now: () => new Date() };
  const ids: IdGenerator = overrides.ids ?? { generate: () => randomUUID() };

  return {
    probes: [
      capabilityProbe('persistence', config.features.persistence),
      capabilityProbe('identity', config.features.identity),
      capabilityProbe('notifications', config.features.notifications),
      capabilityProbe('payments', config.features.payments),
      capabilityProbe('spam-verification', config.features.spamVerification),
    ],
    leads: new LeadsService({
      leads: persistence.leads,
      notes: persistence.leadNotes,
      audit: persistence.auditEvents,
      unitOfWork: persistence,
      clock,
      ids,
    }),
  };
}
