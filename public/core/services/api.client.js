// public/core/services/api.client.js
async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed: ${res.status} ${text}`.trim());
  }

  // Some endpoints might return empty body
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  return res.json();
}

export function getProduct(id) {
  return apiFetch(`/api/product/${encodeURIComponent(id)}`);
}

export function saveProduct(payload) {
  return apiFetch('/api/product/save', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getWhopSettings() {
  return apiFetch('/api/settings/whop');
}
