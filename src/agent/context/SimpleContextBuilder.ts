import { ContextBuilder } from './ContextBuilder';
import { 
  ContextBuilderRequest, 
  PromptContext, 
  ContextSection, 
  ContextSectionType, 
  ContextStatistics 
} from './ContextTypes';
import { ContextBudgetError } from './ContextErrors';

export interface TokenEstimator {
  estimate(text: string): number;
}

export class DefaultTokenEstimator implements TokenEstimator {
  estimate(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export class SimpleContextBuilder implements ContextBuilder {
  constructor(private tokenEstimator: TokenEstimator = new DefaultTokenEstimator()) {}

  async build(request: ContextBuilderRequest): Promise<PromptContext> {
    const availableTokens = request.tokenBudget.maxTokens - request.tokenBudget.reservedCompletionTokens;
    if (availableTokens <= 0) {
      throw new ContextBudgetError('Invalid token budget: available tokens must be greater than 0.');
    }

    const sections: ContextSection[] = [];

    // 1. System Prompt
    if (request.systemPrompt) {
      sections.push({
        id: 'system',
        type: ContextSectionType.SYSTEM,
        content: request.systemPrompt,
        priority: 100,
        tokenCount: this.tokenEstimator.estimate(request.systemPrompt)
      });
    }

    // 2. User Prompt
    sections.push({
      id: 'user',
      type: ContextSectionType.USER,
      content: request.userPrompt,
      priority: 90,
      tokenCount: this.tokenEstimator.estimate(request.userPrompt)
    });

    // 3. Tool Context
    if (request.toolContext) {
      for (const tool of request.toolContext) {
        const content = `Tool: ${tool.name}\nResult: ${tool.result}`;
        sections.push({
          id: `tool-${tool.name}`,
          type: ContextSectionType.TOOL,
          content,
          priority: 80,
          tokenCount: this.tokenEstimator.estimate(content)
        });
      }
    }

    // 4. Workspace Context
    if (request.workspaceContext) {
      sections.push({
        id: 'workspace',
        type: ContextSectionType.WORKSPACE,
        content: request.workspaceContext,
        priority: 70,
        tokenCount: this.tokenEstimator.estimate(request.workspaceContext)
      });
    }

    // 5. Conversation History
    if (request.conversationHistory) {
      const historyContent = request.conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n');
      sections.push({
        id: 'conversation',
        type: ContextSectionType.CONVERSATION,
        content: historyContent,
        priority: 60,
        tokenCount: this.tokenEstimator.estimate(historyContent)
      });
    }

    // 6. Memory
    if (request.memories) {
      for (const mem of request.memories) {
        sections.push({
          id: `memory-${mem.id}`,
          type: ContextSectionType.MEMORY,
          content: mem.content,
          priority: 50,
          tokenCount: this.tokenEstimator.estimate(mem.content)
        });
      }
    }

    // 7. Knowledge
    if (request.knowledge) {
      for (const k of request.knowledge) {
        sections.push({
          id: `knowledge-${k.id}`,
          type: ContextSectionType.KNOWLEDGE,
          content: k.content,
          priority: 40,
          tokenCount: this.tokenEstimator.estimate(k.content)
        });
      }
    }

    // Deduplicate (simple id based)
    const uniqueSections: ContextSection[] = [];
    const seenIds = new Set<string>();
    for (const section of sections) {
      if (!seenIds.has(section.id)) {
        uniqueSections.push(section);
        seenIds.add(section.id);
      }
    }

    // Sort by priority descending
    uniqueSections.sort((a, b) => b.priority - a.priority);

    // Apply token budget and truncation
    const finalSections: ContextSection[] = [];
    let currentTokens = 0;
    const truncatedSections: string[] = [];

    for (const section of uniqueSections) {
      if (currentTokens + section.tokenCount <= availableTokens) {
        finalSections.push(section);
        currentTokens += section.tokenCount;
      } else {
        // Partial inclusion or skip
        const remaining = availableTokens - currentTokens;
        if (remaining > 50) { 
          const ratio = remaining / section.tokenCount;
          const sliceLen = Math.floor(section.content.length * ratio);
          const truncatedContent = section.content.substring(0, sliceLen) + '...[TRUNCATED]';
          finalSections.push({
            ...section,
            content: truncatedContent,
            tokenCount: remaining
          });
          currentTokens += remaining;
          truncatedSections.push(section.id);
        } else {
          truncatedSections.push(section.id);
        }
      }
    }

    // Sort by priority to ensure stable context layout for LLM (System -> User etc or reverse?)
    // Usually System -> Memory -> Tools -> History -> User 
    // We will just let the caller sort finalSections as needed, but returning it sorted by priority descending is fine.

    // Generate Statistics
    const statistics: ContextStatistics = {
      sectionCounts: {},
      sectionTokens: {},
      truncatedSections,
      totalTokens: currentTokens
    };

    for (const section of finalSections) {
      statistics.sectionCounts[section.type] = (statistics.sectionCounts[section.type] || 0) + 1;
      statistics.sectionTokens[section.type] = (statistics.sectionTokens[section.type] || 0) + section.tokenCount;
    }

    return {
      sections: finalSections,
      metadata: {
        assembledAt: Date.now(),
        totalTokens: currentTokens,
        strategy: 'priority-truncation',
        namespaces: request.namespaces
      },
      statistics,
      budget: request.tokenBudget
    };
  }
}
