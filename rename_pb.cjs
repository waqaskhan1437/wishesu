const fs = require('fs');
const path = require('path');

const OLD_NAME = 'page-builder.html';
const NEW_NAME = 'page-builder-v2.html';

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(OLD_NAME) || content.includes('/page-builder')) {
    content = content.replace(/\/page-builder\.html/g, '/' + NEW_NAME);
    content = content.replace(/page-builder\.html/g, NEW_NAME);
    // Also handle `/page-builder` routing in index.js
    content = content.replace(/\/page-builder'/g, '/' + NEW_NAME.replace('.html', '') + "'");
    content = content.replace(/\/page-builder\/'/g, '/' + NEW_NAME.replace('.html', '') + "/'");
    content = content.replace(/\/page-builder"/g, '/' + NEW_NAME.replace('.html', '') + '"');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('dist')) {
        walk(fullPath);
      }
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.cjs') || fullPath.endsWith('.mjs') || fullPath.endsWith('.html')) {
      replaceInFile(fullPath);
    }
  }
}

// Rename the file
if (fs.existsSync('public/' + OLD_NAME)) {
  fs.renameSync('public/' + OLD_NAME, 'public/' + NEW_NAME);
  console.log(`Renamed public/${OLD_NAME} to public/${NEW_NAME}`);
}

walk('src');
walk('public');
walk('test');
replaceInFile('bump_version.cjs');
