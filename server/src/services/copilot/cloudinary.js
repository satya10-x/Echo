import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { AIError } from '../ai/errors.js';
let configured = false;
export function cloudinaryAvailable() { return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET); }
function client() {
  if (!cloudinaryAvailable()) throw new AIError('STORAGE_UNAVAILABLE', 'Optional private storage is not configured. Pasting or analyzing a text exemplar still works.', 503);
  if (!configured) {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
    configured = true;
  }
  return cloudinary;
}
function storageFailure(error, action) {
  if (error instanceof AIError) return error;
  if ([401, 403].includes(Number(error?.http_code))) return new AIError('STORAGE_CONFIGURATION', 'Cloudinary rejected the upload credentials or signature. Check that the backend cloud name, API key and API secret belong to the same Cloudinary environment.', 503);
  return new AIError('STORAGE_ERROR', `Private storage could not ${action}. Please try again.`, 502);
}
export async function deletePrivateAsset(publicId) {
  try {
    const result = await client().uploader.destroy(publicId, { resource_type: 'raw', type: 'authenticated', invalidate: true, timeout: 30000 });
    if (!['ok', 'not found'].includes(result.result)) throw new Error('Deletion incomplete');
  } catch (error) { throw storageFailure(error, 'delete this asset'); }
}
export function uploadPrivateText(text, signal) {
  const provider = client();
  const publicId = `vibeshift/exemplars/${randomUUID()}.txt`;
  return new Promise((resolve, reject) => {
    let stream;
    const cancel = () => { stream?.destroy(); reject(new AIError('REQUEST_CANCELLED', 'The private upload was cancelled.', 499)); };
    stream = provider.uploader.upload_stream({ resource_type: 'raw', type: 'authenticated', public_id: publicId, overwrite: false, allowed_formats: ['txt'], timeout: 30000 }, (error, result) => {
      signal?.removeEventListener('abort', cancel);
      if (error || !result?.public_id) return reject(storageFailure(error, 'store this exemplar'));
      resolve({ publicId: result.public_id, bytes: Buffer.byteLength(text, 'utf8') });
    });
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) return cancel();
    stream.on('error', () => reject(new AIError('STORAGE_ERROR', 'Private exemplar storage failed. Please try again.', 502)));
    stream.end(Buffer.from(text, 'utf8'));
  });
}
