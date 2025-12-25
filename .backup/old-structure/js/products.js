/*
 * DEPRECATED: This file is no longer used.
 *
 * As of Version 21, both index.html and products-grid.html now use
 * inline ProductCards.render() calls directly for consistency.
 *
 * This file is kept for reference only and is NOT loaded by any page.
 *
 * Previous functionality:
 * - Fetched products from the API and rendered simple cards
 * - Was used by index.html
 *
 * New approach (Version 21+):
 * - Both index.html and products-grid.html use identical structure
 * - ProductCards.render() is called inline in each HTML file
 * - This ensures consistent design and eliminates duplicate rendering
 */

// THIS CODE IS NO LONGER EXECUTED
// Left here for reference only
/*
;(function initProductGrid() {
  const container = document.getElementById('product-list');
  if (!container || !window.ProductCards) return;
  ProductCards.render('product-list', { filter: 'all', columns: 3, limit: 9 });
})();
*/
