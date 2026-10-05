import { AgentRequest } from './types.js';
import { AgentAdapter } from './AgentAdapter.js';
import { AgentFeatureFlags } from './AgentFeatureFlags.js';
import { RetrieverAdapter } from './retrieval/RetrieverAdapter.js';
import { ContextIntegrationService } from './context/ContextIntegrationService.js';
import { ContextBuilderAdapter } from './context/ContextBuilderAdapter.js';
import { PromptContextMapper } from './context/PromptContextMapper.js';
import { ExecutionIntegrationService } from './execution/ExecutionIntegrationService.js';
import { formatInteractivePlanContextPrompt } from '../../../agent/context/InteractivePlanContext.js';
import { BrainIntegrationBridge } from '../brain/BrainIntegrationBridge.js';
import { DEFAULT_CHAT_MODEL, FALLBACK_CHAT_MODEL, PRO_CHAT_MODEL, FLASH_3_8_CHAT_MODEL, isThoughtSignatureModel, getThinkingConfigForModel } from '../../../agent/agent.config.js';
import { di } from '../../di.js';
import { appendSystemLog } from '../../logInterceptor.js';
import { AgentRuntime } from '../../../agent/runtime/AgentRuntime.js';
import { activeCommandRegistry } from '../../workspace/activeCommandRegistry.js';

export interface ActiveAgentExecution {
    executionId: string;
    sessionId?: string;
    workspaceId?: string;
    userId: string;
    abortController: AbortController;
    cancelled: boolean;
    runtime: AgentRuntime;
    startedAt?: number;
}

export function sanitizeModel(model?: string, provider?: string): string {
    if (provider === 'openrouter') {
        return model || 'google/gemini-2.5-flash';
    }
    if (!model) return DEFAULT_CHAT_MODEL;

    // 1. Remove leading provider / path prefixes (e.g., 'google/', 'models/')
    let clean = model.replace(/^(google\/|models\/)/i, '').trim();

    // 2. Remove batch / test / free / preview suffixes if present
    clean = clean.replace(/:(batch|free)$/i, '');
    clean = clean.replace(/\s*\((TEST|BETA|FREE)\)$/i, '');

    // 3. Remap discontinued or deprecated model versions to active models
    if (clean === 'gemini-2.5-pro' || clean === 'gemini-2.0-pro-exp-02-05' || clean === 'gemini-2.0-pro') {
        clean = PRO_CHAT_MODEL;
    } else if (clean === 'gemini-2.5-flash' || clean === 'gemini-2.0-flash' || clean === 'gemini-2.0-flash-exp') {
        clean = DEFAULT_CHAT_MODEL;
    }

    return clean || DEFAULT_CHAT_MODEL;
}

/**
 * Automatically adapts multi-turn contents when changing or switching models.
 * If previous turns contain tool calls that lack a cryptographic thoughtSignature,
 * or when switching across model architectures, converts them into contextual narrative
 * transcripts so that models requiring thought signatures (e.g. Gemini 3.8 Flash, 3.7 Flash,
 * 3.1 Flash Lite, 2.5 Pro) can parse the full context without throwing INVALID_ARGUMENT (missing thought_signature).
 */
export function adaptContentsForModelSwitch(contents: any[], targetModel?: string): any[] {
    if (!Array.isArray(contents)) return contents;
    const isTargetNonGoogle = targetModel && targetModel.includes('/') && !targetModel.startsWith('google/');

    return contents.map((turn: any) => {
        if (!turn.parts || !Array.isArray(turn.parts)) return turn;
        const turnModel = turn.modelUsed || turn.modelName || turn.model;
        const isModelDifferent = targetModel && turnModel && (turnModel !== targetModel);

        if (turn.role === 'model') {
            const newParts: any[] = [];
            for (const part of turn.parts) {
                if (part.functionCall) {
                    const sig = part.thoughtSignature || part.thought_signature || part.functionCall?.thoughtSignature || part.functionCall?.thought_signature;
                    if (isTargetNonGoogle || isModelDifferent || !sig) {
                        const argsStr = JSON.stringify(part.functionCall.args || {});
                        newParts.push({ text: `[Action: Executed tool '${part.functionCall.name}' with parameters: ${argsStr}]` });
                    } else {
                        newParts.push(part);
                    }
                } else if (part.thought) {
                    if (isTargetNonGoogle) {
                        continue;
                    }
                    newParts.push(part);
                } else {
                    newParts.push(part);
                }
            }
            return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: 'Acknowledged.' }] };
        } else if (turn.role === 'user') {
            const newParts: any[] = [];
            for (const part of turn.parts) {
                if (part.functionResponse) {
                    if (isTargetNonGoogle || isModelDifferent) {
                        const respStr = typeof part.functionResponse.response === 'object'
                            ? JSON.stringify(part.functionResponse.response)
                            : String(part.functionResponse.response);
                        newParts.push({ text: `[Tool Result for '${part.functionResponse.name}': ${respStr}]` });
                    } else {
                        newParts.push(part);
                    }
                } else {
                    newParts.push(part);
                }
            }
            return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: 'Please proceed.' }] };
        }
        return turn;
    });
}

export function sanitizeAllToolTurnsToText(contents: any[]): any[] {
    return contents.map((turn: any) => {
        if (!turn.parts || !Array.isArray(turn.parts)) return turn;
        if (turn.role === 'model') {
            const newParts: any[] = [];
            for (const part of turn.parts) {
                if (part.functionCall) {
                    const argsStr = JSON.stringify(part.functionCall.args || {});
                    newParts.push({ text: `[Action: Executed tool '${part.functionCall.name}' with parameters: ${argsStr}]` });
                } else if (part.thought) {
                    continue;
                } else {
                    newParts.push(part);
                }
            }
            return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: 'Acknowledged.' }] };
        } else if (turn.role === 'user') {
            const newParts: any[] = [];
            for (const part of turn.parts) {
                if (part.functionResponse) {
                    const respStr = typeof part.functionResponse.response === 'object'
                        ? JSON.stringify(part.functionResponse.response)
                        : String(part.functionResponse.response);
                    newParts.push({ text: `[Tool Result for '${part.functionResponse.name}': ${respStr}]` });
                } else {
                    newParts.push(part);
                }
            }
            return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: 'Please proceed.' }] };
        }
        return turn;
    });
}

export class AgentIntegrationService {
    public static activeExecutions: Map<string, ActiveAgentExecution> = new Map();

    /**
     * Authoritatively stops/cancels an active agent execution by executionId, sessionId, or workspaceId.
     */
    public static stopExecution(identifier: { executionId?: string; sessionId?: string; workspaceId?: string }): boolean {
        let stopped = false;
        for (const [key, active] of AgentIntegrationService.activeExecutions.entries()) {
            if (
                (identifier.executionId && active.executionId === identifier.executionId) ||
                (identifier.sessionId && active.sessionId === identifier.sessionId) ||
                (identifier.workspaceId && active.workspaceId === identifier.workspaceId)
            ) {
                active.cancelled = true;
                active.abortController.abort();
                active.runtime.cancelExecution(active.executionId, 'Execution stopped by user').catch(() => {});

                // Authoritatively abort any terminal command bound to this execution or session
                activeCommandRegistry.abort(active.executionId);
                if (active.sessionId) {
                    activeCommandRegistry.abort(active.sessionId);
                }

                if (active.sessionId) {
                    di.agentSessionService.setStatus(active.sessionId, 'PAUSED', active.userId).catch(() => {});
                    di.agentSessionService.emitSessionEvent({
                        type: 'session_status_changed',
                        sessionId: active.sessionId,
                        workspaceId: active.workspaceId,
                        timestamp: Date.now(),
                        data: {
                            previousStatus: 'BUSY',
                            newStatus: 'PAUSED',
                            reason: 'User stopped execution'
                        }
                    });
                    di.agentSessionService.emitSessionEvent({
                        type: 'terminal_event',
                        sessionId: active.sessionId,
                        executionId: active.executionId,
                        workspaceId: active.workspaceId,
                        timestamp: Date.now(),
                        data: {
                            type: 'terminal_exit',
                            action: 'stop',
                            executionId: active.executionId,
                            exitCode: 130,
                            isAborted: true,
                            reason: 'User stopped execution'
                        }
                    });
                }
                AgentIntegrationService.activeExecutions.delete(key);
                stopped = true;
            }
        }
        return stopped;
    }

    /**
     * Entry point for the new Agent Runtime pipeline.
     */
    async handleRequest(request: AgentRequest, res: any): Promise<void> {
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const abortController = new AbortController();
        const runtime = new AgentRuntime();
        runtime.createExecution(request.sessionId, executionId);
        const activeExecution: ActiveAgentExecution = {
            executionId,
            sessionId: request.sessionId,
            workspaceId: request.workspaceId,
            userId: request.userId,
            abortController,
            cancelled: false,
            runtime
        };
        AgentIntegrationService.activeExecutions.set(executionId, activeExecution);

        const sendEvent = (type: any, data: any) => {
            if (activeExecution.cancelled) return;
            if (type === 'end') {
                AgentAdapter.handleAgentResponse(res, { type: 'end', data: {} });
            } else {
                AgentAdapter.handleAgentResponse(res, { type, data });
            }
        };

        let activeModel = sanitizeModel(request.model || request.rawModel, request.provider);
        let accumulatedFinalText = '';

        try {
            await runtime.startExecution(executionId);
            const baseSystemPrompt = `You are GeminiDevChatbot, an elite AI Software Engineering Assistant explicitly customized for the development, maintenance, and optimization of this repository.

### CORE OPERATING RULES
1. Strict Grounding: Analyze and formulate responses using the codebase context or any attached repository context provided.
2. File Path References: State full file paths wherever pertinent.
3. TypeScript Excellence: Ensure any code provided is valid, strictly typed TypeScript.
4. Repository Context: When the user attaches or links a repository (or asks about a repository/project), use the provided repository details and use the \`read_github_repo\` tool if you need to fetch specific file contents (such as README.md, package.json, or source code) or explore the file tree.`;

            let cleanPrompt = request.cleanPrompt;
            let sandboxInstructions = '';
            if (request.routingStrategy === 'USE_SANDBOX') {
                sandboxInstructions = `### MANDATORY SANDBOX INSTRUCTION\nThe user has explicitly requested to run code in the sandbox for this query. You MUST use the \`execute_code\` tool to write and execute the code to solve the user's prompt. After receiving the output, present the results clearly to the user.`;
                cleanPrompt = `Please write and execute the code to solve this, using the execute_code tool. Query: ${cleanPrompt}`;
            }

            // 1. Retrieve Knowledge
            let retrievedDocs: { id: string; content: string }[] | undefined = undefined;
            if (AgentFeatureFlags.USE_AGENT_RETRIEVER && request.routingStrategy === 'USE_RAG') {
                const retriever = new RetrieverAdapter(request.userId, request.apiKey, request.provider, request.customBaseUrl);
                retrievedDocs = await retriever.retrieveKnowledge(cleanPrompt, sendEvent);
            }

            // 2. Build Context
            let finalSystemPrompt = baseSystemPrompt;
            if (AgentFeatureFlags.USE_AGENT_CONTEXT_BUILDER) {
                const simpleHistory = request.history.map((h: any) => ({
                    role: h.role,
                    content: h.parts.map((p: any) => p.text || '').join('\n')
                }));
                const reqContext = ContextBuilderAdapter.toContextBuilderRequest(
                    cleanPrompt,
                    baseSystemPrompt,
                    simpleHistory,
                    retrievedDocs,
                    request.customInstructions,
                    sandboxInstructions
                );
                const ctxIntegration = new ContextIntegrationService();
                const m03Context = await ctxIntegration.buildContext(reqContext);
                finalSystemPrompt = PromptContextMapper.toLegacySystemPrompt(m03Context);
            } else {
                if (sandboxInstructions && !finalSystemPrompt.includes(sandboxInstructions)) {
                    finalSystemPrompt += `\n\n${sandboxInstructions}`;
                }
                if (request.customInstructions && !finalSystemPrompt.includes(request.customInstructions)) {
                    finalSystemPrompt += `\n\nUser Custom Personalization:\n${request.customInstructions}`;
                }
            }

            // Enrich prompt with active workspace and editor context (M06-03)
            if (request.codingContext || request.workspaceId) {
                const codingCtx = request.codingContext;
                let contextNote = `\n\n### Interactive Workspace Context`;
                if (request.workspaceId) {
                    contextNote += `\n- Active Workspace ID: ${request.workspaceId}`;
                }
                if (codingCtx?.currentFile) {
                    contextNote += `\n- Currently Active File in Editor: ${codingCtx.currentFile}`;
                }
                if (codingCtx?.selectedCode) {
                    contextNote += `\n- Current User Selection in Editor:\n\`\`\`\n${codingCtx.selectedCode}\n\`\`\``;
                } else if (typeof codingCtx?.selection === 'string') {
                    contextNote += `\n- Current User Selection in Editor:\n\`\`\`\n${codingCtx.selection}\n\`\`\``;
                } else if (codingCtx?.selection && typeof codingCtx.selection === 'object' && codingCtx.selection.text) {
                    contextNote += `\n- Current User Selection in Editor (Lines ${codingCtx.selection.startLine ?? '?'}-${codingCtx.selection.endLine ?? '?'}):\n\`\`\`\n${codingCtx.selection.text}\n\`\`\``;
                }
                contextNote += `\nYou have access to interactive workspace coding tools (view_file, create_file, edit_file, delete_file, list_dir, run_command) to inspect, edit, create, and verify code inside the user's workspace.
When the user asks to run, test, or execute any shell/terminal command, script, or check version/environment (e.g. "Run npm test", "Chạy npm --version", "node -v", "npm run build", "git status", "ls", etc.), you MUST call the 'run_command' tool with the exact command line.
DO NOT merely answer with speculative or assumed textual output without running the tool. Running the command via 'run_command' streams the live process output directly into the user's Workspace Terminal in real-time.`;
                finalSystemPrompt += contextNote;
            }

            // Enrich prompt with active plan context (M06-06)
            if (request.codingContext?.planContext) {
                finalSystemPrompt += `\n\n${formatInteractivePlanContextPrompt(request.codingContext.planContext)}`;
            }

            // Enrich prompt with compact Notion Cloud Brain context if enabled
            if (AgentFeatureFlags.USE_NOTION_BRAIN_LEARNING) {
                const activeFiles = request.codingContext?.currentFile ? [request.codingContext.currentFile] : [];
                const brainContextStr = await BrainIntegrationBridge.getBrainContextForPrompt(cleanPrompt, activeFiles);
                if (brainContextStr) {
                    finalSystemPrompt += brainContextStr;
                }
            }

            // 3. Execution Pipeline Setup
            let execIntegration: ExecutionIntegrationService | undefined;
            if (AgentFeatureFlags.USE_EXECUTION_PIPELINE) {
                execIntegration = new ExecutionIntegrationService();
                await execIntegration.registerProductionTools(
                    { id: request.userId, sessionId: request.sessionId, executionId },
                    sendEvent,
                    request.workspaceId
                );
            }

            // 4. Set up LLM client
            const Type = di.llmService.getTypeEnum();
            const aiInstance = di.llmService.getClient(request.apiKey, request.customBaseUrl, request.provider);
            const originalRequestedModel = request.rawModel || request.model || DEFAULT_CHAT_MODEL;
            activeModel = sanitizeModel(request.model || request.rawModel, request.provider);
            let hasEmittedInitialNormalization = false;

            if (activeModel !== originalRequestedModel) {
                console.log(`[MODEL ROUTING] Normalized requested model '${originalRequestedModel}' to Studio format '${activeModel}'`);
                appendSystemLog('AGENT_MODEL_NORM', `Normalized requested model '${originalRequestedModel}' to '${activeModel}'`);
                sendEvent('model_switch', { model: activeModel, isFallback: false, previousModel: originalRequestedModel });
                hasEmittedInitialNormalization = true;
            }

            appendSystemLog('AGENT_STREAM_INIT', `Starting agent response generation for model '${activeModel}' (userId: ${request.userId || 'anon'})`);

            if (request.sessionId) {
                try {
                    await di.agentSessionService.getOrCreateSession(request.sessionId, request.userId, {
                        workspaceId: request.workspaceId,
                        activeModel: { modelId: activeModel, provider: request.provider }
                    });
                    await di.agentSessionService.associateExecution(request.sessionId, executionId, request.userId);
                    await di.agentSessionService.setStatus(request.sessionId, 'BUSY', request.userId);
                } catch (sessionErr) {
                    console.warn('[AgentIntegrationService] Session association notice:', sessionErr);
                }

                // Canonical persistence of user message
                try {
                    const isAgent = (request.interactionType === 'AGENT') || Boolean(request.workspaceId);
                    const userMsgId = request.userMessageId || `user-${executionId}`;
                    await di.conversationMessageService.saveMessage({
                        id: userMsgId,
                        sessionId: request.sessionId,
                        userId: request.userId,
                        role: 'user',
                        messageRole: 'USER',
                        interactionType: request.interactionType || (isAgent ? 'AGENT' : 'CHAT'),
                        messageKind: 'USER_INPUT',
                        responseCode: 'USER_INPUT',
                        surface: request.surface || (isAgent ? 'AGENT' : 'CHAT'),
                        content: request.cleanPrompt || request.prompt,
                        modelUsed: activeModel,
                        executionId: executionId,
                        planId: request.codingContext?.planContext?.planId,
                        parentMessageId: request.parentMessageId
                    });
                } catch (userMsgErr) {
                    console.warn('[AgentIntegrationService] User message persistence notice:', userMsgErr);
                }
            }

            const proposeKnowledgeTool: any = {
                functionDeclarations: [
                    {
                        name: 'proposeKnowledge',
                        description: 'Propose a new knowledge memory node to be indexed if the user shares important information that needs to be permanently stored and recalled in future conversions.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                content: { type: Type.STRING, description: 'The core knowledge content to store.' },
                                reason: { type: Type.STRING, description: 'Why this knowledge should be remembered.' }
                            },
                            required: ['content', 'reason']
                        }
                    },
                    {
                        name: "execute_code",
                        description: "Execute code in a secure, ephemeral sandbox. Use this tool when you need to test code logic, execute data-processing algorithms, or verify math formulas. Supports 'python', 'javascript', and 'bash' (shell). Strip all markdown formatting like backticks from the 'code' parameter.",
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                code: { type: Type.STRING, description: "Raw, executable source code." },
                                language: { type: Type.STRING, description: "The language of the code ('javascript', 'python', or 'bash').", enum: ['javascript', 'python', 'bash'] }
                            },
                            required: ["code", "language"]
                        }
                    },
                    {
                        name: "read_github_repo",
                        description: "Read the file structure and contents of a public GitHub repository. This tool returns the repository file tree. You can optionally request the content of specific files by providing their paths. Use this when the user shares a GitHub link, attaches a repository, or asks you to read or analyze a repository.",
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                repoUrl: { type: Type.STRING, description: "The public GitHub repository URL (e.g. https://github.com/owner/repo)" },
                                filesToRead: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING },
                                    description: "Optional list of file paths (from the repo root) to read their contents. e.g. ['package.json', 'src/index.ts']"
                                }
                            },
                            required: ["repoUrl"]
                        }
                    }
                ]
            };

            // Add workspace coding tools if in workspace context
            if (request.workspaceId || request.codingContext) {
                proposeKnowledgeTool.functionDeclarations.push(
                    {
                        name: 'view_file',
                        description: 'Read the contents of a file in the workspace.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                filePath: { type: Type.STRING, description: 'Path of the file to read' },
                                TargetFile: { type: Type.STRING, description: 'Alternative alias for filePath' }
                            },
                            required: ['filePath']
                        }
                    },
                    {
                        name: 'create_file',
                        description: 'Create a new file with specified content in the workspace.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                TargetFile: { type: Type.STRING, description: 'Path of the file to create' },
                                Content: { type: Type.STRING, description: 'Full content of the new file' }
                            },
                            required: ['TargetFile', 'Content']
                        }
                    },
                    {
                        name: 'edit_file',
                        description: 'Edit or replace content in an existing file in the workspace.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                TargetFile: { type: Type.STRING, description: 'Path of the file to edit' },
                                TargetContent: { type: Type.STRING, description: 'The exact string snippet to replace' },
                                ReplacementContent: { type: Type.STRING, description: 'The replacement string' },
                                Content: { type: Type.STRING, description: 'Optional: full replacement content' }
                            },
                            required: ['TargetFile']
                        }
                    },
                    {
                        name: 'delete_file',
                        description: 'Delete a file from the workspace.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                TargetFile: { type: Type.STRING, description: 'Path of the file to delete' }
                            },
                            required: ['TargetFile']
                        }
                    },
                    {
                        name: 'list_dir',
                        description: 'List entries in a directory of the workspace.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                DirectoryPath: { type: Type.STRING, description: 'Optional directory path to list' }
                            }
                        }
                    },
                    {
                        name: 'run_command',
                        description: 'Execute a terminal command or script in the workspace sandbox.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                CommandLine: { type: Type.STRING, description: 'Command line string to run' },
                                Cwd: { type: Type.STRING, description: 'Optional working directory' }
                            },
                            required: ['CommandLine']
                        }
                    }
                );
            }

            const promptText = (cleanPrompt || request.prompt || '').trim();

            // Sanitize history and filter out completely empty turns
            const rawHistory: any[] = Array.isArray(request.history) ? request.history : [];
            const sanitizedHistory = rawHistory.filter((h: any) => {
                if (!h || !Array.isArray(h.parts) || h.parts.length === 0) return false;
                return h.parts.some((p: any) => {
                    if (p.text && typeof p.text === 'string' && p.text.trim().length > 0) return true;
                    if (p.functionCall || p.functionResponse || p.thought) return true;
                    return false;
                });
            });

            const lastTurn = sanitizedHistory[sanitizedHistory.length - 1];
            let historyWithUserTurn: any[];

            if (lastTurn && lastTurn.role === 'user') {
                // Ensure the final user turn carries the prompt text
                historyWithUserTurn = sanitizedHistory.map((h: any, idx: number) => {
                    if (idx === sanitizedHistory.length - 1) {
                        let replaced = false;
                        const parts = h.parts.map((p: any) => {
                            if (!replaced && typeof p.text === 'string') {
                                replaced = true;
                                return { ...p, text: promptText || p.text || 'Hello' };
                            }
                            return p;
                        });
                        if (!replaced) {
                            parts.unshift({ text: promptText || 'Hello' });
                        }
                        return { role: h.role, parts, modelUsed: h.modelUsed || h.modelName };
                    }
                    return h;
                });
            } else {
                // History does not end in a user turn or is empty; append the user prompt
                historyWithUserTurn = [
                    ...sanitizedHistory,
                    {
                        role: 'user',
                        parts: [{ text: promptText || 'Hello' }]
                    }
                ];
            }

            let formattedContents = adaptContentsForModelSwitch(historyWithUserTurn, activeModel);

            // Invariant: contents and parts must never be empty
            formattedContents = (Array.isArray(formattedContents) ? formattedContents : []).filter(
                (turn: any) => Array.isArray(turn?.parts) && turn.parts.length > 0
            );
            if (formattedContents.length === 0) {
                formattedContents = [{
                    role: 'user',
                    parts: [{ text: promptText || 'Hello' }]
                }];
            }

            let toolLoops = 0;
            let lastUsageMetadata: any = null;

            while (toolLoops < 10) {
                if (activeExecution.cancelled || abortController.signal.aborted) {
                    sendEvent('status', { message: 'Execution cancelled by user.' });
                    break;
                }
                const config: any = {
                    systemInstruction: finalSystemPrompt,
                    tools: [proposeKnowledgeTool],
                };

                // Ensure non-empty parts on every turn before streaming
                const safeContents = formattedContents.filter(
                    (turn: any) => Array.isArray(turn?.parts) && turn.parts.length > 0
                );
                if (safeContents.length === 0) {
                    safeContents.push({
                        role: 'user',
                        parts: [{ text: promptText || 'Hello' }]
                    });
                }

                const modelsToTry = [
                    activeModel,
                    FLASH_3_8_CHAT_MODEL,
                    DEFAULT_CHAT_MODEL,
                    FALLBACK_CHAT_MODEL,
                    PRO_CHAT_MODEL
                ];
                const uniqueModels = Array.from(new Set(modelsToTry));
                let responseStream: any = null;
                let lastStreamError: any = null;

                for (let mIdx = 0; mIdx < uniqueModels.length; mIdx++) {
                    const candidateModel = uniqueModels[mIdx];
                    try {
                        const callConfig: any = { ...config };
                        const thinkingConfig = getThinkingConfigForModel(candidateModel, typeof request.thinkingLevel === 'string' ? request.thinkingLevel : undefined);
                        if (thinkingConfig) {
                            callConfig.thinkingConfig = thinkingConfig;
                        } else {
                            delete callConfig.thinkingConfig;
                        }

                        const initialStream = await aiInstance.models.generateContentStream({
                            model: candidateModel,
                            contents: safeContents,
                            config: callConfig
                        });
                        const iterator = initialStream[Symbol.asyncIterator]();
                        const firstResult = await iterator.next();
                        const firstChunk = !firstResult.done ? firstResult.value : null;

                        async function* wrappedStream() {
                            if (firstChunk) yield firstChunk;
                            for await (const chunk of iterator) yield chunk;
                        }
                        responseStream = wrappedStream();
                        activeModel = candidateModel;

                        if (activeModel !== originalRequestedModel) {
                            if (!hasEmittedInitialNormalization || activeModel !== candidateModel) {
                                console.log(`[MODEL FALLBACK SUCCESS] Successfully recovered and streaming with fallback model '${activeModel}' (requested: '${originalRequestedModel}')`);
                                sendEvent('model_switch', { model: activeModel, isFallback: true, previousModel: originalRequestedModel });
                                sendEvent('status', { message: `⚡ Model failover active: streaming response with '${activeModel}'.` });
                            }
                        }
                        break;
                    } catch (streamErr: any) {
                        lastStreamError = streamErr;
                        const errText = streamErr?.message || String(streamErr);
                        const errLower = errText.toLowerCase();
                        const isThoughtSigError =
                            errLower.includes('thought_signature') ||
                            errLower.includes('thoughtsignature') ||
                            errLower.includes('thought signature') ||
                            errLower.includes('missing thought') ||
                            errLower.includes('invalid thought') ||
                            errLower.includes('thought_context');

                        // If user switched models and hits a thought signature mismatch from earlier turns,
                        // adapt previous tool turns into narrative context transcripts and retry immediately
                        // on the exact same model selected by the user!
                        if (isThoughtSigError) {
                            console.warn(`[AgentRuntime] Detected thought_signature mismatch on model '${candidateModel}'. Converting history tool turns into context transcripts and retrying '${candidateModel}'...`);
                            formattedContents = sanitizeAllToolTurnsToText(formattedContents);
                            try {
                                const callConfig: any = { ...config };
                                const retryThinkingConfig = getThinkingConfigForModel(candidateModel, typeof request.thinkingLevel === 'string' ? request.thinkingLevel : undefined);
                                if (retryThinkingConfig) {
                                    callConfig.thinkingConfig = retryThinkingConfig;
                                } else {
                                    delete callConfig.thinkingConfig;
                                }

                                const retryStream = await aiInstance.models.generateContentStream({
                                    model: candidateModel,
                                    contents: formattedContents,
                                    config: callConfig
                                });
                                const rIter = retryStream[Symbol.asyncIterator]();
                                const rRes = await rIter.next();
                                const rChunk = !rRes.done ? rRes.value : null;

                                async function* wrappedRetryStream() {
                                    if (rChunk) yield rChunk;
                                    for await (const chunk of rIter) yield chunk;
                                }
                                responseStream = wrappedRetryStream();
                                activeModel = candidateModel;
                                break;
                            } catch (retryErr: any) {
                                console.warn(`[AgentRuntime] Retry with sanitized transcripts on '${candidateModel}' also failed:`, retryErr?.message || retryErr);
                            }
                        }

                        const isRecoverable = errText.includes('404') || errText.includes('503') || errText.includes('429') || 
                                              errText.includes('Not Found') || errText.includes('UNAVAILABLE') || 
                                              errText.includes('RESOURCE_EXHAUSTED') || errText.includes('Quota exceeded') ||
                                              errText.includes('no longer available') || errText.includes('contents are required') ||
                                              errText.includes('Incomplete JSON segment') ||
                                              isThoughtSigError;
                        const nextModel = uniqueModels[mIdx + 1];
                        const failureReason = errText.includes('404') || errText.includes('Not Found')
                            ? '404 Not Found'
                            : errText.includes('503') || errText.includes('UNAVAILABLE')
                            ? '503 High Demand'
                            : errText.includes('429') || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('Quota exceeded')
                            ? '429 Quota Exceeded'
                            : isThoughtSigError
                            ? 'Thought Signature Mismatch'
                            : 'Service Error';

                        if (isRecoverable && nextModel) {
                            console.warn(`[MODEL FALLBACK] Model '${candidateModel}' encountered error (${failureReason}). Cascading to fallback model '${nextModel}'...`);
                            continue;
                        } else {
                            console.error(`[AgentRuntime] generateContentStream failed for model ${candidateModel}:`, errText);
                            throw streamErr;
                        }
                    }
                }

                if (!responseStream) {
                    throw lastStreamError || new Error('Failed to obtain streaming response from model');
                }

                let loopNeedsToolExecution = false;
                const currentFunctionCalls: Array<{ name: string; args?: Record<string, unknown> }> = [];
                const currentFunctionCallParts: Array<{
                    functionCall: { name: string; args?: Record<string, unknown> };
                    thoughtSignature?: string;
                    thought_signature?: string;
                }> = [];
                let currentModelText = '';
                let currentThoughtText = '';
                let latestThoughtSignature: string | undefined = undefined;

                try {
                    for await (const chunk of responseStream) {
                        if (chunk.usageMetadata) {
                            lastUsageMetadata = chunk.usageMetadata;
                        }

                        const candidate = chunk.candidates?.[0];
                        const rawParts = (candidate?.content?.parts as Array<Record<string, unknown>> | undefined) || [];

                        for (const part of rawParts) {
                            const sig = (part.thoughtSignature as string | undefined) ||
                                        (part.thought_signature as string | undefined) ||
                                        ((part.functionCall as Record<string, unknown> | undefined)?.thoughtSignature as string | undefined) ||
                                        ((part.functionCall as Record<string, unknown> | undefined)?.thought_signature as string | undefined);
                            if (sig) {
                                latestThoughtSignature = sig;
                            }

                            if (part.thought === true && typeof part.text === 'string') {
                                currentThoughtText += part.text;
                                sendEvent('thinking', part.text);
                            }

                            if (part.functionCall && typeof (part.functionCall as { name?: string }).name === 'string') {
                                loopNeedsToolExecution = true;
                                const fc = part.functionCall as { name: string; args?: Record<string, unknown> };
                                currentFunctionCalls.push(fc);

                                const partSig = sig || latestThoughtSignature;
                                const preservedPart = {
                                    functionCall: fc,
                                    ...(partSig ? { thoughtSignature: partSig, thought_signature: partSig } : {})
                                };
                                currentFunctionCallParts.push(preservedPart);
                            }
                        }

                        // Fallback to chunk.functionCalls helper getter if parts array didn't capture it
                        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                            loopNeedsToolExecution = true;
                            for (const fc of chunk.functionCalls as Array<{ name: string; args?: Record<string, unknown> }>) {
                                const alreadyCaptured = currentFunctionCalls.some(
                                    existing => existing.name === fc.name && JSON.stringify(existing.args) === JSON.stringify(fc.args)
                                );
                                if (!alreadyCaptured) {
                                    currentFunctionCalls.push(fc);
                                    const sig = ((fc as Record<string, unknown>).thoughtSignature as string | undefined) ||
                                                ((fc as Record<string, unknown>).thought_signature as string | undefined) ||
                                                latestThoughtSignature;
                                    const preservedPart = {
                                        functionCall: fc,
                                        ...(sig ? { thoughtSignature: sig, thought_signature: sig } : {})
                                    };
                                    currentFunctionCallParts.push(preservedPart);
                                }
                            }
                        }

                        if (chunk.text) {
                            currentModelText += chunk.text;
                            sendEvent('text', chunk.text);
                        }
                    }
                } catch (streamIterErr: unknown) {
                    const iterErrStr = streamIterErr instanceof Error ? streamIterErr.message : String(streamIterErr);
                    const isIncompleteJson = iterErrStr.includes('Incomplete JSON segment at the end');

                    if (isIncompleteJson) {
                        console.warn(`[AgentRuntime] Handled trailing SSE stream completion artifact (${iterErrStr}).`);
                        // If model already produced text, thoughts, or function calls, treat stream as successfully completed
                        if (currentModelText.trim().length > 0 || currentThoughtText.trim().length > 0 || currentFunctionCalls.length > 0) {
                            console.log(`[AgentRuntime] Preserving generated output (${currentModelText.length} text chars, ${currentThoughtText.length} thought chars) prior to trailing SSE delimiter artifact.`);
                        } else {
                            // If stream broke before generating anything, provide user-visible message rather than crashing
                            console.warn(`[AgentRuntime] Incomplete JSON encountered before any tokens received.`);
                            currentModelText = 'The AI model stream connection closed unexpectedly before returning tokens. Please retry your prompt or switch to another model.';
                            sendEvent('text', currentModelText);
                        }
                    } else {
                        // If partial content was produced, preserve it and continue cleanly
                        if (currentModelText.trim().length > 0 || currentThoughtText.trim().length > 0 || currentFunctionCalls.length > 0) {
                            console.warn(`[AgentRuntime] Stream iteration interrupted (${iterErrStr}), preserving generated output.`);
                        } else {
                            throw streamIterErr;
                        }
                    }
                }

                if (loopNeedsToolExecution) {
                    const toolResponseParts: any[] = [];
                    for (const fc of currentFunctionCalls) {
                        if (activeExecution.cancelled || abortController.signal.aborted) {
                            sendEvent('status', { message: 'Tool execution cancelled by user.' });
                            break;
                        }
                        appendSystemLog('AGENT_TOOL_CALL', `Agent invoked tool '${fc.name}'`, fc.args);
                        if (request.sessionId) {
                            di.agentSessionService.emitSessionEvent({
                                type: 'tool_activity',
                                sessionId: request.sessionId,
                                workspaceId: request.workspaceId,
                                timestamp: Date.now(),
                                data: {
                                    phase: 'call',
                                    tool: fc.name,
                                    args: fc.args
                                }
                            });
                        }
                        if (execIntegration) {
                            try {
                                const result = await execIntegration.executeTool(fc.name, fc.args, {
                                    executionId,
                                    workspaceId: request.workspaceId,
                                    sessionId: request.sessionId
                                });
                                appendSystemLog('AGENT_TOOL_SUCCESS', `Tool '${fc.name}' completed execution`);
                                sendEvent('system_event', {
                                    type: 'workspace_file_changed',
                                    tool: fc.name,
                                    workspaceId: request.workspaceId,
                                    sessionId: request.sessionId
                                });
                                if (request.sessionId) {
                                    di.agentSessionService.emitSessionEvent({
                                        type: 'tool_activity',
                                        sessionId: request.sessionId,
                                        workspaceId: request.workspaceId,
                                        timestamp: Date.now(),
                                        data: {
                                            phase: 'result',
                                            tool: fc.name,
                                            success: true,
                                            result
                                        }
                                    });
                                }
                                toolResponseParts.push({
                                    functionResponse: {
                                        name: fc.name,
                                        response: typeof result === 'object' && result !== null ? result : { output: String(result) }
                                    }
                                });
                            } catch (err: any) {
                                const errorMessage = err?.message || String(err) || "Tool execution error";
                                appendSystemLog('AGENT_TOOL_ERROR', `Tool '${fc.name}' failed: ${errorMessage}`);
                                if (request.sessionId) {
                                    di.agentSessionService.emitSessionEvent({
                                        type: 'tool_activity',
                                        sessionId: request.sessionId,
                                        workspaceId: request.workspaceId,
                                        timestamp: Date.now(),
                                        data: {
                                            phase: 'result',
                                            tool: fc.name,
                                            success: false,
                                            error: errorMessage
                                        }
                                    });
                                }
                                toolResponseParts.push({
                                    functionResponse: {
                                        name: fc.name,
                                        response: { status: "error", error: errorMessage }
                                    }
                                });
                            }
                        } else {
                            toolResponseParts.push({
                                functionResponse: {
                                    name: fc.name,
                                    response: { status: "error", error: "Execution pipeline disabled" }
                                }
                            });
                        }
                    }

                    // Ensure single model turn combining thoughts, text and function calls with thought signatures intact
                    const modelTurnParts: Array<Record<string, unknown>> = [];
                    if (currentThoughtText) {
                        modelTurnParts.push({
                            thought: true,
                            text: currentThoughtText,
                            ...(latestThoughtSignature ? { thoughtSignature: latestThoughtSignature, thought_signature: latestThoughtSignature } : {})
                        });
                    }
                    if (currentModelText) {
                        accumulatedFinalText = currentModelText;
                        modelTurnParts.push({ text: currentModelText });
                    }
                    for (const fcp of currentFunctionCallParts) {
                        const sig = fcp.thoughtSignature || fcp.thought_signature || latestThoughtSignature;
                        const partObj: Record<string, unknown> = {
                            functionCall: fcp.functionCall
                        };
                        if (sig) {
                            partObj.thoughtSignature = sig;
                            partObj.thought_signature = sig;
                        }
                        modelTurnParts.push(partObj);
                    }

                    if (modelTurnParts.length > 0) {
                        formattedContents.push({
                            role: 'model',
                            parts: modelTurnParts
                        });
                    }
                    if (toolResponseParts.length > 0) {
                        formattedContents.push({
                            role: 'user',
                            parts: toolResponseParts
                        });
                    }
                    toolLoops++;
                } else {
                    if (currentModelText) {
                        accumulatedFinalText = currentModelText;
                        formattedContents.push({
                            role: 'model',
                            parts: [{ text: currentModelText }]
                        });
                    }
                    break;
                }
            }

            if (lastUsageMetadata) {
                sendEvent('metadata', {
                    ...lastUsageMetadata,
                    model: activeModel,
                    isFallback: activeModel !== originalRequestedModel
                });
            } else {
                sendEvent('metadata', {
                    model: activeModel,
                    isFallback: activeModel !== originalRequestedModel
                });
            }

            // Canonical persistence of assistant final message (ONE durable DB record)
            if (request.sessionId && !activeExecution.cancelled) {
                try {
                    const asstMsgId = request.assistantMessageId || `asst-${executionId}`;
                    const isAgent = (request.interactionType === 'AGENT') || Boolean(request.workspaceId);
                    const savedMessage = await di.conversationMessageService.saveMessage({
                        id: asstMsgId,
                        sessionId: request.sessionId,
                        userId: request.userId,
                        role: 'model',
                        messageRole: 'ASSISTANT',
                        interactionType: request.interactionType || (isAgent ? 'AGENT' : 'CHAT'),
                        messageKind: isAgent ? 'AGENT_RESPONSE' : 'CHAT_RESPONSE',
                        responseCode: isAgent ? 'AGENT_FINAL' : 'CHAT_FINAL',
                        surface: request.surface || (isAgent ? 'AGENT' : 'CHAT'),
                        content: accumulatedFinalText,
                        modelUsed: activeModel,
                        executionId: executionId,
                        planId: request.codingContext?.planContext?.planId,
                        parentMessageId: request.userMessageId || `user-${executionId}`
                    });
                    sendEvent('message_saved', savedMessage);
                } catch (saveErr) {
                    console.warn('[AgentIntegrationService] Assistant message persistence notice:', saveErr);
                }
            }

            if (request.sessionId && !activeExecution.cancelled) {
                try {
                    await di.agentSessionService.setStatus(request.sessionId, 'IDLE', request.userId);
                } catch (statusErr) {
                    console.warn('[AgentIntegrationService] Failed to set IDLE status:', statusErr);
                }
            }

            AgentAdapter.handleAgentResponse(res, { type: 'end', data: {} });
        } catch (e: any) {
            const errStr = e?.message || String(e) || '';
            const isIncompleteJson = errStr.includes('Incomplete JSON segment at the end');
            if (isIncompleteJson) {
                console.warn('[AgentRuntime] Handled stream completion error gracefully:', errStr);
            } else {
                console.error('[AgentRuntime ERROR]:', e);
            }
            if (request.sessionId && !activeExecution.cancelled) {
                try {
                    await di.agentSessionService.setStatus(request.sessionId, 'ERROR', request.userId);
                } catch (statusErr) {
                    console.warn('[AgentIntegrationService] Failed to set ERROR status:', statusErr);
                }
            }
            const is503 = (errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('RESOURCE_EXHAUSTED')) && !errStr.includes('No such file') && !errStr.includes('ENOENT');
            let friendlyError = e.message || 'An unexpected error occurred in backend chat pipeline.';
            if (is503) {
                friendlyError = 'AI Model cluster is currently experiencing extremely high demand. We cascaded through all fallback models but they are currently unavailable. Please try again shortly.';
            } else if (isIncompleteJson) {
                friendlyError = 'The model streaming connection closed prematurely or encountered a network drop. Please retry your request.';
            } else if (typeof friendlyError === 'string' && friendlyError.includes('Missing Authentication header')) {
                friendlyError = "API Error (401): Missing Authentication header. If you are using Google Gemini natively, please ensure your Custom Base URL in Key Settings is empty. If you are using OpenRouter, ensure your key is valid and Provider is set to OpenRouter.";
            } else if (typeof friendlyError === 'string' && friendlyError.includes('User not found')) {
                friendlyError = "API Error (401): User not found. Your OpenRouter API key is invalid.";
            } else if (typeof friendlyError === 'string' && friendlyError.includes('API key not valid')) {
                friendlyError = "API Error (400): Google Gemini API key not valid. Please ensure your API key is correct in Settings.";
            }

            // Canonical persistence of error assistant message
            if (request.sessionId && !activeExecution.cancelled) {
                try {
                    const asstMsgId = request.assistantMessageId || `asst-${executionId}`;
                    const isAgent = (request.interactionType === 'AGENT') || Boolean(request.workspaceId);
                    const savedError = await di.conversationMessageService.saveMessage({
                        id: asstMsgId,
                        sessionId: request.sessionId,
                        userId: request.userId,
                        role: 'model',
                        messageRole: 'ASSISTANT',
                        interactionType: request.interactionType || (isAgent ? 'AGENT' : 'CHAT'),
                        messageKind: 'ERROR',
                        responseCode: isAgent ? 'AGENT_ERROR' : 'CHAT_ERROR',
                        surface: request.surface || (isAgent ? 'AGENT' : 'CHAT'),
                        content: friendlyError,
                        modelUsed: activeModel,
                        executionId: executionId,
                        planId: request.codingContext?.planContext?.planId,
                        parentMessageId: request.userMessageId || `user-${executionId}`
                    });
                    sendEvent('message_saved', savedError);
                } catch (saveErr) {
                    console.warn('[AgentIntegrationService] Error message persistence notice:', saveErr);
                }
            }

            sendEvent('error', friendlyError);
            AgentAdapter.handleAgentResponse(res, { type: 'end', data: {} });
        } finally {
            AgentIntegrationService.activeExecutions.delete(executionId);
            if (!activeExecution.cancelled) {
                await runtime.completeExecution(executionId).catch(() => {});
            }
            res.end();
        }
    }
}
