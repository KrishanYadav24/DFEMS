import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;

  // Log on completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Filter out spammy health checks in debug mode
    if (url === '/api/health' && status === 200) {
      logger.debug(`${method} ${url} -> ${status} (${duration}ms)`);
      return;
    }

    const logMeta = {
      method,
      url,
      status,
      durationMs: duration,
      ip: req.ip || req.socket.remoteAddress,
    };

    if (status >= 500) {
      logger.error(`${method} ${url} -> ${status} (${duration}ms)`, logMeta);
    } else if (status >= 400) {
      logger.warn(`${method} ${url} -> ${status} (${duration}ms)`, logMeta);
    } else {
      logger.info(`${method} ${url} -> ${status} (${duration}ms)`, logMeta);
    }
  });

  next();
}
