import fs from 'fs';
let content = fs.readFileSync('src/server/controllers/ChatController.ts', 'utf8');

const importTarget = "import { AgentIntegrationService } from '../services/agentIntegration/AgentIntegrationService.js';";
const importReplacement = "import { AgentIntegrationService } from '../services/agentIntegration/AgentIntegrationService.js';\nimport { RetrieverAdapter } from '../services/agentIntegration/retrieval/RetrieverAdapter.js';";

content = content.replace(importTarget, importReplacement);

const legacySearchTarget = `    if (routingStrategy === 'USE_RAG') {
      sendEvent('status', { message: 'Performing vector similarity search in repository context...' });
      
      
      const aiInstance = di.llmService.getClient(apiKey, customBaseUrl, provider);
      
      // Generate embedding using modern EMBEDDING_MODEL
      const embedResponse = await aiInstance.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: cleanPrompt,
        config: {
          outputDimensionality: 768
        }
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
          })
          .from(knowledgeNodes)
          .orderBy(cosineDistance(knowledgeNodes.embedding, embeddingVector))
          .limit(5);
        });

        if (retrievedContexts.length > 0) {
          const formattedContext = retrievedContexts.map((node, i) => {
            const pathInfo = (node.metadata as any)?.path || 'Unknown File';
            return \`[Node \${i + 1}] (\${node.nodeType}) File: \${pathInfo}\\nSimilarity: \${(1 - node.similarity).toFixed(4)}\\nContent:\\n\${node.content}\`;
          }).join('\\n\\n---\\n\\n');

          finalSystemPrompt += \`\\n\\n### RETRIEVED REPOSITORY CONTEXT\\nUse the following active codebase memory contexts to formulate your answer:\\n\\n\${formattedContext}\`;
          sendEvent('status', { message: \`Context retrieval completed. Loaded \${retrievedContexts.length} repository memory blocks.\` });
        } else {
          sendEvent('status', { message: 'No highly relevant context found in repository.' });
        }
      }
    }`;

const legacySearchReplacement = `    if (routingStrategy === 'USE_RAG') {
      if (AgentFeatureFlags.USE_AGENT_RETRIEVER) {
          const retrieverAdapter = new RetrieverAdapter(userId, apiKey, provider, customBaseUrl);
          finalSystemPrompt = await retrieverAdapter.augmentPromptWithContext(cleanPrompt, finalSystemPrompt, sendEvent);
      } else {
          sendEvent('status', { message: 'Performing vector similarity search in repository context...' });
          
          const aiInstance = di.llmService.getClient(apiKey, customBaseUrl, provider);
          
          // Generate embedding using modern EMBEDDING_MODEL
          const embedResponse = await aiInstance.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: cleanPrompt,
            config: {
              outputDimensionality: 768
            }
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
              })
              .from(knowledgeNodes)
              .orderBy(cosineDistance(knowledgeNodes.embedding, embeddingVector))
              .limit(5);
            });

            if (retrievedContexts.length > 0) {
              const formattedContext = retrievedContexts.map((node, i) => {
                const pathInfo = (node.metadata as any)?.path || 'Unknown File';
                return \`[Node \${i + 1}] (\${node.nodeType}) File: \${pathInfo}\\nSimilarity: \${(1 - node.similarity).toFixed(4)}\\nContent:\\n\${node.content}\`;
              }).join('\\n\\n---\\n\\n');

              finalSystemPrompt += \`\\n\\n### RETRIEVED REPOSITORY CONTEXT\\nUse the following active codebase memory contexts to formulate your answer:\\n\\n\${formattedContext}\`;
              sendEvent('status', { message: \`Context retrieval completed. Loaded \${retrievedContexts.length} repository memory blocks.\` });
            } else {
              sendEvent('status', { message: 'No highly relevant context found in repository.' });
            }
          }
      }
    }`;

content = content.replace(legacySearchTarget, legacySearchReplacement);

fs.writeFileSync('src/server/controllers/ChatController.ts', content);
