const fs = require('fs');

let content = fs.readFileSync('src/server/controllers/utils.ts', 'utf8');

const oldFunc = `export async function determineRoutingStrategy(userQuery: string, apiKey: string): Promise<'USE_RAG' | 'DIRECT_CHAT'> {
  try {
    const aiInstance = di.llmService.getClient(apiKey);`;

const newFunc = `export async function determineRoutingStrategy(userQuery: string, apiKey: string, provider?: string, customBaseUrl?: string, userId?: string): Promise<'USE_RAG' | 'DIRECT_CHAT'> {
  try {
    let routeApiKey = apiKey;
    let routeProvider = provider;
    let routeBaseUrl = customBaseUrl;
    
    if (provider && provider !== 'google') {
       const googleKey = userId ? await resolveGoogleApiKey(userId, undefined, 'google') : undefined;
       if (googleKey) {
          routeApiKey = googleKey;
          routeProvider = 'google';
          routeBaseUrl = undefined;
       } else {
          return 'DIRECT_CHAT';
       }
    }
    
    const aiInstance = di.llmService.getClient(routeApiKey, routeBaseUrl, routeProvider);`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync('src/server/controllers/utils.ts', content);
