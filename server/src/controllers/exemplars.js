import { ExemplarAsset } from '../models/History.js';
import { cloudinaryAvailable, uploadPrivateText, deletePrivateAsset } from '../services/copilot/cloudinary.js';
import { userText } from '../services/copilot/structured.js';
import { AIError } from '../services/ai/errors.js';
import { historyHandler, ownerFilter } from './history.js';
export const listExemplars = historyHandler(async (req, res) => {
  const records = await ExemplarAsset.find({ owner: req.sessionOwner }).select('_id name bytes createdAt').sort({ createdAt: -1 }).limit(20).lean();
  res.json({ configured: cloudinaryAvailable(), assets: records.map(({ _id, ...item }) => ({ id: _id, ...item })) });
});
export const uploadExemplar = historyHandler(async (req, res) => {
  const text = userText(req.body?.exemplar, 'Exemplar', 4000);
  const name = userText(req.body?.name, 'Filename', 120);
  if (!/\.txt$/i.test(name) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/u.test(text) || Buffer.byteLength(text, 'utf8') > 16384) throw new AIError('INVALID_FILE', 'Only plain UTF-8 .txt exemplars up to 16 KB are supported.', 400);
  if (await ExemplarAsset.countDocuments({ owner: req.sessionOwner }) >= 20) throw new AIError('STORAGE_LIMIT', 'Delete an older private exemplar before storing another.', 409);
  const asset = await uploadPrivateText(text);
  try {
    const record = await ExemplarAsset.create({ owner: req.sessionOwner, publicId: asset.publicId, name, bytes: asset.bytes });
    res.status(201).json({ id: record._id, name: record.name, bytes: record.bytes, createdAt: record.createdAt, access: 'authenticated' });
  } catch (error) {
    try { await deletePrivateAsset(asset.publicId); } catch { console.error('Private exemplar cleanup failed after a database error.'); }
    throw error;
  }
});
export const deleteExemplar = historyHandler(async (req, res) => {
  const record = await ExemplarAsset.findOne(ownerFilter(req.sessionOwner, req.params.id)).select('+publicId');
  if (!record) throw new AIError('NOT_FOUND', 'Private exemplar not found.', 404);
  await deletePrivateAsset(record.publicId);
  await ExemplarAsset.deleteOne(ownerFilter(req.sessionOwner, req.params.id));
  res.status(204).end();
});
