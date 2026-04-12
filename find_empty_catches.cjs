const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'controllers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const catchRegex = /catch\s*\(\s*[a-zA-Z0-9_]+\s*\)\s*\{([\s\S]*?)\}/g;
  let match;
  while ((match = catchRegex.exec(content)) !== null) {
    const block = match[1];
    if (!block.includes('return') && !block.includes('throw')) {
      if (block.includes('env.DB') || block.trim() === '' || block.includes('console.log') || block.includes('console.error')) {
        console.log(`[${f}] Empty/Swallowing Catch block at char index ${match.index}:`);
        console.log(block.trim());
        console.log('---');
      }
    }
  }
});
