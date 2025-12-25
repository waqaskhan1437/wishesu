/**
 * Chat Widget Tab Leader Management
 * Ensures only one tab polls for messages at a time
 */

import { STORAGE_KEYS, TAB_ID, LIMITS } from './config.js';

export class TabLeader {
  static getLeader() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.POLL_LEADER) || 'null');
    } catch {
      return null;
    }
  }

  static isLeaderFresh(leader) {
    return leader && leader.id && leader.ts && (Date.now() - leader.ts) < LIMITS.LEADER_STALE_MS;
  }

  static tryBecomeLeader() {
    const leader = this.getLeader();
    if (!this.isLeaderFresh(leader) || leader.id === TAB_ID) {
      localStorage.setItem(STORAGE_KEYS.POLL_LEADER, JSON.stringify({ id: TAB_ID, ts: Date.now() }));
      return true;
    }
    return false;
  }

  static heartbeatLeader() {
    const leader = this.getLeader();
    if (leader && leader.id === TAB_ID) {
      localStorage.setItem(STORAGE_KEYS.POLL_LEADER, JSON.stringify({ id: TAB_ID, ts: Date.now() }));
      return true;
    }
    return false;
  }

  static releaseLeader() {
    const leader = this.getLeader();
    if (leader && leader.id === TAB_ID) {
      localStorage.removeItem(STORAGE_KEYS.POLL_LEADER);
    }
  }
}
