#!/bin/bash

# Forum Page Update Script
# Run this from project root: bash update-forum.sh

echo "🔄 Updating Forum Page in Database..."

# Get database name from wrangler.toml
DB_NAME=$(grep "database_name" wrangler.toml | cut -d'"' -f2 | head -1)

if [ -z "$DB_NAME" ]; then
  echo "❌ Error: Could not find database_name in wrangler.toml"
  echo "Please set database_name manually in the command below"
  exit 1
fi

echo "📊 Database: $DB_NAME"

# Delete old forum page
echo "🗑️  Deleting old forum page..."
npx wrangler d1 execute $DB_NAME --remote --command="DELETE FROM pages WHERE slug = 'forum';"

# Insert new forum page
echo "✅ Inserting new forum page..."
npx wrangler d1 execute $DB_NAME --remote --file=update-forum-db.sql

# Verify
echo "🔍 Verifying update..."
npx wrangler d1 execute $DB_NAME --remote --command="SELECT id, slug, title, page_type, is_default, status FROM pages WHERE slug = 'forum';"

echo ""
echo "✅ Forum page updated successfully!"
echo "🌐 Visit: https://your-domain.workers.dev/forum"
echo ""
echo "⚠️  If changes don't appear:"
echo "   1. Clear browser cache (Ctrl+Shift+R)"
echo "   2. Wait 1-2 minutes for CDN cache to clear"
echo ""
