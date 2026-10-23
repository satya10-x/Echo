import { api } from './api';

export function createRewritePayload({ draft, persona, tone, length, purpose, audience, styleProfile }, refinement = '') {
  return {
    draft: draft.trim(), persona: persona === 'peer' ? 'supportive' : persona,
    tone: tone.toLowerCase(), length: length.toLowerCase(),
    purpose: purpose === 'Give feedback' ? 'feedback' : purpose.toLowerCase(),
    audience: audience.trim(), refinement: refinement.trim(), ...(styleProfile ? { styleProfile } : {}),
  };
}
export async function requestRewrite(settings, refinement, signal) {
  const { data } = await api.post('/api/rewrite', createRewritePayload(settings, refinement), {
    signal, timeout: 185000, // Bounded server generation, evaluation and repair budget (maximum 180s).
  });
  if (typeof data?.rewrittenText !== 'string' || !data.rewrittenText.trim()) throw new Error('The server returned an incomplete rewrite. Please try again.');
  return data;
}

export async function requestAnalysis(result, { text = result.text, segmentId } = {}, signal) {
  const { data } = await api.post('/api/rewrite/analyze', {
    ...createRewritePayload({ ...result.settings, draft: result.originalText }, result.refinement),
    rewrittenText: text, ...(segmentId ? { segmentId, revision: result.revision } : {}),
  }, { signal, timeout: 185000 });
  return data;
}
export async function getPersonaContracts(signal) {
  const { data } = await api.get('/api/personas', { signal });
  return data.personas;
}
