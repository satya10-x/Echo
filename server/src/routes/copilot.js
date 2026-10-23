import express, { Router } from 'express';
import { handler } from '../controllers/rewrite.js';
import { generateVariants } from '../services/copilot/variants.js';
import { simulateMisread, mitigateMisread } from '../services/copilot/misread.js';
import { extractStyle, parseTextFile } from '../services/copilot/style.js';
import { createRewriteRateLimit } from '../middleware/rewriteRateLimit.js';
import { intelligenceConfig } from '../config/env.js';
import { historyHandler } from '../controllers/history.js';

export const copilotRouter = Router();
const aiLimit = createRewriteRateLimit();
const bounded = (operation) => handler((body, signal) => operation(body, { signal: AbortSignal.any([signal, AbortSignal.timeout(intelligenceConfig.timeoutMs)]) }));
copilotRouter.post('/variants', aiLimit, bounded(generateVariants));
copilotRouter.post('/misread', aiLimit, bounded(simulateMisread));
copilotRouter.post('/mitigate', aiLimit, bounded(mitigateMisread));
copilotRouter.post('/style', aiLimit, bounded(extractStyle));
copilotRouter.post('/style/file', aiLimit, express.raw({ type: ['text/plain', 'application/octet-stream'], limit: '16kb' }), historyHandler(async (req, res) => {
  let filename;
  try { filename = decodeURIComponent(req.get('X-Filename') || ''); } catch { filename = ''; }
  const text = parseTextFile(req.body, filename, req.get('Content-Type')?.split(';')[0]);
  res.json({ exemplar: text, note: 'Parsed locally on the backend. No AI or Cloudinary request was sent.' });
}));
