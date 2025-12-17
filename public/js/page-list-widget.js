/**
 * Page List Widget
 *
 * This widget fetches the list of all pages saved via the page builder
 * and renders them as a simple list of links.  It allows optional
 * configuration (e.g. number of columns for a grid layout) but
 * defaults to a single column list.  The widget will also inject its
 * own styles exactly once to avoid duplicating CSS on the page.
 */

(function() {
  window.PageListWidget = {
    /**
     * Render a list of pages into the container with the given ID.  The
     * options parameter can include a `columns` property to control
     * layout, though the current implementation uses a simple list.  If
     * no pages are available, a placeholder message is shown.
     *
     * @param {string} containerId The ID of the container element
     * @param {object} options Optional render options
     */
    render: async function(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('PageListWidget: Container not found:', containerId);
        return;
      }
      // Fetch the list of pages from the backend.  The /api/pages/list
      // endpoint returns an object like { success: true, pages: [ { slug, title, url, uploaded, size }, … ] }.
      let pages = [];
      try {
        const res = await fetch('/api/pages/list');
        const data = await res.json();
        pages = (data.pages || []).filter(p => p && p.slug);
      } catch (err) {
        console.error('PageListWidget: Failed to load pages:', err);
        container.innerHTML = '<p style="color: red;">Failed to load pages.</p>';
        return;
      }
      if (!pages.length) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">\n  <p>No pages found.</p>\n</div>';
        return;
      }
      // Build the HTML list.  Use the title if available, otherwise the slug.
      container.innerHTML = `\n        <ul class="page-list-widget" style="list-style: none; padding: 0; margin: 0;">\n          ${pages.map(p => `<li style=\"padding: 6px 0;\"><a href=\"${p.url}\" style=\"color: #3b82f6; text-decoration: none;\" target=\"_blank\">${(p.title || p.slug)}</a></li>`).join('')}\n        </ul>\n      `;
      // Inject styles once
      this.addStyles();
    },

    /**
     * Add CSS styles required for the page list.  This method ensures
     * styles are injected only once per page by checking for a style
     * element with a specific ID.  Additional classes or custom
     * styles can be added here in the future.
     */
    addStyles: function() {
      if (document.getElementById('page-list-widget-styles')) return;
      const style = document.createElement('style');
      style.id = 'page-list-widget-styles';
      style.textContent = `
        .page-list-widget li a:hover {
          text-decoration: underline;
        }
      `;
      document.head.appendChild(style);
    }
  };
})();