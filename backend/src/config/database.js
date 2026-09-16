import oracledb from 'oracledb';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Enforce modern object output formatting across all queries
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false; // Require explicit commit or explicit autoCommit flag

let pool = null;
let isPoolInitializing = false;

/**
 * Initializes the Oracle 26ai connection pool in Thin Mode.
 */
export async function initializeDatabasePool() {
  if (pool) return pool;
  if (isPoolInitializing) {
    while (isPoolInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return pool;
  }

  isPoolInitializing = true;
  try {
    logger.info(`Connecting to Oracle 26ai service "${env.DB_CONNECT_STRING}" as "${env.DB_USER}" (Thin Mode)...`);

    pool = await oracledb.createPool({
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      connectString: env.DB_CONNECT_STRING,
      poolMin: env.DB_POOL_MIN,
      poolMax: env.DB_POOL_MAX,
      poolIncrement: env.DB_POOL_INCREMENT,
      poolTimeout: env.DB_POOL_TIMEOUT,
      queueTimeout: env.DB_QUEUE_TIMEOUT,
      enableStatistics: true,
    });

    logger.info('Oracle 26ai connection pool established successfully.', {
      poolMin: env.DB_POOL_MIN,
      poolMax: env.DB_POOL_MAX,
      connectString: env.DB_CONNECT_STRING,
    });

    return pool;
  } catch (error) {
    logger.error('Failed to initialize Oracle Database connection pool', error);
    pool = null;
    throw error;
  } finally {
    isPoolInitializing = false;
  }
}

/**
 * Returns the active Oracle connection pool.
 */
export function getDatabasePool() {
  return pool;
}

/**
 * Gracefully shuts down the Oracle connection pool.
 */
export async function closeDatabasePool() {
  if (pool) {
    try {
      logger.info('Draining and closing Oracle connection pool...');
      await pool.close(10); // 10 second drain timeout
      pool = null;
      logger.info('Oracle connection pool closed cleanly.');
    } catch (err) {
      logger.error('Error while closing Oracle connection pool', err);
    }
  }
}

/**
 * Test connectivity against Oracle FREEPDB1.
 * Returns health report without exposing credentials.
 */
export async function testDatabaseConnectivity() {
  if (!pool) {
    try {
      await initializeDatabasePool();
    } catch (initErr) {
      return {
        connected: false,
        service: env.DB_CONNECT_STRING,
        user: env.DB_USER,
        error: initErr.message,
        code: initErr.code || (initErr.message.includes('ORA-') ? initErr.message.match(/ORA-\d+/)?.[0] : 'NJS-CONNECTION-FAILED'),
      };
    }
  }

  let connection = null;
  const startTime = Date.now();
  try {
    connection = await pool.getConnection();
    const result = await connection.execute('SELECT 1 AS HEALTHY, SYSTIMESTAMP AS SERVER_TIME FROM DUAL', [], {
      timeout: 5000,
    });

    const latencyMs = Date.now() - startTime;
    return {
      connected: true,
      service: env.DB_CONNECT_STRING,
      user: env.DB_USER,
      latencyMs,
      serverTime: result.rows?.[0]?.SERVER_TIME || new Date().toISOString(),
      poolStats: {
        openConnections: pool.connectionsOpen,
        inUseConnections: pool.connectionsInUse,
      },
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      connected: false,
      service: env.DB_CONNECT_STRING,
      user: env.DB_USER,
      latencyMs,
      error: err.message,
      code: err.code || (err.message.includes('ORA-') ? err.message.match(/ORA-\d+/)?.[0] : 'CONNECTION_ERROR'),
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        logger.error('Error releasing test connection', closeErr);
      }
    }
  }
}

/**
 * Executes a parameterized SQL query with automatic resource disposal.
 * Binds are strictly required for user parameters (never concatenate SQL).
 */
export async function query(sql, binds = {}, options = {}) {
  if (!pool) {
    await initializeDatabasePool();
  }

  let connection = null;
  try {
    connection = await pool.getConnection();
    const execOptions = {
      autoCommit: options.autoCommit ?? true,
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options,
    };

    const result = await connection.execute(sql, binds, execOptions);
    return result;
  } catch (error) {
    // Enrich error with non-sensitive query context
    error.oracleSql = sql.substring(0, 100);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logger.error('Failed to release connection back to pool', err);
      }
    }
  }
}

/**
 * Executes a multi-step transaction block with automatic commit or rollback.
 */
export async function withTransaction(callback) {
  if (!pool) {
    await initializeDatabasePool();
  }

  let connection = null;
  try {
    connection = await pool.getConnection();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        logger.error('Rollback failed during transaction handling', rbErr);
      }
    }
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logger.error('Failed to close transactional connection', err);
      }
    }
  }
}
