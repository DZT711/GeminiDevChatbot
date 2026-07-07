# Project Vision

To build the most robust, scalable, and intelligent DevGenie AI platform capable of acting as an autonomous developer and coding assistant. The platform will support long-context retention, advanced tool calling, multiple providers, sophisticated agentic workflows, and a flawless developer UX.

# Current Architecture Review

## Strengths
- Solid stack choice (React 19, TypeScript, Vite 6, Tailwind v4, Drizzle ORM).
- Modular initial component structure for chat and logic.
- Basic routing and Express API proxy established.
- Support for multiple LLM providers (Google, OpenAI, Anthropic, etc.).

## Weaknesses
- Missing strong separation between domain logic and view layers in massive files like `DevEngine.tsx` (over 7000 lines).
- Lacks a robust plugin and tool-calling framework (MCP-ready).
- Memory management is basic, relying on simple window sliding without deep semantic compression.
- Observability and analytics are primitive.

## Technical Debt
- Massive monolithic files (`DevEngine.tsx`, `api.ts`) require urgent refactoring into smaller, testable modules.
- Hardcoded integrations instead of a dynamic registry for providers, skills, and tools.
- Tight coupling between UI state and backend communication.

## Scalability Risks
- Long chat histories will crash the browser or exceed context limits without a dedicated RAG/Knowledge Graph.
- Synchronous processing in the backend API could bottleneck under high load.
- WebSocket or SSE connections for streaming need robust connection pooling and error recovery.

## Missing Features
- Model Context Protocol (MCP) integration.
- Advanced Agentic Workflows (Planner, Researcher, Coder).
- Deep filesystem, Git, and Docker integration.
- Semantic RAG over codebase.
- True real-time multimodal capabilities.

# Priority Matrix

## Must Have
- Architecture Refactoring (Split monoliths)
- Tool Calling Framework
- Advanced Context Window & Memory Management
- Agentic Workflow Engine

## Should Have
- MCP Framework
- Codebase Semantic RAG
- Observability & Telemetry

## Nice to Have
- Browser Automation & Playwright Integration
- Multi-User Collaboration

## Future
- Marketplace & Extension System

# Milestone Overview

| Milestone | Name | Priority | Status |
|-----------|------|----------|--------|
| M01 | Architecture Refactor | Critical | ⬜ |
| M02 | MCP Framework | Critical | ⬜ |
| M03 | Tool Calling | Critical | ⬜ |
| M04 | Memory Management | High | ⬜ |
| M05 | Agent Workflow | High | ⬜ |
| M06 | Semantic RAG | Medium | ⬜ |
| M07 | Observability | Medium | ⬜ |
| M08 | Performance | Medium | ⬜ |
| M09 | UX Refinement | Low | ⬜ |
| M10 | Polish & Extensions | Low | ⬜ |
