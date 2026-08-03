import { PlanStep } from './PlanStep';

export interface TaskGraph {
  steps: Map<string, PlanStep>;
  edges: Map<string, string[]>;
  
  getExecutableSteps(completedStepIds: Set<string>): PlanStep[];
  isAcyclic(): boolean;
}

export class DirectedTaskGraph implements TaskGraph {
  public steps: Map<string, PlanStep> = new Map();
  public edges: Map<string, string[]> = new Map();

  public addStep(step: PlanStep): void {
    this.steps.set(step.id, step);
    this.edges.set(step.id, [...step.dependencies]);
  }

  public getExecutableSteps(completedStepIds: Set<string>): PlanStep[] {
    const executable: PlanStep[] = [];
    for (const [id, step] of this.steps.entries()) {
      if (completedStepIds.has(id)) {
        continue;
      }
      const deps = this.edges.get(id) || [];
      const allDepsMet = deps.every(dep => completedStepIds.has(dep));
      if (allDepsMet) {
        executable.push(step);
      }
    }
    return executable;
  }

  public isAcyclic(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return false;
      if (visited.has(nodeId)) return true;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const deps = this.edges.get(nodeId) || [];
      for (const dep of deps) {
        if (!dfs(dep)) {
          return false;
        }
      }

      recursionStack.delete(nodeId);
      return true;
    };

    for (const nodeId of this.steps.keys()) {
      if (!dfs(nodeId)) {
        return false;
      }
    }

    return true;
  }
}
