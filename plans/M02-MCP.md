# Milestone 02

MCP Framework

## Goal
Implement the Model Context Protocol (MCP) to standardize how agents interact with external data sources, tools, and environments.

## Estimated complexity
High

## Dependencies
Depends On: M01
Unlocks: M03

## Deliverables
- MCP Server implementation.
- MCP Client integration in the frontend/backend.
- Resource and Tool capability negotiation.

## Files affected
- `src/mcp/*`
- `src/services/geminiService.ts`

## Architecture Diagram
(Agent) <-> (MCP Client) <-> (MCP Protocol) <-> (MCP Server) <-> (Local Files/DB)

## Task List

### TASK-004
Title: MCP Core Protocol Implementation
Priority: Critical
Estimated effort: 3 days
Description: Implement standard MCP JSON-RPC protocol handling.
Acceptance Criteria: Can establish MCP connection and exchange capabilities.
Subtasks:
- [ ] Implement JSON-RPC message parser
- [ ] Create MCP session manager
- [ ] Implement capability negotiation

### TASK-005
Title: MCP Resource Providers
Priority: High
Estimated effort: 2 days
Description: Allow MCP to expose local filesystem and workspace context as resources.
Acceptance Criteria: Agent can read workspace files via MCP `resources/read`.
Subtasks:
- [ ] Implement Filesystem Resource Provider
- [ ] Implement Database Resource Provider

## Definition of Done
MCP server and client can communicate and read a file successfully.

## Testing Checklist
- [ ] Connection established
- [ ] Ping/Pong succeeds
- [ ] Resource read succeeds

## Risk
Protocol mismatch with official MCP specifications.

## Future Improvements
Support remote MCP servers over WebSocket.
