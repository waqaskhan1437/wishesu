import fs from 'fs';

const data = fs.readFileSync('tail_prankwish.log', 'utf-8');
const lines = data.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const log = JSON.parse(line);
    if (log.outcome !== 'ok' || (log.exceptions && log.exceptions.length > 0)) {
      console.log('--- ERROR FOUND ---');
      console.log('Outcome:', log.outcome);
      console.log('Exceptions:', JSON.stringify(log.exceptions, null, 2));
      console.log('Logs:', JSON.stringify(log.logs, null, 2));
    }
  } catch (e) {
    // Ignore invalid JSON
  }
}
console.log('Log analysis complete.');
