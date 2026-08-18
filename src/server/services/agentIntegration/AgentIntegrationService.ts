import { AgentRequest } from './types.js';
import { AgentAdapter } from './AgentAdapter.js';
import { AgentFeatureFlags } from './AgentFeatureFlags.js';
import { RetrieverAdapter } from './retrieval/RetrieverAdapter.js';
import { ContextIntegrationService } from './context/ContextIntegrationService.js';
import { ContextBuilderAdapter } from './context/ContextBuilderAdapter.js';
import { PromptContextMapper } from './context/PromptContextMapper.js';
import { ExecutionIntegrationService } from './execution/ExecutionIntegrationService.js';
import { di } from '../../di.js';

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
            const chatModel = request.model || 'gemini-3.5-flash';

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

            const formattedContents = request.history.map((h: any, idx: number) => {
                if (idx === request.history.length - 1 && h.role === 'user') {
                    const parts = h.parts.map((p: any, pIdx: number) => {
                        if (pIdx === 0 && p.text) return { text: cleanPrompt };
                        return p;
                    });
                    return { role: h.role, parts };
                }
                return h;
            });

            let toolLoops = 0;
            let lastUsageMetadata: any = null;

            while (toolLoops < 5) {
                const config: any = {
                    systemInstruction: finalSystemPrompt,
                    tools: [proposeKnowledgeTool],
                };

                if (chatModel.includes('thinking') || chatModel === 'gemini-3.1-pro-preview') {
                    config.thinkingConfig = {
                        thinkingLevel: request.thinkingLevel || 'LOW',
                        includeThoughts: true
                    };
                }

                const responseStream = await aiInstance.models.generateContentStream({
                    model: chatModel,
                    contents: formattedContents,
                    config
                });

                let loopNeedsToolExecution = false;
                let currentFunctionCalls: any[] = [];
                let currentModelText = '';

                for await (const chunk of responseStream) {
                    if (chunk.usageMetadata) {
                        lastUsageMetadata = chunk.usageMetadata;
                    }
                    if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                        loopNeedsToolExecution = true;
                        currentFunctionCalls = chunk.functionCalls;
                        break;
                    }

                    if (chunk.text) {
                        currentModelText += chunk.text;
                        sendEvent('text', chunk.text);
                    }
                }

                if (loopNeedsToolExecution) {
                    const toolResponseParts: any[] = [];
                    for (const fc of currentFunctionCalls) {
                        if (execIntegration) {
                            try {
                                const result = await execIntegration.executeTool(fc.name, fc.args);
                                toolResponseParts.push({
                                    functionResponse: {
                                        name: fc.name,
                                        response: typeof result === 'object' && result !== null ? result : { output: String(result) }
                                    }
                                });
                            } catch (err: any) {
                                const errorMessage = err?.message || String(err) || "Tool execution error";
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

                    // Ensure single model turn combining text and function calls
                    const modelTurnParts: any[] = [];
                    if (currentModelText) {
                        modelTurnParts.push({ text: currentModelText });
                    }
                    for (const fc of currentFunctionCalls) {
                        modelTurnParts.push({ functionCall: fc });
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
                sendEvent('metadata', lastUsageMetadata);
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
