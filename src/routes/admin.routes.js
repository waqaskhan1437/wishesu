/**
 * Admin Routes
 * Admin-specific API endpoints
 */

import {
  purgeCache,
  getWhopSettings,
  saveWhopSettings,
  getAnalyticsSettings,
  saveAnalyticsSettings,
  getControlWebhookSettings,
  saveControlWebhookSettings,
  getDefaultPages,
  saveDefaultPages,
  getR2File,
  uploadEncryptedFile,
  uploadTempFile,
  getArchiveCredentials,
  listUsers,
  updateUserBlocks,
  resetData
} from '../controllers/admin.js';

/**
 * Register admin routes
 * @param {Function} router - Route registration function
 */
export function registerAdminRoutes(router) {
  // Cache management
  router.post('/api/purge-cache', async (req, env, url) => {
    return purgeCache(env);
  });

  // Whop settings
  router.get('/api/admin/whop-settings', async (req, env, url) => {
    return getWhopSettings(env);
  });

  router.post('/api/admin/whop-settings', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return saveWhopSettings(env, body);
  });

  // Analytics settings
  router.get('/api/settings/analytics', async (req, env, url) => {
    return getAnalyticsSettings(env);
  });

  router.post('/api/settings/analytics', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return saveAnalyticsSettings(env, body);
  });

  // Control webhook settings
  router.get('/api/settings/control-webhook', async (req, env, url) => {
    return getControlWebhookSettings(env);
  });

  router.post('/api/settings/control-webhook', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return saveControlWebhookSettings(env, body);
  });

  // Default pages settings
  router.get('/api/settings/default-pages', async (req, env, url) => {
    return getDefaultPages(env);
  });

  router.post('/api/settings/default-pages', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return saveDefaultPages(env, body);
  });

  // File operations
  router.get('/api/admin/r2-file', async (req, env, url) => {
    const key = url.searchParams.get('key');
    return getR2File(env, key);
  });

  router.post('/api/order/upload-encrypted-file', async (req, env, url) => {
    return uploadEncryptedFile(env, req);
  });

  router.post('/api/upload/temp-file', async (req, env, url) => {
    return uploadTempFile(env, req, url);
  });

  router.post('/api/upload/archive-credentials', async (req, env, url) => {
    return getArchiveCredentials(env);
  });

  // User management
  router.get('/api/admin/users/list', async (req, env, url) => {
    return listUsers(env);
  });

  router.post('/api/admin/users/block', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return updateUserBlocks(env, body);
  });

  // Data reset
  router.post('/api/admin/reset-data', async (req, env, url) => {
    const body = await req.json().catch(() => ({}));
    return resetData(env, body);
  });
}

export default registerAdminRoutes;
