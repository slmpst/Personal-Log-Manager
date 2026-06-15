import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '8787', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://devlog_manager_app:dev-secret-used-only-for-local-example@127.0.0.1:5432/devlog_manager?schema=public',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://127.0.0.1:5173',
};
