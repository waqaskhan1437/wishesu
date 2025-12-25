/**
 * Orders countdown helpers.
 */

export function getCountdownDisplay(deadline, status) {
  if (status === 'delivered') {
    return 'Delivered';
  }

  if (!deadline) return 'N/A';

  const now = new Date();
  const target = new Date(deadline);
  const diffMs = target - now;

  if (diffMs <= 0) {
    return '<span class="text-danger">Expired</span>';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}
