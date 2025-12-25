/**
 * Admin and settings API routes.
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
  uploadTempFile,
  getArchiveCredentials,
  listUsers,
  updateUserBlocks,
  resetData,
  exportFull,
  exportProducts,
  exportPages,
  exportForGoogleSheets,
  importProducts,
  importPages,
  testGoogleSync,
  clearTempFiles,
  clearPendingCheckouts
} from './admin.controller.js';
import {
  getPages,
  getPagesList,
  getPage,
  savePage,
  savePageBuilder,
  deletePage,
  deletePageBySlug,
  updatePageStatus,
  duplicatePage,
  loadPageBuilder
} from './controllers/pages.js';
import { handleControlWebhook } from './controllers/control-webhook.js';

export async function routeAdminNoDb(req, env, url, path, method) {
  if (method === 'POST' && path === '/api/upload/temp-file') {
    return uploadTempFile(env, req, url);
  }
  if (method === 'POST' && path === '/api/upload/archive-credentials') {
    return getArchiveCredentials(env);
  }
  return null;
}

export async function routeAdmin(req, env, url, path, method) {
  if (method === 'POST' && path === '/api/purge-cache') {
    return purgeCache(env);
  }

  if (method === 'GET' && path === '/api/settings/default-pages') {
    return getDefaultPages(env);
  }
  if (method === 'POST' && path === '/api/settings/default-pages') {
    const body = await req.json().catch(() => ({}));
    return saveDefaultPages(env, body);
  }

  if (method === 'GET' && path === '/api/settings/analytics') {
    return getAnalyticsSettings(env);
  }
  if (method === 'POST' && path === '/api/settings/analytics') {
    const body = await req.json().catch(() => ({}));
    return saveAnalyticsSettings(env, body);
  }

  if (method === 'GET' && path === '/api/settings/control-webhook') {
    return getControlWebhookSettings(env);
  }
  if (method === 'POST' && path === '/api/settings/control-webhook') {
    const body = await req.json().catch(() => ({}));
    return saveControlWebhookSettings(env, body);
  }

  if (method === 'GET' && path === '/api/admin/users/list') {
    return listUsers(env);
  }
  if (method === 'POST' && path === '/api/admin/users/block') {
    const body = await req.json().catch(() => ({}));
    return updateUserBlocks(env, body);
  }

  if (method === 'GET' && path === '/api/settings/whop') {
    return getWhopSettings(env);
  }
  if (method === 'POST' && path === '/api/settings/whop') {
    const body = await req.json();
    return saveWhopSettings(env, body);
  }

  if (method === 'GET' && path === '/api/pages') {
    return getPages(env);
  }
  if (method === 'GET' && path === '/api/pages/list') {
    return getPagesList(env);
  }
  if (method === 'GET' && path.startsWith('/api/page/')) {
    const slug = path.split('/').pop();
    return getPage(env, slug);
  }
  if (method === 'POST' && path === '/api/page/save') {
    const body = await req.json();
    return savePage(env, body);
  }
  if (method === 'DELETE' && path === '/api/page/delete') {
    const id = url.searchParams.get('id');
    return deletePage(env, id);
  }
  if (method === 'POST' && path === '/api/pages/save') {
    const body = await req.json();
    return savePageBuilder(env, body);
  }
  if (method === 'POST' && path === '/api/pages/delete') {
    const body = await req.json().catch(() => ({}));
    return deletePageBySlug(env, body);
  }
  if (method === 'POST' && path === '/api/pages/status') {
    const body = await req.json().catch(() => ({}));
    return updatePageStatus(env, body);
  }
  if (method === 'POST' && path === '/api/pages/duplicate') {
    const body = await req.json().catch(() => ({}));
    return duplicatePage(env, body);
  }
  if (method === 'GET' && path === '/api/pages/load') {
    const name = url.searchParams.get('name');
    return loadPageBuilder(env, name);
  }

  if (method === 'GET' && path === '/api/r2/file') {
    const key = url.searchParams.get('key');
    return getR2File(env, key);
  }

  if (method === 'GET' && path === '/api/admin/export/full') {
    return exportFull(env);
  }
  if (method === 'GET' && path === '/api/admin/export/products') {
    return exportProducts(env);
  }
  if (method === 'GET' && path === '/api/admin/export/pages') {
    return exportPages(env);
  }
  if (method === 'POST' && path === '/api/admin/import/products') {
    return importProducts(env, req);
  }
  if (method === 'POST' && path === '/api/admin/import/pages') {
    return importPages(env, req);
  }

  if (method === 'POST' && path === '/api/admin/test-google-sync') {
    const body = await req.json().catch(() => ({}));
    return testGoogleSync(env, body);
  }
  if (method === 'POST' && path === '/api/admin/clear-temp-files') {
    return clearTempFiles(env);
  }
  if (method === 'POST' && path === '/api/admin/clear-pending-checkouts') {
    return clearPendingCheckouts(env);
  }
  if (method === 'POST' && path === '/api/admin/reset-data') {
    return resetData(env);
  }

  if (method === 'POST' && path === '/api/admin/control-webhook') {
    return handleControlWebhook(env, req);
  }

  if (method === 'GET' && path === '/api/admin/export-data') {
    return exportForGoogleSheets(env);
  }

  return null;
}
