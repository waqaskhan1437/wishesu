/**
 * Chat Widget Main Entry Point
 * Orchestrates all chat widget components
 */

import { STORAGE_KEYS, TAB_ID } from './config.js';
import { ChatStorage } from './storage.js';
import { TabLeader } from './leader.js';
import { ChatUI } from './ui.js';
import { ChatSession } from './session.js';
import { ChatMessaging } from './messaging.js';

(() => {
  // Prevent double init across navigations / partial reloads
  if (window.__WISHESU_CHAT_WIDGET_INITIALIZED__) return;
  window.__WISHESU_CHAT_WIDGET_INITIALIZED__ = true;

  // Initialize components
  const storage = new ChatStorage();
  const ui = new ChatUI();
  const session = new ChatSession(storage, ui);
  const messaging = new ChatMessaging(storage, ui);

  let isOpen = storage.getIsOpen();

  // Quick actions
  ui.addQuickAction('📦 My Order Status', () => messaging.sendMessage('My Order Status'));
  ui.addQuickAction('💬 Talk to Human', () => messaging.sendMessage('Talk to Human'));
  ui.addQuickAction('🚚 Check Delivery Status', () => messaging.sendMessage('Check Delivery Status'));

  // Panel visibility
  function setOpen(open) {
    isOpen = !!open;
    storage.setIsOpen(isOpen);
    ui.setVisible(isOpen);

    if (isOpen) {
      session.ensureSession((success) => {
        if (success) {
          messaging.startPolling();
          messaging.syncNow();
          messaging.applyCooldownUI();
        }
      });
    } else {
      messaging.stopPolling();
    }
  }

  // Event handlers
  ui.elements.btn.addEventListener('click', () => setOpen(!isOpen));
  ui.elements.closeBtn.addEventListener('click', () => setOpen(false));

  ui.elements.logoutBtn.addEventListener('click', async () => {
    storage.clearSession();
    messaging.lastId = 0;
    messaging.seenIds.clear();
    ui.clearMessages();
    await session.ensureSession(() => {});
  });

  ui.elements.sendBtn.addEventListener('click', () => messaging.sendMessage());
  ui.elements.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      messaging.sendMessage();
    }
  });

  ui.elements.input.addEventListener('input', () => ui.updateCounter());

  // Storage event listener for multi-tab coordination
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.POLL_LEADER && isOpen) {
      const leader = TabLeader.getLeader();
      if (leader && leader.id !== TAB_ID) messaging.stopPolling();
      if ((!leader || !TabLeader.isLeaderFresh(leader)) && !document.hidden) messaging.startPolling();
    }
  });

  // Visibility change handler
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      messaging.stopPolling();
      TabLeader.releaseLeader();
    } else if (isOpen) {
      messaging.startPolling();
      messaging.syncNow();
    }
  });

  // Initialize
  ui.updateAuthUI(!!storage.sessionId);
  if (isOpen) setOpen(true);
})();
