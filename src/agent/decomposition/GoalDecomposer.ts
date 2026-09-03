import { Goal } from '../goal/GoalTypes.js';
import { assertValidGoal } from '../goal/GoalValidation.js';
import {
  DecompositionOptions,
  DecompositionResult,
  DecompositionStrategy,
  GoalDecomposer
} from './DecompositionTypes.js';
import { TemplateDecompositionStrategy } from './TemplateDecompositionStrategy.js';
import { validateDecomposition } from './DecompositionValidation.js';
import {
  InvalidGoalDecompositionError,
  UnsupportedGoalIntentError
} from './DecompositionErrors.js';

function generateDecompositionId(goalId: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `decomp_${crypto.randomUUID()}`;
  }
  return `decomp_${goalId}_${Date.now()}`;
}

export class DefaultGoalDecomposer implements GoalDecomposer {
  private readonly strategies: Map<string, DecompositionStrategy> = new Map();
  private readonly defaultStrategy: DecompositionStrategy;

  constructor(customStrategies?: DecompositionStrategy[]) {
    this.defaultStrategy = new TemplateDecompositionStrategy();
    this.strategies.set(this.defaultStrategy.name, this.defaultStrategy);

    if (customStrategies) {
      for (const strat of customStrategies) {
        this.strategies.set(strat.name, strat);
      }
    }
  }

  registerStrategy(strategy: DecompositionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  getStrategy(name: string): DecompositionStrategy | undefined {
    return this.strategies.get(name);
  }

  async decompose(goal: Goal, options?: DecompositionOptions): Promise<DecompositionResult> {
    // 1. Assert valid input goal
    assertValidGoal(goal);

    // 2. Select strategy
    let strategy: DecompositionStrategy | undefined;
    if (options?.strategy) {
      strategy = this.strategies.get(options.strategy);
    }
    if (!strategy) {
      // Find first strategy that can decompose this goal
      for (const s of this.strategies.values()) {
        if (s.canDecompose(goal)) {
          strategy = s;
          break;
        }
      }
    }

    if (!strategy) {
      throw new UnsupportedGoalIntentError(goal.intent);
    }

    // 3. Perform decomposition
    const rawTasks = await strategy.decompose(goal, options);

    // 4. Validate decomposition outputs
    const validationResult = validateDecomposition(rawTasks, goal);
    if (!validationResult.isValid) {
      throw new InvalidGoalDecompositionError(
        `Generated tasks failed structural validation:\n- ${validationResult.errors.join('\n- ')}`,
        { errors: validationResult.errors, warnings: validationResult.warnings }
      );
    }

    // 5. Construct result
    const decompositionResult: DecompositionResult = {
      goalId: goal.id,
      decompositionId: generateDecompositionId(goal.id),
      tasks: rawTasks,
      strategyName: strategy.name,
      warnings: validationResult.warnings,
      metadata: {
        ...(options?.metadata || {}),
        taskCount: rawTasks.length,
        goalIntent: goal.intent
      },
      createdAt: Date.now()
    };

    return decompositionResult;
  }
}
