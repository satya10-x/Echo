import { validateStyleProfile } from './styleProfile.js';
import { AIError } from '../services/ai/errors.js';
export const choices = {
  persona: ['executive', 'supportive', 'legal', 'genz'],
  tone: ['professional', 'friendly', 'assertive', 'empathetic', 'diplomatic', 'casual'],
  length: ['concise', 'balanced', 'detailed'],
  purpose: ['inform', 'request', 'feedback', 'apologize', 'persuade'],
};
export function validateRewrite(body) {
  const invalid = (message) => { throw new AIError('INVALID_INPUT', message, 400); };
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Send a JSON object with a draft and delivery settings.');
  if (typeof body.draft !== 'string' || !body.draft.trim()) invalid('Add a draft before rewriting.');
  if (body.draft.length > 10000) invalid('Keep your original draft under 10,000 characters.');
  const result = { draft: body.draft.trim() };
  for (const [field, allowed] of Object.entries(choices)) {
    if (typeof body[field] !== 'string') invalid(`Choose a supported ${field}.`);
    const value = body[field].trim().toLowerCase();
    if (!allowed.includes(value)) invalid(`Choose a supported ${field}: ${allowed.join(', ')}.`);
    result[field] = value;
  }
  for (const [field, max] of [['audience', 160], ['refinement', 500]]) {
    const value = body[field] ?? '';
    if (typeof value !== 'string' || value.length > max) invalid(`${field === 'audience' ? 'Audience' : 'Refinement'} must be text with no more than ${max} characters.`);
    result[field] = value.trim();
  }
  if (body.styleProfile !== undefined) result.styleProfile = validateStyleProfile(body.styleProfile);
  return result;
}
