const fs = require('fs');
const files = [
  'src/controllers/admin.js',
  'src/controllers/analytics.js',
  'src/controllers/backup.js',
  'src/controllers/email.js',
  'src/controllers/payment-universal.js',
  'src/controllers/settings-clean.js',
  'src/controllers/settings-media.js'
];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // Simple regex to match the start of the function and capture until we see catch (...) { ... } }
  // We know that these functions all end with `} catch (e) { ... } }` or just `}`.
  const regex = /async function ensure[A-Za-z0-9_]+\(env\)\s*\{[\s\S]*?(?:console\.error\([^)]+\);\s*\}\s*\}|\}\s*catch\s*\([^\)]+\)\s*\{\s*\})/g;
  let matches = content.match(regex);
  if (matches) {
    matches.forEach(m => console.log('File:', f, '\nMATCHED:\n', m, '\n---\n'));
  }
  
  // also check settings-media which is just `async function ensureMediaTable(env) { ... }` 
  // It has a loop `for (...) { try { ... } catch (_) { ... } } }`
  const regex2 = /async function ensureMediaTable\(env\)\s*\{[\s\S]*?catch\s*\(_\)\s*\{\s*\/\/\s*Column.*?\s*\}\s*\}\s*\}/g;
  let matches2 = content.match(regex2);
  if (matches2) {
    matches2.forEach(m => console.log('File:', f, '\nMATCHED MEDIA:\n', m, '\n---\n'));
  }
});
