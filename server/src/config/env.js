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
