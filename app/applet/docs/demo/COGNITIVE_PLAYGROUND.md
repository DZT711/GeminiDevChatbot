# Cognitive Integration Playground

## Overview
The Cognitive Integration Playground (`src/agent/playground/index.ts`) is an end-to-end simulation environment designed to validate the core architectural pathways established in Milestone 03. It exercises the Agent Core's contextual pipelines and dynamic tool ingestion mechanisms without requiring live LLM calls or external network dependencies.

## Execution
To run the playground:
```bash
npx tsx src/agent/playground/index.ts
```

## Simulated Scenarios

### 1. Contextual Recall
Demonstrates how raw data flows from short-term memory and long-term knowledge into a unified `PromptContext`.
*   Injects a simulated episodic memory (User Query).
*   Injects a factual knowledge node.
*   Simulates retrieval and context building under a constrained `TokenBudget`.

### 2. Cognitive Learning Loop
Validates the agent's ability to learn from execution.
*   Simulates a successful `ExecutionResult`.
*   Passes it to the `ReflectionEngine`, generating insights.
*   Evaluates insights via the `LearningEngine`, producing a `KnowledgePromotion`.
*   Persists the new insight to the `KnowledgeStore`.

### 3. Noise Rejection
Validates the agent's defense against polluting the Knowledge Store with bad data.
*   Simulates a failed `ExecutionResult`.
*   `ReflectionEngine` generates a low-confidence or negative summary.
*   `LearningEngine` rejects the reflection, preventing knowledge promotion.

### 4-6. Pluggable Tool Execution
Validates that the `ExecutionPipeline` can execute tools from disparate sources natively.
*   Native Tools (Scenario 4)
*   MCP Tools via Mock Connection (Scenario 5)
*   REST Tools via Mock Provider (Scenario 6)

### 7-8. Dynamic Tool Registry
Validates hot-plugging capabilities.
*   Simulates adding an MCP server at runtime. The discovery layer identifies the tool and mounts it.
*   Simulates detaching the MCP server. The tool is cleanly unmounted and becomes irresolvable.

### 9. Version Collision Determinism
Validates how the system handles identical tool names across different providers.
*   Registers `read_file` via Native (v1.0.0) and MCP (v1.1.0).
*   Demonstrates the `ToolResolver` correctly defaulting to the highest provided version (MCP).
