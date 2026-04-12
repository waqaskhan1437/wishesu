const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'src', 'index.js');
let code = fs.readFileSync(indexPath, 'utf8');

// Blog Fix
const blogSearch = `            await initDB(env);
            const blog = await env.DB.prepare(\`
              SELECT * FROM blogs WHERE slug = ? AND status = 'published'
            \`).bind(slug).first();
            
            if (blog) {
              // Run all queries in parallel for better CPU efficiency
              const [prevResult, commentsResult, seo] = await Promise.all([
                // Get previous 2 blog posts (before current one)
                env.DB.prepare(\`
                  SELECT id, title, slug, description, thumbnail_url, created_at
                  FROM blogs 
                  WHERE status = 'published' AND id < ?
                  ORDER BY id DESC
                  LIMIT 2
                \`).bind(blog.id).all(),
                // Get approved comments
                env.DB.prepare(\`
                  SELECT id, name, comment, created_at
                  FROM blog_comments 
                  WHERE blog_id = ? AND status = 'approved'
                  ORDER BY created_at DESC
                \`).bind(blog.id).all(),
                // Get SEO settings
                getSeoForRequest(env, req, { path })
              ]);
              
              const previousBlogs = prevResult.results || [];
              const comments = commentsResult.results || [];`;

const blogReplace = `            await initDB(env);
            
            let blog = null, previousBlogs = [], comments = [], seo = null;
            const cacheKey = \`api_cache:ssr:blog:\${slug}\`;
            
            try {
              const cached = await env.PAGE_CACHE.get(cacheKey, 'json');
              if (cached) {
                blog = cached.blog;
                previousBlogs = cached.previousBlogs;
                comments = cached.comments;
              }
            } catch(e) {}
            
            seo = await getSeoForRequest(env, req, { path });

            if (!blog) {
              blog = await env.DB.prepare(\`
                SELECT * FROM blogs WHERE slug = ? AND status = 'published'
              \`).bind(slug).first();
              
              if (blog) {
                const [prevResult, commentsResult] = await Promise.all([
                  env.DB.prepare(\`
                    SELECT id, title, slug, description, thumbnail_url, created_at
                    FROM blogs 
                    WHERE status = 'published' AND id < ?
                    ORDER BY id DESC
                    LIMIT 2
                  \`).bind(blog.id).all(),
                  env.DB.prepare(\`
                    SELECT id, name, comment, created_at
                    FROM blog_comments 
                    WHERE blog_id = ? AND status = 'approved'
                    ORDER BY created_at DESC
                  \`).bind(blog.id).all()
                ]);
                previousBlogs = prevResult.results || [];
                comments = commentsResult.results || [];
                try { await env.PAGE_CACHE.put(cacheKey, JSON.stringify({blog, previousBlogs, comments}), { expirationTtl: 86400 * 7 }); } catch(e) {}
              }
            }
            
            if (blog) {`;

if (code.includes(blogSearch)) {
  code = code.replace(blogSearch, blogReplace);
  console.log('Blog SSR fixed.');
} else {
  // Try CRLF / LF normalization
  const normalizedCode = code.replace(/\r\n/g, '\n');
  const normalizedSearch = blogSearch.replace(/\r\n/g, '\n');
  if (normalizedCode.includes(normalizedSearch)) {
    code = normalizedCode.replace(normalizedSearch, blogReplace.replace(/\r\n/g, '\n'));
    console.log('Blog SSR fixed (LF).');
  } else {
    console.error('Blog SSR search string not found.');
  }
}

// Forum Fix
const forumSearch = `              const forumSeoPath = question?.slug
                ? \`/forum/\${encodeURIComponent(String(question.slug).trim())}\`
                : path;

              // Run all queries in parallel for better CPU efficiency
              const [repliesResult, productsResult, blogsResult, seo] = await Promise.all([
                // Get approved replies
                env.DB.prepare(\`
                  SELECT id, name, content, created_at
                  FROM forum_replies 
                  WHERE question_id = ? AND status = 'approved'
                  ORDER BY created_at ASC
                \`).bind(question.id).all(),
                // Get sidebar products
                env.DB.prepare(\`
                  SELECT id, title, slug, thumbnail_url, sale_price, normal_price
                  FROM products 
                  WHERE \${buildPublicProductStatusWhere('status')}
                  ORDER BY id DESC
                  LIMIT 2 OFFSET ?
                \`).bind(Math.max(0, question.id - 1)).all(),
                // Get sidebar blogs
                env.DB.prepare(\`
                  SELECT id, title, slug, thumbnail_url, description
                  FROM blogs 
                  WHERE status = 'published'
                  ORDER BY id DESC
                  LIMIT 2 OFFSET ?
                \`).bind(Math.max(0, question.id - 1)).all(),
                // Get SEO settings
                getSeoForRequest(env, req, { path: forumSeoPath })
              ]);
              
              const replies = repliesResult.results || [];
              const sidebar = {
                products: productsResult.results || [],
                blogs: blogsResult.results || []
              };`;

const forumReplace = `              const forumSeoPath = question?.slug
                ? \`/forum/\${encodeURIComponent(String(question.slug).trim())}\`
                : path;

              let replies = [], sidebar = { products: [], blogs: [] };
              const cacheKey = \`api_cache:ssr:forum_detail:\${question.id}\`;
              
              try {
                const cached = await env.PAGE_CACHE.get(cacheKey, 'json');
                if (cached) {
                  replies = cached.replies;
                  sidebar = cached.sidebar;
                }
              } catch(e) {}

              let seo = await getSeoForRequest(env, req, { path: forumSeoPath });

              if (replies.length === 0 && sidebar.products.length === 0 && sidebar.blogs.length === 0) {
                const [repliesResult, productsResult, blogsResult] = await Promise.all([
                  env.DB.prepare(\`
                    SELECT id, name, content, created_at
                    FROM forum_replies 
                    WHERE question_id = ? AND status = 'approved'
                    ORDER BY created_at ASC
                  \`).bind(question.id).all(),
                  env.DB.prepare(\`
                    SELECT id, title, slug, thumbnail_url, sale_price, normal_price
                    FROM products 
                    WHERE \${buildPublicProductStatusWhere('status')}
                    ORDER BY id DESC
                    LIMIT 2 OFFSET ?
                  \`).bind(Math.max(0, question.id - 1)).all(),
                  env.DB.prepare(\`
                    SELECT id, title, slug, thumbnail_url, description
                    FROM blogs 
                    WHERE status = 'published'
                    ORDER BY id DESC
                    LIMIT 2 OFFSET ?
                  \`).bind(Math.max(0, question.id - 1)).all()
                ]);
                
                replies = repliesResult.results || [];
                sidebar = {
                  products: productsResult.results || [],
                  blogs: blogsResult.results || []
                };
                
                try { await env.PAGE_CACHE.put(cacheKey, JSON.stringify({ replies, sidebar }), { expirationTtl: 86400 * 7 }); } catch(e) {}
              }`;

const normalizedCode2 = code.replace(/\r\n/g, '\n');
const normalizedSearch2 = forumSearch.replace(/\r\n/g, '\n');
if (normalizedCode2.includes(normalizedSearch2)) {
  code = normalizedCode2.replace(normalizedSearch2, forumReplace.replace(/\r\n/g, '\n'));
  console.log('Forum SSR fixed.');
} else {
  console.error('Forum SSR search string not found.');
}

// Product Schema Fix
const productSchemaSearch = `                // OPTIMIZED: Run product + reviews + settings + whop gateway ALL in a single Promise.all
                // This reduces from 2 sequential rounds to 1 round of parallel queries
                const numPid = Number(productId);
                const [productResult, reviewsResult, settingsMap, whopGateway] = await Promise.all([
                  env.DB.prepare(\`
                    SELECT p.*,
                      COUNT(r.id) as review_count,
                      AVG(r.rating) as rating_average
                    FROM products p
                    LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
                    WHERE p.id = ? AND \${buildPublicProductStatusWhere('p.status')}
                    GROUP BY p.id
                  \`).bind(numPid).first(),
                  env.DB.prepare(
                    'SELECT * FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC LIMIT 5'
                  ).bind(numPid, 'approved').all(),
                  getCachedSettings(env, ['site_branding', 'site_components', 'whop']),
                  env.DB.prepare(\`
                    SELECT whop_product_id, whop_theme, webhook_secret, whop_api_key
                    FROM payment_gateways
                    WHERE gateway_type = 'whop'
                    ORDER BY is_enabled DESC, id DESC
                    LIMIT 1
                  \`).first().catch(() => null)
                ]);

                const product = productResult;
                  if (product) {
                    schemaProduct = product;
                    const reviews = reviewsResult.results || [];
                    let adjacent = { previous: null, next: null };
                    let siteBranding = { logo_url: '', favicon_url: '' };
                    let siteComponents = {};
                    let whopSettingsBootstrap = {};

                    // Adjacent products need product.sort_order so must be a second round
                    try {
                      const [prev, next] = await Promise.all([
                        env.DB.prepare(\`
                          SELECT id, title, slug, thumbnail_url
                          FROM products
                          WHERE \${buildPublicProductStatusWhere('status')}
                          AND (
                            sort_order < ?
                            OR (sort_order = ? AND id > ?)
                          )
                          ORDER BY sort_order DESC, id ASC
                          LIMIT 1
                        \`).bind(product.sort_order, product.sort_order, product.id).first(),
                        env.DB.prepare(\`
                          SELECT id, title, slug, thumbnail_url
                          FROM products
                          WHERE \${buildPublicProductStatusWhere('status')}
                          AND (
                            sort_order > ?
                            OR (sort_order = ? AND id < ?)
                          )
                          ORDER BY sort_order ASC, id DESC
                          LIMIT 1
                        \`).bind(product.sort_order, product.sort_order, product.id).first()
                      ]);`;

const productSchemaReplace = `                const numPid = Number(productId);
                const cacheKey = \`api_cache:ssr:product_detail:\${numPid}\`;
                
                let product = null, reviews = [], adjacent = { previous: null, next: null }, whopGateway = null;
                
                try {
                  const cached = await env.PAGE_CACHE.get(cacheKey, 'json');
                  if (cached) {
                    product = cached.product;
                    reviews = cached.reviews;
                    adjacent = cached.adjacent;
                    whopGateway = cached.whopGateway;
                  }
                } catch(e) {}
                
                const settingsMap = await getCachedSettings(env, ['site_branding', 'site_components', 'whop']);
                
                if (!product) {
                  const [productResult, reviewsResult, whopGatewayResult] = await Promise.all([
                    env.DB.prepare(\`
                      SELECT p.*,
                        COUNT(r.id) as review_count,
                        AVG(r.rating) as rating_average
                      FROM products p
                      LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
                      WHERE p.id = ? AND \${buildPublicProductStatusWhere('p.status')}
                      GROUP BY p.id
                    \`).bind(numPid).first(),
                    env.DB.prepare(
                      'SELECT * FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC LIMIT 5'
                    ).bind(numPid, 'approved').all(),
                    env.DB.prepare(\`
                      SELECT whop_product_id, whop_theme, webhook_secret, whop_api_key
                      FROM payment_gateways
                      WHERE gateway_type = 'whop'
                      ORDER BY is_enabled DESC, id DESC
                      LIMIT 1
                    \`).first().catch(() => null)
                  ]);
                  
                  product = productResult;
                  reviews = reviewsResult.results || [];
                  whopGateway = whopGatewayResult;
                  
                  if (product) {
                    try {
                      const [prev, next] = await Promise.all([
                        env.DB.prepare(\`
                          SELECT id, title, slug, thumbnail_url
                          FROM products
                          WHERE \${buildPublicProductStatusWhere('status')}
                          AND (sort_order < ? OR (sort_order = ? AND id > ?))
                          ORDER BY sort_order DESC, id ASC
                          LIMIT 1
                        \`).bind(product.sort_order, product.sort_order, product.id).first(),
                        env.DB.prepare(\`
                          SELECT id, title, slug, thumbnail_url
                          FROM products
                          WHERE \${buildPublicProductStatusWhere('status')}
                          AND (sort_order > ? OR (sort_order = ? AND id < ?))
                          ORDER BY sort_order ASC, id DESC
                          LIMIT 1
                        \`).bind(product.sort_order, product.sort_order, product.id).first()
                      ]);
                      adjacent = { previous: prev || null, next: next || null };
                    } catch(e) {}
                    
                    try { await env.PAGE_CACHE.put(cacheKey, JSON.stringify({ product, reviews, adjacent, whopGateway }), { expirationTtl: 86400 * 7 }); } catch(e) {}
                  }
                }
                
                if (product) {
                    schemaProduct = product;
                    let siteBranding = { logo_url: '', favicon_url: '' };
                    let siteComponents = {};
                    let whopSettingsBootstrap = {};
                    
                    const prev = adjacent.previous;
                    const next = adjacent.next;
                    
                    try {`;

const normalizedCode3 = code.replace(/\r\n/g, '\n');
const normalizedSearch3 = productSchemaSearch.replace(/\r\n/g, '\n');
if (normalizedCode3.includes(normalizedSearch3)) {
  code = normalizedCode3.replace(normalizedSearch3, productSchemaReplace.replace(/\r\n/g, '\n'));
  console.log('Product Schema SSR fixed.');
} else {
  console.error('Product Schema SSR search string not found.');
}

fs.writeFileSync(indexPath, code, 'utf8');
