/**
 * Index Loader - Central Module Exports
 * This file re-exports all utility functions from their consolidated modules
 * allowing gradual migration from the monolithic index.js
 */

// ============= HTML & Text Utilities =============
export {
  escapeHtmlText,
  decodeBasicHtmlEntities,
  decodeXmlEntities,
  escapeHtmlAttr,
  stripHtml
} from './utils/html-entities.js';

export {
  sanitizeProductDescriptionHtml,
  ALLOWED_PRODUCT_DESCRIPTION_TAGS
} from './utils/html-sanitizer.js';

export {
  formatDate,
  formatBlogArchiveDate,
  formatBlogPostDate,
  formatShortDate,
  formatCommentDate,
  formatDateTime,
  getRelativeTime,
  formatReviewDateForSsr
} from './utils/date-formatter.js';

export {
  stringifyJson,
  safeJsonParse,
  safeJsonParseArray
} from './utils/json-helpers.js';

export {
  CACHE_NO_STORE,
  CACHE_PRIVATE,
  CACHE_SHORT,
  CACHE_MEDIUM,
  CACHE_STANDARD,
  CACHE_LONG,
  CACHE_IMMUTABLE,
  CACHE_API_SHORT,
  CACHE_API_MEDIUM,
  CACHE_API_LONG,
  noStoreHeaders,
  cacheHeaders,
  apiCacheHeaders
} from './utils/cache-headers.js';

export {
  stripUrlQueryHash,
  isLikelyVideoMediaUrl,
  isLikelyImageMediaUrl,
  toGalleryArray,
  normalizeGalleryForPlayerSsr,
  extractYouTubeId
} from './utils/url-helpers.js';

export {
  SCANNER_PREFIXES,
  SCANNER_PATH_RE,
  DYNAMIC_SLUG_RE,
  KNOWN_API_SEGMENTS,
  isLikelyScannerPath,
  canLookupDynamicSlug,
  isKnownApiPath,
  isMalformedNestedSlug
} from './utils/path-detection.js';

export {
  isLocalHostname,
  isLocalDevHost,
  getCanonicalHostname,
  isInsecureRequest,
  normalizeSeoBaseUrl
} from './utils/hostname-helpers.js';

export {
  isEnabledFlag,
  isNoJsSsrEnabled
} from './utils/feature-flags.js';

export {
  injectIntoHead,
  injectIntoBody,
  injectBeforeCloseBody,
  hasTag,
  injectAfterHead
} from './utils/html-injector.js';

export {
  buildPageHref,
  renderPaginationSsr,
  renderSimplePagination
} from './utils/paginations.js';

export {
  truncateText,
  slugify,
  capitalizeFirst,
  parseInteger,
  parseNumber,
  normalizeSsrInteger,
  normalizeSsrIdList
} from './utils/string-helpers.js';

export {
  formatPriceForSsr,
  formatPrice,
  calculateDiscount
} from './utils/price-formatter.js';

export {
  renderStarsForSsr,
  renderStarsUnicode,
  renderStarsHtml,
  renderStarsForProductCard
} from './utils/star-renderer.js';

// ============= Routing =============
export {
  CANONICAL_ALIAS_MAP,
  DIRECT_INTERNAL_ALIAS_PATHS,
  shouldServeCanonicalAliasDirectly,
  normalizeCanonicalPath,
  getCanonicalRedirectPath
} from './routing/path-aliases.js';

// ============= SSR Modules =============
export {
  getDeliveryTextFromInstantDaysForSsr,
  computeInitialDeliveryLabelForSsr,
  computeDeliveryBadgeForSsr,
  sanitizeAddonIdForSsr,
  parseAddonGroupsForSsr
} from './ssr/product-ssr.js';

export {
  renderAddonDataAttrsForSsr,
  renderSsrAddonField,
  renderSsrAddonsForm
} from './ssr/product-renderer.js';

export {
  optimizeThumbUrlForSsr,
  injectProductInitialContent,
  renderProductStep1PlayerShell
} from './ssr/product-player.js';

export {
  renderSsrReviewCards,
  renderSsrReviewSliderThumbs
} from './ssr/review-ssr.js';

export {
  parseReviewVideoMetadataForSsr,
  extractYouTubeIdForSsr,
  resolveReviewVideoMediaForSsr,
  renderReviewMediaDataAttrsForSsr
} from './ssr/review-media.js';

export {
  renderBlogArchiveCardsSsr,
  renderEmbeddedBlogCards
} from './ssr/blog-ssr.js';

export {
  renderForumArchiveCardsSsr,
  renderEmbeddedForumQuestionsSsr,
  renderForumArchivePaginationSsr,
  renderEmbeddedForumPaginationSsr
} from './ssr/forum-ssr.js';

// ============= SEO Modules =============
export {
  resolveFallbackSiteTitle,
  getSeoSettingsObject,
  resolveSiteTitle,
  applySiteTitleToHtml,
  replaceLegacyBrandTokensInText
} from './seo/seo-helpers.js';

export {
  isSensitiveNoindexPath,
  applySeoToHtml,
  getSeoForRequest
} from './seo/seo-tags.js';

export {
  normalizeUrlForSitemapCompare,
  getSitemapMembershipSet,
  isCanonicalInSitemap
} from './seo/sitemap-helpers.js';

// ============= Global Components =============
export {
  ensureGlobalComponentsRuntimeScript,
  upsertBodyDataAttribute,
  hasGlobalHeaderMarkup,
  hasGlobalFooterMarkup,
  injectMarkupIntoSlot,
  injectGlobalHeaderSsr,
  injectGlobalFooterSsr,
  isExcludedFromGlobalComponents,
  isTransactionalGlobalComponentsPath,
  resolveDefaultComponentCode,
  getSiteComponentsForSsr,
  applyGlobalComponentsSsr
} from './components/global-components.js';

// ============= Settings Helper (NEW) =============
export {
  clearSettingsCache,
  getSetting,
  getSettings,
  saveSetting,
  deleteSetting,
  getSettingOrDefault
} from './utils/settings-helper.js';

// ============= Database Helper (NEW) =============
export {
  queryOne,
  queryAll,
  runQuery,
  countRows,
  exists,
  insertRow,
  updateRow,
  deleteRow,
  upsertRow,
  batchInsert,
  getTableColumns,
  tableExists,
  createTable
} from './utils/db-helpers.js';

// ============= Cache Keys (NEW) =============
export {
  buildVersionedCacheKey,
  buildCacheKey,
  parseCacheVersion,
  shouldServeFromCache,
  getFromCache,
  setToCache,
  deleteFromCache,
  clearCache,
  getCacheControlForFile
} from './utils/cache-keys.js';

// ============= Error Handler (NEW) =============
export {
  handleError,
  logError,
  safeAsync,
  tryCatch,
  tryCatchSync,
  isError,
  getErrorMessage,
  isNetworkError,
  isAuthError,
  isNotFoundError,
  isValidationError,
  AppError,
  ValidationError,
  NotFoundError,
  AuthError,
  ForbiddenError,
  NetworkError,
  withErrorHandler,
  createErrorHandler
} from './utils/error-handler.js';

// ============= Order Decoder (NEW) =============
export {
  decodeOrderData,
  getEmptyOrderData,
  parseOrderEncryptedData,
  encodeOrderData,
  extractBuyerInfo,
  extractBuyerEmail,
  extractBuyerName,
  hasBuyerEmail,
  getOrderAddons,
  getOrderMessage,
  formatOrderDataForDisplay
} from './utils/order-decoder.js';

// ============= Enhanced Response Builder (NEW) =============
export {
  json,
  cachedJson,
  errorResponse,
  successResponse,
  html,
  text,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  redirectResponse,
  fileResponse,
  emptyResponse
} from './utils/response.js';

// ============= SSR Query Helpers (NEW) =============
export {
  queryProductsForComponentSsr,
  queryBlogsForComponentSsr,
  queryForumQuestionsForSsr,
  queryReviewsForSsr,
  queryHomepageProducts,
  queryPublishedBlogs
} from './ssr/query-helpers.js';

// ============= Page Generators (NEW) =============
export {
  generateBlogPostHTML,
  generateBlogCard
} from './ssr/blog-page-generator.js';

export {
  generateForumQuestionHTML,
  generateForumCard
} from './ssr/forum-page-generator.js';

// ============= Component Applier (NEW) =============
export {
  applyComponentSsrToHtml
} from './ssr/component-applier.js';

// ============= Query Modules (NEW) =============
export {
  getProductById,
  getProductBySlug,
  getAllProducts,
  searchProducts,
  getProductCount,
  getProductReviews,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getFeaturedProducts
} from './queries/product-queries.js';

export {
  getOrderById,
  getOrderByOrderId,
  getOrders,
  getOrdersByEmail,
  getOrderCount,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrdersByProduct,
  getRecentOrders,
  searchOrders
} from './queries/order-queries.js';

export {
  getBlogById,
  getBlogBySlug,
  getAllBlogs,
  getBlogCount,
  createBlog,
  updateBlog,
  deleteBlog,
  getFeaturedBlogs,
  searchBlogs,
  getBlogComments,
  createBlogComment
} from './queries/blog-queries.js';

export {
  getForumQuestionById,
  getForumQuestionBySlug,
  getAllForumQuestions,
  getForumQuestionCount,
  createForumQuestion,
  updateForumQuestion,
  deleteForumQuestion,
  getForumReplies,
  createForumReply,
  updateForumReply,
  deleteForumReply,
  searchForumQuestions,
  incrementReplyCount
} from './queries/forum-queries.js';

// ============= Utility Modules (NEW) =============
export * from './utils/r2-helpers.js';
export * from './utils/logger.js';
export * from './utils/external-fetch.js';
export * from './utils/email-helpers.js';

// ============= Validation (ENHANCED) =============
export {
  enforceUserRateLimit,
  isValidEmail,
  validateRequired,
  isValidNumber,
  isValidWhopPlanId,
  isValidPhone,
  isValidUrl,
  isValidSlug,
  validatePassword,
  isValidId,
  isValidDate,
  isValidFileType,
  isValidFileSize,
  sanitizeInput
} from './utils/validation.js';

// ============= Auth Middleware (NEW) =============
export {
  requireAuth,
  getClientIp,
  getUserAgent,
  checkAdminIp,
  generateSessionToken,
  hashPassword,
  verifyPassword,
  createSession,
  isSessionValid,
  getBasicAuthCredentials,
  requireApiKey,
  rateLimitKey
} from './middleware/auth.js';

// ============= Config Exports =============
export {
  initDB,
  getDb,
  getDbWithRetry,
  withDbRetry,
  isDbReady,
  isDbInitialized
} from './config/db.js';

export { CORS } from './config/cors.js';

// ============= Controller Exports =============
export * from './controllers/products.js';
export * from './controllers/orders.js';
export * from './controllers/blog.js';
export * from './controllers/forum.js';
export * from './controllers/reviews.js';
export * from './controllers/pages.js';
export * from './controllers/admin.js';
export * from './controllers/email.js';
export * from './controllers/chat.js';
export * from './controllers/coupons.js';
export * from './controllers/noindex.js';
export * from './controllers/seo-minimal.js';
export * from './controllers/settings-clean.js';
export * from './controllers/settings-media.js';
export * from './controllers/backup.js';
export * from './controllers/api-keys.js';
export * from './controllers/analytics.js';
export * from './controllers/webhooks.js';
export * from './controllers/paypal.js';
export * from './controllers/payment-gateway.js';
export * from './controllers/payment-universal.js';
export * from './controllers/whop.js';
export * from './controllers/blog-comments.js';

// ============= Middleware Exports =============
export * from './middleware/api-auth.js';
