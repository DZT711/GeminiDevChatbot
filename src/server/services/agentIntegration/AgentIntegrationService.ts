import { AgentRequest } from './types.js';
import { AgentAdapter } from './AgentAdapter.js';
import { AgentFeatureFlags } from './AgentFeatureFlags.js';
import { RetrieverAdapter } from './retrieval/RetrieverAdapter.js';
import { ContextIntegrationService } from './context/ContextIntegrationService.js';
import { ContextBuilderAdapter } from './context/ContextBuilderAdapter.js';
import { PromptContextMapper } from './context/PromptContextMapper.js';
import { ExecutionIntegrationService } from './execution/ExecutionIntegrationService.js';
import { DEFAULT_CHAT_MODEL, FALLBACK_CHAT_MODEL, PRO_CHAT_MODEL, FLASH_3_8_CHAT_MODEL, isThoughtSignatureModel, getThinkingConfigForModel } from '../../agent/agent.config.js';
import { di } from '../../di.js';
import { appendSystemLog } from '../../logInterceptor.js';

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
            return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: '' }] };
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
            return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: '' }] };
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
            return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: '' }] };
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
            return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: '' }] };
        }
        return turn;
    });
}

export class AgentIntegrationService {
    /**
     * Entry point for the new Agent Runtime pipeline.
     */
    async handleRequest(request: AgentRequest, res: any): Promise<void> {
        const sendEvent = (type: any, data: any) => {
            if (type === 'end') {
                AgentAdapter.handleAgentResponse(res, { type: 'end', data: {} });
            } else {
                AgentAdapter.handleAgentResponse(res, { type, data });
            }
        };

        try {
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

            // 3. Execution Pipeline Setup
            let execIntegration: ExecutionIntegrationService | undefined;
            if (AgentFeatureFlags.USE_EXECUTION_PIPELINE) {
                execIntegration = new ExecutionIntegrationService();
                await execIntegration.registerProductionTools({ id: request.userId }, sendEvent);
            }

            // 4. Set up LLM client
            const Type = di.llmService.getTypeEnum();
            const aiInstance = di.llmService.getClient(request.apiKey, request.customBaseUrl, request.provider);
            const originalRequestedModel = request.rawModel || request.model || DEFAULT_CHAT_MODEL;
            let activeModel = sanitizeModel(request.model || request.rawModel, request.provider);
            let hasEmittedInitialNormalization = false;

            if (activeModel !== originalRequestedModel) {
                console.log(`[MODEL ROUTING] Normalized requested model '${originalRequestedModel}' to Studio format '${activeModel}'`);
                appendSystemLog('AGENT_MODEL_NORM', `Normalized requested model '${originalRequestedModel}' to '${activeModel}'`);
                sendEvent('model_switch', { model: activeModel, isFallback: false, previousModel: originalRequestedModel });
                hasEmittedInitialNormalization = true;
            }

            appendSystemLog('AGENT_STREAM_INIT', `Starting agent response generation for model '${activeModel}' (userId: ${request.userId || 'anon'})`);

            const proposeKnowledgeTool = {
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

            let formattedContents = adaptContentsForModelSwitch(
                request.history.map((h: any, idx: number) => {
                    if (idx === request.history.length - 1 && h.role === 'user') {
                        const parts = h.parts.map((p: any, pIdx: number) => {
                            if (pIdx === 0 && p.text) return { text: cleanPrompt };
                            return p;
                        });
                        return { role: h.role, parts, modelUsed: h.modelUsed || h.modelName };
                    }
                    return h;
                }),
                activeModel
            );

            let toolLoops = 0;
            let lastUsageMetadata: any = null;

            while (toolLoops < 5) {
                const config: any = {
                    systemInstruction: finalSystemPrompt,
                    tools: [proposeKnowledgeTool],
                };

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

                        responseStream = await aiInstance.models.generateContentStream({
                            model: candidateModel,
                            contents: formattedContents,
                            config: callConfig
                        });
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

                                responseStream = await aiInstance.models.generateContentStream({
                                    model: candidateModel,
                                    contents: formattedContents,
                                    config: callConfig
                                });
                                activeModel = candidateModel;
                                break;
                            } catch (retryErr: any) {
                                console.warn(`[AgentRuntime] Retry with sanitized transcripts on '${candidateModel}' also failed:`, retryErr?.message || retryErr);
                            }
                        }

                        const isRecoverable = errText.includes('404') || errText.includes('503') || errText.includes('429') || 
                                              errText.includes('Not Found') || errText.includes('UNAVAILABLE') || 
                                              errText.includes('RESOURCE_EXHAUSTED') || errText.includes('Quota exceeded') ||
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

                if (loopNeedsToolExecution) {
                    const toolResponseParts: any[] = [];
                    for (const fc of currentFunctionCalls) {
                        appendSystemLog('AGENT_TOOL_CALL', `Agent invoked tool '${fc.name}'`, fc.args);
                        if (execIntegration) {
                            try {
                                const result = await execIntegration.executeTool(fc.name, fc.args);
                                appendSystemLog('AGENT_TOOL_SUCCESS', `Tool '${fc.name}' completed execution`);
                                toolResponseParts.push({
                                    functionResponse: {
                                        name: fc.name,
                                        response: typeof result === 'object' && result !== null ? result : { output: String(result) }
                                    }
                                });
                            } catch (err: any) {
                                const errorMessage = err?.message || String(err) || "Tool execution error";
                                appendSystemLog('AGENT_TOOL_ERROR', `Tool '${fc.name}' failed: ${errorMessage}`);
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

                    formattedContents.push({
                        role: 'model',
                        parts: modelTurnParts
                    });
                    formattedContents.push({
                        role: 'user',
                        parts: toolResponseParts
                    });
                    toolLoops++;
                } else {
                    if (currentModelText) {
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

            AgentAdapter.handleAgentResponse(res, { type: 'end', data: {} });
        } catch (e: any) {
            console.error('[AgentRuntime ERROR]:', e);
            const errStr = e?.message || String(e) || '';
            const is503 = (errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('RESOURCE_EXHAUSTED')) && !errStr.includes('No such file') && !errStr.includes('ENOENT');
            let friendlyError = e.message || 'An unexpected error occurred in backend chat pipeline.';
            if (is503) {
                friendlyError = 'AI Model cluster is currently experiencing extremely high demand. We cascaded through all fallback models but they are currently unavailable. Please try again shortly.';
            } else if (typeof friendlyError === 'string' && friendlyError.includes('Missing Authentication header')) {
                friendlyError = "API Error (401): Missing Authentication header. If you are using Google Gemini natively, please ensure your Custom Base URL in Key Settings is empty. If you are using OpenRouter, ensure your key is valid and Provider is set to OpenRouter.";
            } else if (typeof friendlyError === 'string' && friendlyError.includes('User not found')) {
                friendlyError = "API Error (401): User not found. Your OpenRouter API key is invalid.";
            } else if (typeof friendlyError === 'string' && friendlyError.includes('API key not valid')) {
                friendlyError = "API Error (400): Google Gemini API key not valid. Please ensure your API key is correct in Settings.";
            }
            sendEvent('error', friendlyError);
            AgentAdapter.handleAgentResponse(res, { type: 'end', data: {} });
        } finally {
            res.end();
        }
    }
}
