const fs = require('fs');

let content = fs.readFileSync('src/agent/runtime/ExecutionArtifact.ts', 'utf8');
content = content.replace(/ArtifactMetadata/g, 'ExecutionArtifactMetadata');
fs.writeFileSync('src/agent/runtime/ExecutionArtifact.ts', content);

let reports = fs.readFileSync('reports/M02-02-Report.md', 'utf8');
reports = reports.replace(/ArtifactMetadata/g, 'ExecutionArtifactMetadata');
fs.writeFileSync('reports/M02-02-Report.md', reports);
