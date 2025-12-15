@echo off
echo 🚀 Starting AUTO SETUP...
echo.

REM Check if wrangler is installed
where wrangler >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Wrangler not found. Installing...
    npm install -g wrangler
)

echo 📦 Step 1: Creating D1 Database...
wrangler d1 create product_db
echo.
echo ⚠️  IMPORTANT: Copy the database_id from above output
echo.
set /p DB_ID="Enter the database_id: "

echo 📝 Step 2: Updating wrangler.toml...
powershell -Command "(gc wrangler.toml) -replace 'YOUR_DATABASE_ID', '%DB_ID%' | Out-File -encoding ASCII wrangler.toml"
echo ✓ wrangler.toml updated
echo.

echo 🗄️  Step 3: Running Database Migrations...
wrangler d1 execute product_db --file=apps/worker/src/core/db/migrations/0001_init.sql
echo ✓ Database tables created
echo.

echo 🪣 Step 4: Creating R2 Bucket...
wrangler r2 bucket create product-media
echo ✓ R2 bucket ready
echo.

echo 🔐 Step 5: Setting up TOKEN_SECRET...
echo Enter a strong random string (or press Enter for random):
set /p TOKEN=""
if "%TOKEN%"=="" set TOKEN=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
echo %TOKEN%| wrangler secret put TOKEN_SECRET
echo ✓ TOKEN_SECRET configured
echo.

echo ✅ AUTO SETUP COMPLETE!
echo.
echo 🚀 Deploying to Cloudflare...
wrangler deploy

echo.
echo 🎉 DEPLOYMENT SUCCESSFUL!
echo.
pause
