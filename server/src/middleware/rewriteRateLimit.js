import { aiConfig } from '../config/env.js';

// Bounded per-process/IP limiter. Use a shared store before scaling to multiple instances.
export function createRewriteRateLimit({ max = aiConfig.rateLimit, windowMs = aiConfig.rateWindowMs } = {}) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of clients) if (entry.reset <= now) clients.delete(key);
    const key = req.ip;
    let entry = clients.get(key);
    if (!entry && clients.size >= 10000) return res.status(503).json({ code: 'AI_BUSY', error: 'The rewrite service is busy. Please try again shortly.' });
    if (!entry) { entry = { count: 0, reset: now + windowMs }; clients.set(key, entry); }
    entry.count++;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ code: 'RATE_LIMITED', error: 'You’ve made several rewrite requests. Please wait a moment before trying again.' });
    }
    next();
  };
}
