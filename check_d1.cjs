const { execSync } = require('child_process');
try {
  console.log("Checking components table...");
  let out1 = execSync('npx wrangler d1 execute secure-shop-db --remote --json --command "SELECT name, html FROM components WHERE html LIKE \'%lorem%\'"', { encoding: 'utf-8' });
  console.log(out1);
  
  console.log("Checking pages table again...");
  let out2 = execSync('npx wrangler d1 execute secure-shop-db --remote --json --command "SELECT id, slug, title FROM pages WHERE content LIKE \'%lorem%\' OR content LIKE \'%ipsum%\'"', { encoding: 'utf-8' });
  console.log(out2);
} catch (e) {
  console.error(e.stdout);
  console.error(e.stderr);
}