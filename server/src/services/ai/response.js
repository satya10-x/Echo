import { AIError } from './errors.js';
export function parseRewrite(text, input) {
  const malformed = () => { throw new AIError('AI_INVALID_RESPONSE', 'The AI returned an incomplete or invalid response. Please try again.', 502); };
  if (typeof text !== 'string' || text.length > 45000) return malformed();
  let result;
  try { result = JSON.parse(text); } catch { return malformed(); }
  const string = (value, max, required = true) => typeof value === 'string' && value.length <= max && (!required || Boolean(value.trim()));
  if (!result || typeof result !== 'object' || Array.isArray(result) ||
    !string(result.rewrittenText, 30000) || !string(result.summary, 800) ||
    !['persona', 'tone', 'purpose'].every((field) => result[field] === input[field]) ||
    !Array.isArray(result.changeReasons) || result.changeReasons.length > 8 ||
    !result.changeReasons.every((reason) => reason && string(reason.category, 60) && string(reason.explanation, 500)) ||
    !Array.isArray(result.warnings) || result.warnings.length > 10 ||
    !result.warnings.every((warning) => string(warning, 500))) return malformed();
  // Whitelist fields; unknown provider output never becomes API metadata.
  return {
    rewrittenText: result.rewrittenText.trim(), persona: input.persona, tone: input.tone, purpose: input.purpose,
    summary: result.summary.trim(), changeReasons: result.changeReasons.map(({ category, explanation }) => ({ category, explanation })),
    warnings: result.warnings,
  };
}
