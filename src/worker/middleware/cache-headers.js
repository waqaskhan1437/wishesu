/**
 * Cache header helpers.
 */

export function applyNoStore(headers = new Headers()) {
  const out = new Headers(headers);
  out.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  out.set('Pragma', 'no-cache');
  return out;
}
