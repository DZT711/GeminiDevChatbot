const fs = require('fs');
const content = fs.readFileSync('src/server/controllers/ChatController.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('if (reallyNeedsFallback')) {
        console.log((i+1) + ': ' + line);
    }
});
