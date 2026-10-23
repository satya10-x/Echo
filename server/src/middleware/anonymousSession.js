import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { AnonymousSession } from '../models/History.js';
import { AIError } from '../services/ai/errors.js';
export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
export function requireDatabase(_req, _res, next) {
  if (mongoose.connection.readyState !== 1) return next(new AIError('DATABASE_UNAVAILABLE', 'History and private exemplar storage need a connected MongoDB database. Rewriting remains available.', 503));
  next();
}
export async function issueSession(_req, res, next) {
  try {
    const token = randomBytes(32).toString('hex');
    await AnonymousSession.create({ tokenHash: tokenHash(token) });
    res.set('Cache-Control', 'no-store').status(201).json({ token, scope: 'anonymous-browser-session', notice: 'This browser stores the access token locally. Losing it loses access to this anonymous history. Never share it.' });
  } catch (error) { next(error); }
}
export async function requireSession(req, _res, next) {
  try {
    const authorization = req.get('Authorization') || '';
    const match = /^Bearer ([a-f0-9]{64})$/.exec(authorization);
    if (!match) throw new AIError('SESSION_REQUIRED', 'Open a browser history session before saving or viewing records.', 401);
    const session = await AnonymousSession.findOne({ tokenHash: tokenHash(match[1]) }).select('_id').lean();
    if (!session) throw new AIError('SESSION_INVALID', 'This anonymous history session is no longer available. Create a new session to continue.', 401);
    req.sessionOwner = session._id;
    next();
  } catch (error) { next(error); }
}
