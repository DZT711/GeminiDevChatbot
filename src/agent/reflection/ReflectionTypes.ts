import { ExecutionResult } from '../runtime/ExecutionResult';
import { PromptContext } from '../context/ContextTypes';
import { ToolResult } from '../tools/ToolResult';

export enum ReflectionCategory {
  EXECUTION_SUCCESS = 'EXECUTION_SUCCESS',
  TOOL_QUALITY = 'TOOL_QUALITY',
  CONTEXT_QUALITY = 'CONTEXT_QUALITY',
  PROMPT_QUALITY = 'PROMPT_QUALITY',
  ERROR_HANDLING = 'ERROR_HANDLING',
  GENERAL = 'GENERAL'
}

export interface ReflectionScore {
  score: number; // 0 to 100
  confidence: number; // 0.0 to 1.0
}

export interface ReflectionSuggestion {
  category: ReflectionCategory | string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
}

export interface ReflectionSummary {
  overallScore: number;
  success: boolean;
  failureReason?: string;
  detectedMistakes: string[];
  potentialImprovements: string[];
}

export interface ReflectionRecord {
  id: string;
  timestamp: number;
  executionId: string;
  summary: ReflectionSummary;
  scores: Record<string, ReflectionScore>;
  suggestions: ReflectionSuggestion[];
  metadata?: Record<string, unknown>;
}

export interface ReflectionRequest {
  executionId: string;
  result: ExecutionResult;
  context?: PromptContext;
  toolResults?: ToolResult[];
  errors?: Error[];
  metadata?: Record<string, unknown>;
}
