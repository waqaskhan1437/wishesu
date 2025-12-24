/**
 * Reviews View
 * Manages reviews display and moderation
 */

import apiClient from '../core/api-client.js';
import stateManager from '../core/state-manager.js';
import ConfirmModal from '../components/confirm-modal.js';
import Toast from '../components/toast-notification.js';
import LoadingSpinner from '../components/loading-spinner.js';
import { createTableContainer } from './shared-containers.js';
import { withSpinner } from './shared-spinner.js';
import { createReviewsHeader } from './reviews-header.js';
import { createReviewsTable } from './reviews-table.js';
import { fetchReviews, approveReview, deleteReview } from './reviews-api.js';

export class ReviewsView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.reviews = [];
  }

  async render() {
    this.container.innerHTML = '';

    const header = createReviewsHeader();
    this.container.appendChild(header);

    const tableContainer = createTableContainer('reviews-table-container');
    this.container.appendChild(tableContainer);

    await this.loadReviews();
  }

  async loadReviews() {
    await withSpinner('Loading reviews...', async () => {
      try {
        this.reviews = await fetchReviews(apiClient);
        stateManager.set('reviews', this.reviews);
        this._renderTable();
      } catch (error) {
        console.error('Error loading reviews:', error);
        Toast.error('Failed to load reviews: ' + error.message);
      }
    });
  }

  _renderTable() {
    if (this.table) {
      this.table.destroy();
    }

    const handlers = {
      onApprove: (review) => this.approveReview(review),
      onDelete: (review) => this.deleteReview(review)
    };

    this.table = createReviewsTable(this.reviews, handlers);
    this.table.render('#reviews-table-container');
  }

  async approveReview(review) {
    const spinner = LoadingSpinner.show({ text: 'Approving review...' });

    try {
      await approveReview(apiClient, review.id);
      Toast.success('Review approved successfully!');
      await this.loadReviews();
    } catch (error) {
      console.error('Error approving review:', error);
      Toast.error('Failed to approve review: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  async deleteReview(review) {
    await ConfirmModal.delete(
      `Review by ${review.author}`,
      async () => {
        const spinner = LoadingSpinner.show({ text: 'Deleting review...' });

        try {
          await deleteReview(apiClient, review.id);
          Toast.success('Review deleted successfully!');
          await this.loadReviews();
        } catch (error) {
          console.error('Error deleting review:', error);
          Toast.error('Failed to delete review: ' + error.message);
        } finally {
          spinner.hide();
        }
      }
    );
  }

  destroy() {
    if (this.table) {
      this.table.destroy();
    }
  }
}

export default ReviewsView;
