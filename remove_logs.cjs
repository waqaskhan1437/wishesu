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
let totalRemoved = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const initialLength = content.length;
  
  // Remove single line console.log statements
  // This regex matches lines that only contain console.log(something)
  const lines = content.split('\n');
  const newLines = lines.filter(line => {
    if (line.match(/^\s*console\.log\([^;]*\);?\s*$/)) {
      totalRemoved++;
      return false; // remove line
    }
    return true; // keep line
  });
  
  const newContent = newLines.join('\n');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Cleaned ${path.basename(file)}`);
  }
});

console.log(`Total useless console.log lines removed: ${totalRemoved}`);
