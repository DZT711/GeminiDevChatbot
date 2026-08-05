import { LearningEngine } from './LearningEngine';
import {
  LearningRequest,
  LearningResult,
  LearningDecision,
  KnowledgePromotion,
  MemoryPromotion
} from './LearningTypes';

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
}
