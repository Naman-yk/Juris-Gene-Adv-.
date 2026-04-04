const fs = require('fs');
const path = require('path');

// Render's `property: host` gives bare hostnames without protocol
function ensureProtocol(url) {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

const proUiUrl = ensureProtocol(process.env.PRO_UI_URL || 'http://localhost:3000');
const backendUrl = ensureProtocol(process.env.BACKEND_URL || 'http://localhost:3001');

console.log('[replace-urls] PRO_UI_URL:', proUiUrl);
console.log('[replace-urls] BACKEND_URL:', backendUrl);
const assetDirs = [
    path.join(__dirname, 'intelligence-engine', 'Frontend', 'assets'),
    path.join(__dirname, 'Frontend', 'assets')
];

assetDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    
    // Process HTML, JS, and TS files
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.ts'));
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        let newContent = content.replace(/http:\/\/localhost:3000/g, proUiUrl);
        newContent = newContent.replace(/http:\/\/localhost:3001/g, backendUrl);
        newContent = newContent.replace(/http:\/\/localhost:8000\/pro/g, '/pro');
        
        // Also fix branding in index.html and why-world.html
        if (file === 'index.html') {
            newContent = newContent.replace(/Infrastructure for India/g, 'Global Legal Infrastructure');
            newContent = newContent.replace(/"J\. Singh"/g, '"John Doe"');
        }
        if (file === 'why-world.html') {
            newContent = newContent.replace(/₹2,000–₹10,000\+/g, '$50–$500+');
            newContent = newContent.replace(/tier-2 cities/g, 'growing global markets');
        }
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            console.log(`Updated ${filePath}`);
        }
    });
});
