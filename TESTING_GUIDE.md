# Schema Fix Testing Guide

## Pre-Deployment Checklist

Before deploying, verify these files were modified correctly:

### ✅ Modified Files

- [x] `worker.js` - Added server-side schema generation
- [x] `public/product.html` - Schema now server-side
- [x] `public/index.html` - Removed collection-schema.js
- [x] `public/home-example.html` - Removed collection-schema.js
- [x] `public/products-grid.html` - Removed collection-schema.js
- [x] `public/page-builder.html` - Removed collection-schema.js references
- [x] `public/js/product-cards.js` - Removed schema injection
- [x] `public/js/product/seo-utils.js` - Simplified to meta tags only

### ✅ Documentation Created

- [x] `AUDIT.md` - Complete worker.js audit
- [x] `SCHEMA_FIX_SUMMARY.md` - Quick reference guide
- [x] `TESTING_GUIDE.md` - This file

---

## Testing Steps

### 1. Deploy to Cloudflare

```bash
# Deploy the worker
npm run deploy
# or
wrangler deploy
```

### 2. Test Product Page Schema

**URL:** `https://your-domain.com/product.html?id=1`

**Steps:**
1. Open the page in browser
2. Right-click → "View Page Source" (NOT Inspect Element)
3. Search for: `<script type="application/ld+json" id="product-schema">`
4. Verify it contains:
   ```json
   {
     "@context": "https://schema.org/",
     "@type": "Product",
     "name": "Product Name",
     "price": "XX.XX",
     ...
   }
   ```

**Expected Results:**
- ✅ Single schema tag with id="product-schema"
- ✅ Contains complete product data (not empty {})
- ✅ Has pricing information
- ✅ Has brand information
- ✅ Has aggregateRating if reviews exist

**Red Flags:**
- ❌ Empty schema: `{}`
- ❌ Multiple schema tags with same id
- ❌ No schema tag found

### 3. Test Collection Page Schema

**URL:** `https://your-domain.com/` or `https://your-domain.com/index.html`

**Steps:**
1. Open the page in browser
2. Right-click → "View Page Source"
3. Search for: `<script type="application/ld+json" id="collection-schema">`
4. Verify it contains:
   ```json
   {
     "@context": "https://schema.org/",
     "@type": "ItemList",
     "itemListElement": [
       {
         "@type": "ListItem",
         "position": 1,
         "item": {
           "@type": "Product",
           ...
         }
       },
       ...
     ]
   }
   ```

**Expected Results:**
- ✅ Single schema tag with id="collection-schema"
- ✅ Contains ItemList with multiple products
- ✅ Each product has position number
- ✅ Each product has complete data

**Red Flags:**
- ❌ Empty schema: `{}`
- ❌ Only one product when multiple exist
- ❌ Missing position numbers

### 4. Google Rich Results Test

**Tool:** https://search.google.com/test/rich-results

**Test These URLs:**
1. Homepage: `https://your-domain.com/`
2. Product page: `https://your-domain.com/product.html?id=1`
3. Home example: `https://your-domain.com/home-example.html`
4. Products grid: `https://your-domain.com/products-grid.html`

**For Each URL:**
1. Paste URL into the tool
2. Click "Test URL"
3. Wait for results

**Expected Results:**
- ✅ "Valid item(s)" shown with green checkmark
- ✅ Product details displayed in preview
- ✅ Pricing information shown
- ✅ Reviews/ratings displayed (if present)
- ✅ No errors or warnings about schema

**Red Flags:**
- ❌ "No items detected"
- ❌ "Duplicate schema" warnings
- ❌ "Missing required field" errors
- ❌ Schema not detected at all

### 5. Browser Console Check

**Steps:**
1. Open any product or collection page
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for errors

**Expected Results:**
- ✅ No JavaScript errors
- ✅ Products load and display correctly
- ✅ No "injectCollectionSchema is not defined" errors
- ✅ No "updateSEO is not defined" errors

**Red Flags:**
- ❌ `Uncaught ReferenceError: injectCollectionSchema is not defined`
- ❌ `Uncaught ReferenceError: injectSchema is not defined`
- ❌ Failed to load product data

### 6. Meta Tags Still Work

**Steps:**
1. Open a product page: `/product.html?id=1`
2. Wait for page to fully load
3. Right-click → Inspect → Head section
4. Look for meta tags in <head>

**Expected Results:**
- ✅ `<title>` shows product name
- ✅ `<meta name="description">` has product description
- ✅ `<meta property="og:title">` exists
- ✅ `<meta property="og:image">` has product thumbnail
- ✅ `<meta name="twitter:card">` exists

**Red Flags:**
- ❌ Title still says "Loading Product..."
- ❌ Missing Open Graph tags
- ❌ Generic meta description

### 7. Products Still Render

**Steps:**
1. Visit homepage: `/`
2. Check products display correctly
3. Click on a product card
4. Verify product page loads

**Expected Results:**
- ✅ Product cards display with images
- ✅ Prices show correctly
- ✅ Click on card navigates to product page
- ✅ Product detail page loads and shows all info
- ✅ Reviews section displays (if reviews exist)

**Red Flags:**
- ❌ No products show
- ❌ Products show but missing images
- ❌ Clicking cards does nothing
- ❌ Product page shows loading forever

---

## Advanced Testing

### Schema Validation with Structured Data Testing Tool

**Tool:** https://validator.schema.org/

**Steps:**
1. Visit your product page
2. View page source
3. Copy the entire JSON-LD schema (between `<script type="application/ld+json">` tags)
4. Paste into Schema.org validator
5. Check for errors

**Expected Results:**
- ✅ No errors
- ✅ All required Product properties present
- ✅ Valid URLs and values

### Performance Testing

**Check Schema Load Time:**

```javascript
// Open browser console on product page
// Run this before page loads (in about:blank)
performance.mark('start');
window.addEventListener('DOMContentLoaded', () => {
  const schema = document.getElementById('product-schema');
  if (schema && schema.textContent !== '{}') {
    performance.mark('schema-ready');
    performance.measure('schema-load', 'start', 'schema-ready');
    const measure = performance.getEntriesByName('schema-load')[0];
    console.log('✅ Schema loaded in:', measure.duration, 'ms');
  } else {
    console.log('❌ Schema not loaded or empty');
  }
});
```

**Expected Results:**
- ✅ Schema loads in < 50ms
- ✅ Schema present before JavaScript executes

### Crawlability Test

**Disable JavaScript and Check Schema:**

**Chrome:**
1. Open DevTools (F12)
2. Press Ctrl+Shift+P (Command+Shift+P on Mac)
3. Type "Disable JavaScript"
4. Select "Disable JavaScript"
5. Refresh page
6. View page source
7. Check if schema is present

**Expected Results:**
- ✅ Schema still present in HTML
- ✅ Schema contains data (not empty)
- ✅ This proves schema loads server-side

**Firefox:**
1. Type `about:config` in address bar
2. Search for `javascript.enabled`
3. Toggle to false
4. Test as above

---

## Troubleshooting

### Issue: Empty Schema `{}`

**Possible Causes:**
1. Worker not deployed
2. Database connection issue
3. Product doesn't exist
4. Path matching in worker incorrect

**Solutions:**
1. Redeploy worker: `wrangler deploy`
2. Check worker logs: `wrangler tail`
3. Verify product ID exists in database
4. Check worker.js lines 2434-2480 for path matching

### Issue: "No items detected" in Google Rich Results

**Possible Causes:**
1. Schema not injected
2. Schema has validation errors
3. Multiple schemas causing conflicts
4. Schema not accessible to Googlebot

**Solutions:**
1. Check page source for schema tag
2. Validate schema at validator.schema.org
3. Search page source for duplicate script tags
4. Check robots.txt isn't blocking

### Issue: Products Not Displaying

**Possible Causes:**
1. JavaScript error
2. API endpoint not returning data
3. CSS file not loading

**Solutions:**
1. Check browser console for errors
2. Test API directly: `/api/products`
3. Check network tab for failed requests
4. Verify `product-cards.js` loads correctly

### Issue: Meta Tags Not Updating

**Possible Causes:**
1. `seo-utils.js` not loaded
2. `updateSEO` function not called
3. JavaScript error preventing execution

**Solutions:**
1. Check `product.html` includes `seo-utils.js`
2. Check `main.js` calls `updateSEO(product)`
3. Check browser console for errors

---

## Success Criteria Checklist

Before marking this task complete, verify:

- [ ] Product pages show single schema tag with data
- [ ] Collection pages show ItemList schema with multiple products
- [ ] Google Rich Results Tool shows "Valid item(s)"
- [ ] No "No items detected" errors
- [ ] No duplicate schema warnings
- [ ] Products display and function correctly
- [ ] Meta tags update dynamically
- [ ] No JavaScript errors in console
- [ ] Schema loads without JavaScript enabled
- [ ] All HTML files updated correctly
- [ ] Worker deploys without errors

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback

```bash
# Rollback to previous worker version
wrangler rollback
```

### Manual Fix

If you need to quickly restore old behavior:

1. Re-add `collection-schema.js` script tags to HTML files
2. Uncomment schema injection in `product-cards.js`
3. Restore `injectSchema()` function in `seo-utils.js`
4. Remove schema generation from worker.js
5. Redeploy

**Note:** This is not recommended as it will bring back duplicate issues.

---

## Contact & Support

If you encounter issues not covered in this guide:

1. Check worker logs: `wrangler tail`
2. Review browser console for JavaScript errors
3. Test API endpoints directly
4. Verify database has products
5. Check Google Rich Results Tool for specific errors

**Key Files to Review:**
- `worker.js` (lines 81-225, 2411-2507)
- `public/js/product/seo-utils.js`
- `public/js/product-cards.js`
- Browser Developer Tools Console

---

**Testing Date:** _____________  
**Tester:** _____________  
**Status:** ⬜ Pass / ⬜ Fail  
**Notes:** _____________
