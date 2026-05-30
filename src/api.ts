import express from 'express';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import crypto from 'crypto';
import { eq, sql, inArray } from 'drizzle-orm';
import path from 'path';

import { db } from './db/index.js';
import { users, accounts, userPreferences, apiKeys, customSkills, sessions, messages, modelInformation } from './db/schema.js';
import { encryptKey, decryptKey } from './lib/encryption.js';
import { CLASSIFICATION_MODEL, EMBEDDING_MODEL } from './agent/agent.config.js';

export const apiRouter = express.Router();

apiRouter.use(express.json({ limit: '50mb' }));
apiRouter.use(express.urlencoded({ limit: '50mb', extended: true }));

apiRouter.get('/models/info', async (req, res) => {
  try {
    const cachedModels = await db.select().from(modelInformation);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Only fetch if empty or outdated
    if (cachedModels.length === 0 || new Date(cachedModels[0].updatedAt) < dayAgo) {
      const openRouterRes = await fetch('https://openrouter.ai/api/v1/models');
      if (openRouterRes.ok) {
        const { data } = await openRouterRes.json();
        
        // Use a transaction or simply upsert
        for (const m of data) {
          const provider = m.id.split('/')[0] || 'unknown';
          const pricingInfo = m.pricing;
          
          await db.insert(modelInformation).values({
            id: m.id,
            provider: provider,
            name: m.name,
            contextLength: m.context_length?.toString(),
            description: m.description || '',
            pricing: pricingInfo,
            architecture: m.architecture?.modality || m.architecture?.instruct_type || '', // Simple fallback schema
            updatedAt: new Date()
          }).onConflictDoUpdate({
            target: modelInformation.id,
            set: {
              name: m.name,
              contextLength: m.context_length?.toString(),
              description: m.description || '',
              pricing: pricingInfo,
              architecture: m.architecture?.modality || m.architecture?.instruct_type || '',
              updatedAt: new Date()
            }
          });
        }
      }
      
      // refetch after update
      const updatedModels = await db.select().from(modelInformation);
      return res.json(updatedModels);
    }
    
    res.json(cachedModels);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-123456');


apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', using: 'supabase-postgres' });
});

apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) return res.status(400).json({ error: 'Email in use' });

    const hash = await bcrypt.hash(password, 10);
    const isSpecialAdmin = email === 'nguyensihuynsh711@gmail.com';
    const [user] = await db.insert(users).values({
      email,
      passwordHash: hash,
      role: isSpecialAdmin ? 'ADMIN' : 'USER'
    }).returning();

    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.email === 'nguyensihuynsh711@gmail.com' && user.role !== 'ADMIN') {
      await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, user.id));
      user.role = 'ADMIN';
    }

    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put('/auth/me', async (req, res) => {
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

    const { name, avatarUrl, customInstructions } = req.body;
    const [user] = await db.update(users)
      .set({ name, avatarUrl, customInstructions })
      .where(eq(users.id, payload.id as string))
      .returning();

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string),
      with: { accounts: true }
    });
    const githubToken = currentUser?.accounts?.find(a => a.provider === 'github')?.accessToken;

    res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, customInstructions: user.customInstructions, githubToken });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function txWithUser<T>(userId: string, callback: (tx: any) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    return await callback(tx);
  });
}

apiRouter.post('/knowledge/proposals', async (req, res) => {
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

    const { actionType, targetNodeId, proposedContent, reason } = req.body;
    const { knowledgeProposals, knowledgeNodes } = await import('./db/schema.js');

    if (actionType === 'INSERT') {
      const content = proposedContent;
      if (!content) {
        return res.status(400).json({ error: 'Proposal missing content to encode' });
      }

      const apiKey = await resolveGoogleApiKey(payload.id as string);
      if (!apiKey) {
        return res.status(400).json({ error: 'Google Gemini API key not configured. Cannot process vector embeddings for automatic insertion.' });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const embedResponse = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: content,
        config: {
          outputDimensionality: 768
        }
      });
      
      const embeddingVector = embedResponse.embeddings?.[0]?.values;
      if (!embeddingVector) {
        throw new Error('Failed to generate embedding');
      }

      // Create both the knowledge node and the approved proposal record under the user transaction context
      const proposal = await txWithUser(payload.id as string, async (tx) => {
        const [insertedNode] = await tx.insert(knowledgeNodes).values({
          content: content,
          nodeType: 'web_data', // fallback default
          embedding: embeddingVector,
          metadata: { reason: reason || 'Automatically embedded' }
        }).returning();

        const [createdProposal] = await tx.insert(knowledgeProposals).values({
          userId: payload.id as string,
          actionType: 'INSERT',
          targetNodeId: insertedNode.id,
          proposedContent: content,
          reason,
          status: 'APPROVED'
        }).returning();

        return createdProposal;
      });

      return res.json(proposal);
    }

    // For UPDATE or DELETE, they need administrator approval, so we log as PENDING
    const [proposal] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.insert(knowledgeProposals).values({
        userId: payload.id as string,
        actionType,
        targetNodeId: targetNodeId || null,
        proposedContent,
        reason,
        status: 'PENDING'
      }).returning();
    });

    res.json(proposal);
  } catch (e: any) {
    console.error('ERROR in /api/knowledge/proposals:', e);
    console.error('ERROR details:', {
      name: e.name,
      message: e.message,
      detail: e.detail,
      hint: e.hint,
      code: e.code,
      column: e.column,
      constraint: e.constraint,
      table: e.table,
      severity: e.severity,
      stack: e.stack
    });
    res.status(500).json({
      error: e.message,
      detail: e.detail,
      hint: e.hint,
      code: e.code,
      constraint: e.constraint,
      postgresError: e.internalQuery || e.originalError || e.cause || e
    });
  }
});

async function resolveGoogleApiKey(userId: string, customKey?: string): Promise<string | undefined> {
  if (customKey) return customKey;

  // Query database first for configured user-specific keys
  const dbKey = await txWithUser(userId, async (tx) => {
    const { userPreferences, apiKeys } = await import('./db/schema.js');
    const [prefs] = await tx.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    if (prefs?.activeKeyId) {
      const [userKey] = await tx.select().from(apiKeys).where(eq(apiKeys.id, prefs.activeKeyId));
      if (userKey && (userKey.provider === 'google' || userKey.provider === 'GOOGLE') && userKey.key) {
        return decryptKey(userKey.key);
      }
    }
    
    const userKeys = await tx.select().from(apiKeys).where(eq(apiKeys.userId, userId));
    const googleKey = userKeys.find(k => k.provider === 'google' || k.provider === 'GOOGLE');
    if (googleKey && googleKey.key) {
      return decryptKey(googleKey.key);
    }
    return undefined;
  });

  if (dbKey) {
    return dbKey;
  }

  // Fallback to process.env if no DB credentials exist
  return process.env.GEMINI_API_KEY;
}

apiRouter.post('/knowledge/search', async (req, res) => {
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

    const { query, limit = 5, customKey } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required for search' });
    }

    const apiKey = await resolveGoogleApiKey(payload.id as string, customKey);

    if (!apiKey) {
      return res.status(400).json({ error: 'API key not valid. Please configure a valid API key or set one up in active settings.' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Generate embedding for the query using the updated gemini-embedding-2-preview model
    const embedResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: query,
      config: {
        outputDimensionality: 768
      }
    });
    
    const embeddingVector = embedResponse.embeddings?.[0]?.values;
    if (!embeddingVector) {
      throw new Error('Failed to generate embeddings for query');
    }

    const { knowledgeNodes } = await import('./db/schema.js');
    const { cosineDistance } = await import('drizzle-orm');

    // Perform vector search
    const results = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select({
        id: knowledgeNodes.id,
        content: knowledgeNodes.content,
        nodeType: knowledgeNodes.nodeType,
        metadata: knowledgeNodes.metadata,
        similarity: cosineDistance(knowledgeNodes.embedding, embeddingVector)
      })
      .from(knowledgeNodes)
      .orderBy(cosineDistance(knowledgeNodes.embedding, embeddingVector))
      .limit(limit);
    });

    res.json({ results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Standalone classifier helper for routing logic
async function determineRoutingStrategy(userQuery: string, apiKey: string): Promise<'USE_RAG' | 'DIRECT_CHAT'> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const aiInstance = new GoogleGenAI({ apiKey });
    const systemPrompt = `You are an elite AI Router designed to analyze developer queries and routing them accurately to either RAG or DIRECT chat paths.
Determine whether the user query is specific to this codebase/repository context, or if it is a general coding question/normal conversation.

- Classify as 'USE_RAG' if the query explicitly or implicitly mentions project source code, file paths, structural logic, database schemas, or verified solutions previously stored in the database. E.g., queries asking about "how is the login structured", "where are user accounts stored", "show me schema.ts implementation", "how to build/start the app", "db connections", "RAG function logic".
- Classify as 'DIRECT_CHAT' if it's a generic coding question (e.g., "how to write a for-loop in typescript", "explain closure in javascript"), general greeting, conversational filler, or a generic logical puzzle.

You MUST follow these rules strictly:
1. Return ONLY the string literal 'USE_RAG' or 'DIRECT_CHAT' in plain text.
2. Absolutely NO markdown block (such as \`\`\`), no punctuation, and no conversational padding.
3. Be highly decisive and favor 'USE_RAG' if there is any doubt or context clues pointing to the local repository files/structure.`;

    const response = await aiInstance.models.generateContent({
      model: CLASSIFICATION_MODEL,
      contents: userQuery,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.0,
      }
    });

    const result = response.text?.trim() || 'DIRECT_CHAT';
    console.log(`[AI Query Router] Query classified as: "${result}" for query: "${userQuery}"`);
    if (result.includes('USE_RAG')) {
      return 'USE_RAG';
    }
    return 'DIRECT_CHAT';
  } catch (e) {
    console.error('[AI Query Router] Failure executing classifier, fallback to DIRECT_CHAT', e);
    return 'DIRECT_CHAT';
  }
}

// POST /execute - Runs arbitrary backend code via E2B sandbox or Piston API
apiRouter.post('/execute', async (req, res) => {
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
apiRouter.post('/chat', async (req, res) => {
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

    const { prompt, history, model, activeSkillIds, useSearch, thinkingLevel, customKey, customInstructions } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const userId = payload.id as string;
    const apiKey = await resolveGoogleApiKey(userId, customKey);
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
      
      const { GoogleGenAI } = await import('@google/genai');
      const aiInstance = new GoogleGenAI({ apiKey });
      
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
        const { knowledgeNodes } = await import('./db/schema.js');
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

    const { GoogleGenAI, Type } = await import('@google/genai');
    const aiInstance = new GoogleGenAI({ apiKey });
    
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

    while (toolLoops < 5) {
      let responseStream;
      try {
        responseStream = await aiInstance.models.generateContentStream({
          model: finalModelUsed,
          contents: formattedContents,
          config: {
            systemInstruction: finalSystemPrompt,
            tools: [proposeKnowledgeTool],
            thinkingConfig: (finalModelUsed.includes('thinking') || finalModelUsed === 'gemini-3.1-pro-preview') ? { 
              thinkingLevel: thinkingLevel || 'LOW',
              includeThoughts: true 
            } : undefined,
          }
        });
      } catch (streamError: any) {
        const errorMsg = streamError.message || streamError.toString() || '';
        const isQuotaExceeded = errorMsg.includes('429') || 
                               errorMsg.includes('RESOURCE_EXHAUSTED') || 
                               errorMsg.includes('Quota exceeded') ||
                               errorMsg.includes('limit: 0');
        const isModelNotFound = errorMsg.includes('404') || 
                               errorMsg.includes('not found') || 
                               errorMsg.includes('not supported') ||
                               errorMsg.includes('not be found');

        if ((isQuotaExceeded || isModelNotFound) && finalModelUsed !== 'gemini-3.5-flash') {
          console.warn(`[AI Query Router] Model ${finalModelUsed} triggered error (${isQuotaExceeded ? 'Quota' : 'Not Found'}). Dynamic fallback.`);
          sendEvent('status', { message: `⚠️ Selected model '${finalModelUsed}' hit quota limits or is currently unavailable. Redirected to high-performance 'gemini-3.5-flash'.` });
          
          finalModelUsed = 'gemini-3.5-flash';
          responseStream = await aiInstance.models.generateContentStream({
            model: finalModelUsed,
            contents: formattedContents,
            config: {
              systemInstruction: finalSystemPrompt,
              tools: [proposeKnowledgeTool],
            }
          });
        } else {
          throw streamError;
        }
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
            
            if (fc.name === 'proposeKnowledge') {
              const { content, reason } = fc.args as any;
              try {
                const { knowledgeProposals } = await import('./db/schema.js');
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
        }
      }

      sendEvent('thinking_done', null);

      if (hasFunctionCalls && allFunctionCallsInStream.length > 0) {
        formattedContents.push({ role: 'model', parts: allFunctionCallsInStream.map(c => ({ functionCall: c })) });
        formattedContents.push({ role: 'user', parts: toolResponses });
        toolLoops++;
        continue;
      }
      
      break;
    }

    if (lastUsageMetadata) {
      console.log('[AI Query Router] Response Metrics (usageMetadata):', lastUsageMetadata);
      sendEvent('metadata', lastUsageMetadata);
    }

    res.write('event: end\ndata: {}\n\n');
    res.end();
  } catch (e: any) {
    console.error('[AI Query Router ERROR]:', e);
    res.write(`data: ${JSON.stringify({ type: 'error', data: e.message || 'An unexpected error occurred in backend chat pipeline.' })}\n\n`);
    res.write('event: end\ndata: {}\n\n');
    res.end();
  }
});

// POST /messages/query - Query historic messages table for system intelligence
apiRouter.post('/messages/query', async (req, res) => {
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
apiRouter.put('/messages/:id/rating', async (req, res) => {
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
apiRouter.get('/knowledge', async (req, res) => {
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

    const userId = payload.id as string;
    const { knowledgeNodes } = await import('./db/schema.js');
    
    const nodes = await txWithUser(userId, async (tx) => {
      return await tx.select().from(knowledgeNodes);
    });
    
    res.json(nodes);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /knowledge/:id - Update directly a knowledge node (generates new embeddings)
apiRouter.put('/knowledge/:id', async (req, res) => {
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

    // Role check: Only ADMIN can directly update knowledge nodes
    const { users, knowledgeNodes } = await import('./db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can update knowledge nodes directly.' });
    }

    const { content, nodeType, metadata } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const [existingNode] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, req.params.id));
    });
    if (!existingNode) {
      return res.status(404).json({ error: 'Knowledge node not found' });
    }

    const apiKey = await resolveGoogleApiKey(payload.id as string);
    if (!apiKey) {
      return res.status(400).json({ error: 'API key not configured. Cannot update vector embeddings.' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const embedResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: content,
      config: {
        outputDimensionality: 768
      }
    });
    
    const embeddingVector = embedResponse.embeddings?.[0]?.values;
    if (!embeddingVector) {
      throw new Error('Failed to generate embedding');
    }

    const [updatedNode] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.update(knowledgeNodes).set({
        content,
        nodeType: nodeType || existingNode.nodeType,
        metadata: metadata || existingNode.metadata,
        embedding: embeddingVector
      }).where(eq(knowledgeNodes.id, req.params.id)).returning();
    });

    res.json(updatedNode);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /knowledge/:id - Directly delete a knowledge node
apiRouter.delete('/knowledge/:id', async (req, res) => {
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

    // Role check: Only ADMIN can directly delete knowledge nodes
    const { users, knowledgeNodes } = await import('./db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can delete knowledge nodes directly.' });
    }

    const [existingNode] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, req.params.id));
    });
    if (!existingNode) {
      return res.status(404).json({ error: 'Knowledge node not found' });
    }

    await txWithUser(payload.id as string, async (tx) => {
      await tx.delete(knowledgeNodes).where(eq(knowledgeNodes.id, req.params.id));
    });

    res.json({ message: 'Knowledge node deleted successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /knowledge/proposals - Retrieve list of proposals
apiRouter.get('/knowledge/proposals', async (req, res) => {
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

    const { knowledgeProposals } = await import('./db/schema.js');
    const proposals = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeProposals);
    });
    
    res.json(proposals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /knowledge/proposals/:id - Update content of a proposal
apiRouter.put('/knowledge/proposals/:id', async (req, res) => {
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

    const { proposedContent, reason, status } = req.body;
    const { users, knowledgeProposals } = await import('./db/schema.js');

    const [proposal] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
    });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });

    if (proposal.userId !== (payload.id as string) && (!userObj || userObj.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized to modify this proposal' });
    }

    const [updated] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.update(knowledgeProposals).set({
        proposedContent: proposedContent !== undefined ? proposedContent : proposal.proposedContent,
        reason: reason !== undefined ? reason : proposal.reason,
        status: status !== undefined ? status : proposal.status
      }).where(eq(knowledgeProposals.id, req.params.id)).returning();
    });

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /knowledge/proposals/:id/approve - Approve and apply a proposal
apiRouter.post('/knowledge/proposals/:id/approve', async (req, res) => {
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

    // Role check: Only ADMIN can approve proposals
    const { users, knowledgeProposals, knowledgeNodes } = await import('./db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can approve proposals.' });
    }

    const [proposal] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
    });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (proposal.status !== 'PENDING') {
      return res.status(400).json({ error: 'Proposal has already been processed' });
    }

    const apiKey = await resolveGoogleApiKey(payload.id as string);
    if (!apiKey) {
      return res.status(400).json({ error: 'API key not configured. Cannot process vector embeddings for approval.' });
    }

    if (proposal.actionType === 'INSERT' || proposal.actionType === 'UPDATE') {
      const content = proposal.proposedContent;
      if (!content) {
        return res.status(400).json({ error: 'Proposal missing content to encode' });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const embedResponse = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: content,
        config: {
          outputDimensionality: 768
        }
      });
      
      const embeddingVector = embedResponse.embeddings?.[0]?.values;
      if (!embeddingVector) {
        throw new Error('Failed to generate embedding');
      }

      const updatedProposal = await txWithUser(payload.id as string, async (tx) => {
        if (proposal.actionType === 'INSERT') {
          const [insertedNode] = await tx.insert(knowledgeNodes).values({
            content: content,
            nodeType: 'web_data', // fallback default
            embedding: embeddingVector,
            metadata: { reason: proposal.reason }
          }).returning();

          await tx.update(knowledgeProposals).set({
            status: 'APPROVED',
            targetNodeId: insertedNode.id
          }).where(eq(knowledgeProposals.id, req.params.id));

        } else if (proposal.actionType === 'UPDATE') {
          if (!proposal.targetNodeId) {
            throw new Error('Update proposal is missing targetNodeId');
          }

          await tx.update(knowledgeNodes).set({
            content: content,
            embedding: embeddingVector
          }).where(eq(knowledgeNodes.id, proposal.targetNodeId));

          await tx.update(knowledgeProposals).set({
            status: 'APPROVED'
          }).where(eq(knowledgeProposals.id, req.params.id));
        }

        const [finalProposal] = await tx.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
        return finalProposal;
      });

      res.json(updatedProposal);

    } else if (proposal.actionType === 'DELETE') {
      if (!proposal.targetNodeId) {
        return res.status(400).json({ error: 'Delete proposal is missing targetNodeId' });
      }

      const updatedProposal = await txWithUser(payload.id as string, async (tx) => {
        await tx.delete(knowledgeNodes).where(eq(knowledgeNodes.id, proposal.targetNodeId));

        await tx.update(knowledgeProposals).set({
          status: 'APPROVED'
        }).where(eq(knowledgeProposals.id, req.params.id));

        const [finalProposal] = await tx.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
        return finalProposal;
      });

      res.json(updatedProposal);
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /knowledge/proposals/:id/reject - Reject a proposal
apiRouter.post('/knowledge/proposals/:id/reject', async (req, res) => {
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

    // Role check: Only ADMIN can reject proposals
    const { users, knowledgeProposals } = await import('./db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can reject proposals.' });
    }

    const [proposal] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
    });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const [updatedProposal] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.update(knowledgeProposals).set({
        status: 'REJECTED'
      }).where(eq(knowledgeProposals.id, req.params.id)).returning();
    });

    res.json(updatedProposal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/auth/guest', async (req, res) => {
  try {
    const guestEmail = `guest_${crypto.randomUUID()}@guest.local`;
    const [user] = await db.insert(users).values({
      email: guestEmail,
      name: 'Guest User',
    }).returning();

    const token = await new jose.SignJWT({ id: user.id, email: user.email, isGuest: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(JWT_SECRET);

    res.json({ user: { id: user.id, email: user.email, name: user.name, isGuest: true }, token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /proxy - General proxy to bypass CORS
apiRouter.post('/proxy', async (req, res) => {
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

    const { url, method = 'GET', headers = {}, body, stream } = req.body;
    if (!url) {
       return res.status(400).json({ error: 'Proxy URL is required' });
    }

    const fetchHeaders: any = { ...headers, 'ngrok-skip-browser-warning': 'true' };
    console.log(`[PROXY REQUEST] ${method} ${url}`, { hasBody: !!body, stream });
    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined
    });

    if (stream && response.ok) {
       res.status(response.status);
       res.setHeader('Content-Type', 'text/event-stream');
       res.setHeader('Cache-Control', 'no-cache');
       res.setHeader('Connection', 'keep-alive');
       if (response.body) {
         try {
           const reader = response.body.getReader();
           while (true) {
             const { done, value } = await reader.read();
             if (done) break;
             res.write(value);
           }
         } catch(e) {
           console.error("Proxy streaming error:", e);
         }
       }
       return res.end();
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      data = text;
    }

    if (!response.ok) {
      console.error(`[PROXY ERROR] ${method} ${url} returned ${response.status}`, data);
      return res.status(response.status).json({ error: `Proxy returned ${response.status}`, data });
    }
    console.log(`[PROXY SUCCESS] ${method} ${url} -> ${response.status}`);
    return res.json(data);
  } catch (e: any) {
    console.error(`[PROXY CATCH ERROR]`, e);
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get('/auth/me', async (req, res) => {
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

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string),
      with: { accounts: true }
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    let userRole = user.role;
    if (user.email === 'nguyensihuynsh711@gmail.com' && user.role !== 'ADMIN') {
      await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, user.id));
      userRole = 'ADMIN';
    }

    const githubAccount = user.accounts?.find(a => a.provider === 'github');
    const githubToken = githubAccount?.accessToken;

    res.json({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      avatarUrl: user.avatarUrl, 
      role: userRole,
      customInstructions: user.customInstructions, 
      isGuest: !!payload.isGuest,
      githubToken
    });
  } catch (e: any) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

apiRouter.get('/user/state', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid token' });
    const userId = payload.id as string;

    const { userPrefs, userKeys, userSkills, formattedSessions } = await txWithUser(userId, async (tx) => {
      const [prefs] = await tx.select().from(userPreferences).where(eq(userPreferences.userId, userId));
      const keys = await tx.select().from(apiKeys).where(eq(apiKeys.userId, userId));
      const skills = await tx.select().from(customSkills).where(eq(customSkills.userId, userId));
      
      // Fetch sessions and messages
      const sessionsList = await tx.select().from(sessions).where(eq(sessions.userId, userId));
      const ids = sessionsList.map(s => s.id);
      const messagesList = ids.length > 0 
        ? await tx.select().from(messages).where(inArray(messages.sessionId, ids))
        : [];
      
      const formatted = sessionsList.map(s => ({
        ...s,
        updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : Date.now(),
        createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now(),
        messages: messagesList.filter(m => m.sessionId === s.id).map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          modelName: m.modelUsed,
          imageUrl: m.imageUrl,
          videoUrl: m.videoUrl,
          attachments: m.attachments,
          rating: m.rating,
          createdAt: new Date(m.createdAt).getTime(),
        })).sort((a, b) => a.createdAt - b.createdAt)
      }));

      return { userPrefs: prefs, userKeys: keys, userSkills: skills, formattedSessions: formatted };
    });

    res.json({
      preferences: userPrefs,
      apiKeys: userKeys.map(k => ({ ...k, key: decryptKey(k.key) })),
      customSkills: userSkills,
      sessions: formattedSessions,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put('/user/state', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid token' });
    const userId = payload.id as string;

    const { preferences, apiKeys: newKeys, customSkills: newSkills, sessions: newSessions } = req.body;

    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
      // Preferences
      if (preferences) {
        const exist = await tx.select().from(userPreferences).where(eq(userPreferences.userId, userId));
        if (exist.length > 0) {
          await tx.update(userPreferences).set(preferences).where(eq(userPreferences.userId, userId));
        } else {
          await tx.insert(userPreferences).values({ userId, ...preferences });
        }
      }

      // API Keys
      if (newKeys && Array.isArray(newKeys)) {
        await tx.delete(apiKeys).where(eq(apiKeys.userId, userId));
        if (newKeys.length > 0) {
          await tx.insert(apiKeys).values(newKeys.map((k: any) => ({
            id: k.id,
            userId,
            name: k.name,
            key: encryptKey(k.key),
            provider: k.provider,
            models: k.models,
          })));
        }
      }

      // Custom Skills
      if (newSkills && Array.isArray(newSkills)) {
        await tx.delete(customSkills).where(eq(customSkills.userId, userId));
        if (newSkills.length > 0) {
          await tx.insert(customSkills).values(newSkills.map((s: any) => ({
            id: s.id,
            userId,
            name: s.name,
            description: s.description,
            systemPrompt: s.systemPrompt,
            model: s.model || null,
            isCustom: true,
          })));
        }
      }

      // Sessions
      if (newSessions && Array.isArray(newSessions)) {
        // Simple strategy: delete all sessions for user, re-insert
        await tx.delete(sessions).where(eq(sessions.userId, userId));
        for (const s of newSessions) {
          await tx.insert(sessions).values({
            id: s.id,
            userId,
            title: s.title || 'Chat Session',
            pinned: s.pinned || false,
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
            createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          });
          if (s.messages && Array.isArray(s.messages) && s.messages.length > 0) {
            const msgsToInsert = s.messages.map((m: any) => ({
              id: m.id || `msg-${Date.now()}-${Math.random()}`,
              sessionId: s.id,
              role: m.role || 'user',
              content: m.content || '',
              modelUsed: m.modelName || m.modelUsed,
              imageUrl: m.imageUrl,
              videoUrl: m.videoUrl,
              attachments: m.attachments || [],
              rating: typeof m.rating === 'number' ? m.rating : 0,
              createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
            }));
            await tx.insert(messages).values(msgsToInsert);
          }
        }
      }

      res.json({ success: true });
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const getBaseUrl = (req: express.Request) => {
  let host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  let protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  if (String(host).includes('vercel.app')) {
    protocol = 'https';
  }
  return `${protocol}://${host}`;
};

apiRouter.get('/auth/github/url', (req, res) => {
  try {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.status(501).json({ error: 'GitHub OAuth is not configured. Missing GITHUB_CLIENT_ID.' });
    }
    const redirectUri = `${getBaseUrl(req)}/api/auth/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email%20repo`;
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/auth/github/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('No code provided');

  try {
    // 1. Get access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    // 2. Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });
    const userData = await userResponse.json();

    let email = userData.email;
    // 3. GitHub users might have hidden emails
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });
      const emailsData = await emailsResponse.json();
      const primaryEmail = emailsData.find((e: any) => e.primary && e.verified);
      email = primaryEmail ? primaryEmail.email : emailsData[0]?.email;
    }
    
    if (!email) throw new Error('No email found from GitHub');

    // 4. Upsert user entirely using drizzle
    // Check if user exists via email or accounts table
    let user = await db.query.users.findFirst({ where: eq(users.email, email) });
    const isSpecialAdmin = email === 'nguyensihuynsh711@gmail.com';
    if (!user) {
      [user] = await db.insert(users).values({
        email: email,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        role: isSpecialAdmin ? 'ADMIN' : 'USER',
      }).returning();
    } else if (isSpecialAdmin && user.role !== 'ADMIN') {
      [user] = await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, user.id)).returning();
    }

    // Check account mapping
    const existingAccount = await db.query.accounts.findFirst({
      where: (accounts, { eq, and }) =>
        and(eq(accounts.provider, 'github'), eq(accounts.providerAccountId, String(userData.id)))
    });

    if (!existingAccount) {
      await db.insert(accounts).values({
        userId: user.id,
        provider: 'github',
        providerAccountId: String(userData.id),
        accessToken: tokenData.access_token,
      });
    } else {
      await db.update(accounts)
        .set({ accessToken: tokenData.access_token })
        .where(eq(accounts.id, existingAccount.id));
    }

    // Generate JWT
    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?token=${token}';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (e: any) {
    console.error('GitHub oauth error:', e);
    const errMessage = e.cause ? e.cause.message : e.message;
    const err = encodeURIComponent(errMessage);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?error=${err}';
            }
          </script>
          <p>Authentication failed. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
});

apiRouter.get('/auth/google/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google OAuth is not configured. Missing GOOGLE_CLIENT_ID.' });
  }
  const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile`;
  res.json({ url });
});

apiRouter.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('No code provided');

  try {
    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    // 1. Get tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    // 2. Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();
    
    if (!userData.email) throw new Error('No email found from Google');

    // 3. Upsert user
    let user = await db.query.users.findFirst({ where: eq(users.email, userData.email) });
    if (!user) {
      [user] = await db.insert(users).values({
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.picture,
      }).returning();
    }

    // Check account mapping
    const existingAccount = await db.query.accounts.findFirst({
      where: (accounts, { eq, and }) =>
        and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, String(userData.id)))
    });

    if (!existingAccount) {
      await db.insert(accounts).values({
        userId: user.id,
        provider: 'google',
        providerAccountId: String(userData.id),
        accessToken: tokenData.access_token,
      });
    }

    // Generate JWT
    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?token=${token}';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (e: any) {
    console.error('Google oauth error:', e);
    const errMessage = e.cause ? e.cause.message : e.message;
    const err = encodeURIComponent(errMessage);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?error=${err}';
            }
          </script>
          <p>Authentication failed. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
});
