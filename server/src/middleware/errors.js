export function notFound(_req, res) {
  res.status(404).json({ error: 'Endpoint not found.' });
}
export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  if (status >= 500) console.error('Request failed:', error.name);
  res.status(status).json({ error: status >= 500 ? 'An unexpected server error occurred.' : error.message });
}
