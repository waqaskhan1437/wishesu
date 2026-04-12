const fs = require('fs');

let content = fs.readFileSync('src/index.js', 'utf8');

// Replace faqRegex block with empty catch block or remove it
content = content.replace(/\/\/ Extract FAQ items from[\s\S]*?catch \([^)]*\) \{\}/g, '// FAQ Extraction removed for performance');

fs.writeFileSync('src/index.js', content);
console.log('FAQ Extraction blocks removed.');