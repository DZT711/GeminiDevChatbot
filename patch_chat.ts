import fs from 'fs';
let content = fs.readFileSync('src/server/controllers/ChatController.ts', 'utf8');

const importTarget = "import { JWT_SECRET, getBaseUrl, txWithUser, resolveGoogleApiKey, determineRoutingStrategy } from './utils.js';\n\nexport const router = express.Router();";
const importReplacement = "import { JWT_SECRET, getBaseUrl, txWithUser, resolveGoogleApiKey, determineRoutingStrategy } from './utils.js';\nimport { AgentFeatureFlags } from '../services/agentIntegration/AgentFeatureFlags.js';\nimport { AgentAdapter } from '../services/agentIntegration/AgentAdapter.js';\nimport { AgentIntegrationService } from '../services/agentIntegration/AgentIntegrationService.js';\n\nexport const router = express.Router();";

content = content.replace(importTarget, importReplacement);

const boundaryTarget = `    } else {
      routingStrategy = await determineRoutingStrategy(cleanPrompt, apiKey, provider, customBaseUrl, userId);
      sendEvent('routing', { strategy: routingStrategy, forced: false });
    }`;

const boundaryReplacement = `    } else {
      routingStrategy = await determineRoutingStrategy(cleanPrompt, apiKey, provider, customBaseUrl, userId);
      sendEvent('routing', { strategy: routingStrategy, forced: false });
    }

    // --- M04-01 AGENT INTEGRATION BOUNDARY ---
    if (AgentFeatureFlags.USE_AGENT_RUNTIME) {
        const agentRequest = AgentAdapter.toAgentRequest(req.body, cleanPrompt, routingStrategy, userId, apiKey);
        const integrationService = new AgentIntegrationService();
        await integrationService.handleRequest(agentRequest, res);
        return;
    }
    // -----------------------------------------`;

content = content.replace(boundaryTarget, boundaryReplacement);

fs.writeFileSync('src/server/controllers/ChatController.ts', content);
