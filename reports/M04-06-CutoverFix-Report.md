# M04-06 Cutover Fix Report

## Root Cause
The infinite loading state was caused by `USE_AGENT_RUNTIME=true` routing requests to the `AgentIntegrationService` skeleton, which did not call `res.end()` to terminate the HTTP stream. Additionally, it emitted `type: 'chunk'` instead of `type: 'text'`, which the frontend ignored.

## Architecture Before Fix
- The completed components (Retriever, ContextBuilder, ExecutionPipeline) were tightly coupled to the legacy controller (`ChatController.ts`).
- `AgentIntegrationService` only contained an empty skeleton implementation that didn't invoke any LLM or Agent subsystems.
- `AgentFeatureFlags.USE_AGENT_RUNTIME` routed to the skeleton.

## Architecture After Fix
- `AgentIntegrationService` is now the master orchestration boundary for the M04 architecture.
- It properly orchestrates:
  1. `RetrieverAdapter` (if `USE_RAG`)
  2. `ContextBuilderAdapter` & `ContextIntegrationService`
  3. `ExecutionIntegrationService` (handles Tools, Reflection, and Learning natively)
  4. The LLM generation loop (handles streaming, function calls, and fallback logic cleanly)
- The legacy pipeline remains intact in `ChatController.ts` for rollback purposes.
- Subsystem flags (`USE_AGENT_RETRIEVER`, `USE_AGENT_CONTEXT_BUILDER`, `USE_EXECUTION_PIPELINE`) continue to work.

## Files Changed
- `src/server/services/agentIntegration/AgentIntegrationService.ts`: Replaced skeleton with full orchestration loop.
- `src/server/services/agentIntegration/types.ts`: Added missing SSE event types (`text`, `metadata`, `thinking`, etc.) to `AgentResponse`.
- `src/server/services/agentIntegration/AgentFeatureFlags.ts`: Set `USE_AGENT_RUNTIME` to `true`.

## AgentIntegrationService Responsibility
It intercepts the raw `AgentRequest` from the frontend, queries subsystems to prepare execution context (knowledge and rules), invokes the LLM using a loop for tool resolution, delegates tool execution to the `ExecutionPipeline`, and formats outputs to match the frontend SSE contract.

## SSE Contract & Error Termination
The `AgentAdapter.handleAgentResponse` ensures correct event formatting. On stream completion (or when an error is caught), the backend emits `type: 'end'` and calls `res.end()`. All errors are surfaced as terminal `error` events.

## End-to-End Validation
- **Simple Greeting**: Fast completion, zero tool execution, stream gracefully terminates.
- **RAG Query**: `RetrieverAdapter` successfully attaches repository context blocks.
- **Tool Execution/Failure**: The loop triggers `ExecutionIntegrationService`, which captures output or errors without hanging the pipeline.
- **Reflection & Learning**: Triggers only when a tool is called, avoiding unneeded LLM queries.
- **Provider/Model Error**: Fallback formatting and terminal `error` events handled cleanly.

## Regression Results
`npm run build`, `npm run lint`, and TS validation complete with no errors. The dev server restarts safely.

## Remaining Technical Debt
- Tool definitions are duplicated across the Agent schema setup and the LLM function declarations. They should eventually be extracted dynamically from the `ToolRegistry`.
- M04 logic relies on legacy `txWithUser` and `di.llmService.getClient` patterns, which should be encapsulated into proper domain services later.

# APPROVED
