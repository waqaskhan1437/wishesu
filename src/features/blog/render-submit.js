/**
 * Render blog submit page.
 */

import { buildSubmitHtml } from './submit-template.js';

export async function renderBlogSubmit() {
  const html = buildSubmitHtml();

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
