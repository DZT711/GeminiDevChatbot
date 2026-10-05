/**
 * Provider-agnostic domain model for Interactive Plan Context (M06-06).
 * Strictly isolated: no React, Express, database, or provider SDK imports.
 */

export interface InteractivePlanContext {
  goalId: string;
  planId: string;
  taskId?: string;
  goalSummary?: string;
  taskSummary?: string;
  dependencies?: string[];
  completedTasks?: string[];
  relevantTaskOutputs?: unknown[];
  workspaceId?: string;
  sessionId: string;
  executionId?: string;
}

export function formatInteractivePlanContextPrompt(ctx: InteractivePlanContext): string {
  const lines: string[] = [
    '### Active Plan & Task Context',
    `- Goal ID: ${ctx.goalId}`,
    `- Plan ID: ${ctx.planId}`
  ];
  if (ctx.taskId) {
    lines.push(`- Current Task ID: ${ctx.taskId}`);
  }
  if (ctx.goalSummary) {
    lines.push(`- Goal: ${ctx.goalSummary}`);
  }
  if (ctx.taskSummary) {
    lines.push(`- Task Objective: ${ctx.taskSummary}`);
  }
  if (ctx.dependencies && ctx.dependencies.length > 0) {
    lines.push(`- Task Dependencies: ${ctx.dependencies.join(', ')}`);
  }
  if (ctx.completedTasks && ctx.completedTasks.length > 0) {
    lines.push(`- Completed Tasks: ${ctx.completedTasks.join(', ')}`);
  }
  if (ctx.relevantTaskOutputs && ctx.relevantTaskOutputs.length > 0) {
    lines.push(`- Prior Outputs:\n\`\`\`json\n${JSON.stringify(ctx.relevantTaskOutputs, null, 2)}\n\`\`\``);
  }
  lines.push('Keep your actions aligned with this active plan and focused on advancing the current task objective.');
  return lines.join('\n');
}
