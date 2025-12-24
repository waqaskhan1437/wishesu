/**
 * Blog render query helpers for posts.
 */

export async function getBlogPostBySlug(env, slug) {
  return env.DB.prepare(
    `SELECT slug, title, html, css
     FROM blog_posts
     WHERE slug = ? AND status = 'published'`
  ).bind(String(slug || '').trim()).first();
}
