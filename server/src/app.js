import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { apiRouter } from './routes/api.js';
import { notFound, errorHandler } from './middleware/errors.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin(origin, callback) {
  if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
  callback(Object.assign(new Error('Origin is not allowed.'), { status: 403 }));
} }));
app.use(express.json({ limit: '256kb' }));
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);
