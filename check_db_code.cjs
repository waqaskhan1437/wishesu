const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

console.log("=== Checking for dead/commented DB code ===");
files.forEach(f => {
  const content = fs.readFileSync(path.join(controllersDir, f), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.match(/\/\/.*env\.DB\.prepare/)) {
      console.log(`[${f}:${i+1}] Commented out DB query: ${line.trim()}`);
    }
  });
});

console.log("\n=== Checking for Error Codes in DB catches ===");
files.forEach(f => {
  const content = fs.readFileSync(path.join(controllersDir, f), 'utf8');
  const catchBlocks = content.match(/catch\s*\([^)]*\)\s*\{([\s\S]*?)\}/g);
  if (catchBlocks) {
    catchBlocks.forEach(block => {
      if (!block.includes('return') && !block.includes('throw')) {
         console.log(`[${f}] Catch block without return or throw: \n${block.substring(0, 100)}...`);
      }
      if (block.includes('return json') && !block.match(/500|400|401|403|404|409/)) {
         console.log(`[${f}] Catch block might return 200 on error: \n${block.substring(0, 100)}...`);
      }
    });
  }
});

console.log("\n=== Checking for Unused Exports ===");
// Just checking if module.exports or export has everything used... Actually, hard to do with simple regex.
// We'll check if any exported function is NOT found in router.js or index.js
const routerContent = fs.readFileSync(path.join(__dirname, 'src', 'router.js'), 'utf8') + 
                      fs.readFileSync(path.join(__dirname, 'src', 'index.js'), 'utf8');

files.forEach(f => {
  const content = fs.readFileSync(path.join(controllersDir, f), 'utf8');
  const exports = content.match(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g);
  if (exports) {
    exports.forEach(exp => {
      const funcName = exp.split(/\s+/).pop();
      if (!routerContent.includes(funcName) && !content.includes(` ${funcName}(`) && funcName !== 'getProducts' && !routerContent.includes(`${funcName}`)) {
         console.log(`[${f}] Potentially unused export: ${funcName}`);
      }
    });
  }
});
