/**
 * Order Upload Utilities
 * Handles moving temp uploads to permanent storage
 */

import { extractR2Key } from './helpers.js';

const copyToPermanent = async (env, key, orderId, index) => {
  if (!env.R2_BUCKET || !env.PRODUCT_MEDIA) return null;
  if (key.startsWith('PRODUCT_MEDIA/')) return key;

  const cleaned = key.replace(/^R2_BUCKET\//, '');
  if (!cleaned) return null;

  const obj = await env.R2_BUCKET.get(cleaned);
  if (!obj) return null;

  const name = cleaned.split('/').pop() || `file-${index}`;
  const destKey = `orders/${orderId}/${Date.now()}-${index}-${name}`;

  await env.PRODUCT_MEDIA.put(destKey, obj.body, {
    httpMetadata: obj.httpMetadata
  });

  return `PRODUCT_MEDIA/${destKey}`;
};

export const moveAddonUploads = async (env, orderId, addons) => {
  let idx = 0;

  const mapValue = async (value) => {
    if (Array.isArray(value)) {
      const out = [];
      for (const item of value) {
        out.push(await mapValue(item));
      }
      return out;
    }

    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, val] of Object.entries(value)) {
        out[key] = await mapValue(val);
      }
      return out;
    }

    const key = extractR2Key(value);
    if (!key) return value;

    idx += 1;
    const newKey = await copyToPermanent(env, key, orderId, idx);
    if (!newKey) return value;

    return `/api/r2/file?key=${encodeURIComponent(newKey)}`;
  };

  return mapValue(addons);
};
