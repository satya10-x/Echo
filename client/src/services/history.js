import { api } from './api';
import { createRewritePayload } from './rewrite';
const key = 'vibeshift-anonymous-session';
let pendingSession;
async function sessionToken() {
  const current = localStorage.getItem(key);
  if (current) return current;
  if (!pendingSession) pendingSession = api.post('/api/session', {}, { timeout: 15000 }).then(({ data }) => {
    // A server-issued capability, never a client-selected user ID.
    localStorage.setItem(key, data.token);
    return data.token;
  }).finally(() => { pendingSession = null; });
  return pendingSession;
}
async function authorized(method, url, data) {
  const token = await sessionToken();
  return (await api.request({ method, url, data, timeout: 35000, headers: { Authorization: `Bearer ${token}` } })).data;
}
export const listHistory = (query = '') => authorized('GET', `/api/history?q=${encodeURIComponent(query)}`);
export const getHistory = (id, version) => authorized('GET', `/api/history/${id}${version ? `?version=${version}` : ''}`);
export const removeHistory = (id) => authorized('DELETE', `/api/history/${id}`);
export const renameHistory = (record, title) => authorized('PATCH', `/api/history/${record.id}`, { title, expectedVersion: record.revision });
export function saveHistory(result, title) {
  const version = { ...createRewritePayload({ ...result.settings, draft: result.originalText }, result.refinement), rewrittenText: result.text, metadata: result.metadata };
  return result.historyRecordId
    ? authorized('PATCH', `/api/history/${result.historyRecordId}`, { title, expectedVersion: result.historyRecordRevision, version })
    : authorized('POST', '/api/history', { ...version, title });
}
export const listExemplars = () => authorized('GET', '/api/exemplars');
export const storeExemplar = (exemplar, name) => authorized('POST', '/api/exemplars', { exemplar, name });
export const removeExemplar = (id) => authorized('DELETE', `/api/exemplars/${id}`);

export function forgetHistorySession() { localStorage.removeItem(key); }
