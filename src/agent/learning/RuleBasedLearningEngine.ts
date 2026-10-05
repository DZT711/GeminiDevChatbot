import { LearningEngine } from './LearningEngine';
import {
  LearningRequest,
  LearningResult,
  LearningDecision,
  KnowledgePromotion,
  MemoryPromotion,
  PlanLifecycleObservation
} from './LearningTypes';

function sanitizePlanEvidence(text: string): string {
  if (!text) return '';
  return text
    .replace(/(bearer\s+[a-zA-Z0-9_\-.]+)/gi, '[REDACTED_TOKEN]')
    .replace(/(api[_-]?key["':\s=]+)([a-zA-Z0-9_\-.]+)/gi, '$1[REDACTED_KEY]')
    .replace(/(token["':\s=]+)([a-zA-Z0-9_\-.]+)/gi, '$1[REDACTED_TOKEN]')
    .replace(/(password["':\s=]+)([^\s"',}]+)/gi, '$1[REDACTED_PASS]')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);
}

export class RuleBasedLearningEngine implements LearningEngine {
  async learn(request: LearningRequest): Promise<LearningResult> {
    const { reflection } = request;
    const knowledgePromotions: KnowledgePromotion[] = [];
    const memoryPromotions: MemoryPromotion[] = [];

    // Analyze Reflection Summary
    const hasMistakes = reflection.summary.detectedMistakes.length > 0;
    const hasImprovements = reflection.summary.potentialImprovements.length > 0;
    
    // Determine confidence and importance based on overall score
    const importance = reflection.summary.overallScore;
    const confidence = (importance / 100) * 0.9; // Simple heuristic

    if (!hasMistakes && hasImprovements) {
      // Good execution but room for improvement - promote to knowledge
      for (let i = 0; i < reflection.summary.potentialImprovements.length; i++) {
        knowledgePromotions.push({
          id: `kp-${reflection.executionId}-${i}`,
          content: reflection.summary.potentialImprovements[i],
          confidence,
          tags: ['improvement', 'heuristic']
        });
      }
    }

    if (hasMistakes) {
      // Mistakes happened - promote to memory to avoid repeating
      for (let i = 0; i < reflection.summary.detectedMistakes.length; i++) {
        memoryPromotions.push({
          id: `mp-${reflection.executionId}-${i}`,
          content: `Mistake to avoid: ${reflection.summary.detectedMistakes[i]}`,
          importance: 100 - importance // Higher importance for lower score
        });
      }
    }

    let decision = LearningDecision.DISCARD;
    
    if (knowledgePromotions.length > 0 && memoryPromotions.length > 0) {
      decision = LearningDecision.PROMOTE_TO_KNOWLEDGE; // Priority
    } else if (knowledgePromotions.length > 0) {
      decision = LearningDecision.PROMOTE_TO_KNOWLEDGE;
    } else if (memoryPromotions.length > 0) {
      decision = LearningDecision.PROMOTE_TO_MEMORY;
    }

    // Example of human approval condition: very low score might need human review
    if (importance < 30) {
      decision = LearningDecision.REQUIRES_HUMAN_APPROVAL;
    }

    let reasoning = 'No promotions derived from reflection.';
    if (decision === LearningDecision.PROMOTE_TO_KNOWLEDGE) {
      reasoning = 'Derived actionable improvements for future general execution.';
    } else if (decision === LearningDecision.PROMOTE_TO_MEMORY) {
      reasoning = 'Derived specific context mistakes that should be remembered.';
    } else if (decision === LearningDecision.REQUIRES_HUMAN_APPROVAL) {
      reasoning = 'Execution score is critically low. Human approval required before learning.';
    }

    return {
      decision,
      knowledgePromotions,
      memoryPromotions,
      reasoning
    };
  }

  /**
   * Plan-Level Learning: Extracts durable knowledge from multi-step plan execution observations.
   * STRICT POLICY: Does NOT promote trivial or routine successful plan completions.
   * Only promotes when durable replanning/repair patterns, dependency order rules,
   * or failure lessons are discovered.
   */
  async learnFromPlan(observation: PlanLifecycleObservation): Promise<LearningResult> {
    const knowledgePromotions: KnowledgePromotion[] = [];
    const memoryPromotions: MemoryPromotion[] = [];

    const hasReplans = observation.replanningEvents && observation.replanningEvents.length > 0;
    const hasRepairs = observation.repairedStepIds && observation.repairedStepIds.length > 0;
    const hasFailures = observation.failedStepIds && observation.failedStepIds.length > 0;
    const isFailed = observation.finalOutcome === 'FAILED' || observation.finalOutcome === 'ABORTED';

    // 1. Trivial check: normal completion without failures, repairs, replans, or architectural lessons produces NO learning
    if (!hasReplans && !hasRepairs && !hasFailures && !isFailed) {
      return {
        decision: LearningDecision.DISCARD,
        knowledgePromotions: [],
        memoryPromotions: [],
        reasoning: 'Trivial or normal plan completion with no durable failure, repair, or architectural lesson.'
      };
    }

    // 2. Replanning & Verified Repair Patterns
    if (hasReplans) {
      for (let i = 0; i < observation.replanningEvents.length; i++) {
        const event = observation.replanningEvents[i];
        const isRepaired = observation.repairedStepIds.includes(event.stepId) || observation.finalOutcome === 'COMPLETED';

        // Check if event relates to dependency ordering or prerequisites
        const isDependencyIssue = 
          event.failureCategory.toUpperCase().includes('DEPENDENCY') ||
          event.failureCategory.toUpperCase().includes('PREREQUISITE') ||
          (event.reason && event.reason.toLowerCase().includes('order')) ||
          (event.reason && event.reason.toLowerCase().includes('prerequisite'));

        if (isDependencyIssue) {
          const content = sanitizePlanEvidence(
            `Dependency ordering constraint verified for step '${event.stepId}': prerequisites must be verified prior to step execution. Category: ${event.failureCategory}.${event.reason ? ` Reason: ${event.reason}` : ''}`
          );
          knowledgePromotions.push({
            id: `kp-plan-dep-${observation.planId}-${i}`,
            content,
            confidence: 0.92,
            tags: ['plan_learning', 'dependency_order', 'invariant', 'workflow_optimization'],
            metadata: {
              planId: observation.planId,
              executionId: observation.executionId,
              stepId: event.stepId,
              failureCategory: event.failureCategory,
              action: event.action,
              isPlanLevel: true
            }
          });
        } else if (isRepaired) {
          const content = sanitizePlanEvidence(
            `Verified repair pattern for category '${event.failureCategory}': action '${event.action}' successfully resolved failure on step '${event.stepId}'.${event.reason ? ` Strategy: ${event.reason}` : ''}`
          );
          knowledgePromotions.push({
            id: `kp-plan-repair-${observation.planId}-${i}`,
            content,
            confidence: 0.90,
            tags: ['plan_learning', 'replan_repair', event.failureCategory.toLowerCase(), 'heuristic'],
            metadata: {
              planId: observation.planId,
              executionId: observation.executionId,
              stepId: event.stepId,
              failureCategory: event.failureCategory,
              action: event.action,
              isPlanLevel: true
            }
          });
        }
      }
    }

    // 3. Unresolved Plan Failure Lessons
    if (isFailed && hasFailures) {
      const sanitizedError = sanitizePlanEvidence(observation.error || 'Plan execution failed during task execution.');
      const content = sanitizePlanEvidence(
        `Plan execution failure lesson: task execution failed on steps [${observation.failedStepIds.join(', ')}]. ${sanitizedError} Ensure prerequisite validation and recovery constraints are addressed.`
      );
      knowledgePromotions.push({
        id: `kp-plan-fail-${observation.planId}`,
        content,
        confidence: 0.85,
        tags: ['plan_learning', 'error_avoidance', 'failure_lesson'],
        metadata: {
          planId: observation.planId,
          executionId: observation.executionId,
          failedStepIds: observation.failedStepIds,
          error: sanitizedError,
          isPlanLevel: true
        }
      });
    }

    if (knowledgePromotions.length === 0) {
      return {
        decision: LearningDecision.DISCARD,
        knowledgePromotions: [],
        memoryPromotions: [],
        reasoning: 'Plan execution observation contained no durable architectural lessons or verified repair patterns.'
      };
    }

    return {
      decision: LearningDecision.PROMOTE_TO_KNOWLEDGE,
      knowledgePromotions,
      memoryPromotions,
      reasoning: `Extracted ${knowledgePromotions.length} durable plan-level learning item(s) from plan lifecycle observation.`
    };
  }
}

