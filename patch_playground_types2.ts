import fs from 'fs';
let content = fs.readFileSync('src/agent/playground/index.ts', 'utf8');

content = content.replace(
  "{ id: 'memory-mem-1', content: { color: 'blue' }, metadata: { label: 'favorite-color', userId: 'user-1' } }",
  "{ id: 'memory-mem-1', content: { color: 'blue' }, metadata: { label: 'favorite-color', userId: 'user-1' }, tags: [], relationships: [] }"
);

content = content.replace(
  "console.log('Learning generated promotions:', promotions.proposedKnowledge.length);",
  "console.log('Learning generated promotions:', promotions.proposedNodes?.length || 0);"
);

content = content.replace(
  "console.log('Noise Learning promotions (should be 0 or rejected):', rejectedPromotions.proposedKnowledge.length);",
  "console.log('Noise Learning promotions (should be 0 or rejected):', rejectedPromotions.proposedNodes?.length || 0);"
);

fs.writeFileSync('src/agent/playground/index.ts', content);
