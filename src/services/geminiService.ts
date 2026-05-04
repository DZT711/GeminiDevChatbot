import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

export enum ModelId {
  PRO = "gemini-3.1-pro-preview",
  FLASH = "gemini-3-flash-preview",
  LITE = "gemini-3.1-flash-lite-preview",
  IMAGE = "gemini-2.5-flash-image"
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

export interface Message {
  role: 'user' | 'model';
  content: string;
  modelName?: string;
  imageUrl?: string;
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
  }
];

class GeminiService {
  private ai: GoogleGenAI;
  private modelQueue: ModelId[] = [ModelId.PRO, ModelId.FLASH, ModelId.LITE];
  private currentModelIndex: number = 0;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  getCurrentModel(): ModelId {
    return this.modelQueue[this.currentModelIndex];
  }

  private rotateModel() {
    this.currentModelIndex = (this.currentModelIndex + 1) % this.modelQueue.length;
    console.log(`Rotating to: ${this.getCurrentModel()}`);
  }

  async generateResponse(
    prompt: string, 
    activeSkillIds: string[], 
    customSkills: Skill[],
    history: { role: 'user' | 'model', parts: { text: string }[] }[] = [],
    config: { useSearch?: boolean; thinkingLevel?: ThinkingLevel } = {},
    onChunk?: (chunk: string) => void
  ) {
    const allSkills = [...DEFAULT_SKILLS, ...customSkills];
    const activeSkills = allSkills.filter(s => activeSkillIds.includes(s.id));
    
    const systemPrompt = `You are DevGenie, a highly capable AI developer assistant.
${activeSkills.map(s => `[Skill: ${s.name}] ${s.systemPrompt}`).join('\n')}
Current project context: A web application using React, Vite, and Tailwind.
Always provide full, runnable code blocks where applicable. Use Markdown for formatting.
If the user asks to generate an image, use your internal image generation tool capabilities (note: handled separately by generateImage).`;

    let attempts = 0;
    while (attempts < this.modelQueue.length) {
      try {
        const model = this.getCurrentModel();
        
        const tools = config.useSearch ? [{ googleSearch: {} }] : undefined;

        const stream = await this.ai.models.generateContentStream({
          model,
          contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: model === ModelId.PRO ? undefined : { thinkingLevel: config.thinkingLevel || ThinkingLevel.LOW },
            tools: tools
          }
        });

        let fullText = "";
        for await (const chunk of stream) {
          if (chunk.text) {
            fullText += chunk.text;
            onChunk?.(chunk.text);
          }
        }
        return fullText;

      } catch (error: any) {
        if (error?.message?.includes("429") || error?.message?.includes("quota")) {
          this.rotateModel();
          attempts++;
        } else {
          throw error;
        }
      }
    }
    throw new Error("All models limits reached.");
  }

  async generateImage(prompt: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: ModelId.IMAGE,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from model.");
  }

  async createSkillFromPrompt(description: string): Promise<Skill> {
    const response = await this.ai.models.generateContent({
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
}

export const geminiService = new GeminiService();
