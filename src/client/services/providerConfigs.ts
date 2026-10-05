import { Provider } from './types.js';

export interface ProviderConfig {
  name: string;
  baseUrl?: string;
  isGoogle?: boolean;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  [Provider.GOOGLE]: { name: "Google", isGoogle: true },
  [Provider.OPENAI]: { name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  [Provider.ANTHROPIC]: { name: "Anthropic", baseUrl: "https://api.anthropic.com/v1" },
  [Provider.XAI]: { name: "xAI (Grok)", baseUrl: "https://api.x.ai/v1" },
  [Provider.GROQ]: { name: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  [Provider.MISTRAL]: { name: "Mistral", baseUrl: "https://api.mistral.ai/v1" },
  [Provider.DEEPSEEK]: { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  [Provider.PERPLEXITY]: { name: "Perplexity", baseUrl: "https://api.perplexity.ai" },
  [Provider.OPENROUTER]: { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  [Provider.OLLAMA]: { name: "Ollama", baseUrl: "http://localhost:11434" },
  [Provider.NVIDIA]: { name: "Nvidia NIM", baseUrl: "https://integrate.api.nvidia.com/v1" },
  [Provider.TOGETHER]: { name: "Together AI", baseUrl: "https://api.together.xyz/v1" },
  [Provider.CEREBRAS]: { name: "Cerebras", baseUrl: "https://api.cerebras.ai/v1" },
  [Provider.HUGGINGFACE]: { name: "Hugging Face", baseUrl: "https://api-inference.huggingface.co/v1" },
  [Provider.GITHUB]: { name: "GitHub Models", baseUrl: "https://models.inference.ai.azure.com" },
  [Provider.CUSTOM]: { name: "Custom Provider" }
};
