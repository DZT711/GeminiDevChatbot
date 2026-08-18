import fs from 'fs';
const file = 'src/server/controllers/ChatController.ts';
let content = fs.readFileSync(file, 'utf8');

const targetLoopStart = "for (const fc of chunk.functionCalls) {";
const replacementLoopStart = `let execIntegration: any = null;
          if (AgentFeatureFlags.USE_EXECUTION_PIPELINE) {
              execIntegration = new ExecutionIntegrationService();
              await execIntegration.registerProductionTools(payload, sendEvent);
          }
          for (const fc of chunk.functionCalls) {`;

content = content.replace(targetLoopStart, replacementLoopStart);

const targetBlock = `            if (AgentFeatureFlags.USE_EXECUTION_PIPELINE) {
              try {
                  const execIntegration = new ExecutionIntegrationService();
                  await execIntegration.registerProductionTools(payload, sendEvent);
                  const result = await execIntegration.executeTool(fc.name, fc.args);
                  toolResponses.push({ functionResponse: { name: fc.name, response: result } });
              } catch (err: any) {
                  console.error(\`[ExecutionPipeline] Error executing \${fc.name}:\`, err);
                  toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
              }
            } else {`;

const replacementBlock = `            if (AgentFeatureFlags.USE_EXECUTION_PIPELINE) {
              try {
                  const result = await execIntegration.executeTool(fc.name, fc.args);
                  toolResponses.push({ functionResponse: { name: fc.name, response: result } });
              } catch (err: any) {
                  console.error(\`[ExecutionPipeline] Error executing \${fc.name}:\`, err);
                  toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
              }
            } else {`;

const index = content.indexOf(targetBlock);
if (index !== -1) {
    content = content.replace(targetBlock, replacementBlock);
    fs.writeFileSync(file, content);
    console.log("Patched loop init!");
} else {
    console.error("COULD NOT FIND BLOCK TO REPLACE!");
}
