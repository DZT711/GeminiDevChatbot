export enum ModelId {
  PRO = "gemini-3.1-pro-preview",
  FLASH_3_5 = "gemini-3.5-flash",
  FLASH = "gemini-3-flash-preview",
  LITE = "gemini-3.1-flash-lite-preview",
  IMAGE = "gemini-2.5-flash-image",
  VIDEO = "veo-2-flash-preview",
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
  MISTRAL = "mistral",
  OLLAMA = "ollama",
  HUGGINGFACE = "huggingface",
  GITHUB = "github",
  CUSTOM = "custom"
}

export interface ApiKey {
  name: string;
  key: string;
  id: string;
  provider: Provider;
  models?: string[];
  baseUrl?: string;
  expectedPrefix?: string;
}
