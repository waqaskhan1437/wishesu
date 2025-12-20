/**
 * Shared Review Submission Utility
 * This file prevents code duplication between buyer-order.js and order-detail.js
 * 
 * Usage:
 *   await submitReviewToAPI(orderData, { name, comment, rating, portfolioEnabled });
 */

async function submitReviewToAPI(orderData, reviewFormData) {
  const { name, comment, rating, portfolioEnabled } = reviewFormData;
  
  // Validate inputs
  if (!name || !comment) {
    throw new Error('Please fill all fields');
  }
  
  if (!rating || rating < 1 || rating > 5) {
    throw new Error('Please select a rating');
  }
  
  // Prepare review data with all required fields
  const reviewData = {
    productId: orderData.product_id,
    author: name,
    rating: rating,
    comment: comment,
    orderId: orderData.order_id,
    showOnProduct: portfolioEnabled ? 1 : 0,
    deliveredVideoUrl: orderData.delivered_video_url || null,
    deliveredThumbnailUrl: orderData.delivered_thumbnail_url || null
  };
  
  // Submit review to API
  const res = await fetch('/api/reviews/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData)
  });
  
  const data = await res.json();
  
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit review');
  }
  
  // Update portfolio setting if enabled
  if (portfolioEnabled) {
    await fetch('/api/order/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        orderId: orderData.order_id, 
        portfolioEnabled: 1 
      })
    });
  }
  
  return { success: true, data };
}

/**
 * Helper function to hide review UI elements after submission
 */
function hideReviewUIElements() {
  const reviewSection = document.getElementById('review-section');
  const approveBtn = document.getElementById('approve-btn');
  const revisionBtn = document.getElementById('revision-btn');
  const tipSection = document.getElementById('tip-section');
  
  if (reviewSection) reviewSection.style.display = 'none';
  if (approveBtn) approveBtn.style.display = 'none';
  if (revisionBtn) revisionBtn.style.display = 'none';
  if (tipSection) tipSection.style.display = 'none';
}
