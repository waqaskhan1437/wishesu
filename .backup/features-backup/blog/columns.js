/**
 * Blog schema helpers.
 */

let blogColumnsChecked = false;

export async function ensureBlogColumns(env) {
  if (blogColumnsChecked) return;
  try {
    await env.DB.prepare('ALTER TABLE blog_posts ADD COLUMN author_name TEXT').run();
  } catch (_) {}
  try {
    await env.DB.prepare('ALTER TABLE blog_posts ADD COLUMN author_email TEXT').run();
  } catch (_) {}
  blogColumnsChecked = true;
}
