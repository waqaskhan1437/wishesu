/**
 * Reviews View
 * Manages reviews display and moderation
 * Extracted from dashboard.js
 */

import apiClient from '../../../../core/scripts/api-client.js';
import stateManager from '../../../../core/scripts/state-manager.js';
import DataTable from '../../../../core/components/table/data-table.js';
import ConfirmModal from '../../../../core/components/modal/confirm-modal.js';
import Toast from '../../../../core/components/shared/toast-notification.js';
import LoadingSpinner from '../../../../core/components/shared/loading-spinner.js';
import { formatDate } from '../../../../core/utils/date-utils.js';
import { createElement } from '../../../../core/utils/dom-helper.js';

export class ReviewsView {
  constructor(container) {
    this.container = container;
    this.table = null;
    this.reviews = [];
  }

  /**
   * Render reviews view
   */
  async render() {
    // Clear container
    this.container.innerHTML = '';

    // Create header
    const header = createElement('h2', {
      textContent: 'Reviews Management',
      style: 'margin-bottom: 20px;'
    });
    this.container.appendChild(header);

    // Create table container
    const tableContainer = createElement('div', {
      className: 'table-container',
      id: 'reviews-table-container'
    });
    this.container.appendChild(tableContainer);

    // Load reviews
    await this.loadReviews();
  }

  /**
   * Load reviews from API
   */
  async loadReviews() {
    const spinner = LoadingSpinner.show({ text: 'Loading reviews...' });

    try {
      const response = await apiClient.get('/api/reviews');

      if (response.reviews) {
        this.reviews = response.reviews;
        stateManager.set('reviews', this.reviews);
        this._renderTable();
      }

    } catch (error) {
      console.error('Error loading reviews:', error);
      Toast.error('Failed to load reviews: ' + error.message);
    } finally {
      spinner.hide();
    }
  }

  /**
   * Render reviews table
   */
  _renderTable() {
    // Destroy existing table
    if (this.table) {
      this.table.destroy();
    }

    // Create new table
    this.table = new DataTable({
      columns: [
        {
          key: 'author',
          label: 'Author',
          sortable: true
        },
        {
          key: 'product_title',
          label: 'Product',
          sortable: true
        },
        {
          key: 'rating',
          label: 'Rating',
          sortable: true,
          formatter: (value) => {
            const stars = '⭐'.repeat(parseInt(value) || 0);
            return createElement('span', {
              textContent: stars,
              title: `${value}/5 stars`
            });
          }
        },
        {
          key: 'review_text',
          label: 'Review',
          formatter: (value) => {
            if (!value) return 'N/A';
            const truncated = value.length > 100
              ? value.substring(0, 100) + '...'
              : value;
            return createElement('div', {
              textContent: truncated,
              title: value,
              style: 'max-width: 300px;'
            });
          }
        },
        {
          key: 'approved',
          label: 'Status',
          sortable: true,
          formatter: (value) => {
            const badge = createElement('span', {
              className: value ? 'status-badge status-approved' : 'status-badge status-pending',
              textContent: value ? 'Approved' : 'Pending'
            });
            return badge;
          }
        },
        {
          key: 'created_at',
          label: 'Date',
          sortable: true,
          formatter: formatDate
        }
      ],
      data: this.reviews,
      sortable: true,
      filterable: true,
      pagination: true,
      pageSize: 20,
      rowClass: (review) => {
        return review.approved ? '' : 'review-pending';
      },
      actions: (review) => {
        const actions = [];

        if (!review.approved) {
          actions.push({
            label: 'Approve',
            className: 'btn btn-sm btn-success',
            icon: 'icon-check',
            onClick: (review) => this.approveReview(review)
          });
        }

        actions.push({
          label: 'Delete',
          className: 'btn btn-sm btn-danger',
          icon: 'icon-trash',
          onClick: (review) => this.deleteReview(review)
        });

        return actions;
      }
    });

    this.table.render('#reviews-table-container');
  }

  /**
   * Approve review
   */
  async approveReview(review) {
    const spinner = LoadingSpinner.show({ text: 'Approving review...' });

    try {
      const response = await apiClient.post('/api/reviews/update', {
        id: review.id,
        approved: true
      });

      if (response.success) {
        Toast.success('Review approved successfully!');
        await this.loadReviews(); // Reload reviews
      } else {
        throw new Error(response.error || 'Failed to approve review');
      }

    } catch (error) {
      console.error('Error approving review:', error);
      Toast.error('Failed to approve review: ' + error.message);

    } finally {
      spinner.hide();
    }
  }

  /**
   * Delete review
   */
  async deleteReview(review) {
    const confirmed = await ConfirmModal.delete(
      `Review by ${review.author}`,
      async () => {
        const spinner = LoadingSpinner.show({ text: 'Deleting review...' });

        try {
          const response = await apiClient.post('/api/reviews/delete', {
            id: review.id
          });

          if (response.success) {
            Toast.success('Review deleted successfully!');
            await this.loadReviews(); // Reload reviews
          } else {
            throw new Error(response.error || 'Failed to delete review');
          }

        } catch (error) {
          console.error('Error deleting review:', error);
          Toast.error('Failed to delete review: ' + error.message);

        } finally {
          spinner.hide();
        }
      }
    );
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.table) {
      this.table.destroy();
    }
  }
}

export default ReviewsView;
