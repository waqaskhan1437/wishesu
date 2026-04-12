const { execSync } = require('child_process');
try {
  console.log("Checking pages table...");
  let out = execSync('npx wrangler d1 execute secure-shop-db --remote --json --command "SELECT id, slug, title FROM pages WHERE content LIKE \'%lorem%\' OR content LIKE \'%ipsum%\'"', { encoding: 'utf-8' });
  console.log(out);
} catch (e) {
  console.error(e.stdout);
  console.error(e.stderr);
}