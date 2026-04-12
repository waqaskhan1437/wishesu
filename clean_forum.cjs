const fs = require('fs');

// 1. Clean forum.js
let forumPath = 'src/controllers/forum.js';
let forumCode = fs.readFileSync(forumPath, 'utf8');

// Replace ensureForumTables definition with an empty function
const ensureTablesRegex = /async function ensureForumTables\(env\) \{[\s\S]*?forumSchemaValidationPromise = null;\s*\}/;
forumCode = forumCode.replace(ensureTablesRegex, 'async function ensureForumTables(env) { /* migrated to db.js */ }');

// Remove all calls to ensureForumTables(env);
forumCode = forumCode.replace(/\s*await ensureForumTables\(env\);/g, '');

// Replace ensureForumQuestionSlugHealth with an empty function
const slugHealthRegex = /async function ensureForumQuestionSlugHealth\(env\) \{[\s\S]*?forumSlugHealthPromise = null;\s*\}/;
forumCode = forumCode.replace(slugHealthRegex, 'async function ensureForumQuestionSlugHealth(env) { /* migrated to db.js */ }');

// Remove all calls to ensureForumQuestionSlugHealth(env);
forumCode = forumCode.replace(/\s*await ensureForumQuestionSlugHealth\(env\);/g, '');

// Replace normalizeExistingForumQuestionSlugs with an empty function
const normalizeSlugsRegex = /async function normalizeExistingForumQuestionSlugs\(env\) \{[\s\S]*?CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_questions_slug_unique[\s\S]*?\}\s*\)/;
// Wait, normalize has a loop and ends with `.run(); }`
const normalizeRegex2 = /async function normalizeExistingForumQuestionSlugs\(env\) \{[\s\S]*?\}\)\.run\(\);\s*\}/;
forumCode = forumCode.replace(normalizeRegex2, 'async function normalizeExistingForumQuestionSlugs(env) { /* migrated to db.js */ }');

// Also clear out the global variables used for caching these checks
forumCode = forumCode.replace(/let forumSchemaValidated = false;\nlet forumSchemaValidationPromise = null;\nlet forumSlugHealthChecked = false;\nlet forumSlugHealthPromise = null;/g, '');

fs.writeFileSync(forumPath, forumCode, 'utf8');
console.log('forum.js cleaned.');

// 2. Clean backup.js
let backupPath = 'src/controllers/backup.js';
let backupCode = fs.readFileSync(backupPath, 'utf8');
// remove ensureBackupsTable
const backupRegex = /async function ensureBackupsTable\(env\) \{[\s\S]*?cols\.add\('r2_key'\);\s*\}\s*\}/;
backupCode = backupCode.replace(backupRegex, '');
fs.writeFileSync(backupPath, backupCode, 'utf8');
console.log('backup.js cleaned.');

// 3. Update db.js
let dbPath = 'src/config/db.js';
let dbCode = fs.readFileSync(dbPath, 'utf8');

// Update backups table in db.js to include r2_key
const backupTableSearch = 'CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, size INTEGER DEFAULT 0, media_count INTEGER DEFAULT 0, data TEXT)';
const backupTableReplace = 'CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, size INTEGER DEFAULT 0, media_count INTEGER DEFAULT 0, data TEXT, r2_key TEXT)';
dbCode = dbCode.replace(backupTableSearch, backupTableReplace);

// Add idx_forum_questions_slug_unique to db.js initialization
const forumIndexSearch = 'CREATE INDEX IF NOT EXISTS idx_forum_replies_question ON forum_replies(question_id)';
const forumIndexReplace = 'CREATE INDEX IF NOT EXISTS idx_forum_replies_question ON forum_replies(question_id)`),\n        env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_questions_slug_unique ON forum_questions(slug)';
if (!dbCode.includes('idx_forum_questions_slug_unique')) {
  dbCode = dbCode.replace(forumIndexSearch, forumIndexReplace);
}

fs.writeFileSync(dbPath, dbCode, 'utf8');
console.log('db.js updated.');
