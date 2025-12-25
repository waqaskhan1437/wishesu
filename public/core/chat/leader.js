const KEY = 'wishesu_chat_leader';
const TTL = 6000;

const now = () => Date.now();

export function createLeader(onLeaderChange) {
  let isLeader = false;
  const id = `tab_${Math.random().toString(36).slice(2)}`;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(KEY) : null;

  const heartbeat = () => {
    const data = { id, ts: now() };
    localStorage.setItem(KEY, JSON.stringify(data));
    channel?.postMessage(data);
  };

  const check = () => {
    const raw = localStorage.getItem(KEY);
    let leader = null;
    try { leader = raw ? JSON.parse(raw) : null; } catch (_) {}
    const stale = !leader || (now() - leader.ts > TTL);
    const shouldLead = stale || leader.id === id;
    if (shouldLead && !isLeader) {
      isLeader = true;
      onLeaderChange(true);
    }
    if (!shouldLead && isLeader) {
      isLeader = false;
      onLeaderChange(false);
    }
  };

  const start = () => {
    check();
    heartbeat();
    const tick = setInterval(() => {
      if (isLeader) heartbeat();
      check();
    }, 2000);
    channel?.addEventListener('message', check);
    return () => clearInterval(tick);
  };

  return { start, isLeader: () => isLeader };
}
