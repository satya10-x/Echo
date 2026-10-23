import { AIError } from '../services/ai/errors.js';
export function notFound(_req, res) {
  res.status(404).json({ error: 'Endpoint not found.' });
}
export function errorHandler(error, _req, res, _next) {
  if (error instanceof AIError) return res.status(error.status).json({ code: error.code, error: error.message });
  const status = error.status || 500;
  if (error.type === 'entity.parse.failed') return res.status(400).json({ code: 'INVALID_JSON', error: 'Send a valid JSON request body.' });
  if (status === 413) return res.status(413).json({ code: 'BODY_TOO_LARGE', error: 'The request is too large. Keep drafts under 10,000 characters.' });
  if (status >= 500) console.error('Request failed:', error.name);
  res.status(status).json({ error: status >= 500 ? 'An unexpected server error occurred.' : error.message });
}
