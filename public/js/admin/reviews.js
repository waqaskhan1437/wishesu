/*
 * Admin Reviews List
 *
 * Displays all customer reviews across products in a simple table.
 * Each row shows the product title, author, rating, comment, status
 * and submission date.  Uses getAllReviews() from api.js.
 */

;(async function initReviewsPage() {
  const table = document.getElementById('reviews-table');
  if (!table) return;
  try {
    const resp = await getAllReviews();
    const reviews = (resp && resp.reviews) || [];
    if (!reviews.length) {
      table.innerHTML = '<tbody><tr><td colspan="7" style="text-align:center; padding: 2rem;">No reviews found.</td></tr></tbody>';
      return;
    }
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width:50px;">ID</th>
        <th>Product</th>
        <th>Author</th>
        <th>Rating</th>
        <th>Comment</th>
        <th>Status</th>
        <th>Date</th>
      </tr>
    `;
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    reviews.forEach(rv => {
      const row = document.createElement('tr');
      const cells = [];
      cells.push(rv.id);
      cells.push(rv.product_title || `Product #${rv.product_id}`);
      cells.push(rv.author_name || 'Anonymous');
      cells.push(rv.rating != null ? rv.rating.toFixed(1) : '–');
      cells.push(rv.comment || '');
      cells.push(rv.status || 'approved');
      cells.push(rv.created_at ? new Date(rv.created_at).toLocaleString() : '–');
      cells.forEach(val => {
        const td = document.createElement('td');
        td.textContent = val;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
  } catch (err) {
    console.error(err);
    table.innerHTML = `<tbody><tr><td colspan="7" style="color:red; text-align:center;">Error loading reviews: ${err.message}</td></tr></tbody>`;
  }
})();