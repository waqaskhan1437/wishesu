/**
 * Admin Dashboard Application
 * Main entry point - Modular Architecture
 */

import stateManager from '../../../core/scripts/state-manager.js';
import { sessionStorage } from '../../../core/scripts/storage.js';
import { ready } from '../../../core/utils/dom-helper.js';

// Import views
import DashboardView from './views/dashboard-view.js';
import OrdersView from './views/orders-view.js';
import ProductsView from './views/products-view.js';
import ReviewsView from './views/reviews-view.js';
import SettingsView from './views/settings-view.js';
import ChatsView from './views/chats-view.js';
import BlogView from './views/blog-view.js';
import ForumView from './views/forum-view.js';
import UsersView from './views/users-view.js';
import PagesView from './views/pages-view.js';
import ComponentsView from './views/components-view.js';

class AdminApp {
  constructor() {
    this.currentView = 'dashboard';
    this.views = new Map();
    this.mainPanel = null;

    this.ALLOWED_VIEWS = new Set([
      'dashboard', 'orders', 'products', 'reviews', 'chats',
      'blog', 'forum', 'users', 'settings', 'pages', 'components'
    ]);

    this.VIEW_KEY = 'admin.activeView';
  }

  async init() {
    try {
      this.mainPanel = document.getElementById('main-panel');
      if (!this.mainPanel) {
        console.error('Main panel not found');
        return;
      }

      this.pageTitleElement = document.getElementById('page-title');
      this._initializeViews();
      this._setupMenu();
      this._setupRouting();

      const initialView = this._getInitialView();
      await this.loadView(initialView);

    } catch (error) {
      console.error('Admin app initialization error:', error);
    }
  }

  _initializeViews() {
    console.log("Initializing views...");
    this.views.set('dashboard', new DashboardView(this.mainPanel));
    this.views.set('orders', new OrdersView(this.mainPanel));
    this.views.set('products', new ProductsView(this.mainPanel));
    this.views.set('reviews', new ReviewsView(this.mainPanel));
    this.views.set('settings', new SettingsView(this.mainPanel));
    this.views.set('chats', new ChatsView(this.mainPanel));
    this.views.set('blog', new BlogView(this.mainPanel));
    this.views.set('forum', new ForumView(this.mainPanel));
    this.views.set('users', new UsersView(this.mainPanel));
    this.views.set('pages', new PagesView(this.mainPanel));
    this.views.set('components', new ComponentsView(this.mainPanel));
    console.log('All views registered:', Array.from(this.views.keys()));
  }

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

  _setupRouting() {
    window.addEventListener('hashchange', () => {
      const view = this._getViewFromHash();
      if (view && view !== this.currentView) {
        this.loadView(view);
      }
    });

    window.addEventListener('popstate', () => {
      const view = this._getInitialView();
      if (view !== this.currentView) {
        this.loadView(view);
      }
    });
  }

  _getInitialView() {
    const hashView = this._getViewFromHash();
    if (hashView && this.ALLOWED_VIEWS.has(hashView)) {
      return hashView;
    }

    const storedView = sessionStorage.get(this.VIEW_KEY);
    if (storedView && this.ALLOWED_VIEWS.has(storedView)) {
      return storedView;
    }

    return 'dashboard';
  }

  _getViewFromHash() {
    const hash = window.location.hash.replace('#', '').trim();
    return hash || null;
  }

  async loadView(viewName) {
    if (!this.ALLOWED_VIEWS.has(viewName)) {
      viewName = 'dashboard';
    }

    this.currentView = viewName;
    stateManager.set('currentView', viewName);
    this._persistView(viewName);
    this._setActiveMenu(viewName);
    this._updatePageTitle(viewName);

    const view = this.views.get(viewName);

    if (view) {
      try {
        this.mainPanel.innerHTML = '<div class="loading">Loading...</div>';
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
      this.mainPanel.innerHTML = `
        <div class="info-message">
          <h3>${viewName.charAt(0).toUpperCase() + viewName.slice(1)}</h3>
          <p>This view is coming soon...</p>
        </div>
      `;
    }
  }

  _persistView(viewName) {
    sessionStorage.set(this.VIEW_KEY, viewName);
    try {
      window.history.replaceState({ view: viewName }, '', `#${viewName}`);
    } catch (_) {}
  }

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

  _updatePageTitle(viewName) {
    if (this.pageTitleElement) {
      const title = viewName.charAt(0).toUpperCase() + viewName.slice(1);
      this.pageTitleElement.textContent = title;
    }
  }

  navigateTo(viewName) {
    this.loadView(viewName);
  }
}

export default AdminApp;
