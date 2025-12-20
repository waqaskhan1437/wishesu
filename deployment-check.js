// Deployment readiness check script

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking deployment readiness...\n');

// Check required files
const requiredFiles = [
  'src/index.js',
  'src/utils/response.js',
  'src/utils/helpers.js',
  'src/db/init.js',
  'src/controllers/products.js',
  'src/controllers/orders.js',
  'src/controllers/reviews.js',
  'src/controllers/chat.js',
  'src/controllers/upload.js',
  'src/controllers/whop.js',
  'src/controllers/admin.js',
  'src/controllers/pages.js',
  'wrangler.toml',
  'public/index.html',
  'public/products-grid.html',
  'public/page-builder.html'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
    allFilesExist = false;
  }
});

// Check wrangler.toml configuration
console.log('\n⚙️  Checking wrangler.toml configuration:');
try {
  const wranglerConfig = fs.readFileSync('wrangler.toml', 'utf8');
  
  if (wranglerConfig.includes('main = "src/index.js"')) {
    console.log('✅ Entry point correctly set to src/index.js');
  } else {
    console.log('❌ Entry point not correctly configured');
    allFilesExist = false;
  }
  
  if (wranglerConfig.includes('directory = "./public"')) {
    console.log('✅ Assets directory correctly set to ./public');
  } else {
    console.log('❌ Assets directory not correctly configured');
    allFilesExist = false;
  }
  
} catch (e) {
  console.log('❌ Could not read wrangler.toml:', e.message);
  allFilesExist = false;
}

// Check public directory structure
console.log('\n📂 Checking public directory structure:');
const publicFiles = [
  'public/index.html',
  'public/products-grid.html',
  'public/page-builder.html',
  'public/css/style.css',
  'public/js/api.js'
];

publicFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
    allFilesExist = false;
  }
});

// Final result
console.log('\n🎯 Deployment Readiness Result:');
if (allFilesExist) {
  console.log('✅ READY FOR DEPLOYMENT!');
  console.log('Run: wrangler deploy');
} else {
  console.log('❌ NOT READY - Fix missing files first');
}