#!/bin/bash
set -e

echo "🚀 Starting AUTO SETUP..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "${RED}❌ Wrangler not found. Installing...${NC}"
    npm install -g wrangler
fi

echo "${BLUE}📦 Step 1: Creating D1 Database...${NC}"
# Create D1 database and capture output
DB_OUTPUT=$(wrangler d1 create product_db 2>&1 || echo "Database might already exist")

# Extract database_id from output
DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")

if [ -z "$DB_ID" ]; then
    echo "${RED}⚠️  Could not auto-extract database_id. Please check manually.${NC}"
    echo "Run: wrangler d1 list"
    echo ""
    read -p "Enter your database_id: " DB_ID
fi

echo "${GREEN}✓ Database ID: $DB_ID${NC}"

# Update wrangler.toml with database_id
echo "${BLUE}📝 Step 2: Updating wrangler.toml...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/YOUR_DATABASE_ID/$DB_ID/g" wrangler.toml
else
    # Linux
    sed -i "s/YOUR_DATABASE_ID/$DB_ID/g" wrangler.toml
fi
echo "${GREEN}✓ wrangler.toml updated${NC}"

echo "${BLUE}🗄️  Step 3: Running Database Migrations...${NC}"
wrangler d1 execute product_db --file=apps/worker/src/core/db/migrations/0001_init.sql
echo "${GREEN}✓ Database tables created${NC}"

echo "${BLUE}🪣 Step 4: Creating R2 Bucket...${NC}"
wrangler r2 bucket create product-media 2>&1 || echo "Bucket might already exist"
echo "${GREEN}✓ R2 bucket ready${NC}"

echo "${BLUE}🔐 Step 5: Setting up TOKEN_SECRET...${NC}"
# Generate random token
RANDOM_TOKEN=$(openssl rand -base64 32 | tr -d "\n")
echo "$RANDOM_TOKEN" | wrangler secret put TOKEN_SECRET
echo "${GREEN}✓ TOKEN_SECRET configured${NC}"

echo ""
echo "${GREEN}✅ AUTO SETUP COMPLETE!${NC}"
echo ""
echo "${BLUE}🚀 Deploying to Cloudflare...${NC}"
wrangler deploy

echo ""
echo "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo ""
echo "Your API is now live!"
echo ""
