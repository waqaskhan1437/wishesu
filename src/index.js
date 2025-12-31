/**
 * Cloudflare Worker - Main Entry Point with HTML Caching
 * Modular ES Module Structure
 */

import { CORS, handleOptions } from './config/cors.js';
import { initDB } from './config/db.js';
import { VERSION } from './config/constants.js';
import { routeApiRequest } from './router.js';
import { handleProductRouting } from './controllers/products.js';
import { handleSecureDownload, maybePurgeCache } from './controllers/admin.js';
import { cleanupExpired } from './controllers/whop.js';
import { generateProductSchema, generateCollectionSchema, injectSchemaIntoHTML } from './utils/schema.js';
import { getMimeTypeFromFilename } from './utils/upload-helper.js';

// Blog post HTML template generator
function generateBlogPostHTML(blog, previousBlogs = [], comments = []) {
  const date = blog.created_at ? new Date(blog.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  }) : '';
  
  const prevBlogsHTML = previousBlogs.length > 0 ? `
    <div class="related-posts">
      <h3>Previous Posts</h3>
      <div class="related-grid">
        ${previousBlogs.map(p => `
          <a href="/blog/${p.slug}" class="related-card">
            <div class="related-thumb">
              <img src="${p.thumbnail_url || 'https://via.placeholder.com/300x169?text=No+Image'}" alt="${p.title}" loading="lazy">
            </div>
            <div class="related-content">
              <h4>${p.title}</h4>
              <p>${p.description ? (p.description.length > 80 ? p.description.substring(0, 80) + '...' : p.description) : ''}</p>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Generate comments HTML
  const commentsHTML = comments.map(c => {
    const commentDate = c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    }) : '';
    const safeName = (c.name || 'Anonymous').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeComment = (c.comment || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    return `
      <div class="comment-item">
        <div class="comment-header">
          <div class="comment-avatar">${safeName.charAt(0).toUpperCase()}</div>
          <div class="comment-info">
            <div class="comment-name">${safeName}</div>
            <div class="comment-date">${commentDate}</div>
          </div>
        </div>
        <div class="comment-text">${safeComment}</div>
      </div>
    `;
  }).join('');

  const safeTitle = (blog.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeDesc = (blog.seo_description || blog.description || '').substring(0, 160).replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blog.seo_title || blog.title} - WishesU</title>
  <meta name="description" content="${safeDesc}">
  <meta name="keywords" content="${blog.seo_keywords || ''}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${blog.thumbnail_url || ''}">
  <meta property="og:type" content="article">
  <link rel="stylesheet" href="/css/style.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; line-height: 1.6; }
    
    .blog-hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
    }
    .blog-hero-inner {
      max-width: 900px;
      margin: 0 auto;
      text-align: center;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: rgba(255,255,255,0.9);
      text-decoration: none;
      font-weight: 500;
      margin-bottom: 30px;
      transition: color 0.2s;
    }
    .back-link:hover { color: white; }
    .blog-hero h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 20px;
      line-height: 1.3;
    }
    .blog-meta {
      display: flex;
      justify-content: center;
      gap: 20px;
      opacity: 0.9;
      font-size: 1rem;
    }
    
    .blog-container {
      max-width: 900px;
      margin: -60px auto 0;
      padding: 0 20px 60px;
      position: relative;
      z-index: 10;
    }
    
    .blog-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    
    .blog-featured-image {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
    }
    
    .blog-body {
      padding: 40px;
    }
    
    .blog-content {
      font-size: 1.1rem;
      color: #374151;
      line-height: 1.8;
    }
    .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4 {
      color: #1f2937;
      margin: 30px 0 15px;
      line-height: 1.3;
    }
    .blog-content h1 { font-size: 2rem; }
    .blog-content h2 { font-size: 1.6rem; }
    .blog-content h3 { font-size: 1.3rem; }
    .blog-content p { margin: 15px 0; }
    .blog-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 20px 0;
    }
    .blog-content a { color: #667eea; }
    .blog-content ul, .blog-content ol {
      margin: 15px 0;
      padding-left: 25px;
    }
    .blog-content li { margin: 8px 0; }
    .blog-content blockquote {
      border-left: 4px solid #667eea;
      margin: 20px 0;
      padding: 15px 25px;
      background: #f9fafb;
      font-style: italic;
      color: #4b5563;
    }
    .blog-content pre {
      background: #1f2937;
      color: #e5e7eb;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9rem;
      margin: 20px 0;
    }
    .blog-content code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
    }
    .blog-content pre code {
      background: none;
      padding: 0;
    }
    
    /* Related Posts */
    .related-posts {
      margin-top: 50px;
      padding-top: 40px;
      border-top: 2px solid #e5e7eb;
    }
    .related-posts h3 {
      font-size: 1.5rem;
      color: #1f2937;
      margin-bottom: 25px;
      text-align: center;
    }
    .related-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 25px;
    }
    .related-card {
      background: #f9fafb;
      border-radius: 12px;
      overflow: hidden;
      text-decoration: none;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
    }
    .related-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .related-thumb {
      aspect-ratio: 16/9;
      overflow: hidden;
    }
    .related-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
    .related-card:hover .related-thumb img {
      transform: scale(1.05);
    }
    .related-content {
      padding: 20px;
    }
    .related-content h4 {
      font-size: 1.1rem;
      color: #1f2937;
      margin: 0 0 10px;
      line-height: 1.4;
    }
    .related-content p {
      font-size: 0.9rem;
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
    }
    
    /* Comments Section */
    .comments-section {
      margin-top: 50px;
      padding-top: 40px;
      border-top: 2px solid #e5e7eb;
    }
    .comments-section h3 {
      font-size: 1.5rem;
      color: #1f2937;
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .comment-count {
      background: #667eea;
      color: white;
      font-size: 0.9rem;
      padding: 4px 12px;
      border-radius: 20px;
    }
    
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 40px;
    }
    .comment-item {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
    }
    .comment-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .comment-avatar {
      width: 45px;
      height: 45px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1.2rem;
    }
    .comment-info { flex: 1; }
    .comment-name {
      font-weight: 600;
      color: #1f2937;
    }
    .comment-date {
      font-size: 0.85rem;
      color: #6b7280;
    }
    .comment-text {
      color: #374151;
      line-height: 1.6;
    }
    
    .no-comments {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      background: #f9fafb;
      border-radius: 12px;
    }
    
    /* Comment Form */
    .comment-form-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 25px;
    }
    .comment-form-card h4 {
      font-size: 1.2rem;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group.full { grid-column: span 2; }
    .form-group label {
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
    }
    .form-group input,
    .form-group textarea {
      padding: 12px 15px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    .form-group textarea {
      min-height: 120px;
      resize: vertical;
    }
    .submit-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
    }
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .form-message {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: none;
    }
    .form-message.success {
      background: #d1fae5;
      color: #065f46;
      display: block;
    }
    .form-message.error {
      background: #fee2e2;
      color: #991b1b;
      display: block;
    }
    .form-message.warning {
      background: #fef3c7;
      color: #92400e;
      display: block;
    }
    
    .pending-notice {
      background: #fef3c7;
      color: #92400e;
      padding: 15px 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    
    @media (max-width: 768px) {
      .blog-hero h1 { font-size: 1.8rem; }
      .blog-body { padding: 25px; }
      .blog-content { font-size: 1rem; }
      .related-grid { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
      .form-group.full { grid-column: span 1; }
    }
    
    ${blog.custom_css || ''}
  </style>
</head>
<body>
  <div class="blog-hero">
    <div class="blog-hero-inner">
      <a href="/blog/" class="back-link">← Back to Blog</a>
      <h1>${safeTitle}</h1>
      ${date ? `<div class="blog-meta"><span>📅 ${date}</span></div>` : ''}
    </div>
  </div>
  
  <div class="blog-container">
    <article class="blog-card">
      ${blog.thumbnail_url ? `<img src="${blog.thumbnail_url}" alt="${safeTitle}" class="blog-featured-image">` : ''}
      <div class="blog-body">
        <div class="blog-content">
          ${blog.content || ''}
        </div>
        
        <!-- Comments Section -->
        <div class="comments-section">
          <h3>💬 Comments <span class="comment-count">${comments.length}</span></h3>
          
          ${comments.length > 0 ? `
            <div class="comments-list">
              ${commentsHTML}
            </div>
          ` : `
            <div class="no-comments">
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          `}
          
          <!-- Comment Form -->
          <div class="comment-form-card">
            <h4>Leave a Comment</h4>
            <div id="form-message" class="form-message"></div>
            <div id="pending-notice" class="pending-notice" style="display:none;">
              ⏳ You have a comment awaiting approval. Please wait for it to be approved before posting another.
            </div>
            <form id="comment-form">
              <input type="hidden" id="blog-id" value="${blog.id}">
              <div class="form-row">
                <div class="form-group">
                  <label for="comment-name">Name *</label>
                  <input type="text" id="comment-name" placeholder="Your name" required>
                </div>
                <div class="form-group">
                  <label for="comment-email">Email *</label>
                  <input type="email" id="comment-email" placeholder="your@email.com" required>
                </div>
              </div>
              <div class="form-group full">
                <label for="comment-text">Comment *</label>
                <textarea id="comment-text" placeholder="Write your comment here..." required></textarea>
              </div>
              <button type="submit" class="submit-btn" id="submit-btn">Submit Comment</button>
            </form>
          </div>
        </div>
        
        ${prevBlogsHTML}
      </div>
    </article>
  </div>
  
  <script>
    const blogId = ${blog.id};
    const form = document.getElementById('comment-form');
    const formMessage = document.getElementById('form-message');
    const pendingNotice = document.getElementById('pending-notice');
    const submitBtn = document.getElementById('submit-btn');
    const emailInput = document.getElementById('comment-email');
    
    // Check for pending comment when email is entered
    let checkTimeout;
    emailInput.addEventListener('blur', async function() {
      const email = this.value.trim();
      if (!email) return;
      
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(async () => {
        try {
          const res = await fetch('/api/blog/comments/check-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blog_id: blogId, email: email })
          });
          const data = await res.json();
          
          if (data.hasPending) {
            pendingNotice.style.display = 'block';
            submitBtn.disabled = true;
          } else {
            pendingNotice.style.display = 'none';
            submitBtn.disabled = false;
          }
        } catch (err) {
          console.error('Check pending error:', err);
        }
      }, 500);
    });
    
    // Submit comment
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const name = document.getElementById('comment-name').value.trim();
      const email = document.getElementById('comment-email').value.trim();
      const comment = document.getElementById('comment-text').value.trim();
      
      if (!name || !email || !comment) {
        showMessage('Please fill in all fields.', 'error');
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      try {
        const res = await fetch('/api/blog/comments/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blog_id: blogId,
            name: name,
            email: email,
            comment: comment
          })
        });
        const data = await res.json();
        
        if (data.success) {
          showMessage(data.message || 'Comment submitted successfully! It will appear after admin approval.', 'success');
          form.reset();
          pendingNotice.style.display = 'block';
          submitBtn.disabled = true;
        } else {
          if (data.hasPending) {
            pendingNotice.style.display = 'block';
            submitBtn.disabled = true;
          }
          showMessage(data.error || 'Failed to submit comment.', 'error');
        }
      } catch (err) {
        console.error('Submit error:', err);
        showMessage('An error occurred. Please try again.', 'error');
      }
      
      submitBtn.textContent = 'Submit Comment';
    });
    
    function showMessage(msg, type) {
      formMessage.textContent = msg;
      formMessage.className = 'form-message ' + type;
      formMessage.style.display = 'block';
      
      if (type === 'success') {
        setTimeout(() => {
          formMessage.style.display = 'none';
        }, 5000);
      }
    }
  </script>
  ${blog.custom_js ? `<script>${blog.custom_js}</script>` : ''}
</body>
</html>`;
}

// Forum question page HTML template generator
function generateForumQuestionHTML(question, replies = [], sidebar = {}) {
  const date = question.created_at ? new Date(question.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  }) : '';
  
  const safeTitle = (question.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeContent = (question.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  
  // Generate replies HTML
  const repliesHTML = replies.map(r => {
    const replyDate = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    }) : '';
    const safeName = (r.name || 'Anonymous').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeReply = (r.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    return `
      <div class="reply-item">
        <div class="reply-header">
          <div class="reply-avatar">${safeName.charAt(0).toUpperCase()}</div>
          <div class="reply-info">
            <div class="reply-name">${safeName}</div>
            <div class="reply-date">${replyDate}</div>
          </div>
        </div>
        <div class="reply-content">${safeReply}</div>
      </div>
    `;
  }).join('');

  // Sidebar products
  const productsHTML = (sidebar.products || []).map(p => `
    <a href="/product-${p.id}/${p.slug || p.id}" class="sidebar-card">
      <img src="${p.thumbnail_url || 'https://via.placeholder.com/150x84?text=Product'}" alt="${p.title}">
      <div class="sidebar-card-info">
        <div class="sidebar-card-title">${(p.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <div class="sidebar-card-price">$${p.sale_price || p.normal_price || 0}</div>
      </div>
    </a>
  `).join('');

  // Sidebar blogs
  const blogsHTML = (sidebar.blogs || []).map(b => `
    <a href="/blog/${b.slug}" class="sidebar-card">
      <img src="${b.thumbnail_url || 'https://via.placeholder.com/150x84?text=Blog'}" alt="${b.title}">
      <div class="sidebar-card-info">
        <div class="sidebar-card-title">${(b.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
    </a>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Forum - WishesU</title>
  <meta name="description" content="${safeTitle}">
  <link rel="stylesheet" href="/css/style.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; line-height: 1.6; }
    
    .forum-hero {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 40px 20px;
    }
    .forum-hero-inner {
      max-width: 1200px;
      margin: 0 auto;
      text-align: center;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: rgba(255,255,255,0.9);
      text-decoration: none;
      font-weight: 500;
      margin-bottom: 20px;
      transition: color 0.2s;
    }
    .back-link:hover { color: white; }
    .forum-hero h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 15px;
      line-height: 1.3;
    }
    .forum-meta {
      display: flex;
      justify-content: center;
      gap: 20px;
      opacity: 0.9;
      font-size: 0.95rem;
    }
    
    .forum-layout {
      max-width: 1200px;
      margin: -40px auto 0;
      padding: 0 20px 60px;
      display: grid;
      grid-template-columns: 200px 1fr 200px;
      gap: 30px;
      position: relative;
      z-index: 10;
    }
    
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .sidebar-section h4 {
      font-size: 0.9rem;
      color: #6b7280;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sidebar-card {
      display: block;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.3s;
      margin-bottom: 12px;
    }
    .sidebar-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
    .sidebar-card img {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
    }
    .sidebar-card-info {
      padding: 12px;
    }
    .sidebar-card-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .sidebar-card-price {
      color: #10b981;
      font-weight: 700;
      margin-top: 5px;
    }
    
    .main-content {
      min-width: 0;
    }
    
    .question-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    
    .question-body {
      padding: 35px;
    }
    
    .question-author {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .author-avatar {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1.3rem;
    }
    .author-info { flex: 1; }
    .author-name {
      font-weight: 600;
      color: #1f2937;
      font-size: 1.1rem;
    }
    .author-date {
      font-size: 0.9rem;
      color: #6b7280;
    }
    
    .question-content {
      font-size: 1.1rem;
      color: #374151;
      line-height: 1.8;
    }
    
    /* Replies Section */
    .replies-section {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    .replies-section h3 {
      font-size: 1.3rem;
      color: #1f2937;
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .reply-count-badge {
      background: #10b981;
      color: white;
      font-size: 0.85rem;
      padding: 4px 12px;
      border-radius: 20px;
    }
    
    .replies-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 35px;
    }
    .reply-item {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid #10b981;
    }
    .reply-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .reply-avatar {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1rem;
    }
    .reply-info { flex: 1; }
    .reply-name {
      font-weight: 600;
      color: #1f2937;
    }
    .reply-date {
      font-size: 0.85rem;
      color: #6b7280;
    }
    .reply-content {
      color: #374151;
      line-height: 1.6;
    }
    
    .no-replies {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      background: #f9fafb;
      border-radius: 12px;
    }
    
    /* Reply Form */
    .reply-form-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 25px;
    }
    .reply-form-card h4 {
      font-size: 1.1rem;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group.full { grid-column: span 2; }
    .form-group label {
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
    }
    .form-group input,
    .form-group textarea {
      padding: 12px 15px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #10b981;
    }
    .form-group textarea {
      min-height: 120px;
      resize: vertical;
    }
    .submit-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(16, 185, 129, 0.4);
    }
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .form-message {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: none;
    }
    .form-message.success { background: #d1fae5; color: #065f46; display: block; }
    .form-message.error { background: #fee2e2; color: #991b1b; display: block; }
    
    .pending-notice {
      background: #fef3c7;
      color: #92400e;
      padding: 15px 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    
    @media (max-width: 1024px) {
      .forum-layout {
        grid-template-columns: 1fr;
      }
      .sidebar { display: none; }
    }
    
    @media (max-width: 768px) {
      .forum-hero h1 { font-size: 1.5rem; }
      .question-body { padding: 25px; }
      .form-row { grid-template-columns: 1fr; }
      .form-group.full { grid-column: span 1; }
    }
  </style>
</head>
<body>
  <div class="forum-hero">
    <div class="forum-hero-inner">
      <a href="/forum/" class="back-link">← Back to Forum</a>
      <h1>${safeTitle}</h1>
      <div class="forum-meta">
        <span>👤 ${(question.name || 'Anonymous').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
        ${date ? `<span>📅 ${date}</span>` : ''}
        <span>💬 ${replies.length} ${replies.length === 1 ? 'Reply' : 'Replies'}</span>
      </div>
    </div>
  </div>
  
  <div class="forum-layout">
    <!-- Left Sidebar - Products -->
    <div class="sidebar">
      <div class="sidebar-section">
        <h4>📦 Products</h4>
        ${productsHTML || '<p style="color:#9ca3af;font-size:0.9rem;">No products</p>'}
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
      <div class="question-card">
        <div class="question-body">
          <div class="question-author">
            <div class="author-avatar">${(question.name || 'A').charAt(0).toUpperCase()}</div>
            <div class="author-info">
              <div class="author-name">${(question.name || 'Anonymous').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              <div class="author-date">${date}</div>
            </div>
          </div>
          
          <div class="question-content">${safeContent}</div>
          
          <!-- Replies Section -->
          <div class="replies-section">
            <h3>💬 Replies <span class="reply-count-badge">${replies.length}</span></h3>
            
            ${replies.length > 0 ? `
              <div class="replies-list">${repliesHTML}</div>
            ` : `
              <div class="no-replies">
                <p>No replies yet. Be the first to help!</p>
              </div>
            `}
            
            <!-- Reply Form -->
            <div class="reply-form-card">
              <h4>Post a Reply</h4>
              <div id="form-message" class="form-message"></div>
              <div id="pending-notice" class="pending-notice" style="display:none;">
                ⏳ You have a pending question or reply awaiting approval. Please wait for it to be approved.
              </div>
              <form id="reply-form">
                <input type="hidden" id="question-id" value="${question.id}">
                <div class="form-row">
                  <div class="form-group">
                    <label for="reply-name">Name *</label>
                    <input type="text" id="reply-name" placeholder="Your name" required>
                  </div>
                  <div class="form-group">
                    <label for="reply-email">Email *</label>
                    <input type="email" id="reply-email" placeholder="your@email.com" required>
                  </div>
                </div>
                <div class="form-group full">
                  <label for="reply-content">Your Reply *</label>
                  <textarea id="reply-content" placeholder="Write your helpful reply..." required></textarea>
                </div>
                <button type="submit" class="submit-btn" id="submit-btn">Submit Reply</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Right Sidebar - Blogs -->
    <div class="sidebar">
      <div class="sidebar-section">
        <h4>📝 Blog Posts</h4>
        ${blogsHTML || '<p style="color:#9ca3af;font-size:0.9rem;">No posts</p>'}
      </div>
    </div>
  </div>
  
  <script>
    const questionId = ${question.id};
    const form = document.getElementById('reply-form');
    const formMessage = document.getElementById('form-message');
    const pendingNotice = document.getElementById('pending-notice');
    const submitBtn = document.getElementById('submit-btn');
    const emailInput = document.getElementById('reply-email');
    
    // Check for pending when email entered
    let checkTimeout;
    emailInput.addEventListener('blur', async function() {
      const email = this.value.trim();
      if (!email) return;
      
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(async () => {
        try {
          const res = await fetch('/api/forum/check-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
          });
          const data = await res.json();
          
          if (data.hasPending) {
            pendingNotice.style.display = 'block';
            submitBtn.disabled = true;
          } else {
            pendingNotice.style.display = 'none';
            submitBtn.disabled = false;
          }
        } catch (err) {
          console.error('Check pending error:', err);
        }
      }, 500);
    });
    
    // Submit reply
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const name = document.getElementById('reply-name').value.trim();
      const email = document.getElementById('reply-email').value.trim();
      const content = document.getElementById('reply-content').value.trim();
      
      if (!name || !email || !content) {
        showMessage('Please fill in all fields.', 'error');
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      try {
        const res = await fetch('/api/forum/submit-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_id: questionId,
            name: name,
            email: email,
            content: content
          })
        });
        const data = await res.json();
        
        if (data.success) {
          showMessage(data.message || 'Reply submitted! It will appear after admin approval.', 'success');
          form.reset();
          pendingNotice.style.display = 'block';
          submitBtn.disabled = true;
        } else {
          if (data.hasPending) {
            pendingNotice.style.display = 'block';
            submitBtn.disabled = true;
          }
          showMessage(data.error || 'Failed to submit reply.', 'error');
        }
      } catch (err) {
        console.error('Submit error:', err);
        showMessage('An error occurred. Please try again.', 'error');
      }
      
      submitBtn.textContent = 'Submit Reply';
    });
    
    function showMessage(msg, type) {
      formMessage.textContent = msg;
      formMessage.className = 'form-message ' + type;
      formMessage.style.display = 'block';
      
      if (type === 'success') {
        setTimeout(() => { formMessage.style.display = 'none'; }, 5000);
      }
    }
  </script>
</body>
</html>`;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    // Normalize the request path
    let path = url.pathname.replace(/\/+/g, '/');
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    const method = req.method;

// =========================
// ADMIN AUTH (ENV/SECRETS)
// =========================
// Set in Cloudflare Worker:
//   ADMIN_EMAIL (variable)
//   ADMIN_PASSWORD (secret)
//   ADMIN_SESSION_SECRET (secret)
const ADMIN_COOKIE = 'admin_session';
const ADMIN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const isAdminUI = (path === '/admin' || path === '/admin/' || path.startsWith('/admin/'));
const isAdminAPI = path.startsWith('/api/admin/');
const isLoginRoute = (path === '/admin/login');
const isLogoutRoute = (path === '/admin/logout');

function base64url(bytes) {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return base64url(new Uint8Array(sig));
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const [k, ...rest] = p.trim().split('=');
    if (k === name) return rest.join('=') || '';
  }
  return null;
}

async function isAdminAuthed() {
  const cookieHeader = req.headers.get('Cookie') || '';
  const value = getCookieValue(cookieHeader, ADMIN_COOKIE);
  if (!value) return false;

  const [tsStr, sig] = value.split('.');
  if (!tsStr || !sig) return false;

  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;

  const ageSec = Math.floor((Date.now() - ts) / 1000);
  if (ageSec < 0 || ageSec > ADMIN_MAX_AGE_SECONDS) return false;

  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const expected = await hmacSha256(secret, tsStr);
  return expected === sig;
}

async function requireAdmin() {
  const ok = await isAdminAuthed();
  if (ok) return null;

  if (isAdminAPI) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return Response.redirect('/admin/login', 302);
}

// Serve login page (GET)
if (isLoginRoute && method === 'GET') {
  if (env.ASSETS) {
    return env.ASSETS.fetch(new Request(new URL('/admin/login.html', req.url)));
  }
  return new Response('Login page not found', { status: 404 });
}

// Handle login (POST)
if (isLoginRoute && method === 'POST') {
  const form = await req.formData();
  const email = (form.get('email') || '').toString().trim();
  const password = (form.get('password') || '').toString();

  if (email === (env.ADMIN_EMAIL || '') && password === (env.ADMIN_PASSWORD || '')) {
    const tsStr = String(Date.now());
    const sig = await hmacSha256(env.ADMIN_SESSION_SECRET || 'missing', tsStr);
    const cookieVal = `${tsStr}.${sig}`;

    return new Response(null, {
      status: 302,
      headers: {
        'Set-Cookie': `${ADMIN_COOKIE}=${cookieVal}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ADMIN_MAX_AGE_SECONDS}`,
        'Location': '/admin'
      }
    });
  }

  return new Response('Invalid login', { status: 401 });
}

// Handle logout
if (isLogoutRoute) {
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
      'Location': '/admin/login'
    }
  });
}

// Protect admin UI + APIs
if ((isAdminUI || isAdminAPI) && !isLoginRoute) {
  const gate = await requireAdmin();
  if (gate) return gate;
}



    // Auto-purge cache on version change (only for admin/webhook routes)
    const shouldPurgeCache = path.startsWith('/admin') || path.startsWith('/api/admin/') || path.startsWith('/api/whop/webhook');
    if (shouldPurgeCache) {
      await maybePurgeCache(env, initDB);
    }

    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      return handleOptions(req);
    }

    try {
      // Private asset: never serve the raw product template directly
      if ((method === 'GET' || method === 'HEAD') && (path === '/_product_template.tpl' || path === '/_product_template' || path === '/_product_template.html')) {
        return new Response('Not found', { status: 404 });
      }

      // ----- CANONICAL PRODUCT URLs -----
      if ((method === 'GET' || method === 'HEAD') && (path === '/product' || path.startsWith('/product/'))) {
        if (env.DB) {
          await initDB(env);
          const redirect = await handleProductRouting(env, url, path);
          if (redirect) return redirect;
        }
      }

      // ----- BLOG POST PAGES -----
      if ((method === 'GET' || method === 'HEAD') && path.startsWith('/blog/') && path !== '/blog/' && !path.includes('.')) {
        const slug = path.replace('/blog/', '').replace(/\/$/, '');
        if (slug && env.DB) {
          try {
            await initDB(env);
            const blog = await env.DB.prepare(`
              SELECT * FROM blogs WHERE slug = ? AND status = 'published'
            `).bind(slug).first();
            
            if (blog) {
              // Get previous 2 blog posts (before current one)
              const prevResult = await env.DB.prepare(`
                SELECT id, title, slug, description, thumbnail_url, created_at
                FROM blogs 
                WHERE status = 'published' AND id < ?
                ORDER BY id DESC
                LIMIT 2
              `).bind(blog.id).all();
              
              // Get approved comments
              const commentsResult = await env.DB.prepare(`
                SELECT id, name, comment, created_at
                FROM blog_comments 
                WHERE blog_id = ? AND status = 'approved'
                ORDER BY created_at DESC
              `).bind(blog.id).all();
              
              const previousBlogs = prevResult.results || [];
              const comments = commentsResult.results || [];
              const html = generateBlogPostHTML(blog, previousBlogs, comments);
              
              return new Response(html, {
                status: 200,
                headers: {
                  'Content-Type': 'text/html; charset=utf-8',
                  'X-Worker-Version': VERSION
                }
              });
            }
          } catch (e) {
            console.error('Blog fetch error:', e);
          }
        }
      }

      // ----- FORUM QUESTION PAGES -----
      if ((method === 'GET' || method === 'HEAD') && path.startsWith('/forum/') && path !== '/forum/' && !path.includes('.')) {
        const slug = path.replace('/forum/', '').replace(/\/$/, '');
        if (slug && env.DB) {
          try {
            await initDB(env);
            const question = await env.DB.prepare(`
              SELECT * FROM forum_questions WHERE slug = ? AND status = 'approved'
            `).bind(slug).first();
            
            if (question) {
              // Get approved replies
              const repliesResult = await env.DB.prepare(`
                SELECT id, name, content, created_at
                FROM forum_replies 
                WHERE question_id = ? AND status = 'approved'
                ORDER BY created_at ASC
              `).bind(question.id).all();
              
              // Get sidebar content - products and blogs based on question id for internal linking
              // Older questions show older products/blogs
              const productsResult = await env.DB.prepare(`
                SELECT id, title, slug, thumbnail_url, sale_price, normal_price
                FROM products 
                WHERE status = 'active'
                ORDER BY id DESC
                LIMIT 2 OFFSET ?
              `).bind(Math.max(0, question.id - 1)).all();
              
              const blogsResult = await env.DB.prepare(`
                SELECT id, title, slug, thumbnail_url, description
                FROM blogs 
                WHERE status = 'published'
                ORDER BY id DESC
                LIMIT 2 OFFSET ?
              `).bind(Math.max(0, question.id - 1)).all();
              
              const replies = repliesResult.results || [];
              const sidebar = {
                products: productsResult.results || [],
                blogs: blogsResult.results || []
              };
              
              const html = generateForumQuestionHTML(question, replies, sidebar);
              
              return new Response(html, {
                status: 200,
                headers: {
                  'Content-Type': 'text/html; charset=utf-8',
                  'X-Worker-Version': VERSION
                }
              });
            }
          } catch (e) {
            console.error('Forum question fetch error:', e);
          }
        }
      }

      // ----- API ROUTES -----
      if (path.startsWith('/api/') || path === '/submit-order') {
        const apiResponse = await routeApiRequest(req, env, url, path, method);
        if (apiResponse) return apiResponse;
      }

      // ----- SECURE DOWNLOAD -----
      if (path.startsWith('/download/')) {
        const orderId = path.split('/').pop();
        return handleSecureDownload(env, orderId, url.origin);
      }

      // ----- ADMIN SPA ROUTING -----
      // Handle both /admin and /admin/ and all admin sub-routes
      if ((path === '/admin' || path.startsWith('/admin/')) && !path.startsWith('/api/')) {
        // These standalone pages should be served directly from assets
        const standaloneAdminPages = [
          '/admin/product-form.html',
          '/admin/blog-form.html',
          '/admin/page-builder.html',
          '/admin/landing-builder.html',
          '/admin/migrate-reviews.html'
        ];
        
        if (standaloneAdminPages.includes(path)) {
          // Serve these pages directly from assets
          if (env.ASSETS) {
            const assetResp = await env.ASSETS.fetch(new Request(new URL(path, req.url)));
            const headers = new Headers(assetResp.headers);
            headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            headers.set('Pragma', 'no-cache');
            headers.set('X-Worker-Version', VERSION);
            return new Response(assetResp.body, { status: assetResp.status, headers });
          }
        } else {
          // Serve the main dashboard.html for all other admin routes
          // This includes: /admin, /admin/, /admin/dashboard.html, /admin/orders.html, etc.
          if (env.ASSETS) {
            const assetResp = await env.ASSETS.fetch(new Request(new URL('/admin/dashboard.html', req.url)));
            const headers = new Headers(assetResp.headers);
            headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            headers.set('Pragma', 'no-cache');
            headers.set('X-Worker-Version', VERSION);
            return new Response(assetResp.body, { status: assetResp.status, headers });
          }
        }
      }

      // ----- DYNAMIC PAGES -----
      // Skip core static pages that should always use the file system
      const coreStaticPages = ['index', 'products-grid', 'product', 'buyer-order', 'order-detail', 'order-success', 'success', 'page-builder'];
      if (path.endsWith('.html') && !path.includes('/admin/') && !path.startsWith('/admin')) {
        const slug = path.slice(1).replace(/\.html$/, '');
        // Only check database for non-core pages
        if (!coreStaticPages.includes(slug)) {
          try {
            if (env.DB) {
              await initDB(env);
              const row = await env.DB.prepare('SELECT content FROM pages WHERE slug = ? AND status = ?').bind(slug, 'published').first();
              if (row && row.content) {
                return new Response(row.content, {
                  headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
              }
            }
          } catch (e) {
            // continue to static assets
          }
        }
      }

      // ----- DEFAULT PAGE ROUTING -----
      // Check for default pages and serve them instead of static files
      if ((method === 'GET' || method === 'HEAD') && env.DB) {
        let defaultPageType = null;
        
        // Home page
        if (path === '/' || path === '/index.html') {
          defaultPageType = 'home';
        }
        // Blog archive
        else if (path === '/blog/' || path === '/blog/index.html' || path === '/blog') {
          defaultPageType = 'blog_archive';
        }
        // Forum archive
        else if (path === '/forum/' || path === '/forum/index.html' || path === '/forum') {
          defaultPageType = 'forum_archive';
        }
        // Product grid
        else if (path === '/products/' || path === '/products/index.html' || path === '/products' || path === '/products-grid.html') {
          defaultPageType = 'product_grid';
        }
        
        if (defaultPageType) {
          try {
            await initDB(env);
            const defaultPage = await env.DB.prepare(
              'SELECT content FROM pages WHERE page_type = ? AND is_default = 1 AND status = ?'
            ).bind(defaultPageType, 'published').first();
            
            if (defaultPage && defaultPage.content) {
              return new Response(defaultPage.content, {
                status: 200,
                headers: {
                  'Content-Type': 'text/html; charset=utf-8',
                  'X-Worker-Version': VERSION,
                  'X-Default-Page': defaultPageType
                }
              });
            }
          } catch (e) {
            console.error('Default page error:', e);
            // Continue to static assets
          }
        }
      }

      // ----- STATIC ASSETS WITH SERVER-SIDE SCHEMA INJECTION & CACHING -----
      if (env.ASSETS) {
        let assetReq = req;
        let assetPath = path;
        let schemaProductId = null;

        // Canonical product URLs: /product-<id>/<slug>
        if ((method === 'GET' || method === 'HEAD')) {
          const canonicalMatch = assetPath.match(/^\/product-(\d+)\/(.+)$/);
          if (canonicalMatch) {
            const pid = Number(canonicalMatch[1]);
            if (!Number.isNaN(pid)) {
              schemaProductId = pid;
              const rewritten = new URL(req.url);
              rewritten.pathname = '/_product_template.tpl';
              rewritten.searchParams.set('id', String(schemaProductId));
              assetReq = new Request(rewritten.toString(), req);
              assetPath = '/_product_template.tpl';
            }
          }
        }

        const assetResp = await env.ASSETS.fetch(assetReq);
        
        const contentType = assetResp.headers.get('content-type') || '';
        const isHTML = contentType.includes('text/html') || assetPath === '/_product_template.tpl';
        const isSuccess = assetResp.status === 200;
        
        // Caching: Only cache HTML pages, never admin routes
        const shouldCache = isHTML && isSuccess && !path.startsWith('/admin') && !path.includes('/admin/');
        const cacheKey = new Request(req.url, { 
          method: 'GET',
          headers: { 'Accept': 'text/html' }
        });

        if (shouldCache) {
          try {
            // Check cache first
            const cachedResponse = await caches.default.match(cacheKey);
            if (cachedResponse) {
              console.log('Cache HIT for:', req.url);
              const headers = new Headers(cachedResponse.headers);
              headers.set('X-Cache', 'HIT');
              headers.set('X-Worker-Version', VERSION);
              return new Response(cachedResponse.body, { 
                status: cachedResponse.status, 
                headers 
              });
            }
            console.log('Cache MISS for:', req.url);
          } catch (cacheError) {
            console.warn('Cache check failed:', cacheError);
            // Continue with normal processing if cache fails
          }
        }
        
        if (isHTML && isSuccess) {
          try {
            const baseUrl = url.origin;
            let html = await assetResp.text();
            
            // Product detail page - inject individual product schema
            if (assetPath === '/_product_template.tpl' || assetPath === '/product.html' || assetPath === '/product') {
              const productId = schemaProductId ? String(schemaProductId) : url.searchParams.get('id');
              if (productId && env.DB) {
                await initDB(env);
                const product = await env.DB.prepare(`
                  SELECT p.*, 
                    COUNT(r.id) as review_count, 
                    AVG(r.rating) as rating_average
                  FROM products p
                  LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
                  WHERE p.id = ?
                  GROUP BY p.id
                `).bind(Number(productId)).first();
                
                if (product) {
                  // Fetch reviews for schema
                  const reviewsResult = await env.DB.prepare(
                    'SELECT * FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC LIMIT 5'
                  ).bind(Number(productId), 'approved').all();
                  
                  const reviews = reviewsResult.results || [];
                  const schemaJson = generateProductSchema(product, baseUrl, reviews);
                  html = injectSchemaIntoHTML(html, 'product-schema', schemaJson);
                  
                  // LCP Optimization: Preload hero image for faster rendering
                  if (product.thumbnail_url) {
                    let lcpImageUrl = product.thumbnail_url;
                    // Optimize Cloudinary URLs
                    if (lcpImageUrl.includes('res.cloudinary.com')) {
                      lcpImageUrl = lcpImageUrl.replace(
                        /(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/,
                        '$1f_auto,q_auto,w_800/$2'
                      );
                    }
                    const preloadTag = `<link rel="preload" as="image" href="${lcpImageUrl}" fetchpriority="high">`;
                    html = html.replace('</head>', `${preloadTag}\n</head>`);
                  }
                  
                  // Inject SEO meta tags
                  const safeTitle = (product.title || '').replace(/"/g, '&quot;');
                  const safeDesc = (product.description || '').substring(0, 160).replace(/"/g, '&quot;').replace(/\n/g, ' ');
                  html = html.replace('<title>Loading Product... | WishVideo</title>', `<title>${safeTitle} | WishVideo</title>`);
                  html = html.replace('<meta property="og:title" content="Loading...">', `<meta property="og:title" content="${safeTitle}">`);
                  html = html.replace('<meta property="og:description" content="">', `<meta property="og:description" content="${safeDesc}">`);
                  html = html.replace('<meta property="og:image" content="">', `<meta property="og:image" content="${product.thumbnail_url || ''}">`);
                  html = html.replace('<meta name="description" content="Custom personalized video greetings from Africa.">', `<meta name="description" content="${safeDesc}">`);
                }
              }
            }
            
            // Collection page - inject product list schema
            if (assetPath === '/index.html' || assetPath === '/' || assetPath === '/products.html' || assetPath === '/products-grid.html') {
              if (env.DB) {
                await initDB(env);
                const productsResult = await env.DB.prepare(`
                  SELECT p.*, 
                    COUNT(r.id) as review_count, 
                    AVG(r.rating) as rating_average
                  FROM products p
                  LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
                  WHERE p.status = 'active'
                  GROUP BY p.id
                  ORDER BY p.sort_order ASC, p.id DESC
                `).all();
                
                const products = productsResult.results || [];
                if (products.length > 0) {
                  const schemaJson = generateCollectionSchema(products, baseUrl);
                  html = injectSchemaIntoHTML(html, 'collection-schema', schemaJson);
                }
              }
            }
            
            const headers = new Headers();
            headers.set('Content-Type', 'text/html; charset=utf-8');
            headers.set('X-Worker-Version', VERSION);
            headers.set('X-Cache', 'MISS');
            
            const response = new Response(html, { status: 200, headers });
            
            // Cache the response for non-admin pages (5 minutes TTL)
            if (shouldCache) {
              try {
                const cacheResponse = new Response(html, {
                  status: 200,
                  headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, max-age=300', // 5 minutes
                    'X-Worker-Version': VERSION,
                    'X-Cache-Created': new Date().toISOString()
                  }
                });
                
                // Store in cache asynchronously
                ctx.waitUntil(caches.default.put(cacheKey, cacheResponse));
                console.log('Cached response for:', req.url);
              } catch (cacheError) {
                console.warn('Cache storage failed:', cacheError);
                // Continue even if caching fails
              }
            }
            
            return response;
          } catch (e) {
            console.error('Schema injection error:', e);
          }
        }
        
        // For non-HTML or failed schema injection, just pass through with version header
        const headers = new Headers(assetResp.headers);
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        headers.set('Pragma', 'no-cache');
        headers.set('X-Worker-Version', VERSION);
        
        return new Response(assetResp.body, { status: assetResp.status, headers });
      }

      return new Response('Not found', { status: 404 });
    } catch (e) {
      console.error('Worker error:', e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }
  },

  // Scheduled handler for cron jobs
  async scheduled(event, env, ctx) {
    console.log('Cron job started:', event.cron);
    
    try {
      if (env.DB) {
        await initDB(env);
        // Cleanup expired Whop checkout sessions
        const result = await cleanupExpired(env);
        const data = await result.json();
        console.log('Cleanup result:', data);
      }
    } catch (e) {
      console.error('Cron job error:', e);
    }
  }
};
