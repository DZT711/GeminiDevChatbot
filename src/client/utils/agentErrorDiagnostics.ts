/**
 * Client-side Agent & LLM Error Diagnostic Engine
 * Analyzes execution errors, HTTP responses, and raw LLM error strings to produce
 * situation-specific user notifications with actionable guidance.
 */

export type AgentErrorCategory =
  | 'MODEL_HIGH_DEMAND_503'
  | 'QUOTA_EXCEEDED_429'
  | 'RATE_LIMIT_429'
  | 'INVALID_API_KEY_400'
  | 'PERMISSION_DENIED_403'
  | 'NETWORK_TIMEOUT'
  | 'WORKSPACE_TOOL_ERROR'
  | 'CODE_SYNTAX_PARSE'
  | 'ABORTED_BY_USER'
  | 'GENERAL_AGENT_ERROR';

export interface AgentErrorDiagnosis {
  category: AgentErrorCategory;
  statusCode?: number;
  badge: string;
  title: string;
  description: string;
  suggestion: string;
  isRetryable: boolean;
  rawMessage: string;
}

/**
 * Parses and categorizes any agent error into a structured diagnosis for user notification.
 */
export function diagnoseAgentError(err: unknown): AgentErrorDiagnosis {
  let rawStr = '';

  if (typeof err === 'string') {
    rawStr = err;
  } else if (err && typeof err === 'object') {
    const errObj = err as Record<string, unknown>;
    // Check if a diagnosis object was already attached by server
    if (errObj.diagnosis && typeof errObj.diagnosis === 'object') {
      const d = errObj.diagnosis as Record<string, unknown>;
      return {
        category: (d.code as AgentErrorCategory) || 'GENERAL_AGENT_ERROR',
        statusCode: typeof d.statusCode === 'number' ? d.statusCode : undefined,
        badge: d.code === 'MODEL_HIGH_DEMAND_503' ? '503 HIGH DEMAND' :
               d.code === 'QUOTA_EXCEEDED_429' ? 'QUOTA EXCEEDED' :
               d.code === 'RATE_LIMIT_EXCEEDED_429' ? 'RATE LIMITED' :
               d.code === 'INVALID_API_KEY_400' ? 'API KEY INVALID' :
               d.code === 'PERMISSION_DENIED_403' ? '403 FORBIDDEN' : 'DEFECT',
        title: (d.title as string) || 'Execution Error',
        description: (d.message as string) || 'Agent execution encountered an issue.',
        suggestion: (d.suggestion as string) || 'Please try again or inspect error logs.',
        isRetryable: d.isRetryable !== false,
        rawMessage: (d.raw as string) || String(errObj.error || errObj.message || '')
      };
    }
    rawStr = (errObj.error as string) || (errObj.message as string) || JSON.stringify(err);
  } else {
    rawStr = String(err || 'Unknown execution error');
  }

  // Check if string contains embedded JSON (e.g. from Google GenAI SDK)
  if (rawStr.includes('{') && rawStr.includes('}')) {
    try {
      const start = rawStr.indexOf('{');
      const end = rawStr.lastIndexOf('}');
      if (start !== -1 && end > start) {
        const parsed = JSON.parse(rawStr.substring(start, end + 1));
        const inner = parsed.error || parsed;
        if (inner && inner.message) {
          rawStr = `[${inner.code || 500} ${inner.status || 'ERROR'}] ${inner.message}`;
        }
      }
    } catch {
      // keep rawStr as is
    }
  }

  const lower = rawStr.toLowerCase();

  // 1. Situation: 503 Service Unavailable / High Demand
  if (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('spikes in demand') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('overloaded')
  ) {
    return {
      category: 'MODEL_HIGH_DEMAND_503',
      statusCode: 503,
      badge: '503 HIGH DEMAND',
      title: 'AI Model High Demand',
      description: 'The Google AI model cluster is currently experiencing high demand spikes. The system attempted automatic retries and fallback models, but the cluster is temporarily congested.',
      suggestion: 'Spikes in demand are temporary. Please click "Retry Execution" in a moment, or switch to Flash in Settings.',
      isRetryable: true,
      rawMessage: rawStr
    };
  }

  // 2. Situation: Quota Exceeded
  if (
    lower.includes('quota exceeded') ||
    lower.includes('quota') ||
    lower.includes('insufficient_quota') ||
    lower.includes('billing')
  ) {
    return {
      category: 'QUOTA_EXCEEDED_429',
      statusCode: 429,
      badge: 'QUOTA EXCEEDED',
      title: 'Quota Exceeded',
      description: 'The API quota limit for this project or key has been exhausted.',
      suggestion: 'Check your Google AI Studio billing and quota details, or configure a new API key in Key Settings.',
      isRetryable: false,
      rawMessage: rawStr
    };
  }

  // 3. Situation: 429 Rate Limit Exceeded
  if (
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('rate-limit') ||
    lower.includes('too many requests') ||
    lower.includes('resource_exhausted') ||
    lower.includes('429')
  ) {
    return {
      category: 'RATE_LIMIT_429',
      statusCode: 429,
      badge: 'RATE LIMITED',
      title: 'Rate Limited',
      description: 'The request frequency or token rate limit for this model has been reached.',
      suggestion: 'Wait 60 seconds before retrying, or switch to a higher throughput model.',
      isRetryable: true,
      rawMessage: rawStr
    };
  }

  // 4. Situation: 400 / 401 / Invalid API Key
  if (
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('api key invalid') ||
    lower.includes('api key is not valid') ||
    lower.includes('key not valid') ||
    lower.includes('gemini_api_key is not configured') ||
    lower.includes('missing authentication') ||
    lower.includes('unauthenticated') ||
    lower.includes('user not found') ||
    (lower.includes('400') && (lower.includes('key') || lower.includes('auth'))) ||
    (lower.includes('401') && (lower.includes('key') || lower.includes('auth')))
  ) {
    return {
      category: 'INVALID_API_KEY_400',
      statusCode: 400,
      badge: 'API KEY INVALID',
      title: 'API Key Invalid',
      description: 'Google AI rejected the request due to an invalid or unconfigured API key.',
      suggestion: 'Open Key Settings from the sidebar, verify your Gemini API key, and test connectivity.',
      isRetryable: false,
      rawMessage: rawStr
    };
  }

  // 4. Situation: 403 Forbidden / Location or Permissions
  if (
    lower.includes('403') ||
    lower.includes('permission_denied') ||
    lower.includes('permission denied') ||
    lower.includes('location not supported')
  ) {
    return {
      category: 'PERMISSION_DENIED_403',
      statusCode: 403,
      badge: '403 FORBIDDEN',
      title: 'Permission Denied',
      description: 'Access to this model or service region is restricted for your current project credentials.',
      suggestion: 'Verify your Google Cloud project permissions or API access controls.',
      isRetryable: false,
      rawMessage: rawStr
    };
  }

  // 5. Situation: Network Timeout
  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed') ||
    lower.includes('failed to fetch')
  ) {
    return {
      category: 'NETWORK_TIMEOUT',
      badge: 'NETWORK TIMEOUT',
      title: 'Connection Timed Out',
      description: 'The connection between the client and AI execution server was interrupted.',
      suggestion: 'Check your network connection and click Retry to resume execution.',
      isRetryable: true,
      rawMessage: rawStr
    };
  }

  // 6. Situation: User Aborted
  if (
    lower.includes('aborted by user') ||
    lower.includes('stopped by user') ||
    lower.includes('cancelled by')
  ) {
    return {
      category: 'ABORTED_BY_USER',
      badge: 'ABORTED',
      title: 'Execution Aborted',
      description: 'Plan execution was manually halted by the user.',
      suggestion: 'You can re-run the plan or select a specific step from the timeline.',
      isRetryable: true,
      rawMessage: rawStr
    };
  }

  // 7. Situation: Workspace Tool Failure
  if (
    lower.includes('enoent') ||
    lower.includes('eacces') ||
    lower.includes('tool execution') ||
    lower.includes('no such file') ||
    lower.includes('cannot find file')
  ) {
    return {
      category: 'WORKSPACE_TOOL_ERROR',
      badge: 'TOOL DEFECT',
      title: 'Workspace Tool Error',
      description: rawStr || 'A file modification or system command failed during execution.',
      suggestion: 'Check file tree permissions or verify that required paths exist in the workspace.',
      isRetryable: true,
      rawMessage: rawStr
    };
  }

  // 8. Situation: Syntax / Code Generation Parse
  if (
    lower.includes('syntax') ||
    lower.includes('parse error') ||
    lower.includes('valid tool calls')
  ) {
    return {
      category: 'CODE_SYNTAX_PARSE',
      badge: 'SYNTAX ISSUE',
      title: 'Code Generation Syntax Issue',
      description: 'The agent generated an invalid code payload or tool call syntax.',
      suggestion: 'Consider refining the task goal with more explicit instructions or smaller steps.',
      isRetryable: true,
      rawMessage: rawStr
    };
  }

  // 9. Generic Fallback
  return {
    category: 'GENERAL_AGENT_ERROR',
    badge: 'EXECUTION FAILED',
    title: 'Agent Execution Failed',
    description: rawStr || 'An unexpected defect halted execution.',
    suggestion: 'Review the execution logs for details or retry the plan execution.',
    isRetryable: true,
    rawMessage: rawStr
  };
}
