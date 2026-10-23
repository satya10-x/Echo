import { api } from './api';
import { createRewritePayload } from './rewrite';
const requestOptions = (signal) => ({ signal, timeout: 185000 });
export const apiMessage = (error) => typeof error.response?.data?.error === 'string' ? error.response.data.error : error.code === 'ECONNABORTED' ? 'This request timed out. Your active rewrite is unchanged.' : 'Could not reach the service. Please try again.';
export async function fetchVariants(settings, signal) {
  return (await api.post('/api/copilot/variants', createRewritePayload(settings), requestOptions(signal))).data;
}
const resultPayload = (result) => ({ ...createRewritePayload({ ...result.settings, draft: result.originalText }, result.refinement), rewrittenText: result.text, revision: result.revision });
export async function fetchMisread(result, perspectives, signal) {
  return (await api.post('/api/copilot/misread', { ...resultPayload(result), perspectives }, requestOptions(signal))).data;
}
export async function fetchMitigation(result, ambiguity, signal) {
  return (await api.post('/api/copilot/mitigate', { ...resultPayload(result), ambiguity }, requestOptions(signal))).data;
}
export async function fetchStyle(exemplar, signal) {
  return (await api.post('/api/copilot/style', { exemplar }, requestOptions(signal))).data;
}
export async function parseExemplarFile(file, signal) {
  return (await api.post('/api/copilot/style/file', file, { signal, headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name) } })).data;
}
export async function fetchStyleRewrite(settings, profile, signal) {
  return (await api.post('/api/rewrite', { ...createRewritePayload(settings), styleProfile: profile }, requestOptions(signal))).data;
}
