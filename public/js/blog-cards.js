/**
 * Blog Cards System
 * Beautiful blog cards for archive page with pagination
 */

(function() {
  window.BlogCards = {
    // Render blog cards with pagination
    render: async function(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('Container not found:', containerId);
        return;
      }

      const {
        limit = 30,
        columns = 3,
        showPagination = true
      } = options;

      // Get current page from URL
      const urlParams = new URLSearchParams(window.location.search);
      const page = parseInt(urlParams.get('page') || '1');

      container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="blog-loader"></div></div>';

      try {
        const res = await fetch(`/api/blogs/published?page=${page}&limit=${limit}`);
        const data = await res.json();
        const blogs = data.blogs || [];
        const pagination = data.pagination || {};

        if (!blogs || blogs.length === 0) {
          container.innerHTML = '<p style="text-align:center;padding:60px 20px;color:#6b7280;font-size:1.1rem;">No blog posts found.</p>';
          return;
        }

        // Render grid
        let html = `
          <div class="blog-cards-grid" style="
            display: grid;
            grid-template-columns: repeat(${columns}, 1fr);
            gap: 30px;
            max-width: 1200px;
            margin: 0 auto;
          ">
            ${blogs.map(b => this.renderCard(b)).join('')}
          </div>
        `;

        // Add pagination
        if (showPagination && pagination.totalPages > 1) {
          html += this.renderPagination(pagination);
        }

        container.innerHTML = html;
        this.addStyles();

      } catch (err) {
        console.error('Failed to load blogs:', err);
        container.innerHTML = '<p style="color:red;text-align:center;padding:40px;">Failed to load blog posts</p>';
      }
    },

    // Render single card
    renderCard: function(blog) {
      const {
        id,
        title,
        slug,
        description,
        thumbnail_url,
        created_at
      } = blog;

      const blogUrl = `/blog/${slug || id}`;
      const date = created_at ? this.formatDate(created_at) : '';
      const shortDesc = description ? (description.length > 120 ? description.substring(0, 120) + '...' : description) : '';

      return `
        <div class="blog-card" onclick="window.location.href='${blogUrl}'">
          <div class="blog-thumbnail">
            <img src="${thumbnail_url || 'https://via.placeholder.com/400x225?text=No+Image'}" alt="${title}" loading="lazy">
          </div>
          <div class="blog-content">
            <h3 class="blog-title">${title}</h3>
            ${date ? `<div class="blog-date">📅 ${date}</div>` : ''}
            <p class="blog-description">${shortDesc}</p>
            <a href="${blogUrl}" class="blog-read-more" onclick="event.stopPropagation();">
              Read More →
            </a>
          </div>
        </div>
      `;
    },

    // Render pagination
    renderPagination: function(pagination) {
      const { page, totalPages, hasNext, hasPrev } = pagination;
      
      let pagesHtml = '';
      
      // Calculate page range
      let startPage = Math.max(1, page - 2);
      let endPage = Math.min(totalPages, page + 2);
      
      // Always show first page
      if (startPage > 1) {
        pagesHtml += `<a href="?page=1" class="page-link">1</a>`;
        if (startPage > 2) {
          pagesHtml += `<span class="page-dots">...</span>`;
        }
      }
      
      // Page numbers
      for (let i = startPage; i <= endPage; i++) {
        if (i === page) {
          pagesHtml += `<span class="page-link active">${i}</span>`;
        } else {
          pagesHtml += `<a href="?page=${i}" class="page-link">${i}</a>`;
        }
      }
      
      // Always show last page
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pagesHtml += `<span class="page-dots">...</span>`;
        }
        pagesHtml += `<a href="?page=${totalPages}" class="page-link">${totalPages}</a>`;
      }

      return `
        <div class="blog-pagination">
          ${hasPrev ? `<a href="?page=${page - 1}" class="page-link page-prev">← Previous</a>` : ''}
          <div class="page-numbers">${pagesHtml}</div>
          ${hasNext ? `<a href="?page=${page + 1}" class="page-link page-next">Next →</a>` : ''}
        </div>
      `;
    },

    // Format date
    formatDate: function(timestamp) {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    },

    // Add CSS styles
    addStyles: function() {
      if (document.getElementById('blog-cards-styles')) return;

      const style = document.createElement('style');
      style.id = 'blog-cards-styles';
      style.textContent = `
        .blog-loader {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .blog-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          contain: layout style paint;
        }

        .blog-card:hover {
          box-shadow: 0 12px 24px rgba(0,0,0,0.15);
        }

        .blog-thumbnail {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          overflow: hidden;
          background: #f3f4f6;
        }

        .blog-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .blog-card:hover .blog-thumbnail img {
        }

        .blog-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }

        .blog-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .blog-date {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .blog-description {
          font-size: 0.95rem;
          color: #4b5563;
          line-height: 1.5;
          margin: 0;
          flex: 1;
        }

        .blog-read-more {
          display: block;
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          transition: box-shadow 0.15s ease;
          margin-top: auto;
        }

        .blog-read-more:hover {
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
        }

        /* Pagination */
        .blog-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          margin-top: 50px;
          padding: 20px 0;
        }

        .page-numbers {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .page-link {
          padding: 10px 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          color: #374151;
          text-decoration: none;
          font-weight: 600;
          transition: border-color 0.15s ease, color 0.15s ease;
        }

        .page-link:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .page-link.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
          color: white;
        }

        .page-dots {
          color: #9ca3af;
          padding: 0 5px;
        }

        .page-prev, .page-next {
          background: #f9fafb;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .blog-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
          }
          
          .blog-pagination {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 480px) {
          .blog-cards-grid {
            grid-template-columns: 1fr !important;
          }
          
          .page-numbers {
            order: 3;
            width: 100%;
            justify-content: center;
            margin-top: 10px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  };

  console.log('✅ Blog Cards System Ready');
})();
