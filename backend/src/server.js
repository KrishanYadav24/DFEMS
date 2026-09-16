import { createApp } from './app.js';
import { env, getSafeConfig } from './config/env.js';
import { testDatabaseConnectivity, closeDatabasePool } from './config/database.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.PORT, async () => {
  logger.info(`================================================================`);
  logger.info(`DFEMS Backend Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  logger.info(`Config:`, getSafeConfig());

  // Test Oracle connectivity at startup
  const dbHealth = await testDatabaseConnectivity();
  if (dbHealth.connected) {
    logger.info(`Oracle Database 26ai: CONNECTED to ${dbHealth.service} (${dbHealth.latencyMs}ms)`, {
      user: dbHealth.user,
      pool: dbHealth.poolStats,
    });
  } else {
    logger.warn(`Oracle Database 26ai: DISCONNECTED or REJECTED credentials.`, {
      service: dbHealth.service,
      user: dbHealth.user,
      error: dbHealth.error,
      code: dbHealth.code,
    });
    logger.warn(`Note: Application is running. Check .env database credentials or port 1521.`);
  }
  logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
  logger.info(`================================================================`);
});

// Graceful Shutdown
async function shutdown(signal) {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await closeDatabasePool();
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown timeout reached. Terminating process.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
