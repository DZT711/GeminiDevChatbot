import type { Goal, GoalConstraints } from '../goal/GoalTypes.js';
import type { TaskSpecification } from '../decomposition/DecompositionTypes.js';
import type { PlanStep } from '../planner/PlanStep.js';
import type { WorkspaceRef } from '../workspace/WorkspaceTypes.js';
import type { ToolDescriptor } from '../tools/ToolDescriptor.js';
import type { ExecutionPipeline } from '../tools/ExecutionPipeline.js';
import type { ExecutionContext } from '../runtime/ExecutionContext.js';
import type { ToolResult } from '../tools/ToolResult.js';

export interface ToolExecutionRecord {
  toolName: string;
  input: unknown;
  output: unknown;
  success: boolean;
  timestamp: number;
  durationMs?: number;
  error?: string;
}

export interface ImplementationError {
  code: string;
  message: string;
  path?: string;
  toolName?: string;
  recoverable: boolean;
  details?: unknown;
}

export interface ImplementationContext {
  goal: Goal;
  task?: TaskSpecification;
  planStep: PlanStep;
  workspaceRef: WorkspaceRef;
  relevantTaskResults?: Record<string, ToolResult> | unknown[];
  constraints: GoalConstraints;
  availableTools: ToolDescriptor[];
  previousExecutionResults?: unknown[];
  pipeline: ExecutionPipeline;
  executionContext: ExecutionContext;
  maxIterations?: number;
  onProgress?: (event: {
    type: string;
    toolName?: string;
    description?: string;
    result?: unknown;
    error?: string;
  }) => void;
  onFileChanged?: (fileChange: {
    path: string;
    action: 'create' | 'edit' | 'delete';
    actor: 'AGENT';
    taskId?: string;
    executionId?: string;
    timestamp: number;
  }) => void;
}

export interface ImplementationResult {
  success: boolean;
  modifiedFiles: string[];
  createdFiles: string[];
  deletedFiles: string[];
  toolCalls: ToolExecutionRecord[];
  verificationRequested: boolean;
  summary: string;
  errors?: ImplementationError[];
}

export interface ImplementationStrategy {
  name: string;
  version: string;
  implement(context: ImplementationContext): Promise<ImplementationResult>;
}
