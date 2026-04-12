const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'controllers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const routerContent = fs.readFileSync(path.join(__dirname, 'src', 'router.js'), 'utf8') + 
                      fs.readFileSync(path.join(__dirname, 'src', 'index.js'), 'utf8');

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const exports = content.match(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g);
  if (exports) {
    exports.forEach(exp => {
      const funcName = exp.split(/\s+/).pop();
      // Allow internal calls or exports used in router/index
      if (!routerContent.includes(funcName) && !content.includes(` ${funcName}(`) && funcName !== 'getProducts' && !routerContent.includes(`${funcName}`)) {
         console.log(`Unused export found: ${f} -> ${funcName}`);
      }
    });
  }
});
