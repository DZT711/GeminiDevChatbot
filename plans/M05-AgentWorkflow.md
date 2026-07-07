# Milestone 05

Agent Workflow Engine

## Goal
Introduce specialized agents (Planner, Researcher, Coder, Reviewer) and a workflow engine to orchestrate complex multi-step tasks.

## Estimated complexity
Very High

## Dependencies
Depends On: M03, M04
Unlocks: M10

## Deliverables
- State Machine for multi-agent workflows.
- Agent personas and prompt registries.
- Task delegation system.

## Files affected
- `src/workflows/*`
- `src/agents/*`

## Task List

### TASK-010
Title: Multi-Agent Orchestrator
Priority: Critical
Estimated effort: 4 days
Description: Build a workflow engine that routes a user request to a Planner, then a Coder, then a Reviewer.
Acceptance Criteria: Agents can pass context and tasks to each other.
Subtasks:
- [ ] Implement Workflow Engine (State Machine)
- [ ] Create Planner Agent
- [ ] Create Coding Agent
- [ ] Create Reviewer Agent

### TASK-011
Title: Prompt Versioning & Registry
Priority: Medium
Estimated effort: 1 day
Description: Manage system prompts systematically rather than inline strings.
Acceptance Criteria: Prompts can be versioned and loaded dynamically.
Subtasks:
- [ ] Create Prompt Registry
- [ ] Implement templating engine (e.g., Handlebars)

## Definition of Done
A complex task like "Build a login page" goes through Planning, Coding, and Reviewing automatically.

## Testing Checklist
- [ ] Planner generates tasks
- [ ] Coder executes tasks
- [ ] Reviewer verifies code

## Risk
Agents looping infinitely. Requires strict loop-detection.

## Future Improvements
Human-in-the-loop approval gates.
