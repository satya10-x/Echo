import { aiService } from '../services/ai/aiService.js';
import { AIError } from '../services/ai/errors.js';

export async function rewrite(req, res, next) {
  const controller = new AbortController();
  const cancel = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', cancel);
  res.set('Cache-Control', 'no-store');
  try {
    const result = await aiService.rewrite(req.body, { signal: controller.signal });
    if (!controller.signal.aborted) res.json(result);
  } catch (error) {
    if (controller.signal.aborted) return;
    if (error instanceof AIError) return res.status(error.status).json({ code: error.code, error: error.message });
    next(error);
  } finally {
    res.off('close', cancel);
  }
}
