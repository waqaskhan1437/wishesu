/**
 * Chat Widget Configuration
 * Constants and configuration settings
 */

export const API_ENDPOINTS = {
  START: '/api/chat/start',
  SEND: '/api/chat/send',
  SYNC: '/api/chat/sync'
};

export const LIMITS = {
  MAX_MESSAGE_LENGTH: 500,
  POLL_INTERVAL_MS: 10000,
  COOLDOWN_MS: 10000,
  LEADER_STALE_MS: 15000
};

export const STORAGE_KEYS = {
  SESSION_OBJ: 'wishesu_chat_session',
  SESSION_ID: 'chat_session_id',
  NAME: 'chat_name',
  EMAIL: 'chat_email',
  OPEN: 'chat_is_open',
  POLL_LEADER: 'chat_poll_leader_v1',
  COOLDOWN_UNTIL: 'chat_cooldown_until'
};

export const TAB_ID = (crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
