import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Oracle Database 26ai Configuration (FREEPDB1)
  DB_USER: process.env.DB_USER || 'dfems_user',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_CONNECT_STRING: process.env.DB_CONNECT_STRING || 'localhost:1521/FREEPDB1',

  // Connection Pool Parameters
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN || '2', 10),
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX || '10', 10),
  DB_POOL_INCREMENT: parseInt(process.env.DB_POOL_INCREMENT || '2', 10),
  DB_POOL_TIMEOUT: parseInt(process.env.DB_POOL_TIMEOUT || '60', 10),
  DB_QUEUE_TIMEOUT: parseInt(process.env.DB_QUEUE_TIMEOUT || '5000', 10),

  // Security & Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'dfems_default_development_secret_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
};

// Safe configuration preview without leaking passwords
export const getSafeConfig = () => ({
  port: env.PORT,
  environment: env.NODE_ENV,
  clientOrigin: env.CLIENT_ORIGIN,
  database: {
    user: env.DB_USER,
    connectString: env.DB_CONNECT_STRING,
    hasPassword: Boolean(env.DB_PASSWORD && env.DB_PASSWORD !== 'your_secure_oracle_password_here'),
    poolMin: env.DB_POOL_MIN,
    poolMax: env.DB_POOL_MAX,
    queueTimeoutMs: env.DB_QUEUE_TIMEOUT,
  },
});
