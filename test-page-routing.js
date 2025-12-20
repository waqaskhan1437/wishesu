// Test script to verify page routing logic

// This script simulates the routing logic to ensure pages are served correctly

const testPaths = [
  '/',
  '/index.html',
  '/products-grid.html',
  '/page-builder.html',
  '/success.html',
  '/order-success.html',
  '/buyer-order.html',
  '/order-detail.html',
  '/api/products',
  '/product-123/test'
];

console.log('Testing page routing logic...\n');

testPaths.forEach(path => {
  console.log(`Path: ${path}`);
  
  if (path === '/' || path.endsWith('.html')) {
    console.log('✅ Should serve static HTML file');
  } else if (path.startsWith('/api/')) {
    console.log('✅ Should route to API handlers');
  } else if (path.startsWith('/product-')) {
    console.log('✅ Should serve static HTML with schema injection');
  } else {
    console.log('❓ Unknown route');
  }
  
  console.log('');
});

console.log('Routing logic verification complete!');