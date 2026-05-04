import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

export enum ModelId {
  PRO = "gemini-3.1-pro-preview",
  FLASH = "gemini-3-flash-preview",
  LITE = "gemini-3.1-flash-lite-preview",
  IMAGE = "gemini-2.5-flash-image",
  HYBRID = "hybrid"
}

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
  private usage: Record<string, number> = {
    [ModelId.PRO]: 0,
    [ModelId.FLASH]: 0,
    [ModelId.LITE]: 0,
    [ModelId.IMAGE]: 0
  };

  setCustomQueue(models: string[]) {
    if (models.length > 0) {
      this.modelQueue = models;
      this.currentModelIndex = 0;
      // Initialize usage for new models if they don't exist
      models.forEach(m => {
        if (this.usage[m] === undefined) {
          this.usage[m] = 0;
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

  getUsage(): Record<string, number> {
    return { ...this.usage };
  }

  private rotateModel() {
    this.currentModelIndex = (this.currentModelIndex + 1) % this.modelQueue.length;
    console.log(`Rotating to: ${this.getCurrentModel()}`);
  }

  async checkKey(key: string) {
    try {
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
      return {
        valid: true,
        models
      };
    } catch (error: any) {
      console.error("Key Validation Error:", error);
      return {
        valid: false,
        error: error.message || "Invalid API Key or Network Error"
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
      onModelSwitch?: (model: string) => void;
    } = {},
    onChunk?: (chunk: string) => void
  ) {
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
    
    // If a specific model is requested, we start there. 
    // If it hits a rate limit, we then fallback through the rest of the queue.
    const startModel = isHybrid ? this.getCurrentModel() : (config.model || this.getCurrentModel());
    let startIndex = this.modelQueue.indexOf(startModel);
    
    // Fallback to first model if the requested model is not in the queue
    if (startIndex === -1) startIndex = 0;
    
    while (attempts < this.modelQueue.length) {
      if (config.signal?.aborted) throw new Error("Operation aborted");

      const model = this.modelQueue[(startIndex + attempts) % this.modelQueue.length];

      try {
        if (attempts > 0) {
          config.onModelSwitch?.(model);
        }
        this.usage[model] = Math.min(100, this.usage[model] + 2); // Simulated usage
        
        const tools = config.useSearch ? [{ googleSearch: {} }] : undefined;

        const stream = await ai.models.generateContentStream({
          model,
          contents: history, // history should already include the latest message
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: model === ModelId.PRO ? undefined : { thinkingLevel: config.thinkingLevel || ThinkingLevel.LOW },
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

        if (
          error?.message?.toLowerCase().includes("429") || 
          error?.message?.toLowerCase().includes("quota") || 
          error?.message?.toLowerCase().includes("limit") ||
          error?.message?.toLowerCase().includes("rate_limit")
        ) {
          this.rotateModel();
          attempts++;
        } else {
          throw error;
        }
      }
    }
    throw new Error("All models limits reached.");
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
