import axios from 'axios';

// Vite's /api proxy exists only in development. Production requests go to Render
// even when Vercel's build-time environment variable has not been set yet.
const configuredURL = import.meta.env.VITE_API_BASE_URL?.trim();
const baseURL = (configuredURL || (import.meta.env.PROD ? 'https://echo-51n2.onrender.com' : '')).replace(/\/+$/, '');
export const api = axios.create({ baseURL, timeout: 6000 });

export function apiErrorMessage(error) {
  if (error.response?.status === 404 && error.config?.url?.startsWith('/api/rewrite')) {
    return 'The rewrite endpoint was not found. Check VITE_API_BASE_URL and deploy the current backend to Render.';
  }
  const message = error.response?.data?.error;
  if (error.response?.status === 403 && message === 'Origin is not allowed.') {
    return 'The backend blocked this website. Add its exact frontend origin to CLIENT_ORIGINS on Render.';
  }
  if (typeof message === 'string') return message;
  if (error.code === 'INVALID_API_RESPONSE') return error.message;
  if (error.code === 'ECONNABORTED') return 'The request timed out. Your previous text is safe; try again.';
  if (error.response) return `The service returned HTTP ${error.response.status}. Please try again.`;
  return 'Could not reach the backend. Check the API URL, connection, and Render CORS configuration.';
}
