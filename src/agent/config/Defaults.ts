/**
 * Purpose: Default configuration values.
 */
import { AgentConfig } from './AgentConfig';
import { FeatureFlags } from './FeatureFlags';

export const DefaultAgentConfig: AgentConfig = {
  maxExecutionTimeMs: 60000,
  maxRetryCount: 3,
  verboseLogging: false
};

export const DefaultFeatureFlags: FeatureFlags = {
  enableAgentRuntime: false,
  enableDestructiveTools: false
};
