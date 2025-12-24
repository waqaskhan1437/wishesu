/**
 * Order Review Module
 * Handles review submission and revision requests
 */

/**
 * Hide review UI elements
 */
export function hideReviewUIElements() {
  const reviewSection = document.getElementById('review-section');
  const tipSection = document.getElementById('tip-section');
  const approveBtn = document.getElementById('approve-btn');
  const revisionBtn = document.getElementById('revision-btn');

  if (reviewSection) reviewSection.style.display = 'none';
  if (tipSection) tipSection.style.display = 'none';
  if (approveBtn) approveBtn.style.display = 'none';
  if (revisionBtn) revisionBtn.style.display = 'none';
}

/**
 * Update star rating display
 */
export function updateStars(rating) {
  document.querySelectorAll('.rating-stars span').forEach((s, i) => s.classList.toggle('active', i < rating));
}

/**
 * Submit review to API
 */
export async function submitReview(orderData, selectedRating) {
  const name = document.getElementById('reviewer-name').value.trim();
  const comment = document.getElementById('review-comment').value.trim();
  const portfolioEnabled = document.getElementById('portfolio-checkbox').checked;

  // Use shared utility function
  await submitReviewToAPI(orderData, {
    name,
    comment,
    rating: selectedRating,
    portfolioEnabled
  });

  alert('âœ... Review submitted!');
  hideReviewUIElements();
}

/**
 * Request revision
 */
export async function requestRevision(orderId, onSuccess) {
  const reason = prompt('What needs to be changed?');
  if (!reason || !reason.trim()) return;

  try {
    const res = await fetch('/api/order/revision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, reason: reason.trim() })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('âœ... Revision requested!');
      if (onSuccess) onSuccess();
    } else {
      throw new Error(data.error || 'Failed');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

/**
 * Setup review event handlers
 */
export function setupReviewHandlers(orderData, selectedRating, onReloadOrder) {
  // Star rating
  document.querySelectorAll('.rating-stars span').forEach(s => {
    s.addEventListener('click', function() {
      selectedRating.value = parseInt(this.dataset.rating);
      updateStars(selectedRating.value);
    });
  });

  // Review form submit
  document.getElementById('review-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await submitReview(orderData, selectedRating.value);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  // Approve button
  document.getElementById('approve-btn')?.addEventListener('click', () => {
    const reviewSection = document.getElementById('review-section');
    const tipSection = document.getElementById('tip-section');
    reviewSection.style.display = 'block';
    tipSection.style.display = 'block';
    reviewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Revision button
  document.getElementById('revision-btn')?.addEventListener('click', () => {
    requestRevision(orderData.order_id, onReloadOrder);
  });
}

