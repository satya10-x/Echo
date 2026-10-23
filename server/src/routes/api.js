import { Router } from 'express';
import { databaseStatus } from '../config/database.js';

export const apiRouter = Router();
apiRouter.get('/', (_req, res) => {
  res.json({ name: 'VibeShift AI API', version: '0.1.0', phase: 'foundation', endpoints: { health: '/api/health' } });
});
apiRouter.get('/health', (_req, res) => {
  const status = databaseStatus();
  res.set('Cache-Control', 'no-store').json({
    status: status === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: { status, connected: status === 'connected' },
  });
});
