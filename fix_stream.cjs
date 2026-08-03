const fs = require('fs');
let content = fs.readFileSync('src/server/controllers/ChatController.ts', 'utf8');

const target1 = `          responseStream = await loopAiInstance.models.generateContentStream({
            model: actualModel,
            contents: adjustedContents,
            config: Object.keys(finalConfig).length > 0 ? finalConfig : undefined
          });
          streamSuccess = true;`;

const replacement1 = `          const initialStream = await loopAiInstance.models.generateContentStream({
            model: actualModel,
            contents: adjustedContents,
            config: Object.keys(finalConfig).length > 0 ? finalConfig : undefined
          });
          
          const iterator = initialStream[Symbol.asyncIterator]();
          const firstResult = await iterator.next();
          let firstChunk = null;
          if (!firstResult.done) {
             firstChunk = firstResult.value;
          }
          
          async function* wrappedStream() {
             if (firstChunk) yield firstChunk;
             for await (const chunk of iterator) yield chunk;
          }
          
          responseStream = wrappedStream();
          streamSuccess = true;`;

content = content.replace(target1, replacement1);
fs.writeFileSync('src/server/controllers/ChatController.ts', content);
