const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'controllers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    // Look for lines containing return json({ error: ... }) without a status code (like 500)
    if (line.includes('return json({') && line.includes('error:') && !line.includes('},') && !line.match(/\}[ ]*,[ ]*[0-9]{3}/)) {
      console.log(`${f}:${i+1} => ${line.trim()}`);
    }
  });
});
