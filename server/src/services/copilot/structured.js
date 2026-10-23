import { AIError } from '../ai/errors.js';
export const textSchema = { type: 'string' };
export const arraySchema = (items) => ({ type: 'array', items });
export const objectSchema = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const enumSchema = (values) => ({ type: 'string', enum: values });
export function malformed() { throw new AIError('AI_INVALID_RESPONSE', 'The AI response was incomplete or could not be validated. Please try again.', 502); }
export function parseJSON(raw) { try { if (typeof raw !== 'string' || raw.length > 100000) return malformed(); return JSON.parse(raw); } catch { return malformed(); } }
export const boundedText = (value, max = 800, required = true) => typeof value === 'string' && value.length <= max && (!required || Boolean(value.trim()));
export function userText(value, name, max, required = true) {
  if (!boundedText(value, max, required)) throw new AIError('INVALID_INPUT', `${name} must be ${required ? 'nonempty ' : ''}text of at most ${max} characters.`, 400);
  return value.trim();
}
export const unit = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
