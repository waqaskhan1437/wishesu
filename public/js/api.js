/*
 * Common API helper functions for the shop frontend.  Each function returns
 * a parsed JSON object from the Worker backend.  Adjust API_BASE if you
 * deploy under a subfolder or custom domain.
 */

const API_BASE = '';

/**
 * Fetch a JSON response from the given endpoint.  Throws if the network
 * request fails or returns a nonOK status.  This helper centralises
 * error handling for all API calls.
 *
 * @param {string} path The API path (e.g. '/api/products')
 * @param {object} options Optional fetch options (method, headers, body)
 * @returns {Promise<any>} Parsed JSON
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Request failed: ${res.status} ${error}`);
  }
  return res.json();
}

/**
 * Get the list of products.  Returns an object like
 * `{ products: [ { id, title, slug, normal_price, sale_price, thumbnail_url },  ] }`.
 */
function getProducts() {
  return apiFetch('/api/products');
}

/**
 * Get details for a single product.
 *
 * Returns an object with `product` and `addons` keys.  See the Worker
 * implementation for field names.
 *
 * @param {string|number} id Product ID
 */
function getProduct(id) {
  return apiFetch(`/api/product/${encodeURIComponent(id)}`);
}

/**
 * Create a new order.  The body should include `email`, `amount`,
 * `productId` and optional `addons` array.  Returns order details.
 * This helper wraps the POST request to `/api/order/create`.
 */
function createOrder(data) {
  return apiFetch('/api/order/create', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Attach an archive link to an existing order.  Expects an object with
 * `orderId` and `archiveUrl` properties.
 */
function saveArchiveLink(data) {
  return apiFetch('/api/order/archive-link', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Retrieve all orders for the admin dashboard.  This helper wraps
 * a GET request to `/api/orders` and returns an object like
 * `{ orders: [] }` where each order includes decrypted email and
 * amount when available.
 */
function getOrders() {
  return apiFetch('/api/orders');
}

/**
 * Retrieve all reviews across products.  Used by the admin review
 * management page.  Returns an object like `{ reviews: [] }`.
 */
function getAllReviews() {
  return apiFetch('/api/reviews');
}

// Export functions to the global scope so they can be called from
// inline scripts in HTML files.  Without this assignment, the
// functions would be modulescoped and unavailable to the page.
window.getProducts = getProducts;
window.getProduct = getProduct;
window.createOrder = createOrder;
window.saveArchiveLink = saveArchiveLink;

/**
 * Fetch Whop settings from the backend.  Returns an object
 * containing a `settings` key.  This helper wraps a GET request
 * to `/api/settings/whop` and hides implementation details.
 */
function getWhopSettings() {
  return apiFetch('/api/settings/whop');
}

/**
 * Persist Whop settings to the backend.  Accepts a plain
 * object with arbitrary fields; they will be JSON serialised
 * and stored under a single row in the settings table.  The
 * backend returns `{ success: true }` on success or an error
 * object on failure.
 *
 * @param {object} data The settings object to save
 * @returns {Promise<any>} Parsed JSON response
 */
function saveWhopSettings(data) {
  return apiFetch('/api/settings/whop', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// Expose Whop settings helpers.  This allows admin pages to call
// getWhopSettings() and saveWhopSettings() without bundling this
// module.  Keeping the number of exported names minimal helps
// avoid polluting the global namespace.
window.getWhopSettings = getWhopSettings;
window.saveWhopSettings = saveWhopSettings;
// Expose new admin helpers
window.getOrders = getOrders;
window.getAllReviews = getAllReviews;

// Also expose apiFetch for custom calls (e.g. test API endpoints).
window.apiFetch = apiFetch;
