/**
 * Whop Helper Functions
 */

export const parseError = (text) => {
  try {
    const data = JSON.parse(text);
    return data.message || data.error || text;
  } catch {
    return text || 'Whop error';
  }
};
