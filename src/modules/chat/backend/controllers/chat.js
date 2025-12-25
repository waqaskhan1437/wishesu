/**
 * Chat controller - re-export from feature modules.
 */

export {
  startChat,
  syncChat,
  sendMessage,
  blockSession,
  deleteSession,
  getSessions
} from '../features/chat/index.js';
