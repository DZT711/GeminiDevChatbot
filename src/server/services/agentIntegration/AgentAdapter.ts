import { AgentRequest, AgentExecutionMode, AgentResponse } from './types.js';

export class AgentAdapter {
    static toAgentRequest(
        reqBody: any, 
        cleanPrompt: string, 
        routingStrategy: string, 
        userId: string, 
        apiKey: string
    ): AgentRequest {
        let mode = AgentExecutionMode.DIRECT_CHAT;
        if (routingStrategy === 'USE_RAG') {
            mode = AgentExecutionMode.USE_RAG;
        } else if (reqBody.prompt && reqBody.prompt.match(/^\/sandbox\s+/i)) {
            mode = AgentExecutionMode.USE_SANDBOX;
        }

        return {
            prompt: reqBody.prompt,
            cleanPrompt: cleanPrompt,
            history: reqBody.history || [],
            model: reqBody.model || 'gemini-2.5-pro',
            activeSkillIds: reqBody.activeSkillIds || [],
            useSearch: reqBody.useSearch || false,
            thinkingLevel: reqBody.thinkingLevel || 0,
            provider: reqBody.provider || 'google',
            userId,
            apiKey,
            customBaseUrl: reqBody.customBaseUrl,
            customInstructions: reqBody.customInstructions,
            routingStrategy: mode,
        };
    }

    static handleAgentResponse(res: any, response: AgentResponse) {
        if (response.type === 'end') {
            res.write(`event: end\ndata: {}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ type: response.type, data: response.data })}\n\n`);
        }
    }
}
