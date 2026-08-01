# Project Understanding

## 1. Architecture Summary
A full-stack application (React/Vite frontend, Node/Express backend) designed as an AI conversational agent (DevEngine) with provider abstraction, session management, RAG (knowledge base), and custom skills. It utilizes JWT for authentication and in-memory stores for knowledge nodes and logs.

## 2. Current Feature Summary
- **Authentication**: JWT-based, Guest login, GitHub OAuth.
- **Chat Interface**: Streaming markdown responses, editing, reverting, rating, copying, attachments (files, repos), thought processes.
- **Sessions**: Persistence, searching, pinning, renaming, deleting.
- **Models & Providers**: Multi-provider support (OpenAI, Groq, Together, Mistral, NVIDIA, Ollama, HuggingFace, GitHub, Cerebras).
- **Skills & Knowledge**: Custom logic overrides, JSON file uploads, RAG vector similarity search, proposal workflows.
- **Admin & Transparency**: Real-time logging, agentic thought breakdowns.

## 3. Critical Modules
- `src/client/hooks/useChatSessions.ts`: Controls all conversation state. Highly complex.
- `src/client/services/geminiService.ts`: Core AI integration logic.
- `src/server/controllers/KnowledgeController.ts`: Central logic for RAG vector search.

## 4. Regression Sensitive Areas
- **Streaming Response Parsing**: Essential for UI continuity and markdown rendering.
- **Session Persistence**: Chat history loading and saving.
- **Authentication**: JWT validation for protected routes.
- **Provider Routing**: Different SSE stream formats for various LLM backends.

## 5. Technical Debt Summary
- **God Objects/Hooks**: `useChatSessions.ts` (>1100 lines), `ChatWindow.tsx` (>700 lines).
- **High Coupling**: Prop drilling in `DevEngine.tsx` down to modal and chat views.
- **Duplicated Logic**: SSE stream parsing across provider integrations.

## 6. Data Flow
User -> React UI (`ChatWindow.tsx`) -> Hook (`useChatSessions.ts`) -> Service (`geminiService.ts`) -> Provider -> Backend/API -> Response Stream -> UI Re-render.

## 7. Provider Flow
Prompt -> Router/Model Selector -> Provider Implementation (e.g. `GroqProvider`) -> LLM Streaming Output -> UI Markdown parsing.

## 8. Constraints
- Client/Server Split: Secure API keys stay off the client unless manually entered by user.
- In-memory backend data wipes on restart.
- TypeScript Strict must be enforced.

## 9. Refactoring Risks
- Breaking markdown rendering during streams.
- Losing chat histories.
- Breaking custom skills routing.

## 10. Implementation Strategy
I plan to iteratively extract smaller contexts (e.g., `SettingsContext`, `SessionContext`) and modular components (`MessageList`, `ChatInput`) from the large monoliths, replacing prop drilling. Each step will involve a complete build check, ensuring the previous feature map is strictly adhered to.
