/**
 * Admin Dashboard Application
 * Main entry point - replaces monolithic dashboard.js
 * Handles routing, menu, and view loading
 */

import stateManager from '../core/state-manager.js';
import { sessionStorage } from '../core/storage.js';
import { ready } from '../utils/dom-helper.js';

// Import views
import DashboardView from './dashboard-view.js';
import OrdersView from './orders-view.js';
import ProductsView from './products-view.js';
import ReviewsView from './reviews-view.js';
import SettingsView from './settings-view.js';

class AdminApp {
  constructor() {
    this.currentView = 'dashboard';
    this.views = new Map();
    this.mainPanel = null;

    // Allowed views
    this.ALLOWED_VIEWS = new Set([
      'dashboard',
      'orders',
      'products',
      'reviews',
      'chats',
      'blog',
      'forum',
      'users',
      'settings',
      'pages',
      'components'
    ]);

    // View key for session storage
    this.VIEW_KEY = 'admin.activeView';
  }

  /**
   * Initialize application
   */
  async init() {
    try {
      // Get main panel
      this.mainPanel = document.getElementById('main-panel');
      if (!this.mainPanel) {
        console.error('Main panel not found');
        return;
      }

      // Get page title element
      this.pageTitleElement = document.getElementById('page-title');

      // Initialize views
      this._initializeViews();

      // Setup menu
      this._setupMenu();

      // Setup routing
      this._setupRouting();

      // Load initial view
      const initialView = this._getInitialView();
      await this.loadView(initialView);

    } catch (error) {
      console.error('Admin app initialization error:', error);
    }
  }

  /**
   * Initialize view instances
   */
  _initializeViews() {
    this.views.set('dashboard', new DashboardView(this.mainPanel));
    this.views.set('orders', new OrdersView(this.mainPanel));
    this.views.set('products', new ProductsView(this.mainPanel));
    this.views.set('reviews', new ReviewsView(this.mainPanel));
    this.views.set('settings', new SettingsView(this.mainPanel));

    // TODO: Add remaining views (chats, blog, forum, users, pages, components)
  }

  /**
   * Setup menu navigation
   */
  _setupMenu() {
    const menuItems = document.querySelectorAll('.menu-item');

    if (menuItems.length === 0) {
      console.error('No menu items found');
      return;
    }

    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view) {
          this.loadView(view);
        }
      });
    });
  }

  /**
   * Setup routing (hash changes, browser back/forward)
   */
  _setupRouting() {
    // Handle hash changes
    window.addEventListener('hashchange', () => {
      const view = this._getViewFromHash();
      if (view && view !== this.currentView) {
        this.loadView(view);
      }
    });

    // Handle popstate (browser back/forward)
    window.addEventListener('popstate', () => {
      const view = this._getInitialView();
      if (view !== this.currentView) {
        this.loadView(view);
      }
    });
  }

  /**
   * Get initial view from hash or session storage
   */
  _getInitialView() {
    // Check hash first
    const hashView = this._getViewFromHash();
    if (hashView && this.ALLOWED_VIEWS.has(hashView)) {
      return hashView;
    }

    // Check session storage
    const storedView = sessionStorage.get(this.VIEW_KEY);
    if (storedView && this.ALLOWED_VIEWS.has(storedView)) {
      return storedView;
    }

    return 'dashboard';
  }

  /**
   * Get view name from URL hash
   */
  _getViewFromHash() {
    const hash = window.location.hash.replace('#', '').trim();
    return hash || null;
  }

  /**
   * Load view
   */
  async loadView(viewName) {
    // Validate view
    if (!this.ALLOWED_VIEWS.has(viewName)) {
      viewName = 'dashboard';
    }

    // Update state
    this.currentView = viewName;
    stateManager.set('currentView', viewName);

    // Persist to storage and URL
    this._persistView(viewName);

    // Update menu
    this._setActiveMenu(viewName);

    // Update page title
    this._updatePageTitle(viewName);

    // Get view instance
    const view = this.views.get(viewName);

    if (view) {
      try {
        // Show loading
        this.mainPanel.innerHTML = '<div class="loading">Loading...</div>';

        // Render view
        await view.render();

      } catch (error) {
        console.error(`Error loading view "${viewName}":`, error);
        this.mainPanel.innerHTML = `
          <div class="error-message">
            <h3>Error Loading View</h3>
            <p>${error.message}</p>
          </div>
        `;
      }
    } else {
      // View not implemented yet
      this.mainPanel.innerHTML = `
        <div class="info-message">
          <h3>${viewName.charAt(0).toUpperCase() + viewName.slice(1)}</h3>
          <p>This view is coming soon...</p>
        </div>
      `;
    }
  }

  /**
   * Persist current view
   */
  _persistView(viewName) {
    // Save to session storage
    sessionStorage.set(this.VIEW_KEY, viewName);

    // Update URL hash
    try {
      const newUrl = `${window.location.pathname}${window.location.search}#${viewName}`;
      history.replaceState(null, '', newUrl);
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  }

  /**
   * Set active menu item
   */
  _setActiveMenu(viewName) {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Update page title
   */
  _updatePageTitle(viewName) {
    if (this.pageTitleElement) {
      const title = viewName.charAt(0).toUpperCase() + viewName.slice(1);
      this.pageTitleElement.textContent = title;
    }
  }

  /**
   * Navigate to view programmatically
   */
  navigateTo(viewName) {
    this.loadView(viewName);
  }
}

// Export the class
export default AdminApp;
