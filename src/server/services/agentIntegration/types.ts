export enum AgentExecutionMode {
    DIRECT_CHAT = 'DIRECT_CHAT',
    USE_RAG = 'USE_RAG',
    USE_SANDBOX = 'USE_SANDBOX'
}

export interface AgentRequest {
    prompt: string;
    cleanPrompt: string;
    history: any[];
    model: string;
    activeSkillIds: string[];
    useSearch: boolean;
    thinkingLevel: number;
    provider: string;
    userId: string;
    apiKey: string;
    customBaseUrl?: string;
    customInstructions?: string;
    routingStrategy: AgentExecutionMode;
}

export interface AgentResponse {
    type: 'event' | 'chunk' | 'status' | 'error' | 'end' | 'routing' | 'text' | 'metadata' | 'system_event' | 'model_switch' | 'thinking' | 'thinking_done';
    data: any;
}
