import app from './app';
import { env } from './config/env';
import { initSeed } from './db/seed';

const startServer = async () => {
  // Run database seeding if empty
  await initSeed();

  const server = app.listen(env.PORT, () => {
    console.log(`[Server] Running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received. Shutting down gracefully.');
    server.close(() => {
      console.log('[Server] HTTP server closed.');
    });
  });
};

startServer();
