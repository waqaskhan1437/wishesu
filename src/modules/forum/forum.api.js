/**
 * Forum API routes.
 */

import {
  submitForumTopic,
  submitForumReply,
  listForumTopics,
  listForumReplies,
  setForumTopicStatus,
  setForumReplyStatus,
  updateForumTopic,
  updateForumReply,
  deleteForumTopic,
  deleteForumReply
} from './forum.controller.js';

async function readRequestBody(req) {
  let body = {};
  try { body = await req.json(); } catch (_) {}
  if (!body || Object.keys(body).length === 0) {
    try {
      const fd = await req.formData();
      body = Object.fromEntries(fd.entries());
    } catch (_) {}
  }
  return body;
}

export async function routeForum(req, env, url, path, method) {
  if (method === 'POST' && path === '/api/forum/topic/submit') {
    const body = await readRequestBody(req);
    return submitForumTopic(env, body);
  }
  if (method === 'POST' && path === '/api/forum/reply/submit') {
    const body = await readRequestBody(req);
    return submitForumReply(env, body);
  }

  if (method === 'GET' && path === '/api/admin/forum/topics') {
    const status = url.searchParams.get('status');
    return listForumTopics(env, status);
  }
  if (method === 'GET' && path === '/api/admin/forum/replies') {
    const status = url.searchParams.get('status');
    return listForumReplies(env, status);
  }
  if (method === 'POST' && path === '/api/admin/forum/topic/status') {
    const body = await req.json().catch(() => ({}));
    return setForumTopicStatus(env, body);
  }
  if (method === 'POST' && path === '/api/admin/forum/reply/status') {
    const body = await req.json().catch(() => ({}));
    return setForumReplyStatus(env, body);
  }
  if (method === 'POST' && path === '/api/admin/forum/topic/update') {
    const body = await req.json().catch(() => ({}));
    return updateForumTopic(env, body);
  }
  if (method === 'POST' && path === '/api/admin/forum/reply/update') {
    const body = await req.json().catch(() => ({}));
    return updateForumReply(env, body);
  }
  if (method === 'POST' && path === '/api/admin/forum/topic/delete') {
    const body = await req.json().catch(() => ({}));
    return deleteForumTopic(env, body);
  }
  if (method === 'POST' && path === '/api/admin/forum/reply/delete') {
    const body = await req.json().catch(() => ({}));
    return deleteForumReply(env, body);
  }
  return null;
}
