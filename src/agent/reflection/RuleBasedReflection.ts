import { ReflectionEngine } from './ReflectionEngine';
import {
  ReflectionRequest,
  ReflectionRecord,
  ReflectionCategory,
  ReflectionScore,
  ReflectionSuggestion
} from './ReflectionTypes';

export class RuleBasedReflection implements ReflectionEngine {
  async reflect(request: ReflectionRequest): Promise<ReflectionRecord> {
    const scores: Record<string, ReflectionScore> = {};
    const suggestions: ReflectionSuggestion[] = [];
    const detectedMistakes: string[] = [];
    const potentialImprovements: string[] = [];
    
    let overallScore = 100;
    let success = true;
    let failureReason: string | undefined;

    // 1. Evaluate Execution Success
    if (!request.result.success || (request.errors && request.errors.length > 0)) {
      success = false;
      overallScore -= 40;
      failureReason = request.result.error?.message || (request.errors ? request.errors[0]?.message : 'Unknown execution failure');
      
      scores[ReflectionCategory.EXECUTION_SUCCESS] = { score: 0, confidence: 1.0 };
      
      detectedMistakes.push('Execution completed with errors or unsuccessful status.');
      suggestions.push({
        category: ReflectionCategory.EXECUTION_SUCCESS,
        description: 'Investigate the root cause of the execution failure.',
        severity: 'high',
        actionable: true
      });
    } else {
      scores[ReflectionCategory.EXECUTION_SUCCESS] = { score: 100, confidence: 1.0 };
    }

    // 2. Evaluate Tool Quality
    if (request.toolResults && request.toolResults.length > 0) {
      const failedTools = request.toolResults.filter(tr => !tr.success);
      if (failedTools.length > 0) {
        overallScore -= 20;
        const failedToolIds = failedTools.map(tr => (tr.metadata?.toolName as string) || 'Unknown Tool').join(', ');
        detectedMistakes.push(`Tool execution failed for: ${failedToolIds}`);
        
        scores[ReflectionCategory.TOOL_QUALITY] = { score: 50, confidence: 0.9 };
        
        suggestions.push({
          category: ReflectionCategory.TOOL_QUALITY,
          description: `Ensure proper arguments and permissions for tools: ${failedToolIds}`,
          severity: 'medium',
          actionable: true
        });
      } else {
        scores[ReflectionCategory.TOOL_QUALITY] = { score: 100, confidence: 0.9 };
        potentialImprovements.push('Tool usage was successful, consider optimizing sequential tool calls to parallel if possible.');
      }
    }

    // 3. Evaluate Context Quality
    if (request.context) {
      if (request.context.statistics.truncatedSections.length > 0) {
        overallScore -= 10;
        detectedMistakes.push('Some context sections were truncated due to token budget limits.');
        
        scores[ReflectionCategory.CONTEXT_QUALITY] = { score: 70, confidence: 0.8 };
        
        suggestions.push({
          category: ReflectionCategory.CONTEXT_QUALITY,
          description: 'Summarize memory or knowledge prior to context assembly to avoid truncation.',
          severity: 'medium',
          actionable: true
        });
      } else {
        scores[ReflectionCategory.CONTEXT_QUALITY] = { score: 100, confidence: 0.8 };
      }
    }

    // Adjust overall score to be within 0-100
    overallScore = Math.max(0, Math.min(100, overallScore));

    const record: ReflectionRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      executionId: request.executionId,
      summary: {
        overallScore,
        success,
        failureReason,
        detectedMistakes,
        potentialImprovements
      },
      scores,
      suggestions,
      metadata: request.metadata
    };

    return structuredClone(record);
  }
}
