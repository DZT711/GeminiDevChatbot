# Milestone 03

Tool Calling Framework

## Goal
Establish a dynamic Tool Registry and execution framework so agents can discover, validate, and execute tools safely.

## Estimated complexity
Medium

## Dependencies
Depends On: M01, M02
Unlocks: M05

## Deliverables
- Dynamic Tool Registry.
- JSON Schema validation for tool arguments.
- Secure sandboxed execution environment.

## Files affected
- `src/tools/*`
- `src/services/agentService.ts`

## Task List

### TASK-006
Title: Tool Registry & Interface
Priority: Critical
Estimated effort: 2 days
Description: Create an extensible registry where tools can be registered with JSON schemas.
Acceptance Criteria: Tools can be added, queried, and their schemas exported to LLMs.
Subtasks:
- [ ] Create Tool Interface
- [ ] Create Tool Registry
- [ ] Dynamic Tool Loader

### TASK-007
Title: Tool Execution Engine
Priority: Critical
Estimated effort: 2 days
Description: Execute tools with validation, error handling, and retry strategies.
Acceptance Criteria: Invalid arguments are rejected; runtime errors are caught and returned to the LLM.
Subtasks:
- [ ] JSON Schema Validation
- [ ] Error Handling
- [ ] Retry Strategy

## Definition of Done
Agent can reliably call a `getCurrentTime` and `readFile` tool.

## Testing Checklist
- [ ] Tool registry loads tools
- [ ] Schema validation rejects bad args
- [ ] Tool execution returns correct result

## Risk
Malicious tool execution if sandbox is not secure.

## Future Improvements
Docker-based isolated tool execution.
