import {
  DurableBrainDestination,
  DurableBrainDestinationResult,
  PromotionCandidate,
  PromotionDecision
} from '../../../agent/promotion/PromotionTypes.js';
import { NotionBrainService } from './NotionBrainService.js';
import { BrainCandidateLearning, BrainDatabaseTarget, BrainLearningType } from '../../../agent/brain/BrainTypes.js';
import { BrainGovernance } from '../../../agent/brain/BrainGovernance.js';
import { AgentFeatureFlags } from '../agentIntegration/AgentFeatureFlags.js';

export class NotionBrainDestination implements DurableBrainDestination {
  constructor(private notionBrainService: NotionBrainService = NotionBrainService.getInstance()) {}

  public async persistCandidate(
    candidate: PromotionCandidate,
    decision: PromotionDecision
  ): Promise<DurableBrainDestinationResult> {
    if (!AgentFeatureFlags.USE_NOTION_BRAIN_LEARNING) {
      return {
        persisted: false,
        destination: 'Notion DevGenie Brain',
        error: 'Disabled by feature flag USE_NOTION_BRAIN_LEARNING'
      };
    }

    if (!this.notionBrainService.isConfigured()) {
      return {
        persisted: false,
        destination: 'Notion DevGenie Brain',
        error: 'Notion Brain is not configured'
      };
    }

    try {
      // Map PromotionCategory to BrainDatabaseTarget and BrainLearningType
      let targetDatabase: BrainDatabaseTarget = 'Knowledge & Concepts';
      let learningType: BrainLearningType = 'New Knowledge';

      if (candidate.category === 'ERROR_AVOIDANCE') {
        targetDatabase = 'Lessons & Bug Memory';
        learningType = 'Updated Lesson';
      } else if (candidate.category === 'FRAMEWORK_SPECIFIC' || candidate.category === 'WORKFLOW_OPTIMIZATION') {
        targetDatabase = 'Knowledge & Concepts';
        learningType = 'New Knowledge';
      } else if (candidate.category === 'TOOL_SELECTION') {
        targetDatabase = 'Knowledge & Concepts';
        learningType = 'New Knowledge';
      }

      const evidenceText = candidate.evidence?.sourceTool
        ? `Source tool: ${candidate.evidence.sourceTool}. Score: ${candidate.evidence.overallScore || 'N/A'}. Rationale: ${candidate.rationale}`
        : (candidate.rationale || 'Verified via execution evidence.');

      const brainCandidate: BrainCandidateLearning = {
        id: candidate.id,
        title: candidate.proposedContent.substring(0, 60),
        learningType,
        targetDatabase,
        summary: candidate.proposedContent,
        evidence: BrainGovernance.sanitizeForBrain(evidenceText),
        confidence: candidate.confidence >= 0.7 ? 'High' : 'Medium',
        moduleName: candidate.evidence?.sourceTool ? String(candidate.evidence.sourceTool) : undefined,
        reusableRule: candidate.category === 'ERROR_AVOIDANCE' ? candidate.proposedContent : undefined,
        isDurable: true,
        metadata: candidate.metadata
      };

      const writeResult = await this.notionBrainService.writeCandidateLearning(brainCandidate);

      return {
        persisted: writeResult.success,
        destination: `Notion DevGenie Brain (${targetDatabase})`,
        recordId: writeResult.recordId,
        auditLogId: writeResult.auditLogId,
        error: writeResult.error
      };
    } catch (error) {
      console.warn('[NotionBrainDestination] Non-fatal error persisting to Notion Cloud Brain:', error);
      return {
        persisted: false,
        destination: 'Notion DevGenie Brain',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async recordRejection(
    candidate: PromotionCandidate,
    decision: PromotionDecision
  ): Promise<void> {
    if (!AgentFeatureFlags.USE_NOTION_BRAIN_LEARNING || !this.notionBrainService.isConfigured()) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const auditLog = {
        name: `[Audit] Rejected Proposal: ${candidate.proposedContent.substring(0, 50)}`,
        date: today,
        task: candidate.proposedContent.substring(0, 50),
        learningType: 'Rejected Proposal' as const,
        action: 'Audited' as const,
        targetPage: 'Promotion Policy Gate',
        summary: `Rejected by policy: ${decision.reason}`,
        evidence: `Confidence: ${candidate.confidence}, Occurrences: ${candidate.occurrenceCount}`,
        confidence: 'Medium' as const,
        agentIdentity: 'DevGenie Coding Agent' as const
      };

      await this.notionBrainService.recordAuditLog(auditLog);
    } catch (e) {
      console.warn('[NotionBrainDestination] Non-fatal error recording rejection audit log:', e);
    }
  }
}
