export interface ExecutionPolicy {
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  maxRetries?: number;
}
