import type {
  PlanningContext,
  PlanningResult,
  PlanningStrategy
} from './PlanningTypes.js';
import { RuleBasedPlanningStrategy } from './RuleBasedPlanningStrategy.js';
import { LLMPlanningStrategy } from './LLMPlanningStrategy.js';

export interface HybridPlanningOptions {
  enableFallback?: boolean;
  preferLLM?: boolean;
}

export class HybridPlanningStrategy implements PlanningStrategy {
  public readonly name = 'HybridPlanningStrategy';
  public readonly version = '1.0.0';

  constructor(
    private readonly ruleBased: RuleBasedPlanningStrategy = new RuleBasedPlanningStrategy(),
    private readonly llmBased?: LLMPlanningStrategy,
    private readonly options: HybridPlanningOptions = { enableFallback: true, preferLLM: true }
  ) {}

  public async generatePlan(context: PlanningContext): Promise<PlanningResult> {
    // If no LLM strategy is provided or user explicitly requested rule-based, use rule-based directly
    if (!this.llmBased || context.preferredStrategy === 'RULE_BASED') {
      return this.ruleBased.generatePlan(context);
    }

    try {
      const llmResult = await this.llmBased.generatePlan(context);
      if (llmResult.success && llmResult.plan) {
        return {
          ...llmResult,
          strategyUsed: `${this.name} [LLM]`,
          metadata: {
            ...llmResult.metadata,
            primaryStrategy: 'LLMPlanningStrategy',
            hybridMode: true
          }
        };
      }

      // If LLM returned failure and fallback is enabled, fall back to rule-based
      if (this.options.enableFallback !== false) {
        const fallbackResult = await this.ruleBased.generatePlan(context);
        return {
          ...fallbackResult,
          strategyUsed: `${this.name} [RuleBased Fallback]`,
          warnings: [
            ...(fallbackResult.warnings || []),
            `LLM planning failed (${(llmResult.errors || []).join('; ')}). Successfully fell back to deterministic rule-based planning.`
          ],
          metadata: {
            ...fallbackResult.metadata,
            fallbackTriggered: true,
            llmErrors: llmResult.errors
          }
        };
      }

      return llmResult;
    } catch (err: unknown) {
      if (this.options.enableFallback !== false) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const fallbackResult = await this.ruleBased.generatePlan(context);
        return {
          ...fallbackResult,
          strategyUsed: `${this.name} [RuleBased Fallback]`,
          warnings: [
            ...(fallbackResult.warnings || []),
            `LLM planning threw exception (${errorMsg}). Successfully fell back to deterministic rule-based planning.`
          ],
          metadata: {
            ...fallbackResult.metadata,
            fallbackTriggered: true,
            llmException: errorMsg
          }
        };
      }

      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        errors: [`Hybrid planning LLM execution failed: ${msg}`],
        strategyUsed: this.name
      };
    }
  }

  public async createPlan(context: PlanningContext): Promise<PlanningResult> {
    return this.generatePlan(context);
  }
}
