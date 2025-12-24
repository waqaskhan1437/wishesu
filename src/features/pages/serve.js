/**
 * Dynamic page serving.
 */

export async function serveDynamicPage(env, slug) {
  const row = await env.DB.prepare(
    'SELECT * FROM pages WHERE slug = ? AND status = ?'
  ).bind(slug, 'published').first();

  if (!row) return null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${row.title || slug}</title>
  ${row.meta_description ? `<meta name="description" content="${row.meta_description}">` : ''}
  <style>body{font-family:-apple-system,system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;}</style>
</head>
<body>
  ${row.content || ''}
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
