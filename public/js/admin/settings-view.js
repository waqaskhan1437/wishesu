/**
 * Settings View
 * Application settings management
 */

import apiClient from '../../core/api-client.js';
import Toast from '../../components/toast-notification.js';
import { withSpinner } from './shared-spinner.js';
import { createElement } from '../../utils/dom-helper.js';
import { createSettingsTabs, setActiveTab } from './settings-tabs.js';
import { renderPlaceholder } from './settings-content.js';
import { createWhopForm } from './settings-whop-form.js';
import { fetchWhopSettings, saveWhopSettings } from './settings-api.js';

export class SettingsView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = '';

    const settingsContainer = createElement('div', {
      className: 'settings-container'
    });

    const tabs = createSettingsTabs((tabId) => this._switchTab(tabId));
    settingsContainer.appendChild(tabs);

    const contentArea = createElement('div', {
      className: 'settings-content',
      id: 'settings-content'
    });
    settingsContainer.appendChild(contentArea);

    this.container.appendChild(settingsContainer);

    await this.loadWhopSettings();
  }

  async _switchTab(tabId) {
    setActiveTab(this.container, tabId);

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

  async loadWhopSettings() {
    const content = document.getElementById('settings-content');
    if (!content) return;

    content.innerHTML = '<div class="loading">Loading settings...</div>';

    try {
      const settings = await fetchWhopSettings(apiClient);

      content.innerHTML = '';

      const form = createWhopForm(settings, () => this._saveWhopSettings());
      content.appendChild(form);
    } catch (error) {
      console.error('Error loading Whop settings:', error);
      content.innerHTML = '<div class="error">Failed to load settings</div>';
    }
  }

  async _saveWhopSettings() {
    const form = document.getElementById('whop-settings-form');
    if (!form) return;

    await withSpinner('Saving settings...', async () => {
      try {
        const formData = new FormData(form);
        const settings = {
          apiKey: formData.get('apiKey'),
          planId: formData.get('planId')
        };

        await saveWhopSettings(apiClient, settings);
        Toast.success('Settings saved successfully!');
      } catch (error) {
        console.error('Error saving settings:', error);
        Toast.error('Failed to save settings: ' + error.message);
      }
    });
  }

  async loadAnalyticsSettings() {
    const content = document.getElementById('settings-content');
    if (!content) return;

    renderPlaceholder(content, 'Analytics Settings', 'Configure analytics tracking...');
  }

  async loadWebhookSettings() {
    const content = document.getElementById('settings-content');
    if (!content) return;

    renderPlaceholder(content, 'Control Webhook Settings', 'Configure external webhooks...');
  }

  async loadDefaultPages() {
    const content = document.getElementById('settings-content');
    if (!content) return;

    renderPlaceholder(content, 'Default Pages', 'Set default landing pages...');
  }

  destroy() {
    // No cleanup needed
  }
}

export default SettingsView;
