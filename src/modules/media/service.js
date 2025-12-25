import { createPresignedPutUrl } from '../../core/utils/s3-sign.js';
import { BUCKETS } from '../../core/config/constants.js';

const sanitizeKey = (value) =>
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
