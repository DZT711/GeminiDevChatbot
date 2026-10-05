import { LLMService } from './services/llmService.js';
import { AgentSessionService, globalAgentSessionService } from './services/session/index.js';
import { ChangeSetService, globalChangeSetService } from './services/changes/ChangeSetService.js';
import { ConversationMessageService, globalConversationMessageService } from './services/message/ConversationMessageService.js';

class DIContainer {
  private _llmService?: LLMService;
  private _agentSessionService?: AgentSessionService;
  private _changeSetService?: ChangeSetService;
  private _conversationMessageService?: ConversationMessageService;

  public get llmService(): LLMService {
    if (!this._llmService) {
      this._llmService = new LLMService();
    }
    return this._llmService;
  }

  public get agentSessionService(): AgentSessionService {
    if (!this._agentSessionService) {
      this._agentSessionService = globalAgentSessionService;
    }
    return this._agentSessionService;
  }

  public get changeSetService(): ChangeSetService {
    if (!this._changeSetService) {
      globalChangeSetService.setSessionService(this.agentSessionService);
      this._changeSetService = globalChangeSetService;
    }
    return this._changeSetService;
  }

  public get conversationMessageService(): ConversationMessageService {
    if (!this._conversationMessageService) {
      this._conversationMessageService = globalConversationMessageService;
    }
    return this._conversationMessageService;
  }
}

export const di = new DIContainer();
