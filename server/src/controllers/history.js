import mongoose from 'mongoose';
import { RewriteHistory } from '../models/History.js';
import { AIError } from '../services/ai/errors.js';
import { validateAnalysis } from '../validation/analyze.js';
import { analyzePair } from '../services/fidelity/fidelityService.js';
import { commitmentLedger } from '../services/commitments/commitmentService.js';
import { revisionOf } from '../services/fidelity/intelligenceService.js';
import { userText } from '../services/copilot/structured.js';
export function ownerFilter(owner, id) {
  if (!mongoose.isObjectIdOrHexString(id)) throw new AIError('NOT_FOUND', 'Saved rewrite not found.', 404);
  return { _id: id, owner };
}
export function savedVersion(body, number) {
  const { input, rewrittenText } = validateAnalysis(body);
  const ledger = commitmentLedger(input.draft, rewrittenText);
  const warnings = ledger.changes.filter((item) => ['critical', 'high'].includes(item.severity)).slice(0, 10).map((item) => item.explanation);
  return { number, input, rewrittenText, warnings, metadata: { provider: typeof body.metadata?.provider === 'string' ? body.metadata.provider.slice(0, 40) : 'unknown', model: typeof body.metadata?.model === 'string' ? body.metadata.model.slice(0, 160) : 'unknown' }, analysisSummary: { commitmentStatus: ledger.status, importantFindings: ledger.changes.filter((item) => ['critical', 'high'].includes(item.severity)).length, semanticStatus: 'not_saved' }, createdAt: new Date() };
}
const summary = (record) => ({ id: record._id, title: record.title, createdAt: record.createdAt, updatedAt: record.updatedAt, revision: record.__v, versions: record.versions.map((version) => ({ number: version.number, createdAt: version.createdAt })), preview: record.versions.at(-1)?.rewrittenText.slice(0, 180), persona: record.versions.at(-1)?.input.persona, analysisSummary: record.versions.at(-1)?.analysisSummary });
export function historyHandler(operation) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { await operation(req, res); } catch (error) {
      if (error.name === 'VersionError') return next(new AIError('VERSION_CONFLICT', 'This record changed in another tab. Refresh history before saving again.', 409));
      next(error);
    }
  };
}
export const listHistory = historyHandler(async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (query.length > 80) throw new AIError('INVALID_INPUT', 'Search with at most 80 characters.', 400);
  const filter = { owner: req.sessionOwner };
  if (query) {
    const literal = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['title', 'versions.input.draft', 'versions.rewrittenText'].map((key) => ({ [key]: { $regex: literal, $options: 'i' } }));
  }
  const records = await RewriteHistory.find(filter).sort({ updatedAt: -1 }).limit(30).lean();
  res.json({ records: records.map(summary), limit: 30, notice: 'Anonymous browser history. Nothing is saved automatically.' });
});
export const createHistory = historyHandler(async (req, res) => {
  const title = userText(req.body?.title, 'Title', 120);
  const version = savedVersion(req.body, 1);
  if (await RewriteHistory.countDocuments({ owner: req.sessionOwner }) >= 100) throw new AIError('HISTORY_LIMIT', 'This session has 100 saved drafts. Delete an older draft before saving another.', 409);
  const record = await RewriteHistory.create({ owner: req.sessionOwner, title, versions: [version] });
  res.status(201).json(summary(record));
});
export const getHistory = historyHandler(async (req, res) => {
  const record = await RewriteHistory.findOne(ownerFilter(req.sessionOwner, req.params.id)).lean();
  if (!record) throw new AIError('NOT_FOUND', 'Saved rewrite not found.', 404);
  const number = req.query.version === undefined ? record.versions.at(-1)?.number : Number(req.query.version);
  const version = record.versions.find((item) => item.number === number);
  if (!version) throw new AIError('NOT_FOUND', 'Saved version not found.', 404);
  const analysis = await analyzePair(version.input, version.rewrittenText, { evaluate: false });
  res.json({ ...summary(record), version: { number: version.number, input: version.input, rewrittenText: version.rewrittenText }, result: { ...analysis, originalText: version.input.draft, rewrittenText: version.rewrittenText, persona: version.input.persona, tone: version.input.tone, purpose: version.input.purpose, metadata: version.metadata, warnings: [...version.warnings, 'Loaded from history. Semantic and tone checks have not been rerun. Use Recheck to evaluate this saved text.'], summary: 'Accepted version loaded from anonymous history.', changeReasons: [], revision: revisionOf(version.input.draft, version.rewrittenText), loadedFromHistory: true } });
});
export const updateHistory = historyHandler(async (req, res) => {
  const record = await RewriteHistory.findOne(ownerFilter(req.sessionOwner, req.params.id));
  if (!record) throw new AIError('NOT_FOUND', 'Saved rewrite not found.', 404);
  if (!Number.isInteger(req.body?.expectedVersion) || req.body.expectedVersion !== record.__v) throw new AIError('VERSION_CONFLICT', 'Refresh this saved draft before updating it.', 409);
  if (req.body.title === undefined && req.body.version === undefined) throw new AIError('INVALID_INPUT', 'Provide a title or accepted version to update.', 400);
  if (req.body.title !== undefined) record.title = userText(req.body.title, 'Title', 120);
  if (req.body.version !== undefined) {
    record.versions = [...record.versions.slice(-9), savedVersion(req.body.version, record.nextVersion)];
    record.nextVersion++;
  }
  await record.save();
  res.json(summary(record));
});
export const deleteHistory = historyHandler(async (req, res) => {
  const result = await RewriteHistory.deleteOne(ownerFilter(req.sessionOwner, req.params.id));
  if (!result.deletedCount) throw new AIError('NOT_FOUND', 'Saved rewrite not found.', 404);
  res.status(204).end();
});
