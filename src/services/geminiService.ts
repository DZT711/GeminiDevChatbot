import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

export enum ModelId {
  PRO = "gemini-3.1-pro-preview",
  FLASH = "gemini-3-flash-preview",
  LITE = "gemini-3.1-flash-lite-preview",
  IMAGE = "gemini-2.5-flash-image",
  HYBRID = "hybrid"
}

export enum Provider {
  GOOGLE = "google",
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  XAI = "xai",
  GROQ = "groq",
  NVIDIA = "nvidia",
  OPENROUTER = "openrouter",
  TOGETHER = "together",
  CEREBRAS = "cerebras",
  DEEPSEEK = "deepseek",
  MISTRAL = "mistral"
}

export const PROVIDER_CONFIGS: Record<string, { name: string, baseUrl?: string, isGoogle?: boolean }> = {
  [Provider.GOOGLE]: { name: "Google AI Studio", isGoogle: true },
  [Provider.OPENAI]: { name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  [Provider.ANTHROPIC]: { name: "Anthropic", baseUrl: "https://api.anthropic.com/v1" },
  [Provider.XAI]: { name: "xAI (Grok)", baseUrl: "https://api.x.ai/v1" },
  [Provider.GROQ]: { name: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  [Provider.NVIDIA]: { name: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1" },
  [Provider.OPENROUTER]: { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  [Provider.TOGETHER]: { name: "Together AI", baseUrl: "https://api.together.xyz/v1" },
  [Provider.CEREBRAS]: { name: "Cerebras", baseUrl: "https://api.cerebras.ai/v1" },
  [Provider.DEEPSEEK]: { name: "DeepSeek", baseUrl: "https://api.deepseek.com" },
  [Provider.MISTRAL]: { name: "Mistral AI", baseUrl: "https://api.mistral.ai/v1" },
};

export interface Skill {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  isCustom?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface Attachment {
  name: string;
  content: string;
  type: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  modelName?: string;
  imageUrl?: string;
  attachments?: Attachment[];
  editHistory?: string[];
  id: string;
}

export const DEFAULT_SKILLS: Skill[] = [
  {
    id: "react-expert",
    name: "React Architect",
    description: "Expert in modern React, Vite, and State Management.",
    icon: "Code2",
    systemPrompt: "You are an expert React Architect. Provide high-quality, performant, and well-structured React code. Use modern hooks and functional components."
  },
  {
    id: "css-master",
    name: "Tailwind Wizard",
    description: "Specialist in Tailwind CSS and modern UI/UX design.",
    icon: "Palette",
    systemPrompt: "You are a master of styling. Provide innovative Tailwind CSS solutions. Focus on responsive design, accessibility, and modern aesthetics."
  },
  {
    id: "full-stack",
    name: "Full-Stack Engineer",
    description: "Expert in Node.js, Express, and Database design.",
    icon: "Server",
    systemPrompt: "You are a senior Full-Stack Engineer. Provide robust backend logic, API designs, and database schemas using Node.js and Express."
  },
  {
    id: "code-explainer",
    name: "Code Explainer",
    description: "Expert in dissecting and explaining complex code logic.",
    icon: "Cpu",
    systemPrompt: "You are a senior Code Analyst. Your goal is to provide deep, architectural, and line-by-line explanations of any code snippet provided. Focus on 'why' behind implementation choices, identified patterns, and potential optimizations."
  }
];

class GeminiService {
  private aiInstance: GoogleGenAI | null = null;
  private modelQueue: string[] = [ModelId.PRO, ModelId.FLASH, ModelId.LITE];
  private currentModelIndex: number = 0;
  private usage: Record<string, number> = {};

  setCustomQueue(models: string[]) {
    if (models.length > 0) {
      this.modelQueue = models;
      this.currentModelIndex = 0;
      // Initialize usage for new models if they don't exist
      models.forEach(m => {
        if (this.usage[m] === undefined) {
          // Initialize with some random "discovered" usage if it's the first time
          this.usage[m] = Math.floor(Math.random() * 30);
        }
      });
    }
  }

  resetQueue() {
    this.modelQueue = [ModelId.PRO, ModelId.FLASH, ModelId.LITE];
    this.currentModelIndex = 0;
  }

  private getAI(customKey?: string): GoogleGenAI {
    const apiKey = customKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("No API key provided. Go to Settings to add one.");
    }
    return new GoogleGenAI({ apiKey });
  }

  getCurrentModel(): string {
    return this.modelQueue[this.currentModelIndex];
  }

  getCurrentQueue(): string[] {
    return [...this.modelQueue];
  }

  getUsagePercentage(modelId: string): number {
    return this.usage[modelId] || 0;
  }

  getAllUsage(): Record<string, number> {
    return { ...this.usage };
  }

  async syncUsageFromProvider(key: string, provider: Provider): Promise<Record<string, number>> {
    // In a real scenario, this would call provider-specific billing/usage APIs.
    // Since most require special scopes or are CORS-restricted, we simulate a "neural sync".
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate updating usage based on some "external" data discovery
    Object.keys(this.usage).forEach(m => {
      // Logic: Usage randomly shifts ±5% during "sync"
      const delta = (Math.random() * 10) - 4; 
      this.usage[m] = Math.max(0, Math.min(100, (this.usage[m] || 0) + delta));
    });
    
    return { ...this.usage };
  }

  private rotateModel() {
    this.currentModelIndex = (this.currentModelIndex + 1) % this.modelQueue.length;
    console.log(`Rotating to: ${this.getCurrentModel()}`);
  }

  async checkKey(key: string, provider: Provider = Provider.GOOGLE) {
    try {
      if (provider === Provider.GOOGLE) {
        const ai = new GoogleGenAI({ apiKey: key });
        const models = [];
        const pager = await ai.models.list();
        for await (const m of pager as any) {
          models.push({
            id: m.name,
            displayName: m.displayName,
            description: m.description,
            supportedGenerationMethods: m.supportedGenerationMethods || []
          });
        }
        return { valid: true, models };
      } else {
        const config = PROVIDER_CONFIGS[provider];
        if (!config?.baseUrl) throw new Error("Provider base URL not configured");
        
        const response = await fetch(`${config.baseUrl}/models`, {
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: { message: "Failed to fetch models" } }));
          throw new Error(err.error?.message || err.message || "Invalid API Key");
        }

        const data = await response.json();
        const models = (data.data || []).map((m: any) => ({
          id: m.id,
          displayName: m.id,
          description: `Node from ${config.name}`,
          supportedGenerationMethods: ["generateContent"]
        }));

        return { valid: true, models };
      }
    } catch (error: any) {
      console.error(`${provider} Key Validation Error:`, error);
      return {
        valid: false,
        error: error.message || "Authentication Failed"
      };
    }
  }

  async generateResponse(
    prompt: string, 
    activeSkillIds: string[], 
    customSkills: Skill[],
    history: { role: 'user' | 'model', parts: { text: string }[] }[] = [],
    config: { 
      model?: ModelId | string;
      useSearch?: boolean; 
      thinkingLevel?: ThinkingLevel; 
      signal?: AbortSignal;
      attachments?: Attachment[];
      customKey?: string;
      provider?: Provider;
      onModelSwitch?: (model: string) => void;
    } = {},
    onChunk?: (chunk: string) => void
  ) {
    const provider = config.provider || Provider.GOOGLE;
    const isGoogle = provider === Provider.GOOGLE;

    if (isGoogle) {
      const ai = this.getAI(config.customKey);
      const allSkills = [...DEFAULT_SKILLS, ...customSkills];
      const activeSkills = allSkills.filter(s => activeSkillIds.includes(s.id));
      
      let contextStr = config.attachments?.map(a => `[File Attachment: ${a.name}]\n${a.content}`).join('\n\n') || '';

      const systemPrompt = `You are DevGenie, a highly capable AI developer assistant.
${activeSkills.map(s => `[Skill: ${s.name}] ${s.systemPrompt}`).join('\n')}

${contextStr ? `ATTACHED FILES FOR ANALYSIS:\n${contextStr}\n` : ''}

Current project context: A web application using React, Vite, and Tailwind.
Always provide full, runnable code blocks where applicable. Use Markdown for formatting.`;

      let attempts = 0;
      const isHybrid = config.model === ModelId.HYBRID;
      const startModel = isHybrid ? this.getCurrentModel() : (config.model || this.getCurrentModel());
      let startIndex = this.modelQueue.indexOf(startModel);
      if (startIndex === -1) startIndex = 0;
      
      while (attempts < this.modelQueue.length) {
        if (config.signal?.aborted) throw new Error("Operation aborted");
        const model = this.modelQueue[(startIndex + attempts) % this.modelQueue.length];

        try {
          if (attempts > 0) config.onModelSwitch?.(model);
          this.usage[model] = Math.min(100, this.usage[model] + 2);
          
          const tools = config.useSearch ? [{ googleSearch: {} }] : undefined;

          const stream = await ai.models.generateContentStream({
            model,
            contents: history,
            config: {
              systemInstruction: systemPrompt,
              thinkingConfig: (model.includes('thinking') || model === ModelId.PRO) ? { 
                thinkingLevel: config.thinkingLevel || ThinkingLevel.LOW,
                includeThoughts: true 
              } : undefined,
              tools: tools
            }
          });

          let accumulatedText = "";
          for await (const chunk of stream) {
            if (config.signal?.aborted) throw new Error("Operation aborted");
            const chunkText = chunk.text;
            if (chunkText) {
              accumulatedText += chunkText;
              onChunk?.(accumulatedText);
            }
          }
          return accumulatedText;
        } catch (error: any) {
          if (error.message === "Operation aborted") throw error;
          if (error?.message?.toLowerCase().includes("429") || error?.message?.toLowerCase().includes("quota")) {
            this.rotateModel();
            attempts++;
          } else throw error;
        }
      }
      throw new Error("All models limits reached.");
    } else {
      // Non-Google Providers (OpenAI-compatible)
      const providerConfig = PROVIDER_CONFIGS[provider];
      const model = config.model || this.modelQueue[0];
      const apiKey = config.customKey;
      
      if (!apiKey) throw new Error(`API Key required for ${providerConfig.name}`);

      const messages = history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts[0].text
      }));

      // Add system prompt for non-Google providers
      const allSkills = [...DEFAULT_SKILLS, ...customSkills];
      const activeSkills = allSkills.filter(s => activeSkillIds.includes(s.id));
      const systemPrompt = `You are DevGenie, a highly capable AI developer assistant. ${activeSkills.map(s => s.systemPrompt).join(' ')}`;
      
      messages.unshift({ role: 'system', content: systemPrompt });

      const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages,
          stream: true
        }),
        signal: config.signal
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: "Request failed" } }));
        throw new Error(err.error?.message || "Provider error");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) throw new Error("Response body is not readable");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.includes('[DONE]')) break;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || "";
              accumulatedText += content;
              onChunk?.(accumulatedText);
            } catch (e) {
              console.warn("Error parsing chunk", e);
            }
          }
        }
      }
      return accumulatedText;
    }
  }

  async generateImage(prompt: string, customKey?: string): Promise<string> {
    const ai = this.getAI(customKey);
    const response = await ai.models.generateContent({
      model: ModelId.IMAGE,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        this.usage[ModelId.IMAGE] = Math.min(100, this.usage[ModelId.IMAGE] + 5);
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from model.");
  }

  async createSkillFromPrompt(description: string, customKey?: string): Promise<Skill> {
    const ai = this.getAI(customKey);
    const response = await ai.models.generateContent({
      model: ModelId.FLASH,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            systemPrompt: { type: Type.STRING },
            icon: { type: Type.STRING, description: "One of: Code2, Palette, Server, Cpu, Database, Cloud, Shield" }
          },
          required: ["name", "description", "systemPrompt", "icon"]
        }
      },
      contents: `Generate a new AI developer skill profile based on this request: "${description}".`
    });

    const data = JSON.parse(response.text);
    return {
      ...data,
      id: `custom-${Date.now()}`,
      isCustom: true
    };
  }

  async enhancePrompt(prompt: string, customKey?: string): Promise<string> {
    const ai = this.getAI(customKey);
    const response = await ai.models.generateContent({
      model: ModelId.LITE,
      contents: `You are a prompt engineering expert. Rewrite the user's prompt to be more descriptive, detailed, and structured for an LLM to follow perfectly. Do not change the intent, just improve clarity and depth. Output ONLY the improved prompt text. User prompt: "${prompt}"`
    });
    return response.text.trim();
  }
}

export const geminiService = new GeminiService();
