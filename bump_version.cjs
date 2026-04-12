const fs = require('fs');
const path = require('path');
const version = '?v=28';

function updateFile(file) {
    if(!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Handle HTML files script src and link href
    if (file.endsWith('.html')) {
        content = content.replace(/(\/js\/page-builder\/loader\.js)(\?v=\d+)?/g, `$1${version}`);
        content = content.replace(/(\/css\/page-builder-loader\.css)(\?v=\d+)?/g, `$1${version}`);
    } 
    // Handle JS files imports
    else if (file.endsWith('.js')) {
        content = content.replace(/(from\s+['"]\.\/[^'"]+\.js)(\?v=\d+)?(['"])/g, `$1${version}$3`);
        content = content.replace(/(import\(['"]\.\/[^'"]+\.js)(\?v=\d+)?(['"]\))/g, `$1${version}$3`);
    }

    if(original !== content) {
        fs.writeFileSync(file, content);
        console.log('Updated:', file);
    }
}

const htmlFiles = [
    'public/page-builder.html',
    'public/admin/landing-builder.html'
];
htmlFiles.forEach(updateFile);

const jsDir = 'public/js/page-builder';
if(fs.existsSync(jsDir)){
    fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).forEach(f => {
        updateFile(path.join(jsDir, f));
    });
}
