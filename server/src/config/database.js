import mongoose from 'mongoose';
import { env } from './env.js';

export function databaseStatus() {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
}
export async function connectDatabase() {
  if (!env.mongoUri) {
    console.warn('MongoDB is not configured. Set MONGODB_URI in server/.env. API remains available.');
    return;
  }
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.info('MongoDB connected.');
  } catch {
    console.error('MongoDB connection failed. Check MONGODB_URI and database availability. API remains available; restart after fixing configuration.');
  }
}
mongoose.connection.on('error', () => console.error('MongoDB connection error.'));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected.'));
