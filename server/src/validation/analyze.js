import { validateRewrite } from './rewrite.js';
import { AIError } from '../services/ai/errors.js';
export function validateAnalysis(body) {
  const input = validateRewrite(body);
  if (typeof body.rewrittenText !== 'string' || !body.rewrittenText.trim() || body.rewrittenText.length > 30000) throw new AIError('INVALID_INPUT', 'Rewritten text must contain 1 to 30,000 characters.', 400);
  if (body.segmentId !== undefined && (typeof body.segmentId !== 'string' || !/^[a-f0-9]{16}$/.test(body.segmentId))) throw new AIError('INVALID_INPUT', 'Choose a valid edit to restore.', 400);
  if (body.revision !== undefined && (typeof body.revision !== 'string' || !/^[a-f0-9]{64}$/.test(body.revision))) throw new AIError('INVALID_INPUT', 'Choose a valid text revision.', 400);
  return { input, rewrittenText: body.rewrittenText, segmentId: body.segmentId, revision: body.revision };
}
