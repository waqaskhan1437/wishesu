/**
 * Forum submission handlers.
 */

import { json } from '../../utils/response.js';
import { isCustomerBlocked, normalizeEmail, upsertCustomer } from '../../utils/customers.js';
import { slugify } from './helpers.js';

async function hasPendingSubmission(env, email) {
  const row = await env.DB.prepare(
    `SELECT id FROM forum_topics WHERE author_email = ? AND status = 'pending'
     UNION ALL
     SELECT id FROM forum_replies WHERE author_email = ? AND status = 'pending'
     LIMIT 1`
  ).bind(email, email).first();
  return !!row;
}

export async function submitForumTopic(env, body) {
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const title = String(body.title || '').trim();
  const text = String(body.body || '').trim();
  if (!name || !email || !title || !text) {
    return json({ success: false, error: 'name, email, title, and body required' }, 400);
  }
  if (await isCustomerBlocked(env, email, 'forum')) {
    return json({ success: false, error: 'You are blocked from forum submissions' }, 403);
  }
  if (await hasPendingSubmission(env, email)) {
    return json({ success: false, error: 'Your previous submission is still pending approval' }, 429);
  }

  let slug = slugify(title) || `topic-${Date.now()}`;
  const existing = await env.DB.prepare('SELECT id FROM forum_topics WHERE slug = ?').bind(slug).first();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  await env.DB.prepare(
    `INSERT INTO forum_topics (slug, title, body, author_name, author_email, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  ).bind(slug, title, text, name, email).run();

  await upsertCustomer(env, email, name);

  return json({ success: true, slug });
}

export async function submitForumReply(env, body) {
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const text = String(body.body || '').trim();
  const slug = String(body.slug || '').trim();
  if (!name || !email || !text || !slug) {
    return json({ success: false, error: 'name, email, body, and slug required' }, 400);
  }
  if (await isCustomerBlocked(env, email, 'forum')) {
    return json({ success: false, error: 'You are blocked from forum submissions' }, 403);
  }
  if (await hasPendingSubmission(env, email)) {
    return json({ success: false, error: 'Your previous submission is still pending approval' }, 429);
  }

  const topic = await env.DB.prepare(
    `SELECT id FROM forum_topics WHERE slug = ? AND status = 'approved'`
  ).bind(slug).first();
  if (!topic) return json({ success: false, error: 'Topic not found' }, 404);

  await env.DB.prepare(
    `INSERT INTO forum_replies (topic_id, body, author_name, author_email, status)
     VALUES (?, ?, ?, ?, 'pending')`
  ).bind(topic.id, text, name, email).run();

  await upsertCustomer(env, email, name);

  return json({ success: true });
}
