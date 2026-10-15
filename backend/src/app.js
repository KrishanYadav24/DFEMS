import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  // Security HTTP headers
  app.use(helmet());

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: [
        env.CLIENT_ORIGIN,
        'https://frontend-seven-sigma-dv0zxs3c3f.vercel.app',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // Body Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Redacted Request Logging Middleware
  app.use(requestLogger);

  // Mount API Root
  app.use('/api', apiRoutes);

  // Root Welcome & Health Shortcut
  app.get('/', (req, res) => {
    res.json({
      system: 'Digital Forensic Evidence Management System (DFEMS)',
      status: 'OPERATIONAL',
      version: '1.0.0',
      database: 'Oracle AI Database 26ai Free (FREEPDB1)',
      healthCheck: '/api/health',
    });
  });

  // 404 Fallback
  app.use(notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
