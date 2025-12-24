/**
 * Blog render query helpers.
 */

export async function getBlogArchivePosts(env) {
  const rows = await env.DB.prepare(
    `SELECT slug, title, html, created_at
     FROM blog_posts
     WHERE status = 'published'
     ORDER BY created_at DESC`
  ).all();
  return rows.results || [];
}
