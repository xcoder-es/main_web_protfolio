export const serviceMetadata = {
  name: 'carlos-pinto-consulting-api',
  version: '0.1.0',
} as const;

export type HealthStatus = {
  status: 'ok';
  service: typeof serviceMetadata.name;
  version: typeof serviceMetadata.version;
};

export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    service: serviceMetadata.name,
    version: serviceMetadata.version,
  };
}
