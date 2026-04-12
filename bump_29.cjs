const fs = require('fs');

const OLD_VER = '28';
const NEW_VER = '29';

const filesToBump = [
  'public/page-builder-v2.html',
  'public/js/page-builder/loader.js',
  'public/js/page-builder/app.js'
];

filesToBump.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(new RegExp(`\\?v=${OLD_VER}`, 'g'), `?v=${NEW_VER}`);
    fs.writeFileSync(file, content);
    console.log(`Bumped ${file} to v=${NEW_VER}`);
  }
});

let toml = fs.readFileSync('wrangler.toml', 'utf8');
toml = toml.replace(`VERSION = "${OLD_VER}"`, `VERSION = "${NEW_VER}"`);
fs.writeFileSync('wrangler.toml', toml);
console.log('Bumped wrangler.toml to v=29');
