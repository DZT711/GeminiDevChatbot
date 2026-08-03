const fs = require('fs');

let content = fs.readFileSync('src/server/controllers/ChatController.ts', 'utf8');

content = content.replace(
  `routingStrategy = await determineRoutingStrategy(cleanPrompt, apiKey);`,
  `routingStrategy = await determineRoutingStrategy(cleanPrompt, apiKey, provider, customBaseUrl, userId);`
);

fs.writeFileSync('src/server/controllers/ChatController.ts', content);
