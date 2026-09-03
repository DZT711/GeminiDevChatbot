import { TaskSpecification } from '../decomposition/DecompositionTypes.js';
import { PlanStep } from './PlanStep.js';

export enum TaskStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED'
}

export enum GraphStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED'
}

export type TaskEntity = TaskSpecification | PlanStep;

export interface TaskGraphNode {
  id: string;
  task: TaskEntity;
  status: TaskStatus;
  dependencies: string[]; // Upstream task IDs that this task depends on (must complete first)
  dependents: string[];   // Downstream task IDs that depend on this task
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface TaskGraphJSON {
  id: string;
  goalId: string;
  nodes: Record<string, {
    id: string;
    task: Record<string, unknown>;
    status: TaskStatus;
    dependencies: string[];
    dependents: string[];
    error?: string;
    metadata?: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
  }>;
  status: GraphStatus;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface TaskGraph {
  readonly id: string;
  readonly goalId: string;
  readonly nodes: Map<string, TaskGraphNode>;
  readonly steps: Map<string, TaskEntity>;
  readonly edges: Map<string, string[]>; // taskId -> dependencies (upstream)
  readonly statuses: Map<string, TaskStatus>;
  status: GraphStatus;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;

  addTask(task: TaskEntity, dependencies?: string[]): void;
  removeTask(taskId: string): boolean;
  addDependency(dependentTaskId: string, dependencyTaskId: string): void;
  removeDependency(dependentTaskId: string, dependencyTaskId: string): boolean;
  setTaskStatus(taskId: string, status: TaskStatus, error?: string): void;

  getTask(taskId: string): TaskEntity | undefined;
  getNode(taskId: string): TaskGraphNode | undefined;
  getTaskStatus(taskId: string): TaskStatus | undefined;
  getDependencies(taskId: string): string[];
  getDependents(taskId: string): string[];
  getUpstreamDependencies(taskId: string): string[];
  getDownstreamDependents(taskId: string): string[];

  getExecutableSteps(completedStepIds: Set<string>): TaskEntity[];
  getParallelFrontier(): TaskEntity[];
  getReadyTasks(): TaskEntity[];
  getTopologicalOrder(): string[];
  isAcyclic(): boolean;

  clone(): TaskGraph;
  toJSON(): TaskGraphJSON;
}
