import { api } from './api';

export function createRewritePayload({ draft, persona, tone, length, purpose, audience }, refinement = '') {
  return {
    draft: draft.trim(), persona: persona === 'peer' ? 'supportive' : persona,
    tone: tone.toLowerCase(), length: length.toLowerCase(),
    purpose: purpose === 'Give feedback' ? 'feedback' : purpose.toLowerCase(),
    audience: audience.trim(), refinement: refinement.trim(),
  };
}
export async function requestRewrite(settings, refinement, signal) {
  const { data } = await api.post('/api/rewrite', createRewritePayload(settings, refinement), {
    signal, timeout: 130000, // Two provider budgets, capped at 60 seconds each on the server.
  });
  if (typeof data?.rewrittenText !== 'string' || !data.rewrittenText.trim()) throw new Error('The server returned an incomplete rewrite. Please try again.');
  return data;
}
