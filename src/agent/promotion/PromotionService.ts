import { KnowledgeStore } from '../knowledge/KnowledgeStore.js';
import { KnowledgeRecord } from '../knowledge/KnowledgeTypes.js';
import { LearningResult, KnowledgePromotion, LearningDecision } from '../learning/LearningTypes.js';
import { ExperienceStore } from '../experience/ExperienceStore.js';
import {
  PromotionCandidate,
  PromotionDecision,
  PromotionResult,
  PromotionCategory,
  PromotionEvidence
} from './PromotionTypes.js';
import { PromotionPolicy, RuleBasedPromotionPolicy } from './PromotionPolicy.js';

export interface PromotionContext {
  sessionId?: string;
  taskId?: string;
  executionId?: string;
  toolName?: string;
  overallScore?: number;
  detectedMistakes?: string[];
  potentialImprovements?: string[];
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface PromotionService {
  evaluateCandidate(candidate: PromotionCandidate): PromotionDecision;
  promoteCandidate(candidate: PromotionCandidate): Promise<PromotionResult>;
  processLearningResult(
    learningResult: LearningResult,
    context?: PromotionContext
  ): Promise<PromotionResult[]>;
  getPromotedKnowledge(namespace?: string): Promise<KnowledgeRecord[]>;
}

export class DefaultPromotionService implements PromotionService {
  private knowledgeStore: KnowledgeStore;
  private policy: PromotionPolicy;
  private experienceStore?: ExperienceStore;

  constructor(
    knowledgeStore: KnowledgeStore,
    policy: PromotionPolicy = new RuleBasedPromotionPolicy(),
    experienceStore?: ExperienceStore
  ) {
    this.knowledgeStore = knowledgeStore;
    this.policy = policy;
    this.experienceStore = experienceStore;
  }

  public evaluateCandidate(candidate: PromotionCandidate): PromotionDecision {
    try {
      return this.policy.evaluate(candidate);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        approved: false,
        status: 'REJECTED',
        reason: `Policy evaluation error: ${errorMessage}`,
        evaluatedCriteria: {
          minConfidencePassed: false,
          minScorePassed: false,
          minOccurrencesPassed: false,
          contentValid: false,
          notExplicitlyRejected: false
        }
      };
    }
  }

  public async promoteCandidate(candidate: PromotionCandidate): Promise<PromotionResult> {
    try {
      candidate.status = 'EVALUATING';
      const decision = this.evaluateCandidate(candidate);

      if (!decision.approved) {
        candidate.status = 'REJECTED';
        candidate.rejectionReason = decision.reason;
        return {
          candidateId: candidate.id,
          status: 'REJECTED',
          decision
        };
      }

      candidate.status = 'APPROVED';

      // Deduplication check: check if equivalent knowledge record already exists
      const isDuplicate = await this.checkDuplicate(candidate);
      if (isDuplicate) {
        candidate.status = 'REJECTED';
        candidate.rejectionReason = 'Equivalent knowledge record already exists in KnowledgeStore.';
        return {
          candidateId: candidate.id,
          status: 'REJECTED',
          decision: {
            ...decision,
            approved: false,
            status: 'REJECTED',
            reason: 'Duplicate knowledge: an identical or equivalent heuristic is already stored.'
          }
        };
      }

      // Persist to KnowledgeStore
      const tags = Array.from(
        new Set(['promoted_knowledge', 'heuristic', candidate.category.toLowerCase(), ...candidate.tags])
      );

      const recordId = `kn_${candidate.id}_${Date.now().toString(36)}`;
      const record = await this.knowledgeStore.createRecord({
        id: recordId,
        content: candidate.proposedContent,
        namespace: candidate.targetNamespace || 'default',
        collection: candidate.targetCollection || 'heuristics',
        metadata: {
          candidateId: candidate.id,
          category: candidate.category,
          confidence: decision.adjustedConfidence ?? candidate.confidence,
          sourceTaskId: candidate.sourceTaskId,
          sourceExperienceIds: candidate.sourceExperienceIds,
          rationale: candidate.rationale,
          evidence: candidate.evidence,
          promotedAt: Date.now(),
          ...(candidate.metadata || {})
        },
        tags,
        relationships: [],
        confidence: decision.adjustedConfidence ?? candidate.confidence,
        source: candidate.sourceTaskId ? `task:${candidate.sourceTaskId}` : 'learning_engine'
      });

      candidate.status = 'PROMOTED';

      return {
        candidateId: candidate.id,
        status: 'PROMOTED',
        decision,
        promotedRecordId: record.id
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      candidate.status = 'REJECTED';
      candidate.rejectionReason = `Persistence failure: ${errorMessage}`;
      return {
        candidateId: candidate.id,
        status: 'REJECTED',
        decision: {
          approved: false,
          status: 'REJECTED',
          reason: `Persistence failure: ${errorMessage}`,
          evaluatedCriteria: {
            minConfidencePassed: false,
            minScorePassed: false,
            minOccurrencesPassed: false,
            contentValid: false,
            notExplicitlyRejected: false
          }
        },
        error: errorMessage
      };
    }
  }

  public async processLearningResult(
    learningResult: LearningResult,
    context: PromotionContext = {}
  ): Promise<PromotionResult[]> {
    const results: PromotionResult[] = [];

    try {
      if (
        learningResult.decision === LearningDecision.DISCARD ||
        learningResult.decision === LearningDecision.REQUIRES_HUMAN_APPROVAL
      ) {
        return results;
      }

      const candidates = this.buildCandidates(learningResult, context);

      for (const candidate of candidates) {
        const result = await this.promoteCandidate(candidate);
        results.push(result);
      }
    } catch (error) {
      console.error('[PromotionService] Error processing learning result:', error);
    }

    return results;
  }

  public async getPromotedKnowledge(namespace?: string): Promise<KnowledgeRecord[]> {
    try {
      return await this.knowledgeStore.queryRecords({
        namespace,
        tags: ['promoted_knowledge'],
        sortBy: 'confidence',
        sortDirection: 'desc'
      });
    } catch (error) {
      console.error('[PromotionService] Error querying promoted knowledge:', error);
      return [];
    }
  }

  private buildCandidates(
    learningResult: LearningResult,
    context: PromotionContext
  ): PromotionCandidate[] {
    const candidates: PromotionCandidate[] = [];
    const now = Date.now();

    for (let i = 0; i < learningResult.knowledgePromotions.length; i++) {
      const kp = learningResult.knowledgePromotions[i];
      const category = this.categorizeKnowledge(kp, context);
      const evidence: PromotionEvidence = {
        sourceTool: context.toolName,
        overallScore: context.overallScore,
        detectedMistakes: context.detectedMistakes,
        potentialImprovements: context.potentialImprovements,
        durationMs: context.durationMs,
        occurrences: 1,
        ...(context.metadata || {})
      };

      const candidate: PromotionCandidate = {
        id: kp.id || `promo_cand_${now}_${i}`,
        sourceExperienceIds: context.executionId ? [context.executionId] : [],
        sourceTaskId: context.taskId,
        sourceLearningDecision: learningResult.decision,
        proposedContent: kp.content,
        category,
        confidence: kp.confidence ?? 0.8,
        occurrenceCount: 1,
        evidence,
        rationale: learningResult.reasoning || 'Derived from execution reflection.',
        tags: kp.tags || [],
        status: 'PENDING',
        createdAt: now,
        metadata: kp.metadata
      };

      candidates.push(candidate);
    }

    return candidates;
  }

  private categorizeKnowledge(
    kp: KnowledgePromotion,
    context: PromotionContext
  ): PromotionCategory {
    const tags = (kp.tags || []).map(t => t.toLowerCase());
    const content = kp.content.toLowerCase();

    if (tags.includes('error') || tags.includes('mistake') || content.includes('mistake') || content.includes('avoid')) {
      return 'ERROR_AVOIDANCE';
    }
    if (tags.includes('tool') || context.toolName || content.includes('tool')) {
      return 'TOOL_SELECTION';
    }
    if (tags.includes('parameter') || tags.includes('tuning') || content.includes('parameter') || content.includes('timeout')) {
      return 'PARAMETER_TUNING';
    }
    if (tags.includes('framework') || content.includes('react') || content.includes('typescript') || content.includes('node')) {
      return 'FRAMEWORK_SPECIFIC';
    }
    if (tags.includes('workflow') || content.includes('pipeline') || content.includes('step')) {
      return 'WORKFLOW_OPTIMIZATION';
    }
    return 'GENERAL_HEURISTIC';
  }

  private async checkDuplicate(candidate: PromotionCandidate): Promise<boolean> {
    try {
      const records = await this.knowledgeStore.queryRecords({
        namespace: candidate.targetNamespace || 'default',
        tags: ['promoted_knowledge']
      });

      const normalizedProposed = candidate.proposedContent.trim().toLowerCase();

      for (const record of records) {
        if (typeof record.content === 'string') {
          const normalizedExisting = record.content.trim().toLowerCase();
          if (normalizedExisting === normalizedProposed) {
            return true;
          }
        }
        if (record.metadata && record.metadata.candidateId === candidate.id) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
}
