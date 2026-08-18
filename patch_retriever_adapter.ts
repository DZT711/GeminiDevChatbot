import fs from 'fs';
const file = 'src/server/services/agentIntegration/retrieval/RetrieverAdapter.ts';
let content = fs.readFileSync(file, 'utf8');

const newMethod = `
    async retrieveKnowledge(cleanPrompt: string, sendEvent: (type: string, data: any) => void): Promise<{ id: string; content: string }[]> {
        sendEvent('status', { message: 'Performing vector similarity search via M03 Agent Retriever...' });
        try {
            const documents = await this.service.retrieveContexts(cleanPrompt, 5);
            if (documents.length > 0) {
                sendEvent('status', { message: \`Context retrieval completed. Loaded \${documents.length} repository memory blocks.\` });
                return documents.map((doc, i) => {
                    const pathInfo = (doc.record.metadata as any)?.path || 'Unknown File';
                    const nodeType = (doc.record.metadata as any)?.nodeType || 'CODE';
                    return {
                        id: doc.record.id || \`\${i}\`,
                        content: \`[Node \${i + 1}] (\${nodeType}) File: \${pathInfo}\\nSimilarity: \${(1 - doc.score).toFixed(4)}\\nContent:\\n\${doc.record.content}\`
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
`;

content = content.replace(/}\s*$/, newMethod + '}');
fs.writeFileSync(file, content);
