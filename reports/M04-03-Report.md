# M04-03: Context Builder Integration Report

## Architecture
This phase integrates the M03 `ContextBuilder` into the core chat generation flow, replacing the legacy inline prompt string concatenation. It operates entirely behind a new feature flag, `USE_AGENT_CONTEXT_BUILDER`.

The integration components are:
- `ContextIntegrationService`: A service layer wrapping the M03 `SimpleContextBuilder`.
- `ContextBuilderAdapter`: Maps the unstructured request payload (system prompts, extracted knowledge, sandbox instructions) into the structured `ContextBuilderRequest` format, including token budget initialization.
- `PromptContextMapper`: Acts as the bridge back to the legacy system, reducing the structured `PromptContext` (prioritized sections) back into the single `finalSystemPrompt` string that the Gemini API currently consumes in this application.

## Files Changed
- `src/server/services/agentIntegration/AgentFeatureFlags.ts`: Added `USE_AGENT_CONTEXT_BUILDER`.
- `src/server/services/agentIntegration/context/ContextIntegrationService.ts`: Created new service.
- `src/server/services/agentIntegration/context/ContextBuilderAdapter.ts`: Created the adapter.
- `src/server/services/agentIntegration/context/PromptContextMapper.ts`: Created the mapper.
- `src/server/controllers/ChatController.ts`: Intercepted the point where `finalSystemPrompt` is augmented. Conditioned it based on `USE_AGENT_CONTEXT_BUILDER`.

## Legacy vs ContextBuilder Comparison
- **Prompt content**: Content format is strictly preserved via `PromptContextMapper`.
- **Ordering**: Maintained. Legacy concatenated system -> sandbox -> custom -> retrieved context. The `ContextBuilder` handles prioritization correctly, and the mapper restores it to exactly match legacy structure.
- **Latency**: No measurable impact; token estimation is extremely fast relative to LLM calls.

## Token Comparison
- In both Legacy and M03 ContextBuilder paths, the token content remains identical for this milestone since we are preserving existing functionality 1:1. 
- However, `ContextBuilder` calculates `totalTokens` usage upfront (e.g. `[ContextBuilder] Assembled 4 sections, 1530 tokens used.`) which allows dynamic safety truncation (to prevent hitting the 1M limit or 8192 reserved completion tokens).

## Rollback Strategy
Change `USE_AGENT_CONTEXT_BUILDER` to `false` in `AgentFeatureFlags.ts`. This immediately completely bypasses `ContextIntegrationService` and returns to the old inline concatenation.

## Regression Risks
Low. `ContextBuilder` relies on plain text manipulation and array sorting. We deliberately exclude `CONVERSATION` from `finalSystemPrompt` mapping because the legacy application already injects it explicitly into the LLM `contents` array.

## Performance Observations
Negligible overhead. The tokenizer runs purely in CPU using character estimation.

---

## Architecture Gate

**When USE_AGENT_CONTEXT_BUILDER = FALSE, is runtime behavior 100% identical to M04-02?**
Yes. The feature flag strictly guards the entire context generation replacement. Without it, the code proceeds down the legacy string builder.

**When USE_AGENT_CONTEXT_BUILDER = TRUE, is ContextBuilder the ONLY replaced component?**
Yes. The LLM streaming mechanism, Gemini API interaction, and `ChatController` lifecycle is entirely untouched. Only `finalSystemPrompt` is modified.

**Can Memory be connected in a future milestone without rewriting the prompt pipeline?**
Yes. `PromptContextMapper` now anticipates `ContextSectionType.MEMORY` and gracefully formats it. When memory is passed into `ContextBuilderAdapter`, it will automatically be parsed, budgeted, and appended to the prompt.

**Can Reflection and Learning remain completely independent from prompt construction?**
Yes. Reflection and Learning will function as asynchronous background processes or separate analytical tools that merely populate the `knowledgeNodes` database. The `ContextBuilder` simply consumes what the `Retriever` fetches without needing to know how it got there.
