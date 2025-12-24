/**
 * Settings tabs builder.
 */

import { createElement } from '../../../utils/dom-helper.js';

export function createSettingsTabs(onSwitch) {
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
      onSwitch(tab.id);
    });

    tabsContainer.appendChild(button);
  });

  return tabsContainer;
}

export function setActiveTab(container, tabId) {
  const buttons = container.querySelectorAll('.tab-button');
  buttons.forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}
