import mongoose from 'mongoose';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';

const server = app.listen(env.port, () => console.info(`VibeShift AI API listening on http://localhost:${env.port}`));
server.on('error', (error) => { console.error(`Server failed to start: ${error.code || error.message}`); process.exitCode = 1; });
void connectDatabase();
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const timeout = setTimeout(() => process.exit(1), 10000).unref();
  server.close(async () => {
    await mongoose.disconnect();
    clearTimeout(timeout);
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
