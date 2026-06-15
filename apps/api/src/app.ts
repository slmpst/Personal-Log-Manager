import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

import path from 'path';
import projectsRouter from './modules/projects/projects.routes';
import filesRouter from './modules/files/files.routes';
import aiRouter from './modules/ai/ai.routes';
import uploadRouter from './modules/upload/upload.routes';
import attachmentsRouter from './modules/attachments/attachments.routes';
import * as filesController from './modules/files/files.controller';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json());

const allowedOrigins = [env.CORS_ORIGIN];
if (env.CORS_ORIGIN.includes('127.0.0.1')) {
  allowedOrigins.push(env.CORS_ORIGIN.replace('127.0.0.1', 'localhost'));
} else if (env.CORS_ORIGIN.includes('localhost')) {
  allowedOrigins.push(env.CORS_ORIGIN.replace('localhost', '127.0.0.1'));
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.redirect(env.CORS_ORIGIN);
});

// Mount module routes under /api
app.use('/api/projects', projectsRouter);
app.use('/api/files', filesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/upload', uploadRouter);
app.use('/api', attachmentsRouter);
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));
app.get('/api/projects/:projectId/files', filesController.getProjectFiles);
app.get('/api/search', filesController.searchFiles);

app.use(notFound);
app.use(errorHandler);

export default app;
