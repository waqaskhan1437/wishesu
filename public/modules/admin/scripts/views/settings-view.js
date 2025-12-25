/**
 * Settings View
 * Application settings management
 * Extracted from dashboard.js settings section
 */

import apiClient from '../../../../core/scripts/api-client.js';
import Toast from '../../../../core/components/shared/toast-notification.js';
import LoadingSpinner from '../../../../core/components/shared/loading-spinner.js';
import { createElement } from '../../../../core/utils/dom-helper.js';

export class SettingsView {
  constructor(container) {
    this.container = container;
  }

  /**
   * Render settings view
   */
  async render() {
    // Clear container
    this.container.innerHTML = '';

    // Create settings container
    const settingsContainer = createElement('div', {
      className: 'settings-container'
    });

    // Create tabs
    const tabs = this._createTabs();
    settingsContainer.appendChild(tabs);

    // Create content area
    const contentArea = createElement('div', {
      className: 'settings-content',
      id: 'settings-content'
    });
    settingsContainer.appendChild(contentArea);

    this.container.appendChild(settingsContainer);

    // Load default tab (Whop settings)
    await this.loadWhopSettings();
  }

  /**
   * Create settings tabs
   */
  _createTabs() {
    const tabsContainer = createElement('div', {
      className: 'settings-tabs'
    });

    const tabs = [
      { id: 'whop', label: 'Whop Integration' },
      { id: 'analytics', label: 'Analytics' },
      { id: 'webhooks', label: 'Control Webhooks' },
      { id: 'pages', label: 'Default Pages' }
    ];

    tabs.forEach(tab => {
      const button = createElement('button', {
        className: `tab-button ${tab.id === 'whop' ? 'active' : ''}`,
        textContent: tab.label,
        dataset: { tab: tab.id }
      });

      button.addEventListener('click', () => {
        this._switchTab(tab.id);
      });

      tabsContainer.appendChild(button);
    });

    return tabsContainer;
  }

  /**
   * Switch between tabs
   */
  async _switchTab(tabId) {
    // Update active tab button
    const buttons = this.container.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Load tab content
    switch (tabId) {
      case 'whop':
        await this.loadWhopSettings();
        break;
      case 'analytics':
        await this.loadAnalyticsSettings();
        break;
      case 'webhooks':
        await this.loadWebhookSettings();
        break;
      case 'pages':
        await this.loadDefaultPages();
        break;
    }
  }

  /**
   * Load Whop settings
   */
  async loadWhopSettings() {
    const content = document.getElementById('settings-content');
    if (!content) return;

    content.innerHTML = '<div class="loading">Loading settings...</div>';

    try {
      const response = await apiClient.get('/api/admin/whop-settings');
      const settings = response.settings || {};

      content.innerHTML = '';

      const form = this._createWhopForm(settings);
      content.appendChild(form);

    } catch (error) {
      console.error('Error loading Whop settings:', error);
      content.innerHTML = '<div class="error">Failed to load settings</div>';
    }
  }

  /**
   * Create Whop settings form
   */
  _createWhopForm(settings) {
    const form = createElement('form', {
      className: 'settings-form',
      id: 'whop-settings-form'
    });

    // API Key field
    const apiKeyGroup = this._createFormGroup('apiKey', 'Whop API Key', 'text', settings.apiKey || '');
    form.appendChild(apiKeyGroup);

    // Plan ID field
    const planIdGroup = this._createFormGroup('planId', 'Plan ID (optional)', 'text', settings.planId || '');
    form.appendChild(planIdGroup);

    // Save button
    const saveBtn = createElement('button', {
      type: 'submit',
      className: 'btn btn-primary',
      textContent: 'Save Settings'
    });

    form.appendChild(saveBtn);

    // Form submit handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._saveWhopSettings();
    });

    return form;
  }

  /**
   * Create form group
   */
  _createFormGroup(name, label, type, value) {
    const group = createElement('div', {
      className: 'form-group'
    });

    const labelElement = createElement('label', {
      htmlFor: name,
      textContent: label
    });

    const input = createElement('input', {
      type,
      id: name,
      name,
      className: 'form-control',
      value: value || ''
    });

    group.appendChild(labelElement);
    group.appendChild(input);

    return group;
  }

  /**
   * Save Whop settings
   */
  async _saveWhopSettings() {
    const form = document.getElementById('whop-settings-form');
    if (!form) return;

    const spinner = LoadingSpinner.show({ text: 'Saving settings...' });

    try {
      const formData = new FormData(form);
      const settings = {
        apiKey: formData.get('apiKey'),
        planId: formData.get('planId')
      };

      const response = await apiClient.post('/api/admin/whop-settings', settings);

      if (response.success) {
        Toast.success('Settings saved successfully!');
      } else {
        throw new Error(response.error || 'Failed to save settings');
      }

    } catch (error) {
      console.error('Error saving settings:', error);
      Toast.error('Failed to save settings: ' + error.message);

    } finally {
      spinner.hide();
    }
  }

  /**
   * Load Analytics settings
   */
  async loadAnalyticsSettings() {
    const content = document.getElementById('settings-content');
    if (!content) return;

    content.innerHTML = `
      <div class="settings-form">
        <h3>Analytics Settings</h3>
        <p>Configure analytics tracking...</p>
        <p class="text-muted">Coming soon...</p>
      </div>
    `;
  }

  /**
   * Load Webhook settings
   */
  async loadWebhookSettings() {
    const content = document.getElementById('settings-content');
    if (!content) return;

    content.innerHTML = `
      <div class="settings-form">
        <h3>Control Webhook Settings</h3>
        <p>Configure external webhooks...</p>
        <p class="text-muted">Coming soon...</p>
      </div>
    `;
  }

  /**
   * Load Default Pages settings
   */
  async loadDefaultPages() {
    const content = document.getElementById('settings-content');
    if (!content) return;

    content.innerHTML = `
      <div class="settings-form">
        <h3>Default Pages</h3>
        <p>Set default landing pages...</p>
        <p class="text-muted">Coming soon...</p>
      </div>
    `;
  }

  /**
   * Cleanup
   */
  destroy() {
    // No cleanup needed
  }
}

export default SettingsView;
