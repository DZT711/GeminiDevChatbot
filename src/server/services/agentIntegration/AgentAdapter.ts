import { AgentRequest, AgentExecutionMode, AgentResponse, CodingRequestContext } from './types.js';
import { DEFAULT_CHAT_MODEL } from '../../../agent/agent.config.js';
import { sanitizeModel } from './AgentIntegrationService.js';

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

        const rawProvider = reqBody.provider || 'google';
        const normalizedModel = sanitizeModel(reqBody.model, rawProvider);
        const interactionType = (reqBody.interactionType === 'AGENT' || reqBody.interactionType === 'CHAT')
            ? reqBody.interactionType
            : (reqBody.workspaceId || reqBody.codingContext ? 'AGENT' : 'CHAT');
        const surface = reqBody.surface || (interactionType === 'AGENT' ? 'AGENT' : 'CHAT');

        return {
            prompt: reqBody.prompt,
            cleanPrompt: cleanPrompt,
            history: reqBody.history || [],
            model: normalizedModel,
            rawModel: reqBody.model,
            activeSkillIds: reqBody.activeSkillIds || [],
            useSearch: reqBody.useSearch || false,
            thinkingLevel: reqBody.thinkingLevel || 0,
            provider: rawProvider,
            userId,
            apiKey,
            customBaseUrl: reqBody.customBaseUrl,
            customInstructions: reqBody.customInstructions,
            routingStrategy: mode,
            sessionId: reqBody.sessionId,
            workspaceId: reqBody.workspaceId,
            codingContext: reqBody.codingContext || (reqBody.currentFile || reqBody.selectedCode || reqBody.selection ? {
                sessionId: reqBody.sessionId,
                workspaceId: reqBody.workspaceId,
                currentFile: reqBody.currentFile,
                selectedCode: reqBody.selectedCode,
                selection: reqBody.selection,
                workspaceState: reqBody.workspaceState,
                openFiles: reqBody.openFiles
            } : undefined),
            interactionType,
            surface,
            userMessageId: reqBody.userMessageId,
            assistantMessageId: reqBody.assistantMessageId,
            parentMessageId: reqBody.parentMessageId
        };
    }

    static fromChatRequest(
        reqBody: any,
        model: string = DEFAULT_CHAT_MODEL,
        userId: string = 'default_user',
        apiKey: string = 'default_key'
    ): AgentRequest {
        return AgentAdapter.toAgentRequest(
            { ...reqBody, model: reqBody.model || model },
            reqBody.prompt || '',
            'DIRECT_CHAT',
            userId,
            apiKey
        );
    }

    static enrichPromptWithContext(prompt: string, context?: CodingRequestContext): string {
        if (!context) return prompt;
        const parts: string[] = [prompt];
        if (context.currentFile) {
            parts.push(`\n[Active File: ${context.currentFile}]`);
        }
        if (context.selectedCode) {
            parts.push(`\n[Selected Code Snippet:\n\`\`\`\n${context.selectedCode}\n\`\`\`]`);
        }
        if (context.openFiles && context.openFiles.length > 0) {
            parts.push(`\n[Open Files: ${context.openFiles.join(', ')}]`);
        }
        if (context.planContext) {
            const pc = context.planContext;
            parts.push(`\n[Plan Context: Goal ${pc.goalId}, Plan ${pc.planId}${pc.taskId ? `, Task: ${pc.taskId}` : ''}]`);
            if (pc.goalSummary) {
                parts.push(`[Goal: ${pc.goalSummary}]`);
            }
            if (pc.taskSummary) {
                parts.push(`[Current Task: ${pc.taskSummary}]`);
            }
            if (pc.completedTasks && pc.completedTasks.length > 0) {
                parts.push(`[Completed Tasks: ${pc.completedTasks.join(', ')}]`);
            }
        }
        return parts.join('\n');
    }

    static handleAgentResponse(res: any, response: AgentResponse) {
        if (response.type === 'end') {
            res.write(`event: end\ndata: {}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ type: response.type, data: response.data })}\n\n`);
        }
    }
}
