const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      let loopIndent = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // crude end loop detection based on indentation
        if (loopIndent !== -1) {
          const match = line.match(/^(\s*)\}/);
          if (match && match[1].length <= loopIndent) {
            loopIndent = -1; // End of loop block
          }
        }

        // detect loops
        if (/(for\s*\(|while\s*\(|.*\.forEach\(|.*\.map\()/.test(line)) {
          loopIndent = line.search(/\S/);
        }
        
        if (loopIndent !== -1 && line.includes('env.DB.prepare')) {
          console.log(`Possible loop DB hit in ${fullPath} at line ${i + 1}: ${line.trim()}`);
        }
      }
    }
  }
}

scanDir('./src');