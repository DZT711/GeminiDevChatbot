import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";
import { ChatGenerateConfig } from "./ProviderInterface";

export class GithubProvider extends OpenAICompatibleProvider {
  constructor(name: string, baseUrl: string) {
    super(name, baseUrl);
  }

  // GitHub models via Azure often use different endpoints or accept specific headers.
  // Using standard OpenAI compatible structure for now, can be overridden if needed.
  async generateResponse(
    prompt: string,
    history: { role: 'user' | 'model', parts: any[] }[],
    systemPrompt: string,
    config: ChatGenerateConfig,
    onChunk: (chunk: string) => void
  ): Promise<string> {
      // Custom overrides for GitHub could go here
      return super.generateResponse(prompt, history, systemPrompt, config, onChunk);
  }
}
