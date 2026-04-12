const fs = require('fs');

const replacements = {
  'ðŸ“Š': '📊',
  'ðŸ¢': '🏢',
  'ðŸ“£': '📢',
  'ðŸ“Œ': '📌',
  'ðŸ“¤': '📤',
  'ðŸ”': '🔍',
  'ðŸ“‘': '📄'
};

const filesToFix = [
  'public/page-builder.html',
  'public/page-builder-v2.html'
];

filesToFix.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [bad, good] of Object.entries(replacements)) {
      if (content.includes(bad)) {
        content = content.split(bad).join(good);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Fixed emojis in ${file}`);
    }
  }
});

// Bump version
const OLD_VER = '29';
const NEW_VER = '30';

const filesToBump = [
  'public/page-builder-v2.html',
  'public/js/page-builder/loader.js',
  'public/js/page-builder/app.js'
];

filesToBump.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(new RegExp(`\\?v=${OLD_VER}`, 'g'), `?v=${NEW_VER}`);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Bumped ${file} to v=${NEW_VER}`);
  }
});

let toml = fs.readFileSync('wrangler.toml', 'utf8');
toml = toml.replace(`VERSION = "${OLD_VER}"`, `VERSION = "${NEW_VER}"`);
fs.writeFileSync('wrangler.toml', toml, 'utf8');
console.log(`Bumped wrangler.toml to v=${NEW_VER}`);
