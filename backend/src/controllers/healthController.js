import { testDatabaseConnectivity } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';

export async function getHealth(req, res) {
  const dbHealth = await testDatabaseConnectivity();

  const status = dbHealth.connected ? 'UP' : 'DEGRADED';
  const statusCode = dbHealth.connected ? 200 : 503;

  const payload = {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbHealth.connected ? 'UP' : 'DOWN',
      service: 'FREEPDB1',
      ...(dbHealth.connected
        ? {
            latencyMs: dbHealth.latencyMs,
            poolStats: dbHealth.poolStats,
          }
        : {
            error: dbHealth.error || 'Connection failed',
            code: dbHealth.code || 'ORACLE_UNAVAILABLE',
          }),
    },
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  if (!dbHealth.connected) {
    return apiResponse.error(
      res,
      'Application is running but Oracle Database 26ai service FREEPDB1 is disconnected or rejecting credentials.',
      'SERVICE_DEGRADED',
      payload,
      503
    );
  }

  return apiResponse.success(res, payload, {}, 200);
}
