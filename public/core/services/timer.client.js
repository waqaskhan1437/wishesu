// public/core/services/timer.client.js
export async function fetchServerTimeOffset() {
  try {
    const before = Date.now();
    const res = await fetch('/api/time');
    if (!res.ok) return 0;

    const data = await res.json();
    const after = Date.now();

    if (!data || typeof data.serverTime !== 'number') return 0;

    const browserTime = Math.floor((before + after) / 2);
    return data.serverTime - browserTime;
  } catch {
    return 0;
  }
}
