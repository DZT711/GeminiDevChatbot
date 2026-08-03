/**
 * Purpose: Global configuration for the Agent Runtime.
 */
export interface AgentConfig {
  maxExecutionTimeMs: number;
  maxRetryCount: number;
  verboseLogging: boolean;
}
