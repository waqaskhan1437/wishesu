/**
 * R2 Helpers - R2 bucket operations
 * Consolidated from admin.js, controllers/admin.js, controllers/settings-media.js
 */

export async function uploadToR2(env, bucket, key, data, options = {}) {
  const { contentType = 'application/octet-stream', metadata = {} } = options;
  
  if (!env[bucket]) {
    throw new Error(`R2 bucket "${bucket}" not configured`);
  }

  try {
    await env[bucket].put(key, data, {
      httpMetadata: {
        contentType
      },
      customMetadata: metadata
    });
    return { success: true, key };
  } catch (error) {
    console.error('R2 upload error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getFromR2(env, bucket, key) {
  if (!env[bucket]) {
    throw new Error(`R2 bucket "${bucket}" not configured`);
  }

  try {
    const object = await env[bucket].get(key);
    if (!object) {
      return null;
    }
    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType,
      metadata: object.customMetadata,
      lastModified: object.lastModified
    };
  } catch (error) {
    console.error('R2 get error:', error.message);
    return null;
  }
}

export async function deleteFromR2(env, bucket, key) {
  if (!env[bucket]) {
    throw new Error(`R2 bucket "${bucket}" not configured`);
  }

  try {
    await env[bucket].delete(key);
    return { success: true };
  } catch (error) {
    console.error('R2 delete error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function listR2Objects(env, bucket, options = {}) {
  const { prefix = '', limit = 100 } = options;
  
  if (!env[bucket]) {
    throw new Error(`R2 bucket "${bucket}" not configured`);
  }

  try {
    const listed = await env[bucket].list({ prefix, limit });
    return listed.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      lastModified: obj.lastModified,
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata
    }));
  } catch (error) {
    console.error('R2 list error:', error.message);
    return [];
  }
}

export async function generatePresignedUrl(env, bucket, key, expiresIn = 3600) {
  if (!env[bucket]) {
    throw new Error(`R2 bucket "${bucket}" not configured`);
  }

  try {
    const url = await env[bucket].sign({ 
      method: 'GET', 
      key,
      expires: Math.floor(Date.now() / 1000) + expiresIn 
    });
    return url;
  } catch (error) {
    console.error('R2 presign error:', error.message);
    return null;
  }
}

export async function copyInR2(env, bucket, sourceKey, destinationKey) {
  const source = await getFromR2(env, bucket, sourceKey);
  if (!source) {
    return { success: false, error: 'Source not found' };
  }

  const body = source.body;
  return uploadToR2(env, bucket, destinationKey, body, { contentType: source.contentType });
}
