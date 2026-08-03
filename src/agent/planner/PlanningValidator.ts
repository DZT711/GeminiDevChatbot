import { TaskGraph } from './TaskGraph';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PlanningValidator {
  public static validate(graph: TaskGraph): ValidationResult {
    const errors: string[] = [];

    for (const [stepId, deps] of graph.edges.entries()) {
      for (const dep of deps) {
        if (!graph.steps.has(dep)) {
          errors.push(`Step '${stepId}' depends on missing step '${dep}'.`);
        }
      }
    }

    if (!graph.isAcyclic()) {
      errors.push('Circular dependencies detected in the task graph.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
