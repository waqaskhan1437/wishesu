/**
 * Dashboard Reviews - Review management
 */

(function(AD) {
  function renderStars(rating) {
    const safeRating = Math.max(1, Math.min(5, Number(rating) || 0));
    return '&#9733;'.repeat(safeRating) + '&#9734;'.repeat(5 - safeRating);
  }

  async function loadReviewProducts(selectEl, selectedId) {
    const data = await AD.apiFetch('/api/products/list');
    const products = Array.isArray(data.products) ? data.products : [];
    AD.reviewProducts = products;

    const options = ['<option value="">Select a product</option>'].concat(
      products.map((product) => {
        const productId = Number(product.id);
        const isSelected = String(selectedId || '') === String(productId) ? ' selected' : '';
        return `<option value="${productId}"${isSelected}>${AD.escapeHtml(product.title || ('Product #' + productId))}</option>`;
      })
    );

    selectEl.innerHTML = options.join('');
    return products;
  }

  AD.loadReviews = async function(panel) {
    panel.innerHTML = `
      <div id="review-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:white; padding:30px; border-radius:12px; max-width:500px; width:90%; max-height:90vh; overflow-y:auto;">
          <h3 id="review-modal-title" style="margin:0 0 20px; color:#1f2937;">Edit Review</h3>
          <form id="review-form">
            <input type="hidden" id="review-mode" value="edit">
            <input type="hidden" id="review-id">
            <div id="review-product-field" style="display:none; margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Product</label>
              <select id="review-product" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px;">
                <option value="">Select a product</option>
              </select>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Author Name</label>
              <input type="text" id="review-author" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;">
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Rating</label>
              <select id="review-rating" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px;">
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Comment</label>
              <textarea id="review-comment" rows="4" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box; resize:vertical;"></textarea>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Status</label>
              <select id="review-status" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px;">
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Delivery Video URL (optional override)</label>
              <input type="url" id="review-delivered-video-url" placeholder="https://..." style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;">
              <div style="font-size:12px;color:#6b7280;margin-top:6px;line-height:1.4;">
                Leave empty to use the delivery link from the related order if one exists.
              </div>
            </div>
            <div style="margin-bottom:15px;">
              <label style="display:block; font-weight:600; margin-bottom:5px;">Delivery Thumbnail URL (optional override)</label>
              <input type="url" id="review-delivered-thumbnail-url" placeholder="https://..." style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;">
              <div style="font-size:12px;color:#6b7280;margin-top:6px;line-height:1.4;">
                Leave empty to fall back to the saved delivery thumbnail.
              </div>
            </div>
            <div style="margin-bottom:20px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="review-show-portfolio">
                <span>Show in Portfolio</span>
              </label>
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
              <button type="button" id="cancel-review-btn" style="padding:10px 20px; background:#6b7280; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Cancel</button>
              <button type="submit" id="submit-review-btn" style="padding:10px 20px; background:#667eea; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; margin-bottom:20px;">
        <button id="add-review-btn" class="btn btn-primary">+ Add Review</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Author</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Product</th>
              <th>Status</th>
              <th>Date</th>
              <th style="width:140px;">Actions</th>
            </tr>
          </thead>
          <tbody id="reviews-tbody">
            <tr><td colspan="8" style="text-align:center;">Loading...</td></tr>
          </tbody>
        </table>
      </div>`;

    const modal = document.getElementById('review-modal');
    const form = document.getElementById('review-form');
    const modeInput = document.getElementById('review-mode');
    const reviewIdInput = document.getElementById('review-id');
    const productField = document.getElementById('review-product-field');
    const productSelect = document.getElementById('review-product');
    const authorInput = document.getElementById('review-author');
    const ratingInput = document.getElementById('review-rating');
    const commentInput = document.getElementById('review-comment');
    const statusInput = document.getElementById('review-status');
    const showPortfolioInput = document.getElementById('review-show-portfolio');
    const deliveredVideoInput = document.getElementById('review-delivered-video-url');
    const deliveredThumbnailInput = document.getElementById('review-delivered-thumbnail-url');
    const modalTitle = document.getElementById('review-modal-title');
    const submitButton = document.getElementById('submit-review-btn');
    const cancelButton = document.getElementById('cancel-review-btn');
    const addReviewButton = document.getElementById('add-review-btn');
    const reviewsTbody = document.getElementById('reviews-tbody');

    function closeModal() {
      modal.style.display = 'none';
    }

    function resetForm() {
      form.reset();
      modeInput.value = 'add';
      reviewIdInput.value = '';
      productSelect.innerHTML = '<option value="">Select a product</option>';
      productSelect.value = '';
      productSelect.required = false;
      productField.style.display = 'none';
      authorInput.value = '';
      ratingInput.value = '5';
      commentInput.value = '';
      statusInput.value = 'approved';
      showPortfolioInput.checked = true;
      deliveredVideoInput.value = '';
      deliveredThumbnailInput.value = '';
    }

    async function openAddReviewModal() {
      resetForm();
      modeInput.value = 'add';
      modalTitle.textContent = 'Add Review';
      submitButton.textContent = 'Add Review';
      productField.style.display = 'block';
      productSelect.required = true;
      productSelect.disabled = true;
      productSelect.innerHTML = '<option value="">Loading products...</option>';
      modal.style.display = 'flex';

      try {
        await loadReviewProducts(productSelect);
      } catch (err) {
        productSelect.innerHTML = '<option value="">Unable to load products</option>';
        alert('Error: ' + err.message);
      } finally {
        productSelect.disabled = false;
      }
    }

    function openEditReviewModal(reviewId) {
      const review = (AD.reviews || []).find((item) => Number(item.id) === Number(reviewId));
      if (!review) {
        alert('Review not found');
        return;
      }

      resetForm();
      modeInput.value = 'edit';
      modalTitle.textContent = 'Edit Review';
      submitButton.textContent = 'Save Changes';
      reviewIdInput.value = review.id;
      authorInput.value = review.author_name || '';
      ratingInput.value = String(review.rating || 5);
      commentInput.value = review.comment || '';
      statusInput.value = review.status || 'approved';
      showPortfolioInput.checked = Number(review.show_on_product) === 1;
      deliveredVideoInput.value = review.delivered_video_url || '';
      deliveredThumbnailInput.value = review.delivered_thumbnail_url || '';
      modal.style.display = 'flex';
    }

    cancelButton.onclick = closeModal;
    modal.onclick = function(e) {
      if (e.target === modal) closeModal();
    };
    addReviewButton.onclick = openAddReviewModal;

    form.onsubmit = async function(e) {
      e.preventDefault();

      const isAddMode = modeInput.value === 'add';
      if (isAddMode && !productSelect.value) {
        alert('Please select a product');
        return;
      }

      const payload = {
        author_name: authorInput.value.trim(),
        rating: ratingInput.value,
        comment: commentInput.value.trim(),
        status: statusInput.value,
        show_on_product: showPortfolioInput.checked ? 1 : 0,
        delivered_video_url: deliveredVideoInput.value.trim(),
        delivered_thumbnail_url: deliveredThumbnailInput.value.trim()
      };

      if (isAddMode) {
        payload.productId = Number(productSelect.value);
      } else {
        payload.id = reviewIdInput.value;
      }

      try {
        const result = await AD.adminPostJson(isAddMode ? '/api/reviews/save' : '/api/reviews/update', payload);
        if (!result.success) {
          throw new Error(result.error || (isAddMode ? 'Failed to add review' : 'Failed to update review'));
        }

        alert(isAddMode ? 'Review added!' : 'Review updated!');
        closeModal();
        await AD.loadReviews(panel);
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };

    window.deleteReview = async function(id) {
      if (!confirm('Are you sure you want to delete this review?')) return;

      try {
        const result = await AD.jfetch('/api/reviews/delete?id=' + encodeURIComponent(id), { method: 'DELETE' });
        if (!result.success) {
          throw new Error(result.error || 'Delete failed');
        }
        alert('Review deleted!');
        await AD.loadReviews(panel);
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };

    window.editReview = openEditReviewModal;

    try {
      const data = await AD.apiFetch('/api/reviews?admin=1');
      AD.reviews = Array.isArray(data.reviews) ? data.reviews : [];

      if (!AD.reviews.length) {
        reviewsTbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No reviews found.</td></tr>';
        return;
      }

      reviewsTbody.innerHTML = AD.reviews.map((review) => {
        const status = review.status || 'approved';
        const badgeStyle = status === 'approved'
          ? 'background:#d1fae5;color:#065f46;'
          : status === 'pending'
            ? 'background:#fef3c7;color:#92400e;'
            : 'background:#fee2e2;color:#991b1b;';
        const comment = String(review.comment || '');
        const shortComment = comment.length > 40 ? comment.substring(0, 40) + '...' : comment;
        const productLabel = review.product_title || ('Product #' + review.product_id);

        return `<tr>
          <td>${Number(review.id) || ''}</td>
          <td>${AD.escapeHtml(review.author_name || 'Anonymous')}</td>
          <td style="color:#f59e0b;">${renderStars(review.rating)}</td>
          <td title="${AD.escapeHtml(comment)}" style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${AD.escapeHtml(shortComment)}</td>
          <td>${AD.escapeHtml(productLabel)}</td>
          <td><span style="padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;${badgeStyle}">${AD.escapeHtml(status)}</span></td>
          <td>${AD.escapeHtml(AD.formatDate(review.created_at))}</td>
          <td>
            <button onclick="editReview(${Number(review.id)})" style="padding:5px 8px;background:#667eea;color:white;border:none;border-radius:4px;cursor:pointer;margin-right:4px;font-size:11px;">Edit</button>
            <button onclick="deleteReview(${Number(review.id)})" style="padding:5px 8px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">Delete</button>
          </td>
        </tr>`;
      }).join('');
    } catch (err) {
      reviewsTbody.innerHTML = '<tr><td colspan="8" style="color:red;text-align:center;">Error loading reviews</td></tr>';
    }
  };

  console.log('Dashboard Reviews loaded');
})(window.AdminDashboard);
