# Cognitive Playground

## Overview
The Cognitive Playground is a validation harness demonstrating the end-to-end integration of the Agent's Cognitive Layer. It proves that transient experiences can be evaluated, transformed into durable knowledge, and successfully retrieved back into the prompt context for future tasks.

## Architecture Tested
1. **Experience (ExecutionResult)**
2. **Reflection (ReflectionEngine)**
3. **Learning (LearningEngine)**
4. **Storage (MemoryProvider namespace='knowledge')**
5. **Context Building (ContextBuilder)**

## How to Run
Execute the playground using `tsx`:
```bash
npx tsx src/agent/cognitive-demo/playground.ts
```

## Scenarios
1. **Scenario 1: Experience -> Knowledge Promotion**
   - Simulates a successful execution with tool usage.
   - Reflection outputs heuristic improvements.
   - Learning engine promotes these to knowledge.

2. **Scenario 2: Experience -> Discard**
   - Simulates an empty or silent execution without new learnings.
   - Learning engine correctly flags it as `DISCARD`.

3. **Scenario 3: Duplicate Knowledge Handling**
   - Identifies already promoted knowledge.
   - Bumps confidence instead of creating duplicate records.

4. **Scenario 4: Context Assembly with New Knowledge**
   - Retrieves the promoted knowledge.
   - Feeds it into `ContextBuilder` alongside a user prompt.

5. **Scenario 5: Full Context Assembly**
   - Mixes `system`, `user`, `workspace`, `conversation`, `memory`, and `knowledge` sections.
   - Evaluates priority ordering and truncation.

## Expected Outputs
- `Knowledge Promotions: 1`
- `Learning Decision: DISCARD` for noisy experiences.
- Knowledge seamlessly appearing inside `PromptContext` sections.

## Troubleshooting
- If using `npx ts-node`, you may encounter `ERR_UNSUPPORTED_DIR_IMPORT` due to ESM directory resolution. Use `npx tsx` instead.
