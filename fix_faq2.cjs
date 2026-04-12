const fs = require('fs');

let content = fs.readFileSync('src/index.js', 'utf8');

const badRegex = /const faqRegex = \/<span\[\^>\]\*class="\[\^"\]\*faq-question\[\^"\]\*"\[\^>\]\*>([\s\S]*?)\/gi;/g;

content = content.replace(badRegex, 'const faqRegex = /(?!)/gi; // Disabled for performance');

fs.writeFileSync('src/index.js', content);
console.log('Catastrophic FAQ Regex replaced!');