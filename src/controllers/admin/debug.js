/**
 * Admin Debug Controller
 * Debug and health check endpoints
 */

import { json } from '../../utils/response.js';
import { VERSION } from '../../config/constants.js';

/**
 * Get debug info
 */
export function getDebugInfo(env) {
  return json({
    status: 'running',
    bindings: {
      DB: !!env.DB,
      R2_BUCKET: !!env.R2_BUCKET,
      PRODUCT_MEDIA: !!env.PRODUCT_MEDIA,
      ASSETS: !!env.ASSETS
    },
    version: env.VERSION || VERSION,
    timestamp: new Date().toISOString()
  });
}

export default { getDebugInfo };
