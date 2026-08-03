# M02-Demo: Agent Playground

## Objective
To prove that the Agent Core architecture completed in M02 is fully functional, end-to-end, without relying on LLMs or external dependencies.

## Implementation Details
We created a dedicated, isolated playground at `src/agent/demo/` comprising:
1. **MockTools.ts**: Defines multiple mock tools representing different failure and success scenarios.
2. **MockPlanner.ts**: A mock implementation of the `Planner` interface to simulate the planner orchestrating tool execution.
3. **index.ts**: The executable demo harness that sets up the registry, pipeline, checkpoint store, and validation layers, and then executes various scenarios.

### Mock Tools Created
- `EchoTool`: Tests basic execution and returns standard output.
- `CounterTool`: Mutates the `ExecutionContext` state to test state manipulation.
- `FailTool`: Maliciously mutates the `ExecutionContext` and then throws an error. Proves checkpointing and rollback works.
- `RestrictedTool`: A tool containing the `SYSTEM_COMMAND` capability with `requiresUserApproval` set to `true`.
- `DelayTool`: Sleeps for a set time to test execution timeouts.

## Demonstrated Scenarios

### Demo 1: Simple Execution via Planner
The `MockPlanner` generated a two-step plan. It passed an `ExecutionContext` through the `ExecutionPipeline` to execute `EchoTool` and then `CounterTool`.
**Result**: Successfully proved that the execution pipeline allows orchestration by planners.

### Demo 2: State Rollback
Initial state was initialized to `counter: 5`. `CounterTool` incremented it to `6`. `FailTool` then mutated the state to `999` before throwing an `ExecutionError`. 
**Result**: The pipeline caught the error, successfully loaded the before-execution checkpoint from the `InMemoryCheckpointStore`, and restored the state. The counter value was proven to be correctly rolled back to `6`.

### Demo 3: Permission Checks
Attempted to run the `RestrictedTool` with a standard execution context.
**Result**: Failed with a `PermissionError` (Tool restricted requires user approval). 
After injecting the approval tag into the context, it successfully bypassed the `PermissionValidator` and executed.

### Demo 4: Input Validation
Attempted to run the `EchoTool` with `{ wrongKey: 'missing text' }`.
**Result**: The `InputValidator` caught the missing required field and threw a `ValidationError` *before* the tool executed or any checkpoints were created.

### Demo 5: Timeout Execution Policy
Executed the `DelayTool` (500ms sleep) with a strict `ExecutionPolicy` containing `timeoutMs: 100`.
**Result**: The pipeline correctly aborted execution and returned a `TimeoutError`.

### Demo 6: Registry Queries
Queried the `ToolRegistry` for all tools possessing the `STATE_MUTATION` capability.
**Result**: The registry correctly returned the `CounterTool`.

## Build & Validation Results
- `npm run build`: Success
- `npx tsc --noEmit`: Success
- `npm run lint`: Success

## Conclusion
The M02 Agent Core architecture has been proven functional. The execution boundaries, validation steps, and rollback mechanisms all behave as expected under isolated mock conditions.

The Agent Core is completely ready for the M03 infrastructure and provider implementations.
