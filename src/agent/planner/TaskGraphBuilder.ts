import { TaskSpecification } from '../decomposition/DecompositionTypes.js';
import { PlanStep } from './PlanStep.js';
import { DirectedTaskGraph } from './TaskGraph.js';
import { TaskEntity, TaskGraph } from './TaskGraphTypes.js';
import { assertValidTaskGraph } from './TaskGraphValidation.js';
import { InvalidTaskGraphError } from './TaskGraphErrors.js';

export type TaskGraphStructureMode = 'SEQUENTIAL' | 'INDEPENDENT' | 'EXPLICIT';

export interface TaskGraphBuildOptions {
  graphId?: string;
  goalId?: string;
  structureMode?: TaskGraphStructureMode;
  explicitDependencies?: Record<string, string[]>;
  metadata?: Record<string, unknown>;
}

export class TaskGraphBuilder {
  /**
   * Builds a validated TaskGraph from an array of TaskSpecifications (or PlanSteps).
   * By default, tasks without explicit dependency mappings are sequenced linearly (SEQUENTIAL),
   * ensuring that each task naturally depends on the completion of the preceding task.
   */
  public static build(
    tasks: TaskEntity[],
    options?: TaskGraphBuildOptions | string
  ): DirectedTaskGraph {
    let opts: TaskGraphBuildOptions = {};
    if (typeof options === 'string') {
      opts = { goalId: options };
    } else if (options) {
      opts = options;
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      const emptyGraph = new DirectedTaskGraph(opts.graphId, opts.goalId);
      if (opts.metadata) emptyGraph.metadata = { ...opts.metadata };
      return emptyGraph;
    }

    const goalId = opts.goalId || (tasks[0] && 'parentGoalId' in tasks[0] ? (tasks[0] as TaskSpecification).parentGoalId : '');
    const graph = new DirectedTaskGraph(opts.graphId, goalId);
    if (opts.metadata) {
      graph.metadata = { ...opts.metadata };
    }

    const mode = opts.structureMode || 'SEQUENTIAL';

    // Step 1: Add all nodes with initial dependencies according to mode
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      let deps: string[] = [];

      if (opts.explicitDependencies && task.id in opts.explicitDependencies) {
        deps = opts.explicitDependencies[task.id];
      } else if (mode === 'SEQUENTIAL' && i > 0) {
        deps = [tasks[i - 1].id];
      } else if (mode === 'INDEPENDENT') {
        deps = [];
      } else if ('dependencies' in task && Array.isArray((task as PlanStep).dependencies)) {
        deps = (task as PlanStep).dependencies;
      }

      graph.addTask(task, deps);
    }

    // Step 2: Validate the graph structure
    assertValidTaskGraph(graph);

    return graph;
  }

  /**
   * Explicitly builds a sequential linear pipeline: task[0] -> task[1] -> ... -> task[n]
   */
  public static buildSequential(
    tasks: TaskSpecification[],
    goalId?: string,
    metadata?: Record<string, unknown>
  ): DirectedTaskGraph {
    return this.build(tasks, {
      goalId,
      structureMode: 'SEQUENTIAL',
      metadata
    });
  }

  /**
   * Explicitly builds an independent / parallel frontier graph where tasks have 0 initial dependencies
   */
  public static buildIndependent(
    tasks: TaskSpecification[],
    goalId?: string,
    metadata?: Record<string, unknown>
  ): DirectedTaskGraph {
    return this.build(tasks, {
      goalId,
      structureMode: 'INDEPENDENT',
      metadata
    });
  }

  /**
   * Builds a graph with explicit dependency mapping (taskId -> array of prerequisite taskIds)
   */
  public static buildFromDependencies(
    tasks: TaskSpecification[],
    dependencies: Record<string, string[]>,
    goalId?: string,
    metadata?: Record<string, unknown>
  ): DirectedTaskGraph {
    return this.build(tasks, {
      goalId,
      structureMode: 'EXPLICIT',
      explicitDependencies: dependencies,
      metadata
    });
  }
}
