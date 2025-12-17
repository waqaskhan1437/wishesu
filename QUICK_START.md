# Quick Start Deployment Guide

Follow these simple steps to deploy the fixed portfolio reviews system:

## Step 1: Deploy Backend (5 minutes)

Upload the new `worker.js` file to your Cloudflare Workers project.

If using Wrangler CLI:
```bash
cd wishesu-fixed
wrangler deploy
```

If using Cloudflare Dashboard:
- Go to your Workers project
- Replace the worker.js content with the new file
- Click "Save and Deploy"

Wait for deployment to complete and verify no errors in the logs.

## Step 2: Deploy Frontend Files (5 minutes)

Copy these files to your public hosting:

```
public/js/buyer-order.js → Your project's public/js/buyer-order.js
public/js/product/layout-main.js → Your project's public/js/product/layout-main.js
public/js/product/layout-extra.js → Your project's public/js/product/layout-extra.js
public/admin/migrate-reviews.html → Your project's public/admin/migrate-reviews.html
```

Clear your CDN cache if using Cloudflare Pages or similar service.

## Step 3: Migrate Old Reviews (2 minutes)

Open your browser and go to:
```
https://your-domain.com/admin/migrate-reviews.html
```

Click "Check Current Status" to see statistics.

Click "Start Migration" to update old reviews.

You should see a success message showing how many reviews were updated.

## Step 4: Test Everything (5 minutes)

1. Visit a product page with reviews
2. Check that review videos show properly with video preview frames
3. Click a review video to ensure it plays in the main player
4. Open browser console - verify no failed network requests
5. (Optional) Create a test order and submit a review to test the full flow

## Done!

Your portfolio reviews system is now fixed and working properly. No more broken thumbnails, no failed requests, and only approved videos will show on product pages.

## Need Help?

If you encounter any issues, check the full README.md file for detailed troubleshooting steps.

## What Changed?

- Videos now use their own frames as thumbnails (no separate images needed)
- Only videos explicitly allowed by buyers are shown
- No placeholder graphics for missing videos
- Simplified database queries with no JOIN operations
- Migration utility for old reviews

## Files Modified

Backend:
- worker.js (new migration endpoint + simplified queries)

Frontend:
- public/js/buyer-order.js (simplified review submission)
- public/js/product/layout-main.js (play button on main thumbnail)
- public/js/product/layout-extra.js (video thumbnails, no placeholders)

New:
- public/admin/migrate-reviews.html (admin utility for migration)
