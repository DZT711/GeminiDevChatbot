import { ProviderInterface } from './ProviderInterface';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';
import { OllamaProvider } from './OllamaProvider';
import { NvidiaProvider } from './NvidiaProvider';
import { GroqProvider } from './GroqProvider';
import { MistralProvider } from './MistralProvider';
import { TogetherProvider } from './TogetherProvider';
import { CerebrasProvider } from './CerebrasProvider';
import { HuggingFaceProvider } from './HuggingFaceProvider';
import { GithubProvider } from './GithubProvider';
import { Provider, PROVIDER_CONFIGS } from '../geminiService';

const providerCache = new Map<string, ProviderInterface>();

export function getProvider(providerKey: string): ProviderInterface {
  if (providerCache.has(providerKey)) {
    return providerCache.get(providerKey)!;
  }

  let instance: ProviderInterface;
  const config = PROVIDER_CONFIGS[providerKey];
  
  if (providerKey === Provider.OLLAMA) {
    instance = new OllamaProvider();
  } else if (providerKey === Provider.NVIDIA) {
    instance = new NvidiaProvider(config.name, config.baseUrl!);
  } else if (providerKey === Provider.GROQ) {
    instance = new GroqProvider(config.name, config.baseUrl!);
  } else if (providerKey === Provider.MISTRAL) {
    instance = new MistralProvider(config.name, config.baseUrl!);
  } else if (providerKey === Provider.TOGETHER) {
    instance = new TogetherProvider(config.name, config.baseUrl!);
  } else if (providerKey === Provider.CEREBRAS) {
    instance = new CerebrasProvider(config.name, config.baseUrl!);
  } else if (providerKey === Provider.HUGGINGFACE) {
    instance = new HuggingFaceProvider(config.name, config.baseUrl!);
  } else if (providerKey === Provider.GITHUB) {
    instance = new GithubProvider(config.name, config.baseUrl!);
  } else {
    // Other providers like OpenAI, OpenRouter, DeepSeek, xAI etc.
    if (!config || !config.baseUrl) {
      throw new Error(`Unsupported generic provider: ${providerKey}`);
    }
    instance = new OpenAICompatibleProvider(config.name, config.baseUrl);
  }

  providerCache.set(providerKey, instance);
  return instance;
}

