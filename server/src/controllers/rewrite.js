import { rewriteWithIntelligence, revisionOf } from '../services/fidelity/intelligenceService.js';
import { analyzePair } from '../services/fidelity/fidelityService.js';
import { restoreSegment } from '../services/diff/diffService.js';
import { validateAnalysis } from '../validation/analyze.js';
import { intelligenceConfig } from '../config/env.js';
import { AIError } from '../services/ai/errors.js';

function handler(operation) {
  return async (req, res, next) => {
    const controller = new AbortController();
    const cancel = () => { if (!res.writableEnded) controller.abort(new Error('Client disconnected')); };
    res.on('close', cancel);
    res.set('Cache-Control', 'no-store');
    try {
      const result = await operation(req.body, controller.signal);
      if (!controller.signal.aborted) res.json(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof AIError) return res.status(error.status).json({ code: error.code, error: error.message });
      next(error);
    } finally { res.off('close', cancel); }
  };
}
export const rewrite = handler((body, signal) => rewriteWithIntelligence(body, { signal }));
export const analyze = handler(async (body, requestSignal) => {
  const { input, rewrittenText, segmentId, revision } = validateAnalysis(body);
  if (revision && revision !== revisionOf(input.draft, rewrittenText)) throw new AIError('STALE_REVISION', 'This edit belongs to a different text revision. Refresh the comparison and try again.', 409);
  const restored = segmentId ? restoreSegment(input.draft, rewrittenText, segmentId) : rewrittenText;
  if (restored === null) throw new AIError('AMBIGUOUS_RESTORATION', 'This phrase cannot be restored safely in the current revision. Edit the message manually.', 409);
  if (!restored.trim()) throw new AIError('INVALID_INPUT', 'Restoration would leave an empty message. Edit it manually instead.', 400);
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(intelligenceConfig.timeoutMs)]);
  const analysis = await analyzePair(input, restored, { signal });
  return { rewrittenText: restored, ...analysis, warnings: analysis.fidelity.status !== 'pass' || analysis.contractValidation.status !== 'pass' ? ['Review the updated findings before using this edited rewrite.'] : [], revision: revisionOf(input.draft, restored), restoredSegmentId: segmentId || null };
});
