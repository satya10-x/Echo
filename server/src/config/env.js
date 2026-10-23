import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid port number.');
export const env = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  clientOrigins: (process.env.CLIENT_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',').map((origin) => origin.trim()).filter(Boolean),
};

function integer(name, fallback, min, max) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  return value;
}
export const aiConfig = {
  primary: (process.env.AI_PRIMARY_PROVIDER || 'groq').trim().toLowerCase(),
  fallbackEnabled: (process.env.AI_FALLBACK_ENABLED || 'true').toLowerCase() === 'true',
  timeoutMs: integer('AI_REQUEST_TIMEOUT_MS', 30000, 1000, 60000),
  rateLimit: integer('AI_RATE_LIMIT_MAX', 10, 1, 1000),
  rateWindowMs: integer('AI_RATE_LIMIT_WINDOW_MS', 60000, 1000, 3600000),
  providers: {
    groq: { apiKey: process.env.GROQ_API_KEY?.trim(), model: process.env.GROQ_MODEL?.trim(), structuredOutput: process.env.GROQ_STRUCTURED_OUTPUT || 'json_object' },
    gemini: { apiKey: process.env.GEMINI_API_KEY?.trim(), model: process.env.GEMINI_MODEL?.trim() },
  },
};
