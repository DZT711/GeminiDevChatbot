import type { PlanningContext, PlanningStrategy, StrategySelector } from './PlanningTypes.js';
import { StrategyType } from './PlanningTypes.js';
import { GoalIntent } from '../goal/GoalTypes.js';
import { RuleBasedPlanningStrategy } from './RuleBasedPlanningStrategy.js';
import { LLMPlanningStrategy } from './LLMPlanningStrategy.js';
import { HybridPlanningStrategy } from './HybridPlanningStrategy.js';

export interface StrategySelectorOptions {
  ruleBasedStrategy?: RuleBasedPlanningStrategy;
  llmStrategy?: LLMPlanningStrategy;
  hybridStrategy?: HybridPlanningStrategy;
}

export class DefaultStrategySelector implements StrategySelector {
  private readonly ruleBased: RuleBasedPlanningStrategy;
  private readonly llmBased?: LLMPlanningStrategy;
  private readonly hybrid: HybridPlanningStrategy;

  constructor(options?: StrategySelectorOptions) {
    this.ruleBased = options?.ruleBasedStrategy || new RuleBasedPlanningStrategy();
    this.llmBased = options?.llmStrategy;
    this.hybrid = options?.hybridStrategy || new HybridPlanningStrategy(this.ruleBased, this.llmBased);
  }

  public selectStrategy(context: PlanningContext): PlanningStrategy {
    // 1. Explicit preference in context
    if (context.preferredStrategy) {
      if (context.preferredStrategy === StrategyType.RULE_BASED || context.preferredStrategy === 'RULE_BASED') {
        return this.ruleBased;
      }
      if ((context.preferredStrategy === StrategyType.LLM || context.preferredStrategy === 'LLM') && this.llmBased) {
        return this.llmBased;
      }
      if (context.preferredStrategy === StrategyType.HYBRID || context.preferredStrategy === 'HYBRID') {
        return this.hybrid;
      }
    }

    // 2. If no LLM strategy is available, always use rule-based
    if (!this.llmBased) {
      return this.ruleBased;
    }

    // 3. Inspect goal intent and complexity
    const intent = context.goal?.intent;
    const isSingleTask = !context.taskGraph || context.taskGraph.nodes.size <= 2;

    // Fast rule-based paths for retrieval, chat, investigation, testing, or small task sets (< 5ms)
    if (
      isSingleTask ||
      intent === GoalIntent.INFORMATION_RETRIEVAL ||
      intent === GoalIntent.GENERAL_CHAT ||
      intent === GoalIntent.TESTING_AND_VERIFICATION ||
      intent === GoalIntent.INVESTIGATION
    ) {
      return this.ruleBased;
    }

    // Complex multi-file or code modification tasks can benefit from hybrid planning
    if (intent === GoalIntent.CODE_MODIFICATION || intent === GoalIntent.INFRASTRUCTURE_OPS) {
      return this.hybrid;
    }

    return this.ruleBased;
  }
}

