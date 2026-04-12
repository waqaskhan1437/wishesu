const fs = require('fs');
let file = 'src/controllers/pages.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const slugOwner = await env\.DB\.prepare\(\s*'SELECT id FROM pages WHERE slug = \? LIMIT 1'\s*\)\.bind\(finalSlug\)\.first\(\);\s*if \(slugOwner && Number\(slugOwner\.id\) !== updateId\) \{\s*return json\(\{ error: 'slug already exists' \}, 409\);\s*\}/g,
  `let slugOwner = await env.DB.prepare('SELECT id FROM pages WHERE slug = ? LIMIT 1').bind(finalSlug).first();
    let baseSlug = finalSlug;
    let idx = 1;
    while (slugOwner && Number(slugOwner.id) !== updateId) {
      finalSlug = \`\${baseSlug}-\${idx++}\`;
      slugOwner = await env.DB.prepare('SELECT id FROM pages WHERE slug = ? LIMIT 1').bind(finalSlug).first();
    }`
);

content = content.replace(
  /const slugOwner = await env\.DB\.prepare\('SELECT id FROM pages WHERE slug = \? LIMIT 1'\)\.bind\(name\)\.first\(\);\s*if \(slugOwner && Number\(slugOwner\.id\) !== Number\(existing\.id\)\) \{\s*return json\(\{ error: 'slug already exists' \}, 409\);\s*\}/g,
  `let slugOwner = await env.DB.prepare('SELECT id FROM pages WHERE slug = ? LIMIT 1').bind(name).first();
    let baseName = name;
    let nameIdx = 1;
    while (slugOwner && Number(slugOwner.id) !== Number(existing.id)) {
      name = \`\${baseName}-\${nameIdx++}\`;
      slugOwner = await env.DB.prepare('SELECT id FROM pages WHERE slug = ? LIMIT 1').bind(name).first();
    }`
);

fs.writeFileSync(file, content);
console.log('pages.js updated');