import { InteractivePlanContext } from '../../../agent/context/InteractivePlanContext.js';

export enum AgentExecutionMode {
    DIRECT_CHAT = 'DIRECT_CHAT',
    USE_RAG = 'USE_RAG',
    USE_SANDBOX = 'USE_SANDBOX'
}

export interface CodingRequestContext {
    sessionId?: string;
    workspaceId?: string;
    currentFile?: string;
    openFiles?: string[];
    selectedCode?: string;
    selection?: {
        startLine?: number;
        endLine?: number;
        text?: string;
    } | string;
    workspaceState?: Record<string, unknown>;
    planContext?: InteractivePlanContext;
}

export interface AgentRequest {
    prompt: string;
    cleanPrompt: string;
    history: any[];
    model: string;
    rawModel?: string;
    activeSkillIds: string[];
    useSearch: boolean;
    thinkingLevel: number;
    provider: string;
    userId: string;
    apiKey: string;
    customBaseUrl?: string;
    customInstructions?: string;
    routingStrategy: AgentExecutionMode;
    sessionId?: string;
    workspaceId?: string;
    codingContext?: CodingRequestContext;
    interactionType?: 'CHAT' | 'AGENT';
    surface?: 'CHAT' | 'AGENT' | 'TERMINAL' | 'PLANNING';
    userMessageId?: string;
    assistantMessageId?: string;
    parentMessageId?: string;
}

export interface AgentResponse {
    type: 'event' | 'chunk' | 'status' | 'error' | 'end' | 'routing' | 'text' | 'metadata' | 'system_event' | 'model_switch' | 'thinking' | 'thinking_done' | 'message_saved';
    data: any;
}
