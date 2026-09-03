import { Goal, GoalIntent } from '../goal/GoalTypes.js';
import { DecompositionOptions, DecompositionStrategy, TaskSpecification } from './DecompositionTypes.js';
import { getDecompositionTemplateForIntent } from './DecompositionTemplate.js';
import { UnsupportedGoalIntentError } from './DecompositionErrors.js';

export class TemplateDecompositionStrategy implements DecompositionStrategy {
  public readonly name = 'TEMPLATE_DETERMINISTIC';

  canDecompose(goal: Goal): boolean {
    return Object.values(GoalIntent).includes(goal.intent);
  }

  async decompose(goal: Goal, options?: DecompositionOptions): Promise<TaskSpecification[]> {
    if (!this.canDecompose(goal)) {
      throw new UnsupportedGoalIntentError(goal.intent);
    }

    const template = getDecompositionTemplateForIntent(goal.intent);
    const availableTools = options?.availableTools;
    const tasks = template.generateTasks(goal, availableTools);

    return tasks;
  }
}
