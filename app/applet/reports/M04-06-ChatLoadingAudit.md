# M04-06 Chat Loading Audit

1. **Does USE_AGENT_RUNTIME=true route the request into the completed M04 Agent Runtime or an M04-01 skeleton?**
   It routes the request into an M04-01 skeleton. The `AgentIntegrationService.handleRequest` method explicitly states in its comments that it "serves as a skeleton that can stream a basic response."

2. **What exact SSE event types does the backend emit for a normal successful response?**
   In the `USE_AGENT_RUNTIME=true` path (the skeleton), the backend emits `status` and `chunk` events (via data payload), and an `end` event. In the legacy path, it emits `routing`, `status`, `text`, `thinking`, `thinking_done`, `metadata`, `system_event`, and `model_switch`.

3. **What exact SSE event types does the frontend handle?**
   The frontend `geminiService.ts` handles `routing`, `status`, `text`, `thinking`, `thinking_done`, `metadata`, `system_event`, `model_switch`, and `error`.

4. **Is there any mismatch such as: backend: "chunk" frontend: "text"?**
   Yes. The `AgentIntegrationService` skeleton emits `type: 'chunk'`, but the frontend `geminiService.ts` expects `type: 'text'`. As a result, the frontend ignores the skeleton's output payload.

5. **When the application LLM provider returns an error, does the backend send a terminal SSE error event?**
   Yes. In `ChatController.ts`, the outer `try/catch` block catches any thrown errors, writes an `error` SSE event, and calls `res.end()` to close the stream.

6. **Can the frontend remain loading forever when the backend terminates without sending the expected completion/error event?**
   Yes. The frontend uses a `while (true)` loop with `await reader.read()`. If the backend does not terminate the HTTP response by calling `res.end()` (which closes the connection), the reader will hang indefinitely waiting for more chunks, resulting in an infinite loading state in the UI.

7. **For a simple greeting, how many LLM calls are actually made?**
   Exactly one LLM call is made. Before hitting the `AgentIntegrationService` boundary, `ChatController.ts` calls `determineRoutingStrategy()`, which makes one LLM call to classify the prompt. After that, the skeleton returns a hardcoded response without making any further LLM calls.

8. **Do Reflection or Learning accidentally invoke an additional LLM?**
   No. The `AgentIntegrationService` skeleton does not invoke Reflection or Learning at all. Additionally, the codebase refers to them as `RuleBasedReflection` and `RuleBasedLearningEngine`, which implies they are rule-based and do not use an LLM.

9. **Is there any application-level retry loop or timeout that can cause the request to remain pending?**
   No. There is no timeout implemented on the frontend's `reader.read()`. The request remains pending purely because the backend never signals the end of the HTTP response stream.

10. **Identify the exact root cause.**
    The exact root cause of the infinite loading state is that the `AgentIntegrationService.handleRequest` method writes its SSE events but fails to call `res.end()` to terminate the HTTP response. Consequently, the frontend's `reader.read()` blocks forever waiting for the connection to close. A secondary issue is the event type mismatch (`chunk` vs `text`), which causes the skeleton's output to be silently ignored even if the stream were correctly closed.

ROOT CAUSE CONFIRMED
