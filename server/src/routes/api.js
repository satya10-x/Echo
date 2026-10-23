import { Router } from 'express';
import { rewrite, analyze } from '../controllers/rewrite.js';
import { createRewriteRateLimit } from '../middleware/rewriteRateLimit.js';
import { personaRegistry } from '../services/personas/registry.js';
import { databaseStatus } from '../config/database.js';

export const apiRouter = Router();
const rewriteLimit = createRewriteRateLimit();
apiRouter.post('/rewrite', rewriteLimit, rewrite);
apiRouter.post('/rewrite/analyze', rewriteLimit, analyze);
apiRouter.get('/personas', (_req, res) => res.json({ personas: personaRegistry.filter((persona) => persona.enabled) }));
apiRouter.get('/', (_req, res) => {
  res.json({ name: 'VibeShift AI API', version: '0.1.0', phase: 'intelligence', endpoints: { health: '/api/health', rewrite: '/api/rewrite', analyze: '/api/rewrite/analyze', personas: '/api/personas' } });
});
apiRouter.get('/health', (_req, res) => {
  const status = databaseStatus();
  res.set('Cache-Control', 'no-store').json({
    status: status === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: { status, connected: status === 'connected' },
  });
});
