import { ProviderInterface } from './ProviderInterface';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';
import { OllamaProvider } from './OllamaProvider';
import { NvidiaProvider } from './NvidiaProvider';
import { Provider, PROVIDER_CONFIGS } from '../geminiService';

const providerCache = new Map<string, ProviderInterface>();

export function getProvider(providerKey: string): ProviderInterface {
  if (providerCache.has(providerKey)) {
    return providerCache.get(providerKey)!;
  }

  let instance: ProviderInterface;
  if (providerKey === Provider.OLLAMA) {
    instance = new OllamaProvider();
  } else if (providerKey === Provider.NVIDIA) {
    const config = PROVIDER_CONFIGS[providerKey];
    instance = new NvidiaProvider(config.name, config.baseUrl!);
  } else {
    // Other providers like OpenAI, Groq, Together, etc.
    const config = PROVIDER_CONFIGS[providerKey];
    if (!config || !config.baseUrl) {
      throw new Error(`Unsupported generic provider: ${providerKey}`);
    }
    instance = new OpenAICompatibleProvider(config.name, config.baseUrl);
  }

  providerCache.set(providerKey, instance);
  return instance;
}

