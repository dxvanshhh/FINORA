const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Replace string literals: 'http://localhost:8000/api...'
    const regex = /'http:\/\/localhost:8000\/api(.*?)'/g;
    if (regex.test(content)) {
        content = content.replace(regex, '`http://${window.location.hostname}:8000/api$1`');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content);
        console.log('Updated: ' + file);
    }
});
