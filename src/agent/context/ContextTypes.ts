export enum ContextSectionType {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  MEMORY = 'MEMORY',
  KNOWLEDGE = 'KNOWLEDGE',
  EXPERIENCE = 'EXPERIENCE',
  WORKSPACE = 'WORKSPACE',
  TOOL = 'TOOL',
  CONVERSATION = 'CONVERSATION',
  CUSTOM = 'CUSTOM'
}

export interface ContextSection {
  id: string;
  type: ContextSectionType | string;
  content: string;
  priority: number; // Higher number = higher priority
  weight?: number;
  metadata?: Record<string, unknown>;
  tokenCount: number;
}

export interface ContextMetadata {
  assembledAt: number;
  totalTokens: number;
  strategy: string;
  namespaces?: string[];
}

export interface TokenBudget {
  maxTokens: number;
  reservedCompletionTokens: number;
}

export interface ContextStatistics {
  sectionCounts: Record<string, number>;
  sectionTokens: Record<string, number>;
  truncatedSections: string[];
  totalTokens: number;
}

export interface PromptContext {
  sections: ContextSection[];
  metadata: ContextMetadata;
  statistics: ContextStatistics;
  budget: TokenBudget;
}

export interface ContextBuilderRequest {
  systemPrompt?: string;
  userPrompt: string;
  conversationHistory?: { role: string; content: string }[];
  toolContext?: { name: string; result: string }[];
  memories?: { id: string; content: string }[];
  knowledge?: { id: string; content: string }[];
  workspaceContext?: string;
  namespaces?: string[];
  tokenBudget: TokenBudget;
}
