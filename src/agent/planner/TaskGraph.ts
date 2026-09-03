import { PlanStep } from './PlanStep.js';
import {
  GraphStatus,
  TaskEntity,
  TaskGraph,
  TaskGraphJSON,
  TaskGraphNode,
  TaskStatus
} from './TaskGraphTypes.js';

export * from './TaskGraphTypes.js';
import {
  InvalidTaskGraphError,
  InvalidTaskStatusTransitionError,
  TaskGraphError
} from './TaskGraphErrors.js';
import {
  computeTopologicalOrder,
  findCycle,
  validateTaskGraph
} from './TaskGraphValidation.js';

const VALID_STATUS_TRANSITIONS: Record<TaskStatus, Set<TaskStatus>> = {
  [TaskStatus.PENDING]: new Set([
    TaskStatus.READY,
    TaskStatus.SKIPPED,
    TaskStatus.BLOCKED,
    TaskStatus.CANCELLED
  ]),
  [TaskStatus.READY]: new Set([
    TaskStatus.RUNNING,
    TaskStatus.BLOCKED,
    TaskStatus.CANCELLED,
    TaskStatus.SKIPPED
  ]),
  [TaskStatus.RUNNING]: new Set([
    TaskStatus.COMPLETED,
    TaskStatus.FAILED,
    TaskStatus.CANCELLED
  ]),
  [TaskStatus.COMPLETED]: new Set([]), // Terminal
  [TaskStatus.FAILED]: new Set([
    TaskStatus.READY,
    TaskStatus.PENDING,
    TaskStatus.BLOCKED,
    TaskStatus.CANCELLED
  ]),
  [TaskStatus.SKIPPED]: new Set([]), // Terminal
  [TaskStatus.BLOCKED]: new Set([
    TaskStatus.READY,
    TaskStatus.PENDING,
    TaskStatus.CANCELLED
  ]),
  [TaskStatus.CANCELLED]: new Set([]) // Terminal
};

export class DirectedTaskGraph implements TaskGraph {
  public readonly id: string;
  public readonly goalId: string;
  public readonly nodes: Map<string, TaskGraphNode> = new Map();
  public readonly steps: Map<string, TaskEntity> = new Map();
  public readonly edges: Map<string, string[]> = new Map(); // taskId -> dependencies (upstream)
  public readonly dependentsMap: Map<string, string[]> = new Map(); // taskId -> downstream dependents
  public readonly statuses: Map<string, TaskStatus> = new Map();
  public status: GraphStatus = GraphStatus.DRAFT;
  public metadata: Record<string, unknown> = {};
  public readonly createdAt: number;
  public updatedAt: number;

  constructor(id?: string, goalId?: string) {
    const now = Date.now();
    this.id = id || `graph_${Math.random().toString(36).substring(2, 9)}_${now}`;
    this.goalId = goalId || '';
    this.createdAt = now;
    this.updatedAt = now;
  }

  public addTask(task: TaskEntity, dependencies?: string[]): void {
    if (!task || !task.id) {
      throw new TaskGraphError('Cannot add invalid task or task with empty ID');
    }

    const taskId = task.id;
    if (this.nodes.has(taskId)) {
      throw new TaskGraphError(`Task with ID '${taskId}' already exists in the graph.`);
    }

    // Determine initial dependencies: from explicit parameter, or from PlanStep.dependencies
    let rawDeps: string[] = [];
    if (Array.isArray(dependencies)) {
      rawDeps = dependencies;
    } else if ('dependencies' in task && Array.isArray((task as PlanStep).dependencies)) {
      rawDeps = (task as PlanStep).dependencies;
    }

    // Filter duplicates & self-references
    const uniqueDeps: string[] = [];
    for (const d of rawDeps) {
      if (d === taskId) {
        throw new InvalidTaskGraphError(`Task '${taskId}' cannot depend on itself.`);
      }
      if (!uniqueDeps.includes(d)) {
        uniqueDeps.push(d);
      }
    }

    const now = Date.now();
    const initialStatus = uniqueDeps.length === 0 ? TaskStatus.READY : TaskStatus.PENDING;

    const node: TaskGraphNode = {
      id: taskId,
      task,
      status: initialStatus,
      dependencies: uniqueDeps,
      dependents: [],
      createdAt: now,
      updatedAt: now
    };

    this.nodes.set(taskId, node);
    this.steps.set(taskId, task);
    this.edges.set(taskId, uniqueDeps);
    this.statuses.set(taskId, initialStatus);

    if (!this.dependentsMap.has(taskId)) {
      this.dependentsMap.set(taskId, []);
    }

    // Register reverse edges (dependents)
    for (const depId of uniqueDeps) {
      const depNode = this.nodes.get(depId);
      if (depNode) {
        if (!depNode.dependents.includes(taskId)) {
          depNode.dependents.push(taskId);
        }
      }
      const existingDeps = this.dependentsMap.get(depId) || [];
      if (!existingDeps.includes(taskId)) {
        existingDeps.push(taskId);
        this.dependentsMap.set(depId, existingDeps);
      }
    }

    this.updatedAt = now;
    this.syncGraphStatus();
  }

  public removeTask(taskId: string): boolean {
    if (!this.nodes.has(taskId)) {
      return false;
    }

    const node = this.nodes.get(taskId)!;

    // Remove from upstream dependencies' dependents list
    for (const depId of node.dependencies) {
      const depNode = this.nodes.get(depId);
      if (depNode) {
        depNode.dependents = depNode.dependents.filter(id => id !== taskId);
      }
      const existing = this.dependentsMap.get(depId);
      if (existing) {
        this.dependentsMap.set(depId, existing.filter(id => id !== taskId));
      }
    }

    // Remove from downstream dependents' dependencies list
    for (const dependentId of node.dependents) {
      const depNode = this.nodes.get(dependentId);
      if (depNode) {
        depNode.dependencies = depNode.dependencies.filter(id => id !== taskId);
      }
      const existing = this.edges.get(dependentId);
      if (existing) {
        this.edges.set(dependentId, existing.filter(id => id !== taskId));
      }
    }

    this.nodes.delete(taskId);
    this.steps.delete(taskId);
    this.edges.delete(taskId);
    this.dependentsMap.delete(taskId);
    this.statuses.delete(taskId);

    this.updatedAt = Date.now();
    this.syncGraphStatus();
    return true;
  }

  public addDependency(dependentTaskId: string, dependencyTaskId: string): void {
    if (dependentTaskId === dependencyTaskId) {
      throw new InvalidTaskGraphError(`Task '${dependentTaskId}' cannot depend on itself.`);
    }

    const dependentNode = this.nodes.get(dependentTaskId);
    if (!dependentNode) {
      throw new TaskGraphError(`Dependent task '${dependentTaskId}' does not exist in the graph.`);
    }

    const dependencyNode = this.nodes.get(dependencyTaskId);
    if (!dependencyNode) {
      throw new TaskGraphError(`Dependency target task '${dependencyTaskId}' does not exist in the graph.`);
    }

    if (!dependentNode.dependencies.includes(dependencyTaskId)) {
      dependentNode.dependencies.push(dependencyTaskId);
    }
    if (!dependencyNode.dependents.includes(dependentTaskId)) {
      dependencyNode.dependents.push(dependentTaskId);
    }

    const edgeList = this.edges.get(dependentTaskId) || [];
    if (!edgeList.includes(dependencyTaskId)) {
      edgeList.push(dependencyTaskId);
      this.edges.set(dependentTaskId, edgeList);
    }

    const depList = this.dependentsMap.get(dependencyTaskId) || [];
    if (!depList.includes(dependentTaskId)) {
      depList.push(dependentTaskId);
      this.dependentsMap.set(dependencyTaskId, depList);
    }

    // If new dependency creates a cycle, revert and throw
    if (!this.isAcyclic()) {
      this.removeDependency(dependentTaskId, dependencyTaskId);
      const cycle = findCycle(this.edges, this.nodes.keys());
      throw new InvalidTaskGraphError(`Adding dependency ${dependentTaskId} -> ${dependencyTaskId} creates a circular dependency: ${cycle?.join(' -> ')}`);
    }

    // Recompute dependent status if needed
    if (dependencyNode.status !== TaskStatus.COMPLETED && dependentNode.status === TaskStatus.READY) {
      dependentNode.status = TaskStatus.PENDING;
      this.statuses.set(dependentTaskId, TaskStatus.PENDING);
    }

    this.updatedAt = Date.now();
    this.syncGraphStatus();
  }

  public removeDependency(dependentTaskId: string, dependencyTaskId: string): boolean {
    const dependentNode = this.nodes.get(dependentTaskId);
    const dependencyNode = this.nodes.get(dependencyTaskId);

    if (dependentNode) {
      dependentNode.dependencies = dependentNode.dependencies.filter(id => id !== dependencyTaskId);
    }
    if (dependencyNode) {
      dependencyNode.dependents = dependencyNode.dependents.filter(id => id !== dependentTaskId);
    }

    const edgeList = this.edges.get(dependentTaskId);
    if (edgeList) {
      this.edges.set(dependentTaskId, edgeList.filter(id => id !== dependencyTaskId));
    }

    const depList = this.dependentsMap.get(dependencyTaskId);
    if (depList) {
      this.dependentsMap.set(dependencyTaskId, depList.filter(id => id !== dependentTaskId));
    }

    this.updatedAt = Date.now();
    this.syncGraphStatus();
    return true;
  }

  public setTaskStatus(taskId: string, newStatus: TaskStatus, error?: string): void {
    const node = this.nodes.get(taskId);
    if (!node) {
      throw new TaskGraphError(`Task '${taskId}' not found in TaskGraph.`);
    }

    const currentStatus = node.status;
    if (currentStatus === newStatus) {
      return;
    }

    // Validate transition
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.has(newStatus)) {
      throw new InvalidTaskStatusTransitionError(taskId, currentStatus, newStatus);
    }

    node.status = newStatus;
    node.updatedAt = Date.now();
    if (error) {
      node.error = error;
    }
    this.statuses.set(taskId, newStatus);
    this.updatedAt = Date.now();

    // Cascading side effects
    if (newStatus === TaskStatus.COMPLETED) {
      // Check downstream dependents to see if they can transition from PENDING to READY
      for (const dependentId of node.dependents) {
        const dependentNode = this.nodes.get(dependentId);
        if (dependentNode && dependentNode.status === TaskStatus.PENDING) {
          const allDepsCompleted = dependentNode.dependencies.every(d => {
            const dn = this.nodes.get(d);
            return dn && dn.status === TaskStatus.COMPLETED;
          });
          if (allDepsCompleted) {
            dependentNode.status = TaskStatus.READY;
            dependentNode.updatedAt = Date.now();
            this.statuses.set(dependentId, TaskStatus.READY);
          }
        }
      }
    } else if (
      newStatus === TaskStatus.FAILED ||
      newStatus === TaskStatus.BLOCKED ||
      newStatus === TaskStatus.CANCELLED
    ) {
      // Propagate BLOCKED status to all downstream dependents that are PENDING or READY
      this.cascadeBlock(taskId);
    }

    this.syncGraphStatus();
  }

  private cascadeBlock(failedTaskId: string): void {
    const queue: string[] = [...(this.nodes.get(failedTaskId)?.dependents || [])];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const targetNode = this.nodes.get(currentId);
      if (targetNode) {
        if (targetNode.status === TaskStatus.PENDING || targetNode.status === TaskStatus.READY) {
          targetNode.status = TaskStatus.BLOCKED;
          targetNode.updatedAt = Date.now();
          this.statuses.set(currentId, TaskStatus.BLOCKED);
        }
        for (const nextId of targetNode.dependents) {
          queue.push(nextId);
        }
      }
    }
  }

  private syncGraphStatus(): void {
    if (this.nodes.size === 0) {
      this.status = GraphStatus.DRAFT;
      return;
    }

    const allNodes = Array.from(this.nodes.values());
    const hasFailed = allNodes.some(n => n.status === TaskStatus.FAILED);
    const hasCancelled = allNodes.some(n => n.status === TaskStatus.CANCELLED);
    const allTerminal = allNodes.every(
      n => n.status === TaskStatus.COMPLETED || n.status === TaskStatus.SKIPPED
    );
    const allBlocked = allNodes.every(
      n => n.status === TaskStatus.BLOCKED || n.status === TaskStatus.FAILED
    );
    const hasRunning = allNodes.some(n => n.status === TaskStatus.RUNNING);
    const hasReady = allNodes.some(n => n.status === TaskStatus.READY);

    if (hasFailed) {
      this.status = GraphStatus.FAILED;
    } else if (hasCancelled && !hasRunning && !hasReady) {
      this.status = GraphStatus.CANCELLED;
    } else if (allTerminal) {
      this.status = GraphStatus.COMPLETED;
    } else if (allBlocked) {
      this.status = GraphStatus.BLOCKED;
    } else if (hasRunning || hasReady) {
      this.status = GraphStatus.ACTIVE;
    } else {
      this.status = GraphStatus.READY;
    }
  }

  public getTask(taskId: string): TaskEntity | undefined {
    return this.nodes.get(taskId)?.task;
  }

  public getNode(taskId: string): TaskGraphNode | undefined {
    return this.nodes.get(taskId);
  }

  public getTaskStatus(taskId: string): TaskStatus | undefined {
    return this.statuses.get(taskId);
  }

  public getDependencies(taskId: string): string[] {
    return [...(this.edges.get(taskId) || [])];
  }

  public getDependents(taskId: string): string[] {
    return [...(this.dependentsMap.get(taskId) || [])];
  }

  public getUpstreamDependencies(taskId: string): string[] {
    return this.getDependencies(taskId);
  }

  public getDownstreamDependents(taskId: string): string[] {
    return this.getDependents(taskId);
  }

  public getExecutableSteps(completedStepIds: Set<string>): TaskEntity[] {
    const executable: TaskEntity[] = [];
    for (const [id, node] of this.nodes.entries()) {
      if (completedStepIds.has(id)) {
        continue;
      }
      const deps = node.dependencies;
      const allDepsMet = deps.every(dep => completedStepIds.has(dep));
      if (allDepsMet) {
        executable.push(node.task);
      }
    }
    return executable;
  }

  public getParallelFrontier(): TaskEntity[] {
    const frontier: TaskEntity[] = [];
    for (const node of this.nodes.values()) {
      if (node.status === TaskStatus.READY) {
        frontier.push(node.task);
      } else if (node.status === TaskStatus.PENDING) {
        const allDepsCompleted = node.dependencies.every(depId => {
          const depNode = this.nodes.get(depId);
          return depNode && depNode.status === TaskStatus.COMPLETED;
        });
        if (allDepsCompleted) {
          frontier.push(node.task);
        }
      }
    }
    return frontier;
  }

  public getReadyTasks(): TaskEntity[] {
    return this.getParallelFrontier();
  }

  public getTopologicalOrder(): string[] {
    return computeTopologicalOrder(this.nodes.keys(), this.edges, this.dependentsMap);
  }

  public isAcyclic(): boolean {
    const cycle = findCycle(this.edges, this.nodes.keys());
    return cycle === null;
  }

  public clone(): DirectedTaskGraph {
    const cloned = new DirectedTaskGraph(this.id, this.goalId);
    cloned.status = this.status;
    cloned.metadata = JSON.parse(JSON.stringify(this.metadata));
    cloned.updatedAt = this.updatedAt;

    for (const node of this.nodes.values()) {
      const clonedNode: TaskGraphNode = {
        id: node.id,
        task: JSON.parse(JSON.stringify(node.task)),
        status: node.status,
        dependencies: [...node.dependencies],
        dependents: [...node.dependents],
        error: node.error,
        metadata: node.metadata ? JSON.parse(JSON.stringify(node.metadata)) : undefined,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt
      };
      cloned.nodes.set(node.id, clonedNode);
      cloned.steps.set(node.id, clonedNode.task);
      cloned.edges.set(node.id, [...node.dependencies]);
      cloned.dependentsMap.set(node.id, [...node.dependents]);
      cloned.statuses.set(node.id, node.status);
    }

    return cloned;
  }

  public toJSON(): TaskGraphJSON {
    const nodesObj: TaskGraphJSON['nodes'] = {};
    for (const [id, node] of this.nodes.entries()) {
      nodesObj[id] = {
        id: node.id,
        task: JSON.parse(JSON.stringify(node.task)),
        status: node.status,
        dependencies: [...node.dependencies],
        dependents: [...node.dependents],
        error: node.error,
        metadata: node.metadata ? JSON.parse(JSON.stringify(node.metadata)) : undefined,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt
      };
    }

    return {
      id: this.id,
      goalId: this.goalId,
      nodes: nodesObj,
      status: this.status,
      metadata: JSON.parse(JSON.stringify(this.metadata)),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  public static fromJSON(json: TaskGraphJSON): DirectedTaskGraph {
    if (!json || typeof json !== 'object') {
      throw new InvalidTaskGraphError('Invalid TaskGraph JSON');
    }

    const graph = new DirectedTaskGraph(json.id, json.goalId);
    graph.status = json.status || GraphStatus.DRAFT;
    graph.metadata = json.metadata || {};
    graph.updatedAt = json.updatedAt || Date.now();

    if (json.nodes && typeof json.nodes === 'object') {
      for (const [id, rawNode] of Object.entries(json.nodes)) {
        const node: TaskGraphNode = {
          id: rawNode.id,
          task: rawNode.task as any,
          status: rawNode.status,
          dependencies: Array.isArray(rawNode.dependencies) ? [...rawNode.dependencies] : [],
          dependents: Array.isArray(rawNode.dependents) ? [...rawNode.dependents] : [],
          error: rawNode.error,
          metadata: rawNode.metadata,
          createdAt: rawNode.createdAt || Date.now(),
          updatedAt: rawNode.updatedAt || Date.now()
        };

        graph.nodes.set(id, node);
        graph.steps.set(id, node.task);
        graph.edges.set(id, node.dependencies);
        graph.dependentsMap.set(id, node.dependents);
        graph.statuses.set(id, node.status);
      }
    }

    validateTaskGraph(graph);
    return graph;
  }
}
