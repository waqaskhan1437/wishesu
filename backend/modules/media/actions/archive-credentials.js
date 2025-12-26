/**
 * Get Archive Credentials Action
 * POST /api/upload/archive-credentials
 */

import { json, serverError } from '../../../core/utils/response.js';
import { getArchiveKeys } from '../services/archive.service.js';

export const archiveCredentials = async (request, env) => {
  const creds = getArchiveKeys(env);

  if (!creds) {
    return serverError('Archive credentials not configured');
  }

  return json(creds);
};
