/**
 * Forum render query helpers for topics.
 */

export async function getForumTopic(env, slug) {
  return env.DB.prepare(
    `SELECT id, slug, title, body, author_name, created_at
     FROM forum_topics
     WHERE slug = ? AND status = 'approved'`
  ).bind(String(slug || '').trim()).first();
}

export async function getForumReplies(env, topicId) {
  const rows = await env.DB.prepare(
    `SELECT body, author_name, created_at
     FROM forum_replies
     WHERE topic_id = ? AND status = 'approved'
     ORDER BY created_at ASC`
  ).bind(topicId).all();
  return rows.results || [];
}

export async function getForumLatestTopics(env, limit) {
  const rows = await env.DB.prepare(
    `SELECT slug, title, created_at
     FROM forum_topics
     WHERE status = 'approved'
     ORDER BY created_at DESC
     LIMIT ?`
  ).bind(Number(limit || 6)).all();
  return rows.results || [];
}
