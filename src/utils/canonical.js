const CANONICAL_ALIAS_ENTRIES = Object.freeze([
  ['/index.html', '/'],
  ['/home', '/'],
  ['/home/', '/'],
  ['/page-builder-v2', '/admin/page-builder-v2.html'],
  ['/page-builder-v2/', '/admin/page-builder-v2.html'],
  ['/page-builder-v2.html', '/admin/page-builder-v2.html'],
  ['/landing-builder', '/admin/landing-builder.html'],
  ['/landing-builder/', '/admin/landing-builder.html'],
  ['/landing-builder.html', '/admin/landing-builder.html'],
  ['/blog/index.html', '/blog'],
  ['/blog.html', '/blog'],
  ['/forum/index.html', '/forum'],
  ['/forum.html', '/forum'],
  ['/terms/', '/terms'],
  ['/terms/index.html', '/terms'],
  ['/terms.html', '/terms'],
  ['/products/index.html', '/products'],
  ['/products.html', '/products'],
  ['/products-grid', '/products'],
  ['/products-grid/', '/products'],
  ['/products-grid.html', '/products'],
  ['/checkout/', '/checkout'],
  ['/checkout/index.html', '/checkout'],
  ['/success.html', '/success'],
  ['/buyer-order/', '/buyer-order'],
  ['/buyer-order.html', '/buyer-order'],
  ['/order-detail/', '/order-detail'],
  ['/order-detail.html', '/order-detail'],
  ['/order-success', '/success'],
  ['/order-success.html', '/success']
]);

const DIRECT_INTERNAL_ALIAS_PATHS = new Set([
  '/index.html',
  '/home',
  '/home/',
  '/blog/index.html',
  '/blog.html',
  '/forum/index.html',
  '/forum.html',
  '/terms',
  '/terms/',
  '/terms/index.html',
  '/terms.html',
  '/products.html',
  '/products-grid',
  '/products-grid/',
  '/products-grid.html',
  '/products/index.html',
  '/checkout/',
  '/checkout/index.html',
  '/success/',
  '/success.html',
  '/buyer-order/',
  '/buyer-order.html',
  '/order-detail/',
  '/order-detail.html',
  '/order-success',
  '/order-success.html'
]);

const NON_REDIRECT_ALIAS_PATHS = new Set([
  '/checkout/',
  '/checkout/index.html',
  '/buyer-order/',
  '/buyer-order.html',
  '/order-detail/',
  '/order-detail.html'
]);

const SAME_SITE_HOSTS = new Set([
  'prankwish.com',
  'www.prankwish.com'
]);

export const CANONICAL_ALIAS_MAP = new Map(CANONICAL_ALIAS_ENTRIES);

function collapsePathname(pathname) {
  let path = String(pathname || '/').trim() || '/';
  path = path.replace(/\/+/g, '/');
  if (!path.startsWith('/')) path = `/${path}`;
  return path || '/';
}

function resolveBaseOrigin(baseOrigin) {
  const fallback = 'https://prankwish.com';
  try {
    return new URL(String(baseOrigin || fallback)).origin;
  } catch (_) {
    return fallback;
  }
}

function isSkippableUrlValue(value) {
  return /^(?:#|mailto:|tel:|javascript:|data:)/i.test(value) || value.startsWith('//');
}

function isInternalHost(hostname, baseHostname) {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host) return false;
  if (host === String(baseHostname || '').trim().toLowerCase()) return true;
  return SAME_SITE_HOSTS.has(host);
}

function normalizeComponentList(entries, baseOrigin) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const next = { ...entry };
    if (typeof next.code === 'string' && next.code) {
      next.code = rewriteLegacyInternalLinksInHtml(next.code, baseOrigin);
    }
    return next;
  });
}

export function shouldServeCanonicalAliasDirectly(pathname) {
  const raw = collapsePathname(pathname);
  return DIRECT_INTERNAL_ALIAS_PATHS.has(raw);
}

export function normalizeCanonicalPath(pathname) {
  let path = collapsePathname(pathname);
  let lowerPath = path.toLowerCase();
  path = CANONICAL_ALIAS_MAP.get(lowerPath) || CANONICAL_ALIAS_MAP.get(path) || path;

  if (
    path.length > 1 &&
    path.endsWith('/') &&
    !path.startsWith('/admin/') &&
    !path.startsWith('/api/')
  ) {
    path = path.slice(0, -1);
  }

  return path || '/';
}

export function getCanonicalRedirectPath(pathname) {
  const raw = collapsePathname(pathname);
  if (raw === '/admin/' || raw === '/api/') return null;
  if (raw.startsWith('/admin/') || raw.startsWith('/api/')) return null;
  if (NON_REDIRECT_ALIAS_PATHS.has(raw)) return null;

  const normalized = normalizeCanonicalPath(raw);
  return normalized !== raw ? normalized : null;
}

export function canonicalizeInternalUrlValue(rawValue, baseOrigin = 'https://prankwish.com') {
  const original = String(rawValue || '');
  const trimmed = original.trim();
  if (!trimmed || isSkippableUrlValue(trimmed)) return original;

  const base = new URL(resolveBaseOrigin(baseOrigin));
  const isAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const isRootRelative = trimmed.startsWith('/');
  if (!isAbsolute && !isRootRelative) return original;

  let parsed;
  try {
    parsed = new URL(trimmed, base);
  } catch (_) {
    return original;
  }

  if (isAbsolute && !isInternalHost(parsed.hostname, base.hostname)) {
    return original;
  }

  const normalizedPath = normalizeCanonicalPath(parsed.pathname);
  const needsHostNormalization = isAbsolute && (
    parsed.protocol !== base.protocol ||
    parsed.hostname.toLowerCase() !== base.hostname.toLowerCase()
  );
  const needsPathNormalization = normalizedPath !== parsed.pathname;
  if (!needsHostNormalization && !needsPathNormalization) return original;

  parsed.protocol = base.protocol;
  parsed.host = base.host;
  parsed.pathname = normalizedPath;

  if (!isAbsolute) {
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }
  return parsed.toString();
}

export function rewriteLegacyInternalLinksInHtml(html, baseOrigin = 'https://prankwish.com') {
  const source = String(html || '');
  if (!source) return source;

  // Pre-compute base URL once for all matches instead of per-match
  const base = new URL(resolveBaseOrigin(baseOrigin));
  const baseHostLower = base.hostname.toLowerCase();

  return source.replace(/\b(href|action)\s*=\s*(["'])(.*?)\2/gi, (match, attr, quote, value) => {
    // Fast skip for common non-rewritable values
    if (!value || value.startsWith('#') || value.startsWith('mailto:') ||
        value.startsWith('tel:') || value.startsWith('javascript:') ||
        value.startsWith('data:') || value.startsWith('//')) {
      return match;
    }

    const trimmed = value.trim();
    const isAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
    const isRootRelative = trimmed.startsWith('/');
    if (!isAbsolute && !isRootRelative) return match;

    let parsed;
    try {
      parsed = new URL(trimmed, base);
    } catch (_) {
      return match;
    }

    if (isAbsolute && !isInternalHost(parsed.hostname, baseHostLower)) {
      return match;
    }

    const normalizedPath = normalizeCanonicalPath(parsed.pathname);
    const needsHostNormalization = isAbsolute && (
      parsed.protocol !== base.protocol ||
      parsed.hostname.toLowerCase() !== baseHostLower
    );
    const needsPathNormalization = normalizedPath !== parsed.pathname;
    if (!needsHostNormalization && !needsPathNormalization) return match;

    parsed.protocol = base.protocol;
    parsed.host = base.host;
    parsed.pathname = normalizedPath;

    const normalized = isAbsolute
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return `${attr}=${quote}${normalized}${quote}`;
  });
}

export function normalizeSiteComponentsPayload(components, baseOrigin = 'https://prankwish.com') {
  if (!components || typeof components !== 'object') return components;

  return {
    ...components,
    headers: normalizeComponentList(components.headers, baseOrigin),
    footers: normalizeComponentList(components.footers, baseOrigin)
  };
}
