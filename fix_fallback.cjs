const fs = require('fs');
let content = fs.readFileSync('src/server/controllers/ChatController.ts', 'utf8');

const target = `          const reallyNeedsFallback = needsFallback || isOpenRouterUpstreamError;
          
          let fb1 = loopProvider === 'openrouter' ? 'google/gemini-2.5-flash' : 'gemini-3.5-flash';
          let fb2 = loopProvider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct' : 'gemini-3-flash-preview';
          let fb3 = loopProvider === 'openrouter' ? 'google/gemini-2.0-flash-exp:free' : 'gemini-2.0-flash';
          let fb4 = loopProvider === 'openrouter' ? 'google/gemini-2.0-pro-exp-02-05:free' : 'gemini-1.5-flash';

          if (reallyNeedsFallback && normalizedModel !== fb1 && normalizedModel !== fb2 && normalizedModel !== fb3 && normalizedModel !== fb4) {`;

const replacement = `          const reallyNeedsFallback = needsFallback || isOpenRouterUpstreamError;
          
          let fb1 = loopProvider === 'openrouter' ? 'google/gemini-2.5-flash' : 'gemini-3.5-flash';
          let fb2 = loopProvider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct' : 'gemini-3-flash-preview';
          let fb3 = loopProvider === 'openrouter' ? 'google/gemini-2.0-flash-exp:free' : 'gemini-2.0-flash';
          let fb4 = loopProvider === 'openrouter' ? 'google/gemini-2.0-pro-exp-02-05:free' : 'gemini-1.5-flash';
          
          console.log(\`[DEBUG] fallback check: attempt=\${attemptCount}, model=\${finalModelUsed}, normalized=\${normalizedModel}, reallyNeedsFallback=\${reallyNeedsFallback}\`);

          if (reallyNeedsFallback && normalizedModel !== fb1 && normalizedModel !== fb2 && normalizedModel !== fb3 && normalizedModel !== fb4) {`;

content = content.replace(target, replacement);

const target2 = `          } else {
            throw streamError;
          }
        }
      }

      if (!streamSuccess) {
        throw lastStreamError;
      }`;

const replacement2 = `          } else {
            console.log(\`[DEBUG] throwing streamError because no fallback matched\`);
            throw streamError;
          }
        }
      }

      if (!streamSuccess) {
        console.log(\`[DEBUG] throwing lastStreamError after loops exhausted\`);
        throw lastStreamError;
      }`;

content = content.replace(target2, replacement2);
fs.writeFileSync('src/server/controllers/ChatController.ts', content);
