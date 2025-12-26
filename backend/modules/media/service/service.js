import { createPresignedPutUrl } from '../../../core/utils/s3-sign/s3-sign.js';
import { BUCKETS } from '../../../core/config/constants/constants.js';

export const sanitizeKey = (value) =>
  String(value || '')
    .replace(/\\/g, '/')
    .replace(/\.+/g, '.')
    .replace(/^\/+/, '')
    .replace(/\.\.\//g, '')
    .trim();

export const getArchiveKeys = (env) => {
  const accessKey = env.ARCHIVE_ACCESS_KEY;
  const secretKey = env.ARCHIVE_SECRET_KEY;
  return accessKey && secretKey ? { accessKey, secretKey } : null;
};

export const buildPresign = async (env, body) => {
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const accountId = env.R2_ACCOUNT_ID;
  if (!accessKeyId || !secretAccessKey || !accountId) return { error: 'R2 signing credentials not configured' };

  const key = sanitizeKey(body.key);
  if (!key) return { error: 'Missing key' };

  const bucketKey = body.bucket === 'PRODUCT_MEDIA' ? 'PRODUCT_MEDIA' : 'R2_BUCKET';
  const bucketName = BUCKETS[bucketKey];
  if (!bucketName) return { error: 'Invalid bucket' };

  const expires = Math.min(3600, Math.max(60, Number(body.expires || 900)));
  const uploadUrl = await createPresignedPutUrl({
    accessKeyId,
    secretAccessKey,
    accountId,
    bucket: bucketName,
    key,
    expires
  });

  return { uploadUrl, key, bucket: bucketKey, expires };
};

const resolveBucket = (env, rawKey) => {
  const safeKey = sanitizeKey(rawKey);
  if (safeKey.startsWith('PRODUCT_MEDIA/')) {
    return { bucket: env.PRODUCT_MEDIA, key: safeKey.replace(/^PRODUCT_MEDIA\//, ''), bucketKey: 'PRODUCT_MEDIA' };
  }
  if (safeKey.startsWith('R2_BUCKET/')) {
    return { bucket: env.R2_BUCKET, key: safeKey.replace(/^R2_BUCKET\//, ''), bucketKey: 'R2_BUCKET' };
  }
  return { bucket: env.R2_BUCKET, key: safeKey, bucketKey: 'R2_BUCKET' };
};

export const buildTempKey = (sessionId, filename) => {
  const safeSession = sanitizeKey(sessionId).replace(/\//g, '-');
  const safeName = sanitizeKey(filename).replace(/\//g, '-');
  return `uploads/${safeSession}/${safeName || 'file'}`;
};

export const putTempFile = async (env, key, body, contentType) => {
  if (!env.R2_BUCKET) return { error: 'R2 bucket not configured' };
  await env.R2_BUCKET.put(key, body, { httpMetadata: { contentType: contentType || 'application/octet-stream' } });
  return { key, bucketKey: 'R2_BUCKET' };
};

export const getR2Object = async (env, rawKey) => {
  const { bucket, key, bucketKey } = resolveBucket(env, rawKey);
  if (!bucket) return { error: 'R2 bucket not configured' };
  const object = await bucket.get(key);
  if (!object) return { error: 'Not found', status: 404 };
  return { object, key, bucketKey };
};
