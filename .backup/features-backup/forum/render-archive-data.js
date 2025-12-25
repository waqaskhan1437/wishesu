/**
 * Forum render query helpers.
 */

export async function getForumArchiveTopics(env) {
  const rows = await env.DB.prepare(
    `SELECT t.id, t.slug, t.title, t.body, t.author_name, t.created_at,
      (SELECT COUNT(*) FROM forum_replies r WHERE r.topic_id = t.id AND r.status = 'approved') as reply_count
     FROM forum_topics t
     WHERE t.status = 'approved'
     ORDER BY t.created_at DESC`
  ).all();
  return rows.results || [];
}
