const API_BASE = "http://localhost:8787";

function getToken() {
  return localStorage.getItem("token") || "";
}
function setToken(t) {
  if (!t) localStorage.removeItem("token");
  else localStorage.setItem("token", t);
}

async function req(path, opts = {}) {
  const headers = new Headers(opts.headers || {});
  headers.set("accept", "application/json");
  const token = getToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(API_BASE + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: data?.error || "REQUEST_FAILED" };
  return { ok: true, data: data?.data };
}

export const api = {
  getToken,
  setToken,
  async login(email, password) {
    const r = await req("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) return r;
    setToken(r.data.token);
    return { ok: true, data: r.data };
  },
  async pingMe() {
    const r = await req("/auth/me", { method: "GET" });
    return r.ok;
  },
  async createProduct(input) {
    return await req("/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  async getProduct(id) {
    return await req(`/admin/products/${encodeURIComponent(id)}`, { method: "GET" });
  },
  async listMedia(productId) {
    return await req(`/admin/products/${encodeURIComponent(productId)}/media`, { method: "GET" });
  },
  async uploadMedia(productId, file, kind, alt) {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", kind);
    fd.set("alt", alt || "");
    return await req(`/admin/products/${encodeURIComponent(productId)}/media`, { method: "POST", body: fd });
  },
  async listAddons(productId) {
    return await req(`/admin/products/${encodeURIComponent(productId)}/addons`, { method: "GET" });
  },
  async addAddon(productId, input) {
    return await req(`/admin/products/${encodeURIComponent(productId)}/addons`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  async getSeo(productId) {
    return await req(`/admin/products/${encodeURIComponent(productId)}/seo`, { method: "GET" });
  },
  async saveSeo(productId, input) {
    return await req(`/admin/products/${encodeURIComponent(productId)}/seo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  },
};
