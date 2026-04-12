const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const controllersDir = path.join(srcDir, 'controllers');

function getAllFiles(dir, ext = '.js') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, ext));
    } else if (file.endsWith(ext)) {
      results.push(filePath);
    }
  });
  return results;
}

const allFiles = getAllFiles(srcDir);

console.log("=== Agent 1: Scanning for un-awaited DB calls ===");
let agent1Found = 0;
allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('env.DB.') && !line.includes('await') && !line.includes('return') && !line.trim().startsWith('//')) {
      if (line.match(/\.(run|all|first)\s*\(/)) {
        console.log(`[Warning] Possible un-awaited DB execution in ${path.basename(file)}:${i+1} -> ${line.trim()}`);
        agent1Found++;
      }
    }
  });
});
if (agent1Found === 0) console.log("Agent 1 found no issues. Great!");

console.log("\n=== Agent 2: Scanning for completely empty catch blocks ===");
let agent2Found = 0;
allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const catchRegex = /catch\s*\(\s*[a-zA-Z0-9_]*\s*\)\s*\{\s*\}/g;
  let match;
  while ((match = catchRegex.exec(content)) !== null) {
    console.log(`[Warning] Empty catch block in ${path.basename(file)} at index ${match.index}`);
    agent2Found++;
  }
});
if (agent2Found === 0) console.log("Agent 2 found no completely empty catch blocks.");

console.log("\n=== Agent 3: Scanning for console logs ===");
let consoleLogCount = 0;
allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.includes('console.log(') && !line.trim().startsWith('//')) {
      consoleLogCount++;
    }
  });
});
console.log(`Found ${consoleLogCount} active console.log statements.`);

console.log("\n=== Agent 4: Scanning for unused exports ===");
let agent4Found = 0;
const routerContent = fs.readFileSync(path.join(srcDir, 'router.js'), 'utf8') + fs.readFileSync(path.join(srcDir, 'index.js'), 'utf8');
const controllers = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
controllers.forEach(f => {
  const content = fs.readFileSync(path.join(controllersDir, f), 'utf8');
  const exports = content.match(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g);
  if (exports) {
    exports.forEach(exp => {
      const funcName = exp.split(/\s+/).pop();
      if (!routerContent.includes(funcName) && !content.includes(`${funcName}(`) && funcName !== 'getProducts' && !routerContent.includes(`${funcName}`)) {
        console.log(`[Warning] Unused function export: ${f} -> ${funcName}`);
        agent4Found++;
      }
    });
  }
});
if (agent4Found === 0) console.log("Agent 4 found no obviously unused exports.");
