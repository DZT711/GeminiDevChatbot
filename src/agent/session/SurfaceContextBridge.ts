/**
 * SurfaceContextBridge (M06-07)
 * Implements deterministic context selection between Normal Chat and Workspace Agent surfaces.
 * 
 * Rules:
 * 1. "One Agent Session, multiple UI representations" — always preserves sessionId.
 * 2. Never dumps raw workspace state, entire terminal history, or internal tool dumps.
 * 3. Applies bounded recent conversation selection (default 5 recent turns).
 * 4. Stale plan prevention: Does not attach plan context unless explicitly relevant.
 * 5. Provider-agnostic: No third-party LLM SDK imports.
 */

import {
  SurfaceContextRequest,
  AgentContextHandoff,
  SurfaceContextMessage,
  SurfacePlanContext
} from './SurfaceContextTypes.js';

export class SurfaceContextBridge {
  private static readonly DEFAULT_MAX_RECENT_MESSAGES = 5;

  /**
   * Builds a clean, bounded AgentContextHandoff from a SurfaceContextRequest.
   */
  public static createHandoff(request: SurfaceContextRequest): AgentContextHandoff {
    if (!request.sessionId || typeof request.sessionId !== 'string') {
      throw new Error('sessionId is required for surface context handoff');
    }

    const {
      sessionId,
      sourceSurface,
      targetSurface,
      includeConversation = true,
      includeWorkspace = true,
      includeCurrentFile = true,
      includeSelection = true,
      includePlan = false,
      includeExecution = true,
      messages = [],
      workspaceId,
      currentFile,
      selection,
      planContext,
      executionId,
      maxRecentMessages = SurfaceContextBridge.DEFAULT_MAX_RECENT_MESSAGES
    } = request;

    // 1. Select bounded recent conversation without tool/terminal dumps
    let selectedMessages: SurfaceContextMessage[] = [];
    let messageIds: string[] = [];

    if (includeConversation && messages.length > 0) {
      // Filter out internal telemetry/tool outputs and keep only user / assistant / model / system
      const validConversation = messages.filter((m) => {
        if (!m || !m.content) return false;
        // Exclude internal tool execution traces and raw terminal outputs
        if (m.content.startsWith('[TOOL_TRACE]') || m.content.startsWith('[TERMINAL_OUTPUT]')) {
          return false;
        }
        return true;
      });

      // Bounded recent history
      const bounded = validConversation.slice(-Math.max(1, maxRecentMessages));
      selectedMessages = bounded.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content.length > 1500 ? `${m.content.substring(0, 1500)}... [truncated]` : m.content,
        timestamp: m.timestamp
      }));
      messageIds = bounded.map((m) => m.id);
    }

    // 2. Plan context selection with stale plan avoidance
    let resolvedGoalId: string | undefined;
    let resolvedPlanId: string | undefined;
    let resolvedTaskId: string | undefined;
    let resolvedPlanSummary: string | undefined;

    if (includePlan && planContext && !planContext.isCompleted) {
      resolvedGoalId = planContext.goalId;
      resolvedPlanId = planContext.planId;
      resolvedTaskId = planContext.taskId;
      resolvedPlanSummary = planContext.taskSummary || planContext.goalSummary;
    }

    // 3. Compact handoff summary for human or LLM awareness
    const summary = SurfaceContextBridge.generateSummary({
      sourceSurface,
      targetSurface,
      messageCount: selectedMessages.length,
      workspaceId: includeWorkspace ? workspaceId : undefined,
      currentFile: includeCurrentFile ? currentFile : undefined,
      planId: resolvedPlanId,
      taskId: resolvedTaskId,
      executionId: includeExecution ? executionId : undefined
    });

    return {
      sessionId,
      sourceSurface,
      targetSurface,
      conversationMessageIds: messageIds.length > 0 ? messageIds : undefined,
      recentMessages: selectedMessages.length > 0 ? selectedMessages : undefined,
      workspaceId: includeWorkspace ? workspaceId : undefined,
      currentFile: includeCurrentFile ? currentFile : undefined,
      selection: includeSelection ? selection : undefined,
      goalId: resolvedGoalId,
      planId: resolvedPlanId,
      taskId: resolvedTaskId,
      planSummary: resolvedPlanSummary,
      executionId: includeExecution ? executionId : undefined,
      summary,
      timestamp: Date.now()
    };
  }

  /**
   * Generates a compact readable summary of the handoff transition.
   */
  private static generateSummary(params: {
    sourceSurface: string;
    targetSurface: string;
    messageCount: number;
    workspaceId?: string;
    currentFile?: string;
    planId?: string;
    taskId?: string;
    executionId?: string;
  }): string {
    const parts: string[] = [
      `Transition: ${params.sourceSurface} -> ${params.targetSurface}`,
      `Selected turns: ${params.messageCount}`
    ];

    if (params.workspaceId) {
      parts.push(`Workspace: ${params.workspaceId}`);
    }
    if (params.currentFile) {
      parts.push(`File: ${params.currentFile}`);
    }
    if (params.planId) {
      parts.push(`Plan: ${params.planId}${params.taskId ? ` (Task: ${params.taskId})` : ''}`);
    }
    if (params.executionId) {
      parts.push(`Active Execution: ${params.executionId}`);
    }

    return parts.join(' | ');
  }
}
