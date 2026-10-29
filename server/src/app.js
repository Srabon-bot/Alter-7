import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
import { lazyClose } from './middleware/lazyClose.js';
import authRoutes from './routes/auth.js';
import habitRoutes from './routes/habits.js';
import dayRoutes from './routes/days.js';
import statsRoutes from './routes/stats.js';
import verdictRoutes from './routes/verdict.js';

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use(globalLimiter);

  app.get('/api/health', (_req, res) => {
    const db = mongoose.connection.readyState === 1;
    res.status(db ? 200 : 503).json({ ok: db, db });
  });
  app.use('/api/auth', authRoutes);

  app.use('/api', requireAuth, lazyClose);
  app.use('/api/habits', habitRoutes);
  app.use('/api/days', dayRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/verdict', verdictRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
