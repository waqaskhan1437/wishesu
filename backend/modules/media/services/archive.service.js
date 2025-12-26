/**
 * Archive.org Storage Service
 * Handles all Internet Archive specific operations
 */

export const getArchiveKeys = (env) => {
  const accessKey = env.ARCHIVE_ACCESS_KEY;
  const secretKey = env.ARCHIVE_SECRET_KEY;

  return accessKey && secretKey ? { accessKey, secretKey } : null;
};

export const validateArchiveCredentials = (env) => {
  const creds = getArchiveKeys(env);
  return {
    valid: !!creds,
    error: creds ? null : 'Archive credentials not configured'
  };
};

export const buildArchiveUploadUrl = (identifier, filename) => {
  const safeId = String(identifier || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeName = String(filename || '').replace(/[^a-zA-Z0-9._-]/g, '');

  if (!safeId || !safeName) {
    return { error: 'Invalid identifier or filename' };
  }

  return {
    url: `https://s3.us.archive.org/${safeId}/${safeName}`,
    identifier: safeId,
    filename: safeName
  };
};

export const buildArchiveDownloadUrl = (identifier, filename) => {
  const safeId = String(identifier || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeName = String(filename || '').replace(/[^a-zA-Z0-9._-]/g, '');

  if (!safeId || !safeName) {
    return { error: 'Invalid identifier or filename' };
  }

  return {
    url: `https://archive.org/download/${safeId}/${safeName}`,
    identifier: safeId,
    filename: safeName
  };
};
