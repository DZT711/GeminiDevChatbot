import fs from 'fs';
const file = 'src/server/controllers/ChatController.ts';
let content = fs.readFileSync(file, 'utf8');

const targetImports = "import { PromptContextMapper } from '../services/agentIntegration/context/PromptContextMapper.js';";
const replacementImports = "import { PromptContextMapper } from '../services/agentIntegration/context/PromptContextMapper.js';\nimport { ExecutionIntegrationService } from '../services/agentIntegration/execution/ExecutionIntegrationService.js';\nimport { AgentFeatureFlags } from '../services/agentIntegration/AgentFeatureFlags.js';";

content = content.replace(targetImports, replacementImports);

const startIndex = content.indexOf("if (fc.name === 'proposeKnowledge') {");
const endText = "toolResponses.push({ functionResponse: { name: fc.name, response: { status: \"success\" } } });\n            }";
const endIndex = content.indexOf(endText) + endText.length;

if (startIndex !== -1 && endIndex !== -1) {
    const originalBlock = content.substring(startIndex, endIndex);
    
    // We replace $ with $$ in replace string
    const replacementBlock = `if (AgentFeatureFlags.USE_EXECUTION_PIPELINE) {
              try {
                  const execIntegration = new ExecutionIntegrationService();
                  await execIntegration.registerProductionTools(payload, sendEvent);
                  const result = await execIntegration.executeTool(fc.name, fc.args);
                  toolResponses.push({ functionResponse: { name: fc.name, response: result } });
              } catch (err: any) {
                  console.error(\`[ExecutionPipeline] Error executing \${fc.name}:\`, err);
                  toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
              }
            } else {
              ` + originalBlock + `
            }`;
            
    content = content.substring(0, startIndex) + replacementBlock + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log("Patched correctly!");
} else {
    console.error("COULD NOT FIND START/END!");
}
