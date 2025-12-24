/**
 * CSRF enforcement for admin endpoints.
 */

function isSameHost(urlValue, host) {
  if (!urlValue) return false;
  try {
    const parsed = new URL(urlValue);
    return parsed.host === host;
  } catch (_) {
    return false;
  }
}

export function isSameOrigin(req) {
  const origin = req.headers.get('origin') || '';
  const referer = req.headers.get('referer') || '';
  const host = req.headers.get('host') || '';
  return isSameHost(origin, host) || isSameHost(referer, host);
}

export function enforceCsrf(req, path, method) {
  const isSafe = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const isAdminRoute = path.startsWith('/admin') || path.startsWith('/api/admin/');
  if (!isSafe && isAdminRoute && !isSameOrigin(req)) {
    return new Response('CSRF blocked', { status: 403 });
  }
  return null;
}
