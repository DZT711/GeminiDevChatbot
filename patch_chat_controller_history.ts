import fs from 'fs';
const file = 'src/server/controllers/ChatController.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `    if (AgentFeatureFlags.USE_AGENT_CONTEXT_BUILDER) {
        const contextIntegrationService = new ContextIntegrationService();
        const contextRequest = ContextBuilderAdapter.toContextBuilderRequest(
            cleanPrompt,
            baseSystemPrompt,
            history || [],
            retrievedKnowledge,
            customInstructions,
            sandboxInstructionStr
        );`;

const replacement = `    if (AgentFeatureFlags.USE_AGENT_CONTEXT_BUILDER) {
        const contextIntegrationService = new ContextIntegrationService();
        const mappedHistory = (history || []).map((h: any) => ({
            role: h.role,
            content: h.parts.map((p: any) => p.text || '').join('\\n')
        }));
        
        const contextRequest = ContextBuilderAdapter.toContextBuilderRequest(
            cleanPrompt,
            baseSystemPrompt,
            mappedHistory,
            retrievedKnowledge,
            customInstructions,
            sandboxInstructionStr
        );`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
