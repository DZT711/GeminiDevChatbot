import fs from 'fs';
const file = 'src/server/controllers/ChatController.ts';
let content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('    // 2. Conditional Branching Context Injection');
const endIndex = content.indexOf('    const Type = di.llmService.getTypeEnum();');

if (startIndex !== -1 && endIndex !== -1) {
    const originalBlock = content.substring(startIndex, endIndex);
    const replacementBlock = `    // 2. Conditional Branching Context Injection
    let baseSystemPrompt = \`You are GeminiDevChatbot, an elite AI Software Engineering Assistant explicitly customized for the development, maintenance, and optimization of this repository.

### CORE OPERATING RULES
1. Strict Grounding: Analyze and formulate responses using the codebase context if provided.
2. File Path References: State full file paths wherever pertinent.
3. TypeScript Excellence: Ensure any code provided is valid, strictly typed TypeScript.

Always provide runnable code blocks/examples with Markdown syntax.\`;

    let sandboxInstructions = '';
    if (isForcedSandbox) {
      sandboxInstructions = \`### MANDATORY SANDBOX INSTRUCTION\\nThe user has explicitly requested to run code in the sandbox for this query. You MUST use the \\\`execute_code\\\` tool to write and execute the code to solve the user's prompt. After receiving the output, present the results clearly to the user.\`;
      cleanPrompt = \`Please write and execute the code to solve this, using the execute_code tool. Query: \${cleanPrompt}\`;
    }

    let retrievedDocs: { id: string; content: string }[] | undefined = undefined;
    let finalSystemPrompt = baseSystemPrompt;
    
    if (AgentFeatureFlags.USE_AGENT_RETRIEVER) {
        if (routingStrategy === 'USE_RAG') {
            const retriever = new RetrieverAdapter(userId, apiKey, provider, customBaseUrl);
            retrievedDocs = await retriever.retrieveKnowledge(cleanPrompt, sendEvent);
        }
    } else {
        // legacy RAG
        if (customInstructions) {
          finalSystemPrompt += \`\\n\\nUser Custom Personalization:\\n\${customInstructions}\`;
        }
        if (routingStrategy === 'USE_RAG') {
          sendEvent('status', { message: 'Performing vector similarity search in repository context...' });
          const aiInstance = di.llmService.getClient(apiKey, customBaseUrl, provider);
          const embedResponse = await aiInstance.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: cleanPrompt,
            config: { outputDimensionality: 768 }
          });
          const embeddingVector = embedResponse.embeddings?.[0]?.values;
          if (embeddingVector) {
            const { knowledgeNodes } = await import('../db/schema.js');
            const { cosineDistance } = await import('drizzle-orm');
            const retrievedContexts = await txWithUser(userId, async (tx) => {
              return await tx.select({
                content: knowledgeNodes.content,
                nodeType: knowledgeNodes.nodeType,
                metadata: knowledgeNodes.metadata,
                similarity: cosineDistance(knowledgeNodes.embedding, embeddingVector)
              }).from(knowledgeNodes).orderBy(cosineDistance(knowledgeNodes.embedding, embeddingVector)).limit(5);
            });
            if (retrievedContexts.length > 0) {
              const formattedContext = retrievedContexts.map((node, i) => {
                const pathInfo = (node.metadata as any)?.path || 'Unknown File';
                return \`[Node \${i + 1}] (\${node.nodeType}) File: \${pathInfo}\\nSimilarity: \${(1 - node.similarity).toFixed(4)}\\nContent:\\n\${node.content}\`;
              }).join('\\n\\n---\\n\\n');
              finalSystemPrompt += \`\\n\\n### RETRIEVED REPOSITORY CONTEXT\\nUse the following active codebase memory contexts to formulate your answer:\\n\\n\${formattedContext}\`;
              sendEvent('status', { message: \`Context retrieval completed. Loaded \${retrievedContexts.length} repository memory blocks.\` });
            } else {
              sendEvent('status', { message: 'No codebase memory matched query context. Proceeding with standard instructions.' });
            }
          } else {
            sendEvent('status', { message: 'Failed to generate search embeddings. Standard mode enabled.' });
          }
        }
    }
    
    // Map simplified history representation
    let simpleHistory = history.map((h: any) => ({
      role: h.role,
      content: h.parts.map((p: any) => p.text || '').join('\\n')
    }));

    if (AgentFeatureFlags.USE_AGENT_CONTEXT_BUILDER) {
        const reqContext = ContextBuilderAdapter.toContextBuilderRequest(
            cleanPrompt,
            baseSystemPrompt,
            simpleHistory,
            retrievedDocs,
            customInstructions,
            sandboxInstructions
        );
        const ctxIntegration = new ContextIntegrationService();
        const m03Context = await ctxIntegration.buildContext(reqContext);
        finalSystemPrompt = PromptContextMapper.toLegacySystemPrompt(m03Context);
    } else {
        // legacy context finalization
        if (sandboxInstructions && !finalSystemPrompt.includes(sandboxInstructions)) {
            finalSystemPrompt += \`\\n\\n\${sandboxInstructions}\`;
        }
        if (customInstructions && !finalSystemPrompt.includes(customInstructions)) {
            finalSystemPrompt += \`\\n\\nUser Custom Personalization:\\n\${customInstructions}\`;
        }
    }

    // Convert history parts into the model input parts
    const formattedContents = history.map((h: any, idx: number) => {
      if (idx === history.length - 1 && h.role === 'user') {
        const parts = h.parts.map((p: any) => {
          if (p.text) return { text: cleanPrompt };
          return p;
        });
        return { role: h.role, parts };
      }
      return h;
    });

`;
    content = content.replace(originalBlock, replacementBlock);
    fs.writeFileSync(file, content);
    console.log("Patched successfully!");
} else {
    console.error("Target block not found");
}
