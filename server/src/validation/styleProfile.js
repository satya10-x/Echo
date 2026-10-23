import { AIError } from '../services/ai/errors.js';
export function validateStyleProfile(profile) {
  const fail = () => { throw new AIError('INVALID_INPUT', 'Use a valid extracted style profile.', 400); };
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return fail();
  const result = {};
  for (const [field, max] of [['averageSentenceWords', 4000], ['averageParagraphWords', 4000], ['hedgesPer100Words', 100], ['bulletFraction', 1], ['formality', 1], ['directness', 1], ['warmth', 1]]) {
    const value = profile[field];
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max)) return fail();
    result[field] = value;
  }
  for (const [field, allowed] of [['greeting', ['none', 'formal', 'casual']], ['signOff', ['none', 'formal', 'casual']]]) {
    if (!allowed.includes(profile[field])) return fail();
    result[field] = profile[field];
  }
  return result;
}
