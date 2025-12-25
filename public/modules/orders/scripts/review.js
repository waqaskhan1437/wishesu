/**
 * Order Detail Review Functions
 * Review submission and revision requests
 */

export function initReviewHandlers(orderData, loadOrder) {
  let selectedRating = 5;

  document.querySelectorAll('.rating-stars span').forEach(star => {
    star.addEventListener('click', function() {
      selectedRating = parseInt(this.dataset.rating);
      updateStars(selectedRating);
    });
  });

  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', (e) => submitReview(e, orderData, selectedRating));
  }

  const approveBtn = document.getElementById('approve-btn');
  if (approveBtn) {
    approveBtn.addEventListener('click', () => {
      document.getElementById('review-section').style.display = 'block';
      document.getElementById('tip-section').style.display = 'block';
      document.getElementById('review-section').scrollIntoView({ behavior: 'smooth' });
    });
  }

  const revisionBtn = document.getElementById('revision-btn');
  if (revisionBtn) {
    revisionBtn.addEventListener('click', (e) => requestRevision(e, orderData.order_id, loadOrder));
  }

  updateStars(5);
}

export function updateStars(rating) {
  document.querySelectorAll('.rating-stars span').forEach((star, i) => {
    star.classList.toggle('active', i < rating);
  });
}

async function submitReview(e, orderData, selectedRating) {
  e.preventDefault();
  const name = document.getElementById('reviewer-name').value.trim();
  const comment = document.getElementById('review-comment').value.trim();
  const portfolioEnabled = document.getElementById('portfolio-checkbox').checked;

  if (!name || !comment) {
    alert('Fill all fields');
    return;
  }

  try {
    const res = await fetch('/api/reviews/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: orderData.product_id,
        author: name,
        rating: selectedRating,
        comment: comment,
        orderId: orderData.order_id,
        showOnProduct: portfolioEnabled ? 1 : 0
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('✅ Review submitted!');
      document.getElementById('review-section').style.display = 'none';

      const approveBtn = document.getElementById('approve-btn');
      const revisionBtn = document.getElementById('revision-btn');
      if (approveBtn) approveBtn.style.display = 'none';
      if (revisionBtn) revisionBtn.style.display = 'none';

      if (portfolioEnabled) {
        await fetch('/api/order/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderData.order_id, portfolioEnabled: 1 })
        });
      }
    } else throw new Error(data.error || 'Failed');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function requestRevision(e, orderId, loadOrder) {
  e.preventDefault();
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
      alert('✅ Revision requested!');
      loadOrder();
    } else throw new Error(data.error || 'Failed');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

export function initTipHandlers(orderData) {
  document.querySelectorAll('.tip-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      processTip(this.dataset.amount, orderData);
    });
  });
}

function processTip(amount, orderData) {
  if (!window.whopCheckout) {
    alert('Payment system not available');
    return;
  }
  window.whopCheckout({
    amount: parseFloat(amount),
    email: orderData.email || '',
    metadata: { type: 'tip', orderId: orderData.order_id },
    productPlan: orderData.whop_plan || '',
    productPriceMap: orderData.whop_price_map || ''
  });
}
