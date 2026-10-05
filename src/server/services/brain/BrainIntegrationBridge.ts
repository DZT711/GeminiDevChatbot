import { NotionBrainService } from './NotionBrainService.js';
import { BrainGovernance } from '../../../agent/brain/BrainGovernance.js';
import { BrainCandidateLearning, BrainWriteResult } from '../../../agent/brain/BrainTypes.js';
import { AgentFeatureFlags } from '../agentIntegration/AgentFeatureFlags.js';

export class BrainIntegrationBridge {
  /**
   * Pre-task hook: Retrieves compact, targeted Brain context for the user's prompt.
   * If feature flag is OFF or Notion is unavailable, returns empty string safely without error.
   */
  public static async getBrainContextForPrompt(
    prompt: string,
    activeFiles: string[] = []
  ): Promise<string> {
    if (!AgentFeatureFlags.USE_NOTION_BRAIN_LEARNING) {
      return '';
    }

    try {
      const brainService = NotionBrainService.getInstance();
      if (!brainService.isConfigured()) {
        return '';
      }

      const summary = await brainService.readContextForTask(prompt, activeFiles);
      if (!summary || !summary.formattedContext) {
        return '';
      }

      return `\n\n${summary.formattedContext}`;
    } catch (error) {
      console.warn('[BrainIntegrationBridge] Non-fatal error retrieving Brain context:', error);
      return '';
    }
  }

  /**
   * Post-task hook: Analyzes completed execution metadata, checks for durable learning,
   * generates candidate, evaluates criteria, and persists to Notion with audit logging.
   */
  public static async processPostTaskLearning(params: {
    task: string;
    filesModified?: string[];
    reusableRule?: string;
    detectedMistakes?: string[];
    potentialImprovements?: string[];
    isRefactoringOrArch?: boolean;
    evidenceText: string;
    moduleName?: string;
  }): Promise<BrainWriteResult | null> {
    if (!AgentFeatureFlags.USE_NOTION_BRAIN_LEARNING) {
      return null;
    }

    try {
      const candidate: BrainCandidateLearning | null = BrainGovernance.generateCandidateFromExecution({
        task: params.task,
        filesModified: params.filesModified || [],
        reusableRule: params.reusableRule,
        detectedMistakes: params.detectedMistakes,
        potentialImprovements: params.potentialImprovements,
        isRefactoringOrArch: params.isRefactoringOrArch,
        evidenceText: params.evidenceText,
        moduleName: params.moduleName
      });

      if (!candidate) {
        // Trivial or non-durable execution; ignore silently
        return null;
      }

      const brainService = NotionBrainService.getInstance();
      if (!brainService.isConfigured()) {
        return null;
      }

      return await brainService.writeCandidateLearning(candidate);
    } catch (error) {
      console.warn('[BrainIntegrationBridge] Non-fatal error in post-task Brain learning:', error);
      return null;
    }
  }
}
