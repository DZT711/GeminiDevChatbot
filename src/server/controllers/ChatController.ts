import express from 'express';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import crypto from 'crypto';
import { eq, sql, inArray } from 'drizzle-orm';
import path from 'path';
import { db } from '../db/index.js';
import { users, accounts, userPreferences, apiKeys, customSkills, sessions, messages, modelInformation } from '../db/schema.js';
import { encryptKey, decryptKey } from '../lib/encryption.js';
import { CLASSIFICATION_MODEL, EMBEDDING_MODEL } from '../agent/agent.config.js';
import { di } from "../di.js";
import { JWT_SECRET, getBaseUrl, txWithUser, resolveGoogleApiKey, determineRoutingStrategy } from './utils.js';

export const router = express.Router();

router.post('/summarize-memory', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET).catch(() => ({ payload: null }));
    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid token' });

    const { logs, existingSummary } = req.body;
    
    // We strictly use gemini-2.0-flash as background compaction agent
    const ai = di.llmService.getClient(process.env.GEMINI_API_KEY!);
    
    const instruction = 'Act as a memory compaction agent. Summarize the technical decisions, codebase changes, architecture paths, and fixed bugs from these logs into a single high-density paragraph. Preserve absolute pathnames and system configurations.' 
      + (existingSummary ? '\n\nPreviously summarized context:\n' + existingSummary : '');
      
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: logs }] }],
      config: {
        systemInstruction: instruction
      }
    });

    res.json({ summary: response.text });
  } catch (err: any) {
    const is503 = err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE');
    if (is503) {
      console.info('Compaction failed due to high demand (503). Retrying later.');
    } else {
      console.error('Compaction failed:', err.message || err);
    }
    res.status(500).json({ error: err.message });
  }
});


import { systemLogEmitter, logHistory } from '../logInterceptor.js';

// GET /admin/logs - stream backend console logs via SSE

router.post('/execute', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    // Quick verification
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET).catch(() => ({ payload: null }));
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { code, language } = req.body;
    if (!code) {
       return res.status(400).json({ error: 'Code is required' });
    }

    const lang = (language || 'javascript').toLowerCase();
    const judge0Langs = ['c', 'cpp', 'c++', 'csharp', 'cs', 'c#', 'rust', 'rs', 'go', 'php', 'ruby', 'rb', 'java', 'typescript', 'ts'];
    
    const judge0Aliases: Record<string, number> = {
      'c': 103, 'cpp': 105, 'c++': 105,
      'csharp': 51, 'cs': 51, 'c#': 51,
      'typescript': 101, 'ts': 101,
      'rust': 108, 'rs': 108, 'go': 107,
      'php': 98, 'ruby': 72, 'rb': 72, 
      'bash': 46, 'sh': 46,
      'javascript': 102, 'js': 102,
      'python': 109, 'py': 109, 'java': 91
    };

    if (judge0Langs.includes(lang) || !process.env.E2B_API_KEY) {
       try {
         const judge0LangId = judge0Aliases[lang] || 102; // Default to JS if unknown
         const judge0Res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             language_id: judge0LangId,
             source_code: code
           })
         });
         
         const data = await judge0Res.json();
         if (!judge0Res.ok) throw new Error(data.error || 'Judge0 execution failed');
         
         let output = '';
         if (data.compile_output) {
            output += `Compilation Error:\n${data.compile_output}\n\n`;
         }
         output += data.stdout || "";
         if (data.stderr) {
            output += (output ? "\n" : "") + data.stderr;
         }
         if (data.message) {
            output += (output ? "\n" : "") + data.message;
         }
         if (!output.trim()) {
            output = "Code executed successfully with no output.";
         }
         return res.json({ output });
       } catch (e: any) {
         return res.status(500).json({ error: `Judge0 execution error: ${e.message}` });
       }
    }

    let e2bModule;
    try {
      e2bModule = await import('@e2b/code-interpreter');
    } catch (e) {
      return res.status(500).json({ error: `Error: Sandbox library missing. ${(e as Error).message}` });
    }
    
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Error: E2B_API_KEY not configured." });

    let sandbox;
    let fullOutput = "";
    
    try {
      let execution;
      const supportedLanguages = ['python', 'javascript', 'r', 'java', 'bash', 'c', 'cpp', 'php', 'ruby'];
      
      if (!supportedLanguages.includes(lang)) {
         return res.json({ output: `Error: Language '${lang}' is not supported in the remote sandbox by default. Supported languages are: ${supportedLanguages.join(', ')}.` });
      }

      sandbox = await e2bModule.Sandbox.create({ apiKey });
      execution = await sandbox.runCode(code, { 
        language: lang,
        onStdout: (out: any) => {
           const text = out.line || out.text || out.toString();
           fullOutput += text;
        },
        onStderr: (out: any) => {
           const text = out.line || out.text || out.toString();
           fullOutput += text;
        },
        onResult: (resD: any) => {
           const text = resD.text ? resD.text + "\n" : JSON.stringify(resD) + "\n";
           fullOutput += text;
        }
      });
      
      if (execution.error) {
         const errorText = `\nError: ${execution.error.name} - ${execution.error.value}\n${execution.error.traceback}\n`;
         fullOutput += errorText;
      }
      
      res.json({ output: fullOutput || "Code executed successfully with no console output." });
    } catch (e: any) {
      res.status(500).json({ error: `Sandbox execution error: ${e.message}` });
    } finally {
      if (sandbox) await sandbox.kill();
    }

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /chat - Fully secure and automated AI router & chat pipeline

router.post('/chat', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log("[CHAT_REQ] provider:", req.body.provider, "model:", req.body.model, "customKey:", !!req.body.customKey);
    const { prompt, history, model, activeSkillIds, useSearch, thinkingLevel, customKey, customInstructions, customBaseUrl, provider } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const userId = payload.id as string;
    const apiKey = await resolveGoogleApiKey(userId, customKey, provider);
    if (!apiKey) {
      return res.status(400).json({ error: 'API key not configured. Please add an API key in active settings.' });
    }

    // Set Server-Sent Events headers for high performance streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (type: string, data: any) => {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    };

    // 1. Determine routing strategy
    // Check if the prompt begins with "/RAG" command (case-insensitive) to force RAG
    let routingStrategy: 'USE_RAG' | 'DIRECT_CHAT' = 'DIRECT_CHAT';
    let cleanPrompt = prompt;
    let isForcedRAG = false;

    let isForcedSandbox = false;

    if (/^\/sandbox\s+/i.test(prompt)) {
      routingStrategy = 'DIRECT_CHAT';
      cleanPrompt = prompt.replace(/^\/sandbox\s+/i, '').trim();
      isForcedSandbox = true;
      sendEvent('routing', { strategy: 'USE_SANDBOX', forced: true, message: 'Forced Sandbox mode activated via /SANDBOX command.' });
    } else if (/^\/rag\s+/i.test(prompt)) {
      routingStrategy = 'USE_RAG';
      cleanPrompt = prompt.replace(/^\/rag\s+/i, '').trim();
      isForcedRAG = true;
      sendEvent('routing', { strategy: 'USE_RAG', forced: true, message: 'Forced memory indexing mode activated via /RAG command.' });
    } else {
      routingStrategy = await determineRoutingStrategy(cleanPrompt, apiKey);
      sendEvent('routing', { strategy: routingStrategy, forced: false });
    }

    // 2. Conditional Branching Context Injection
    let finalSystemPrompt = `You are GeminiDevChatbot, an elite AI Software Engineering Assistant explicitly customized for the development, maintenance, and optimization of this repository.

### CORE OPERATING RULES
1. Strict Grounding: Analyze and formulate responses using the codebase context if provided.
2. File Path References: State full file paths wherever pertinent.
3. TypeScript Excellence: Ensure any code provided is valid, strictly typed TypeScript.

Always provide runnable code blocks/examples with Markdown syntax.`;

    if (isForcedSandbox) {
      finalSystemPrompt += `\n\n### MANDATORY SANDBOX INSTRUCTION\nThe user has explicitly requested to run code in the sandbox for this query. You MUST use the \`execute_code\` tool to write and execute the code to solve the user's prompt. After receiving the output, present the results clearly to the user.`;
      cleanPrompt = `Please write and execute the code to solve this, using the execute_code tool. Query: ${cleanPrompt}`;
    }

    if (customInstructions) {
      finalSystemPrompt += `\n\nUser Custom Personalization:\n${customInstructions}`;
    }

    if (routingStrategy === 'USE_RAG') {
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
            return `[Node ${i + 1}] (${node.nodeType}) File: ${pathInfo}\nSimilarity: ${(1 - node.similarity).toFixed(4)}\nContent:\n${node.content}`;
          }).join('\n\n---\n\n');

          finalSystemPrompt += `\n\n### RETRIEVED REPOSITORY CONTEXT\nUse the following active codebase memory contexts to formulate your answer:\n\n${formattedContext}`;
          sendEvent('status', { message: `Context retrieval completed. Loaded ${retrievedContexts.length} repository memory blocks.` });
        } else {
          sendEvent('status', { message: 'No codebase memory matched query context. Proceeding with standard instructions.' });
        }
      } else {
        sendEvent('status', { message: 'Failed to generate search embeddings. Standard mode enabled.' });
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

    const Type = di.llmService.getTypeEnum();
    const aiInstance = di.llmService.getClient(apiKey, customBaseUrl, provider);
    
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
          description: "Read the file structure and contents of a public GitHub repository. This tool returns the repository file tree. You can optionally request the content of specific files by providing their paths. Use this when the user shares a GitHub link and asks you to read or analyze it.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              repoUrl: { type: Type.STRING, description: "The public GitHub repository URL (e.g. https://github.com/DZT711/DZT711)" },
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

    const chatModel = model || 'gemini-3.5-flash';
    let finalModelUsed = chatModel;
    let toolLoops = 0;
    let lastUsageMetadata: any = null;

    // Auto-save RAG accumulators
    let autoSave_aiOutputText = '';
    const autoSave_allFunctionCalls: any[] = [];
    const autoSave_toolResponses: any[] = [];

    while (toolLoops < 5) {
      let responseStream;
      let streamSuccess = false;
      let attemptCount = 0;
      let lastStreamError: any = null;

      while (!streamSuccess && attemptCount < 4) {
        attemptCount++;
        let loopProvider = provider;
        try {
          let finalConfig: any = {};
             
          if (!loopProvider) {
              if (finalModelUsed && finalModelUsed.includes('/') && !finalModelUsed.startsWith('models/')) {
                  loopProvider = 'openrouter';
              } else {
                  loopProvider = 'google';
              }
          }

          let loopApiKey = apiKey;
          // Dynamically resolve key again if we switched providers during fallback
          if (loopProvider !== provider) {
             loopApiKey = await resolveGoogleApiKey(userId, customKey, loopProvider) || apiKey;
          }
          
          // Re-create aiInstance per loop in case we fell back from OpenRouter to Google
          const loopAiInstance = di.llmService.getClient(loopApiKey, customBaseUrl, loopProvider);
          
          let actualModel = finalModelUsed;
          if ((!loopProvider || loopProvider === 'google') && actualModel.startsWith('google/')) {
             actualModel = actualModel.replace('google/', '');
             actualModel = actualModel.split(':')[0];
          }
          if ((!loopProvider || loopProvider === 'google') && actualModel.includes('/')) {
              actualModel = actualModel.split('/')[1];
          }

          const isGemma = actualModel.toLowerCase().includes('gemma');
          
          if (!isGemma) {
            finalConfig.systemInstruction = finalSystemPrompt;
            finalConfig.tools = [proposeKnowledgeTool];
            if (actualModel.includes('thinking') || actualModel === 'gemini-3.1-pro-preview') {
              finalConfig.thinkingConfig = {
                 thinkingLevel: thinkingLevel || 'LOW',
                 includeThoughts: true
              };
            }
          }
          
          let adjustedContents = formattedContents;
          if (isGemma) {
             adjustedContents = [...formattedContents];
             if (adjustedContents.length > 0 && adjustedContents[0].role === 'user') {
                adjustedContents[0] = {
                   ...adjustedContents[0],
                   parts: [
                      { text: "System Instructions:\n" + finalSystemPrompt + "\n\n--- END SYSTEM INSTRUCTIONS ---\n\n" },
                      ...adjustedContents[0].parts
                   ]
                };
             }
          }

          responseStream = await loopAiInstance.models.generateContentStream({
            model: actualModel,
            contents: adjustedContents,
            config: Object.keys(finalConfig).length > 0 ? finalConfig : undefined
          });
          streamSuccess = true;
        } catch (streamError: any) {
          lastStreamError = streamError;
          console.error("[CHAT_STREAM_ERROR]", streamError);
          const errorMsg = streamError.message || streamError.toString() || '';
          
          if ((errorMsg.includes('401') || errorMsg.includes('Authentication')) && loopProvider === 'openrouter') {
              throw new Error("OpenRouter API Key is missing or invalid. Please add your OpenRouter key in Settings -> API Keys.");
          }

          const isQuotaExceeded = errorMsg.includes('429') || 
                                 errorMsg.includes('RESOURCE_EXHAUSTED') || 
                                 errorMsg.toLowerCase().includes('resource_exhausted') ||
                                 errorMsg.includes('Quota exceeded') ||
                                 errorMsg.includes('exceeded your current quota') ||
                                 errorMsg.includes('limit: 0');
          const isModelNotFound = errorMsg.includes('404') || 
                                 errorMsg.includes('not found') || 
                                 errorMsg.includes('not supported') ||
                                 errorMsg.includes('not be found');
          const isUnavailable = errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('experiencing high demand');

          const needsFallback = isQuotaExceeded || isModelNotFound || isUnavailable;
          const normalizedModel = finalModelUsed.replace('models/', '');
          
          const isOpenRouterUpstreamError = loopProvider === 'openrouter' && (errorMsg.includes('API key not valid') || errorMsg.includes('400') && errorMsg.includes('type.googleapis.com'));
          const reallyNeedsFallback = needsFallback || isOpenRouterUpstreamError;
          
          let fb1 = loopProvider === 'openrouter' ? 'google/gemini-2.5-flash' : 'gemini-3.5-flash';
          let fb2 = loopProvider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct' : 'gemini-3-flash-preview';
          let fb3 = loopProvider === 'openrouter' ? 'google/gemini-2.0-flash-exp:free' : 'gemini-2.0-flash';
          let fb4 = loopProvider === 'openrouter' ? 'google/gemini-2.0-pro-exp-02-05:free' : 'gemini-1.5-flash';

          if (reallyNeedsFallback && normalizedModel !== fb1 && normalizedModel !== fb2 && normalizedModel !== fb3 && normalizedModel !== fb4) {
            console.warn(`[AI Query Router] Model ${finalModelUsed} triggered error. Dynamic fallback to ${fb1}.`);
            sendEvent('status', { message: `⚠️ Selected model '${finalModelUsed}' hit quota limits or is currently unavailable. Redirected to high-performance '${fb1}'.` });
            finalModelUsed = fb1;
            sendEvent('model_switch', { model: finalModelUsed });
          } else if (reallyNeedsFallback && normalizedModel === fb1) {
            console.warn(`[AI Query Router] Model ${finalModelUsed} triggered error. Extended fallback to ${fb2}.`);
            sendEvent('status', { message: `⚠️ High demand on standard models. Connecting to alternative model...` });
            finalModelUsed = fb2;
            sendEvent('model_switch', { model: finalModelUsed });
          } else if (reallyNeedsFallback && normalizedModel === fb2) {
            console.warn(`[AI Query Router] Model ${finalModelUsed} triggered error. Extended fallback to ${fb3}.`);
            sendEvent('status', { message: `⚠️ Extremely high demand on standard models. Connecting to alternative fallback...` });
            finalModelUsed = fb3;
            sendEvent('model_switch', { model: finalModelUsed });
          } else if (reallyNeedsFallback && normalizedModel === fb3) {
            console.warn(`[AI Query Router] Model ${finalModelUsed} triggered error. Extended fallback to ${fb4}.`);
            sendEvent('status', { message: `⚠️ Extremely high demand on standard models. Connecting to alternative fallback...` });
            finalModelUsed = fb4;
            sendEvent('model_switch', { model: finalModelUsed });
          } else {
            throw streamError;
          }
        }
      }

      if (!streamSuccess) {
        throw lastStreamError;
      }

      let hasFunctionCalls = false;
      const allFunctionCallsInStream: any[] = [];
      const toolResponses: any[] = [];

      for await (const chunk of responseStream) {
        if (chunk.usageMetadata) {
          lastUsageMetadata = chunk.usageMetadata;
        }
        
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          hasFunctionCalls = true;
          for (const fc of chunk.functionCalls) {
            allFunctionCallsInStream.push(fc);
            autoSave_allFunctionCalls.push({ name: fc.name });
            
            if (fc.name === 'proposeKnowledge') {
              const { content, reason } = fc.args as any;
              try {
                const { knowledgeProposals } = await import('../db/schema.js');
                await txWithUser(payload.id as string, async (tx: any) => {
                  await tx.insert(knowledgeProposals).values({
                    userId: payload.id as string,
                    actionType: 'INSERT',
                    proposedContent: content,
                    reason: reason || 'AI Auto-Proposed',
                    status: 'PENDING'
                  });
                });
                sendEvent('status', { message: `💡 AI auto-proposed a new knowledge memory! (Content length: ${content?.length || 0})` });
                sendEvent('system_event', { type: 'knowledge_proposal_created' });
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "success" } } });
              } catch (err: any) {
                console.error('Failed to create AI knowledge proposal:', err);
                sendEvent('status', { message: `⚠️ Output failed to propose knowledge memory.` });
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
              }
            } else if (fc.name === 'execute_code') {
              const { code, language } = fc.args as any;
              const langDisp = language || 'javascript';
              sendEvent('status', { message: `🚀 Sandbox Executing ${langDisp}...` });
              sendEvent('text', `\n\n\`\`\`${langDisp}\n${code}\n\`\`\`\n\n\`\`\`ansi\n`);
              
              const runCodeInE2BSandbox = async (codeToRun: string, lang: string): Promise<string> => {
                const targetLang = (lang || 'javascript').toLowerCase();
                const judge0Langs = ['c', 'cpp', 'c++', 'csharp', 'cs', 'c#', 'rust', 'rs', 'go', 'php', 'ruby', 'rb', 'java', 'typescript', 'ts'];
                
                const judge0Aliases: Record<string, number> = {
                  'c': 103, 'cpp': 105, 'c++': 105,
                  'csharp': 51, 'cs': 51, 'c#': 51,
                  'typescript': 101, 'ts': 101,
                  'rust': 108, 'rs': 108, 'go': 107,
                  'php': 98, 'ruby': 72, 'rb': 72, 
                  'bash': 46, 'sh': 46,
                  'javascript': 102, 'js': 102,
                  'python': 109, 'py': 109, 'java': 91
                };

                if (judge0Langs.includes(targetLang) || !process.env.E2B_API_KEY) {
                   try {
                     const judge0LangId = judge0Aliases[targetLang] || 102; // Default to JS if unknown
                     const judge0Res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({
                         language_id: judge0LangId,
                         source_code: codeToRun
                       })
                     });
                     
                     const data = await judge0Res.json();
                     if (!judge0Res.ok) throw new Error(data.error || 'Judge0 execution failed');
                     
                     let output = '';
                     if (data.compile_output) {
                        output += `Compilation Error:\n${data.compile_output}\n\n`;
                     }
                     output += data.stdout || "";
                     if (data.stderr) {
                        output += (output ? "\n" : "") + data.stderr;
                     }
                     if (data.message) {
                        output += (output ? "\n" : "") + data.message;
                     }
                     if (!output.trim()) {
                        output = "Code executed successfully with no output.";
                     }
                     sendEvent('text', output);
                     sendEvent('text', `\n\`\`\`\n\n`);
                     return output;
                   } catch (e: any) {
                     const errorText = `Judge0 execution error: ${e.message}\n`;
                     sendEvent('text', errorText);
                     sendEvent('text', `\n\`\`\`\n\n`);
                     return errorText;
                   }
                }

                let e2bModule;
                try {
                  e2bModule = await import('@e2b/code-interpreter');
                } catch (e) {
                  return `Error: Sandbox library missing. ${(e as Error).message}`;
                }
                const apiKey = process.env.E2B_API_KEY;
                if (!apiKey) return "Error: E2B_API_KEY not configured.";

                let sandbox;
                let fullOutput = "";
                
                try {
                  const supportedLanguages = ['python', 'javascript', 'r', 'java', 'bash', 'c', 'cpp', 'php', 'ruby'];
                  
                  if (!supportedLanguages.includes(targetLang)) {
                    const failMsg = `Error: Language '${targetLang}' is not supported in the remote sandbox by default. Supported languages are: ${supportedLanguages.join(', ')}.`;
                    sendEvent('text', failMsg + '\n');
                    return failMsg;
                  }

                  sandbox = await e2bModule.Sandbox.create({ apiKey });
                  const execution = await sandbox.runCode(codeToRun, { 
                    language: targetLang,
                    onStdout: (out: any) => {
                       const text = out.line || out.text || out.toString();
                       fullOutput += text;
                       sendEvent('text', text);
                    },
                    onStderr: (out: any) => {
                       const text = out.line || out.text || out.toString();
                       fullOutput += text;
                       sendEvent('text', text);
                    },
                    onResult: (res: any) => {
                       const text = res.text ? res.text + "\n" : JSON.stringify(res) + "\n";
                       fullOutput += text;
                       sendEvent('text', text);
                    }
                  });
                  
                  if (execution.error) {
                     const errorText = `\nError: ${execution.error.name} - ${execution.error.value}\n${execution.error.traceback}\n`;
                     fullOutput += errorText;
                     sendEvent('text', errorText);
                  }
                  
                  sendEvent('text', `\n\`\`\`\n\n`);
                  return fullOutput || "Code executed successfully with no output.";
                } catch (e: any) {
                  const errorText = `Sandbox execution error: ${e.message}\n`;
                  sendEvent('text', errorText);
                  sendEvent('text', `\n\`\`\`\n\n`);
                  return errorText;
                } finally {
                  if (sandbox) await sandbox.kill();
                }
              };

              try {
                const executionOutput = await runCodeInE2BSandbox(code, langDisp);
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "success", output: executionOutput } } });
              } catch (err: any) {
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
              }
            } else if (fc.name === 'read_github_repo') {
              const { repoUrl, filesToRead } = fc.args as any;
              sendEvent('status', { message: `🔍 Reading GitHub Repository: ${repoUrl}` });
              
              const fetchGithubRepo = async (url: string, files?: string[]): Promise<any> => {
                const match = url.match(/github\.com\/([^\/]+)\/([^\/\s]+)/i);
                if (!match) {
                   throw new Error("Invalid GitHub URL format.");
                }
                const owner = match[1];
                const repo = match[2].replace(/\.git$/, '');
                
                try {
                  const defaultBranchUrl = `https://api.github.com/repos/${owner}/${repo}`;
                  const repoInfoRes = await fetch(defaultBranchUrl, { headers: { 'User-Agent': 'DevGenie-AI' }});
                  if (!repoInfoRes.ok) throw new Error("Could not fetch repo info. Ensure it is public.");
                  const repoInfo = await repoInfoRes.json();
                  const defaultBranch = repoInfo.default_branch || 'main';

                  let result: any = { status: "success", owner, repo, defaultBranch };

                  if (!files || files.length === 0) {
                     const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
                     const treeRes = await fetch(treeUrl, { headers: { 'User-Agent': 'DevGenie-AI' }});
                     if (!treeRes.ok) throw new Error("Could not fetch file tree.");
                     const treeData = await treeRes.json();
                     result.fileTree = treeData.tree.map((node: any) => node.path).filter((p: string) => !p.startsWith('.git/'));
                  } else {
                     result.fileContents = {};
                     for (const file of files) {
                        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file}`;
                        const rawRes = await fetch(rawUrl, { headers: { 'User-Agent': 'DevGenie-AI' }});
                        if (rawRes.ok) {
                           result.fileContents[file] = await rawRes.text();
                        } else {
                           result.fileContents[file] = `Error: Could not read file ${file}. (${rawRes.status})`;
                        }
                     }
                  }
                  return result;
                } catch (e: any) {
                  return { status: "error", error: e.message };
                }
              };

              try {
                const fetchResult = await fetchGithubRepo(repoUrl, filesToRead);
                toolResponses.push({ functionResponse: { name: fc.name, response: fetchResult } });
                sendEvent('text', `\n*Successfully processed GitHub operation for ${repoUrl}*\n`);
              } catch (err: any) {
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
                sendEvent('text', `\n*Failed to read ${repoUrl}: ${err.message}*\n`);
              }
            } else {
              toolResponses.push({ functionResponse: { name: fc.name, response: { status: "success" } } });
            }
          }
        }

        const candidateParts = (chunk as any).candidates?.[0]?.content?.parts || [];
        for (const part of candidateParts) {
          if (part.thought === true && part.text) {
            sendEvent('thinking', part.text);
          }
        }

        if (chunk.text) {
          sendEvent('text', chunk.text);
          autoSave_aiOutputText += chunk.text;
        }
      }

      sendEvent('thinking_done', null);

      if (hasFunctionCalls && allFunctionCallsInStream.length > 0) {
        autoSave_toolResponses.push(...toolResponses);
        formattedContents.push({ role: 'model', parts: allFunctionCallsInStream.map(c => ({ functionCall: c })) });
        formattedContents.push({ role: 'user', parts: toolResponses });
        toolLoops++;
        continue;
      }
      
      break;
    }

    try {
      const summaryParts = [];
      summaryParts.push(`User Prompt: ${cleanPrompt}`);
      if (autoSave_allFunctionCalls.length > 0) {
        summaryParts.push(`Tools Used by AI: ${autoSave_allFunctionCalls.map(fc => fc.name).join(', ')}`);
        
        const trimmedToolResponses = autoSave_toolResponses.map(tr => {
            let resObjStr = typeof tr.functionResponse.response === 'string' 
              ? tr.functionResponse.response 
              : JSON.stringify(tr.functionResponse.response);
            if (resObjStr && resObjStr.length > 2500) resObjStr = resObjStr.substring(0, 2500) + '...[truncated]';
            return `Tool [${tr.functionResponse.name}] Response:\n${resObjStr}`;
        });
        if (trimmedToolResponses.length > 0) {
            summaryParts.push(`Tool Execution Results:\n${trimmedToolResponses.join('\n\n')}`);
        }
      }
      
      const attachedFilesTextLines = [];
      const userParts = history[history.length - 1]?.parts || [];
      for (const p of userParts) {
         if (p.inlineData && p.inlineData.mimeType && p.inlineData.data) {
            if (p.inlineData.mimeType.startsWith('text/')) {
               const base64Text = Buffer.from(p.inlineData.data, 'base64').toString('utf8');
               attachedFilesTextLines.push(`Attached File/Data (${p.inlineData.mimeType}):\n${base64Text.substring(0, 3000)}${base64Text.length > 3000 ? '...[truncated]' : ''}`);
            } else {
               attachedFilesTextLines.push(`Media / Attachment provided: [${p.inlineData.mimeType} - Data omitted for brevity]`);
            }
         }
      }
      if (attachedFilesTextLines.length > 0) {
         summaryParts.push(attachedFilesTextLines.join('\n'));
      }
      
      if (autoSave_aiOutputText.trim()) {
         summaryParts.push(`AI Output Response:\n${autoSave_aiOutputText.substring(0, 4000)}${autoSave_aiOutputText.length > 4000 ? '...[truncated]' : ''}`);
      }

      const fullContextStr = summaryParts.join('\n\n---\n\n');
      
      if (fullContextStr.length > 10) {
         {
            const Type = di.llmService.getTypeEnum();
            const aiBackground = di.llmService.getClient(apiKey);
            import('../agent/agent.config.js').then(({ EMBEDDING_MODEL }) => {
               aiBackground.models.embedContent({
                   model: EMBEDDING_MODEL,
                   contents: fullContextStr.substring(0, 9000),
                   config: { outputDimensionality: 768 }
               }).then(async (embedResponse) => {
                   const embeddingVector = embedResponse.embeddings?.[0]?.values;
                   if (embeddingVector) {
                       const { knowledgeNodes } = await import('../db/schema.js');
                       await txWithUser(userId, async (tx) => {
                           await tx.insert(knowledgeNodes).values({
                               content: fullContextStr,
                               nodeType: 'past_response',
                               embedding: embeddingVector,
                               metadata: { source: 'Auto-Saved AI Execution Context', date: new Date().toISOString() }
                           });
                       });
                       console.log("[Auto-RAG] Indexed user's chat context & executions.");
                   }
               }).catch(err => {
                   console.error("[Auto-RAG] Embed fails:", err.message);
               });
            });
         }
      }
    } catch (err) {
      console.error("Failed to construct auto-RAG context", err);
    }

    if (lastUsageMetadata) {
      console.log('[AI Query Router] Response Metrics (usageMetadata):', lastUsageMetadata);
      sendEvent('metadata', lastUsageMetadata);
    }

    res.write('event: end\ndata: {}\n\n');
    res.end();
  } catch (e: any) {
    const is503 = e?.message?.includes('503') || e?.message?.includes('UNAVAILABLE');
    if (is503) {
      console.error('[AI Query Router ERROR]: AI Model cluster is currently experiencing high demand. Please try again shortly.');
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'AI Model cluster is currently experiencing extremely high demand. We cascaded through all fallback models but they are currently unavailable. Please try again shortly.' })}\n\n`);
    } else {
      let friendlyError = e.message || 'An unexpected error occurred in backend chat pipeline.';
      if (typeof friendlyError === 'string' && friendlyError.includes('Missing Authentication header')) {
         friendlyError = "API Error (401): Missing Authentication header. If you are using Google Gemini natively, please ensure your Custom Base URL in Key Settings is empty. If you are using OpenRouter, ensure your key is valid and Provider is set to OpenRouter.";
      } else if (typeof friendlyError === 'string' && friendlyError.includes('User not found')) {
         friendlyError = "API Error (401): User not found. Your OpenRouter API key is invalid.";
      } else if (typeof friendlyError === 'string' && friendlyError.includes('API key not valid')) {
         friendlyError = "API Error (400): Google Gemini API key not valid. Please ensure your API key is correct in Settings.";
      }
      console.error('[AI Query Router ERROR]:', e.message || e);
      res.write(`data: ${JSON.stringify({ type: 'error', data: friendlyError })}\n\n`);
    }
    res.write('event: end\ndata: {}\n\n');
    res.end();
  }
});

// POST /messages/query - Query historic messages table for system intelligence

router.post('/messages/query', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { query, limit = 50, sessionId } = req.body;
    const userId = payload.id as string;

    const results = await txWithUser(userId, async (tx) => {
      // Retrieve user object to inspect role
      const userObj = await tx.query.users.findFirst({
        where: eq(users.id, userId)
      });
      if (!userObj) {
        throw new Error('User not found');
      }

      const { and, ilike, desc } = await import('drizzle-orm');

      const conditions = [];

      // Filter by session if provided
      if (sessionId) {
        conditions.push(eq(messages.sessionId, sessionId));
      }

      // Role filtration: Only Admin can inspect other users' logs.
      // Standard users can only query their own session messages.
      if (userObj.role !== 'ADMIN') {
        const userSessions = await tx.select().from(sessions).where(eq(sessions.userId, userId));
        const userSessionIds = userSessions.map(s => s.id);
        if (userSessionIds.length === 0) {
          return [];
        }
        conditions.push(sql`${messages.sessionId} IN ${userSessionIds}`);
      }

      // Keyword filter on content if provided
      if (query && typeof query === 'string' && query.trim()) {
        const cleanQuery = `%${query.trim()}%`;
        conditions.push(ilike(messages.content, cleanQuery));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return await tx.select()
        .from(messages)
        .where(whereClause)
        .orderBy(desc(messages.createdAt))
        .limit(Number(limit) || 50);
    });

    res.json({ results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /messages/:id/rating - Update user rating for a message

router.put('/messages/:id/rating', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { rating } = req.body;
    const messageId = req.params.id;
    const userId = payload.id as string;

    await txWithUser(userId, async (tx) => {
      await tx.update(messages)
        .set({ rating: Number(rating) })
        .where(eq(messages.id, messageId));
    });

    res.json({ success: true, rating });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /knowledge - Get all knowledge nodes for the authenticated user
