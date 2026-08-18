import { RetrieverIntegrationService } from './RetrieverIntegrationService.js';

export class RetrieverAdapter {
    private service: RetrieverIntegrationService;

    constructor(
        userId: string,
        apiKey: string,
        provider: string,
        customBaseUrl?: string
    ) {
        this.service = new RetrieverIntegrationService(userId, apiKey, provider, customBaseUrl);
    }

    async augmentPromptWithContext(
        cleanPrompt: string, 
        currentSystemPrompt: string, 
        sendEvent: (type: string, data: any) => void
    ): Promise<string> {
        sendEvent('status', { message: 'Performing vector similarity search via M03 Agent Retriever...' });
        
        try {
            const documents = await this.service.retrieveContexts(cleanPrompt, 5);
            
            if (documents.length > 0) {
                const formattedContext = documents.map((doc, i) => {
                    const pathInfo = (doc.record.metadata as any)?.path || 'Unknown File';
                    // We extract nodeType dynamically since it's not strictly part of KnowledgeRecord but maybe inside metadata, 
                    // or we just omit nodeType, or we inject it into metadata in KnowledgeStore
                    const nodeType = (doc.record.metadata as any)?.nodeType || 'CODE';
                    return `[Node ${i + 1}] (${nodeType}) File: ${pathInfo}\nSimilarity: ${(1 - doc.score).toFixed(4)}\nContent:\n${doc.record.content}`;
                }).join('\n\n---\n\n');

                const newSystemPrompt = currentSystemPrompt + `\n\n### RETRIEVED REPOSITORY CONTEXT\nUse the following active codebase memory contexts to formulate your answer:\n\n${formattedContext}`;
                sendEvent('status', { message: `Context retrieval completed. Loaded ${documents.length} repository memory blocks.` });
                return newSystemPrompt;
            } else {
                sendEvent('status', { message: 'No highly relevant context found in repository.' });
                return currentSystemPrompt;
            }
        } catch (e: any) {
            console.error('[RetrieverAdapter] Error:', e);
            sendEvent('status', { message: 'Context retrieval failed, continuing without codebase context.' });
            return currentSystemPrompt;
        }
    }

    async retrieveKnowledge(cleanPrompt: string, sendEvent: (type: string, data: any) => void): Promise<{ id: string; content: string }[]> {
        sendEvent('status', { message: 'Performing vector similarity search via M03 Agent Retriever...' });
        try {
            const documents = await this.service.retrieveContexts(cleanPrompt, 5);
            if (documents.length > 0) {
                sendEvent('status', { message: `Context retrieval completed. Loaded ${documents.length} repository memory blocks.` });
                return documents.map((doc, i) => {
                    const pathInfo = (doc.record.metadata as any)?.path || 'Unknown File';
                    const nodeType = (doc.record.metadata as any)?.nodeType || 'CODE';
                    return {
                        id: doc.record.id || `${i}`,
                        content: `[Node ${i + 1}] (${nodeType}) File: ${pathInfo}\nSimilarity: ${(1 - doc.score).toFixed(4)}\nContent:\n${doc.record.content}`
                    };
                });
            } else {
                sendEvent('status', { message: 'No highly relevant context found in repository.' });
                return [];
            }
        } catch (e: any) {
            console.error('[RetrieverAdapter] Error:', e);
            sendEvent('status', { message: 'Context retrieval failed, continuing without codebase context.' });
            return [];
        }
    }
}