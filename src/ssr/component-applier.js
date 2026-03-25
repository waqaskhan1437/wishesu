/**
 * Component SSR Applier - Applies SSR components to HTML
 * Extracted from index.js
 */

import { parseInlineRenderOptions, replaceSimpleContainerById } from '../utils/component-ssr.js';
import { queryProductsForComponentSsr, queryBlogsForComponentSsr, queryForumQuestionsForSsr, queryReviewsForSsr } from './query-helpers.js';

export async function applyComponentSsrToHtml(env, html, url, path) {
  if (!html || !/<body/i.test(html)) return html;

  const componentRegex = /<div[^>]*data-ssr-component=["']([^"']+)["'][^>]*>/gi;
  const matches = [...html.matchAll(componentRegex)];

  if (matches.length === 0) return html;

  let output = html;

  for (const match of matches) {
    const componentTag = match[0];
    const componentName = match[1];

    try {
      const options = parseInlineRenderOptions(componentTag);

      let rendered = { innerHtml: '', attrs: {}, afterHtml: '' };

      if (componentName === 'product-grid' || componentName === 'products') {
        const result = await queryProductsForComponentSsr(env, {
          limit: options.limit || 20,
          offset: options.offset || 0,
          status: 'published'
        });
        const { renderProductCardsSsrMarkup } = await import('../utils/component-ssr.js');
        rendered.innerHtml = renderProductCardsSsrMarkup({
          containerId: options.containerId || 'products-container',
          products: result.products || [],
          options,
          pagination: { page: 1, totalPages: Math.ceil((result.total || 0) / (options.limit || 20)) }
        });
      } else if (componentName === 'blog-grid' || componentName === 'blogs') {
        const result = await queryBlogsForComponentSsr(env, {
          limit: options.limit || 10,
          offset: options.offset || 0
        });
        const { renderBlogGrid } = await import('../utils/component-ssr.js');
        rendered.innerHtml = renderBlogGrid(result.blogs || [], options, {
          page: 1,
          totalPages: Math.ceil((result.total || 0) / (options.limit || 10))
        });
      } else if (componentName === 'forum-questions' || componentName === 'forum') {
        const result = await queryForumQuestionsForSsr(env, {
          limit: options.limit || 10,
          offset: options.offset || 0
        });
        const { renderForumGrid } = await import('../utils/component-ssr.js');
        rendered.innerHtml = renderForumGrid(result.questions || [], options);
      } else if (componentName === 'reviews') {
        const result = await queryReviewsForSsr(env, {
          limit: options.limit || 10,
          offset: options.offset || 0,
          productId: options.productId || null
        });
        const { renderReviewCardsSsrMarkup } = await import('../utils/component-ssr.js');
        rendered.innerHtml = renderReviewCardsSsrMarkup({
          containerId: options.containerId || 'reviews-container',
          reviews: result.reviews || [],
          options
        });
      }

      const containerId = options.containerId || componentName;
      output = replaceSimpleContainerById(output, containerId, rendered.innerHtml, rendered.attrs, rendered.afterHtml);

    } catch (e) {
      console.error(`Component SSR error for ${componentName}:`, e.message);
    }
  }

  return output;
}
