import { buildApp } from './app.js';
import { createApplicationDependencies } from './composition.js';
import { loadApiRuntimeConfig } from './infrastructure/config.js';

async function start(): Promise<void> {
  const config = loadApiRuntimeConfig();
  const dependencies = createApplicationDependencies(config);
  const app = await buildApp(config, dependencies);

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down API');
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.fatal({ err: error }, 'Unable to start API');
    process.exit(1);
  }
}

void start();
