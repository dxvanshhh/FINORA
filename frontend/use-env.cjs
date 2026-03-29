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

    // Replace dynamic window.location.hostname patterns with Vite env var
    const pattern1 = /`http:\/\/\$\{window\.location\.hostname\}:8000\/api(.*?)`/g;
    if (pattern1.test(content)) {
        content = content.replace(pattern1, "`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`}$1`");
        modified = true;
    }

    // Replace const API_URL = ... patterns
    const pattern2 = /const API(?:_URL)? = `http:\/\/\$\{window\.location\.hostname\}:8000\/api`;/g;
    if (pattern2.test(content)) {
        content = content.replace(pattern2, "const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`;");
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content);
        console.log('✅ Updated: ' + file);
    }
});
console.log('Done.');
