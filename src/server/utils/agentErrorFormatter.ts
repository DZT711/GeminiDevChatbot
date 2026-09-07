/**
 * Shared server-side utility to normalize, parse, and format errors
 * from Gemini / LLM calls, tools, and execution strategies.
 */

export interface FormattedAgentError {
  code: string;
  statusCode?: number;
  title: string;
  message: string;
  suggestion: string;
  isRetryable: boolean;
  raw?: string;
}

/**
 * Extracts clean error details from raw Gemini SDK exceptions, JSON strings, or Error objects.
 */
export function formatAgentError(err: unknown): FormattedAgentError {
  const rawStr = err instanceof Error ? err.message : String(err || '');
  let parsedObj: Record<string, unknown> | null = null;

  // Attempt to parse JSON error strings often returned by @google/genai SDK
  // e.g. {"error":{"code":503,"message":"This model is currently experiencing high demand...","status":"UNAVAILABLE"}}
  if (rawStr.includes('{') && rawStr.includes('}')) {
    try {
      const jsonStart = rawStr.indexOf('{');
      const jsonEnd = rawStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const potentialJson = rawStr.substring(jsonStart, jsonEnd + 1);
        parsedObj = JSON.parse(potentialJson) as Record<string, unknown>;
      }
    } catch {
      parsedObj = null;
    }
  }

  const innerError = (parsedObj?.error as Record<string, unknown>) || parsedObj;
  const rawCode = innerError?.code || (err as { status?: number })?.status;
  const rawStatus = innerError?.status as string | undefined;
  const rawMessage = (innerError?.message as string | undefined) || rawStr;

  const lowerMsg = (rawMessage || '').toLowerCase();
  const lowerStr = rawStr.toLowerCase();

  // 1. Situation: 503 / High Demand / Service Unavailable
  if (
    rawCode === 503 ||
    rawStatus === 'UNAVAILABLE' ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('spikes in demand') ||
    lowerMsg.includes('unavailable') ||
    lowerStr.includes('503') ||
    lowerStr.includes('temporarily unavailable')
  ) {
    return {
      code: 'MODEL_HIGH_DEMAND_503',
      statusCode: 503,
      title: 'AI Model High Demand (503)',
      message: 'The AI model cluster is currently experiencing temporary high demand spikes. devgenie retried with fallback options, but services remain congested.',
      suggestion: 'Please wait a moment and click Retry, or select a lighter model like Flash in Settings.',
      isRetryable: true,
      raw: rawStr
    };
  }

  // 2. Situation: Quota Exceeded (specifically quota exhaustion)
  if (
    lowerMsg.includes('quota') ||
    lowerStr.includes('quota') ||
    lowerMsg.includes('insufficient_quota') ||
    lowerMsg.includes('billing')
  ) {
    return {
      code: 'QUOTA_EXCEEDED_429',
      statusCode: 429,
      title: 'Quota Exceeded',
      message: (rawMessage && rawMessage.length < 200 && !rawMessage.includes('{'))
        ? rawMessage
        : 'The API request quota for this project or key has been exceeded.',
      suggestion: 'Check your Google AI Studio quota and billing details, or configure a new API key in Key Settings.',
      isRetryable: false,
      raw: rawStr
    };
  }

  // 3. Situation: 429 Rate Limit Exceeded
  if (
    rawCode === 429 ||
    rawStatus === 'RESOURCE_EXHAUSTED' ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('rate_limit') ||
    lowerMsg.includes('too many requests') ||
    lowerStr.includes('429')
  ) {
    return {
      code: 'RATE_LIMIT_EXCEEDED_429',
      statusCode: 429,
      title: 'Rate Limited',
      message: (rawMessage && rawMessage.length < 200 && !rawMessage.includes('{'))
        ? rawMessage
        : 'Too many requests were sent in a short timeframe. Rate limit ceiling reached.',
      suggestion: 'Please wait 60 seconds before retrying, or configure a custom API key in Key Settings.',
      isRetryable: true,
      raw: rawStr
    };
  }

  // 4. Situation: 400 / 401 / Invalid API Key
  if (
    rawCode === 400 ||
    rawCode === 401 ||
    rawStatus === 'INVALID_ARGUMENT' ||
    lowerMsg.includes('api key not valid') ||
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('invalid api key') ||
    lowerMsg.includes('api key invalid') ||
    lowerMsg.includes('api key is not valid') ||
    lowerMsg.includes('key not valid') ||
    lowerMsg.includes('gemini_api_key is not configured') ||
    lowerMsg.includes('missing authentication') ||
    lowerMsg.includes('unauthenticated') ||
    lowerStr.includes('api_key_invalid') ||
    lowerStr.includes('invalid api key') ||
    lowerStr.includes('api key invalid') ||
    ((lowerStr.includes('400') || lowerStr.includes('401')) && (lowerStr.includes('key') || lowerStr.includes('auth')))
  ) {
    return {
      code: 'INVALID_API_KEY_400',
      statusCode: typeof rawCode === 'number' ? rawCode : 400,
      title: 'API Key Invalid',
      message: (rawMessage && rawMessage.length < 200 && !rawMessage.includes('{'))
        ? rawMessage
        : 'The AI service rejected the request due to an invalid or missing API key configuration.',
      suggestion: 'Please inspect and update your Gemini API key in Key Settings.',
      isRetryable: false,
      raw: rawStr
    };
  }

  // 4. Situation: 403 / Permission Denied / Geo Restrictions
  if (
    rawCode === 403 ||
    rawStatus === 'PERMISSION_DENIED' ||
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('location not supported') ||
    lowerStr.includes('403')
  ) {
    return {
      code: 'PERMISSION_DENIED_403',
      statusCode: 403,
      title: 'Permission Denied (403)',
      message: 'Access to the requested model or feature is restricted for this credential or region.',
      suggestion: 'Check your Google Cloud project permissions or API restrictions.',
      isRetryable: false,
      raw: rawStr
    };
  }

  // 5. Situation: Connection Timeout / Network Interruption
  if (
    lowerStr.includes('timeout') ||
    lowerStr.includes('etimedout') ||
    lowerStr.includes('econnreset') ||
    lowerStr.includes('fetch failed') ||
    lowerStr.includes('network')
  ) {
    return {
      code: 'NETWORK_TIMEOUT',
      title: 'Connection Timeout',
      message: 'Network connection to the AI reasoning engine timed out or was interrupted.',
      suggestion: 'Check your internet connection and retry the agent execution.',
      isRetryable: true,
      raw: rawStr
    };
  }

  // 6. Situation: Tool or Workspace Defect
  if (
    lowerStr.includes('tool execution') ||
    lowerStr.includes('enoent') ||
    lowerStr.includes('eacces') ||
    lowerStr.includes('no such file')
  ) {
    return {
      code: 'WORKSPACE_TOOL_ERROR',
      title: 'Workspace Tool Defect',
      message: rawMessage || 'A workspace file operation or command failed during execution.',
      suggestion: 'Check file paths or permissions in the workspace directory.',
      isRetryable: true,
      raw: rawStr
    };
  }

  // 7. Generic Fallback
  return {
    code: 'AGENT_EXECUTION_FAILURE',
    title: 'Agent Reasoning Defect',
    message: rawMessage || 'An unexpected defect occurred during agent reasoning execution.',
    suggestion: 'Review step details in the execution log or try simplifying the plan step.',
    isRetryable: true,
    raw: rawStr
  };
}
