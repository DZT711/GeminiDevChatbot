import { LLMService } from './services/llmService.js';

class DIContainer {
  private _llmService?: LLMService;

  public get llmService(): LLMService {
    if (!this._llmService) {
      this._llmService = new LLMService();
    }
    return this._llmService;
  }
}

export const di = new DIContainer();
