const fs = require('fs');

const content = fs.readFileSync('src/config/db.js', 'utf8');

const createTableRegex = /CREATE TABLE IF NOT EXISTS\s+([a-z_]+)\s*\(([\s\S]*?)\)/g;
const createIndexRegex = /CREATE UNIQUE INDEX IF NOT EXISTS\s+([a-z_]+)\s+ON\s+([a-z_]+)\s*\(([\s\S]*?)\)/g;

let match;
console.log("--- Tables without UNIQUE columns ---");
while ((match = createTableRegex.exec(content)) !== null) {
  const tableName = match[1];
  const columns = match[2];
  if (!columns.includes('UNIQUE') && !columns.includes('PRIMARY KEY')) {
     console.log(`Table ${tableName} has NO primary key or unique column.`);
  } else if (!columns.includes('UNIQUE')) {
     // Check if it's just an id primary key
     const noIdColumns = columns.replace(/id INTEGER PRIMARY KEY( AUTOINCREMENT)?/g, '');
     if (!noIdColumns.includes('PRIMARY KEY') && !noIdColumns.includes('UNIQUE')) {
         console.log(`Table ${tableName} has no UNIQUE constraints (only Primary Key).`);
     }
  }
}

console.log("\n--- Unique Indexes ---");
while ((match = createIndexRegex.exec(content)) !== null) {
  console.log(`Index ${match[1]} on ${match[2]}(${match[3]})`);
}
