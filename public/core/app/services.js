// public/core/app/services.js
export async function createServices() {
  const api = await import('../services/api.client.js');
  const timer = await import('../services/timer.client.js');
  return { api, timer };
}
