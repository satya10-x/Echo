import { Router } from 'express';
import { rewrite } from '../controllers/rewrite.js';
import { createRewriteRateLimit } from '../middleware/rewriteRateLimit.js';
import { databaseStatus } from '../config/database.js';

export const apiRouter = Router();
apiRouter.post('/rewrite', createRewriteRateLimit(), rewrite);
apiRouter.get('/', (_req, res) => {
  res.json({ name: 'VibeShift AI API', version: '0.1.0', phase: 'ai-rewriting', endpoints: { health: '/api/health', rewrite: '/api/rewrite' } });
});
apiRouter.get('/health', (_req, res) => {
  const status = databaseStatus();
  res.set('Cache-Control', 'no-store').json({
    status: status === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: { status, connected: status === 'connected' },
  });
});
