const fs = require('fs');
let content = fs.readFileSync('src/server/controllers/ChatController.ts', 'utf8');

const target = `            const aiBackground = di.llmService.getClient(apiKey);
            import('../agent/agent.config.js').then(({ EMBEDDING_MODEL }) => {
               aiBackground.models.embedContent({`;

const replacement = `            resolveGoogleApiKey(userId, undefined, 'google').then(googleKeyForAutoRAG => {
               if (!googleKeyForAutoRAG) {
                  console.log("[Auto-RAG] Skipped because Google API key is missing.");
                  return;
               }
               const aiBackground = di.llmService.getClient(googleKeyForAutoRAG);
               import('../agent/agent.config.js').then(({ EMBEDDING_MODEL }) => {
                  aiBackground.models.embedContent({`;

content = content.replace(target, replacement);

const target2 = `                   }
               }).catch(err => {
                   console.error("[Auto-RAG] Embed fails:", err.message);
               });
            });
         }
      }
    } catch (err) {`;

const replacement2 = `                   }
               }).catch(err => {
                   console.error("[Auto-RAG] Embed fails:", err.message);
               });
            });
            }).catch(err => console.error("[Auto-RAG] key resolution fail:", err));
         }
      }
    } catch (err) {`;

content = content.replace(target2, replacement2);
fs.writeFileSync('src/server/controllers/ChatController.ts', content);
