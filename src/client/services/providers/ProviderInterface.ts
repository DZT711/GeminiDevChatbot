export interface ModelInformation {
  id: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
}

export interface ChatGenerateConfig {
  model: string;
  useSearch?: boolean;
  thinkingLevel?: any;
  signal?: AbortSignal;
  customKey?: string;
  customInstructions?: string | null;
  githubToken?: string;
  onModelSwitch?: (model: string) => void;
  onTokenUpdate?: (tokens: number) => void;
}

export interface ProviderInterface {
  name: string;
  checkKey(key: string): Promise<{ valid: boolean; models?: ModelInformation[]; error?: string }>;
  generateResponse(
    prompt: string,
    history: { role: 'user' | 'model', parts: any[] }[],
    systemPrompt: string,
    config: ChatGenerateConfig,
    onChunk: (chunk: string) => void
  ): Promise<string>;
}
