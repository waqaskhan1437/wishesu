/**
 * Shared spinner helper.
 */

import LoadingSpinner from '../components/loading-spinner.js';

export async function withSpinner(text, task) {
  const spinner = LoadingSpinner.show({ text });
  try {
    return await task();
  } finally {
    spinner.hide();
  }
}
