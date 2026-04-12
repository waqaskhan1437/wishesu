const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const replacements = {
    'â†': '←',
    'â†©': '↺',
    'â†ª': '↻',
    'ðŸŽ¨': '🎨',
    'ðŸ–¥ï¸': '🖥️',
    'ðŸ“±': '📱',
    'ðŸ“²': '📲',
    'ðŸ“‚': '📂',
    'ðŸ‘ï¸': '👁️',
    'ðŸ’¾': '💾',
    'âš¡': '⚡',
    'ðŸ ': '🏠',
    'ðŸ“': '📝',
    'ðŸ’¬': '💬',
    'ðŸ›’': '🛒',
    'ðŸ“¦': '📦',
    'ðŸŽ¯': '🎯',
    'â­': '⭐',
    'ðŸ“¢': '📣',
    'ðŸ“„': '📄',
    'ðŸ›ï¸': '🛍️',
    'ðŸ“°': '📰',
    'â“': '❓',
    'Ã¢Â­Â': '⭐',
    'â–¥': '◫',
    'ðŸ–¼ï¸': '🖼️',
    'âš™ï¸': '⚙️',
    'âŒ': '❌',
    'ðŸ”¼': '🔼',
    'ðŸ”½': '🔽',
    'âž•': '➕',
    'ðŸ“‹': '📋',
    'ðŸ–¼': '🖼️',
    'ðŸ”§': '🔧',
    'ðŸ’»': '💻',
    'ðŸŒ': '🌐',
    'ðŸš€': '🚀',
    'âœ¨': '✨',
    'ðŸ”‘': '🔑',
    'â†‘': '↑',
    'â†“': '↓',
    'ðŸ—‘ï¸': '🗑️',
    'âŒ¨ï¸': '⌨️',
    'ðŸ’¡': '💡',
    'â–¶ï¸': '▶️',
    'â°': '⏱️',
    'âž–': '➖',
    'â—„': '◀',
    'â–º': '▶',
    'ðŸ”„': '🔄',
    'ðŸš§': '🚧'
  };
  
  let changed = false;
  for (const [bad, good] of Object.entries(replacements)) {
    if (content.includes(bad)) {
      content = content.split(bad).join(good);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed emojis in ${filePath}`);
  }
}

const filesToFix = [
  'public/page-builder.html',
  'public/page-builder-v2.html',
  'public/js/page-builder/ui.js',
  'public/js/page-builder/app.js',
  'public/js/page-builder/loader.js',
  'public/js/page-builder/widgets.js',
  'public/js/page-builder/section-templates.js',
  'public/js/page-builder/page-templates.js'
];

filesToFix.forEach(fixFile);
