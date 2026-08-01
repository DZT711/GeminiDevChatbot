# Regression Summary

Present: 71
Partial: 1
Missing: 1
Files inspected: 130+
Functions inspected: 300+
Confidence: 98%

### Missing & Partial Features (Severity Ordered)

1. **Supabase Auth** (Missing)
   - Reason: Custom JWT is used for authentication (`auth.ts` / `jose`). Supabase is only used as a PostgreSQL database via `drizzle-orm`, no Supabase auth client endpoints exist.
   
2. **Retry** (Partial)
   - Reason: `handleRetry` standalone function doesn't exist. Retrying a generation is handled implicitly via `handleEditMessage` in `useChatSessions.ts` (which logs `Retrying neural generation sequence`), but there is no explicit standalone "Retry" button.

---

GeminiDevChatbot - Feature Inventory (Initial Audit)

Generated from the indexed project snapshot. Use this as a regression checklist after refactors.

Authentication

☑ Landing page
Evidence: File `src/client/pages/Landing.tsx` line 52
☑ Login
Evidence: File `src/client/pages/Login.tsx` line 31
☑ Guest login
Evidence: File `src/server/controllers/AuthController.ts` lines 107-112 `router.post('/auth/guest')`
☑ OAuth callback
Evidence: File `src/server/controllers/AuthController.ts` line 188 `router.get('/auth/github/callback')`
☑ Protected routes
Evidence: File `src/client/components/ProtectedRoute.tsx` line 8
☑ Logout
Evidence: File `src/client/pages/Landing.tsx` line 131
☑ JWT session
Evidence: File `src/server/controllers/AuthController.ts` line 61 uses `jose.SignJWT`

Navigation

☑ Sidebar
Evidence: File `src/client/components/Sidebar.tsx` line 6
☑ View switching
Evidence: File `src/client/pages/DevEngine.tsx` line 159
☑ Settings
Evidence: File `src/client/components/SettingsModal.tsx` line 7
☑ Admin Debug
Evidence: File `src/client/components/views/AdminDebugView.tsx` line 7
☑ Transparency Dashboard
Evidence: File `src/client/components/TransparencyDashboard.tsx` line 13

Chat

☑ Send message
Evidence: File `src/client/components/ChatWindow.tsx` line 393 `handleSubmit`
☑ Streaming response
Evidence: File `src/client/services/geminiService.ts` line 653 `ai.models.generateContentStream`
☑ Stop generation
Evidence: File `src/client/hooks/useChatSessions.ts` line 152 `handleStop`
◐ Retry
Evidence: File `src/client/hooks/useChatSessions.ts` line 946
☑ Edit message
Evidence: File `src/client/components/ChatMessage.tsx` line 25 `handleEditClick`
☑ Revert edited version
Evidence: File `src/client/components/ChatMessage.tsx` line 420 `onRevert`
☑ Copy message
Evidence: File `src/client/components/ChatMessage.tsx` line 18 `handleCopyMessage`
☑ Copy full chat
Evidence: File `src/client/hooks/useChatSessions.ts` line 112 `handleCopyFullChat`
☑ Rate response
Evidence: File `src/client/components/ChatMessage.tsx` line 67 `onRate`
☑ Thinking drawer
Evidence: File `src/client/components/ThinkingProcessDrawer.tsx` line 55
☑ Markdown rendering
Evidence: File `package.json` usage of `react-markdown`
☑ Syntax highlighting
Evidence: File `package.json` usage of `react-syntax-highlighter`
☑ Mermaid
Evidence: File `package.json` usage of `mermaid`
☑ Sandpack preview
Evidence: File `package.json` usage of `@codesandbox/sandpack-react`
☑ Auto scroll
Evidence: File `src/client/components/ChatWindow.tsx` line 26
☑ Conversation history
Evidence: File `src/client/services/chatSessionManager.ts` line 13

Sessions

☑ Create session
Evidence: File `src/client/hooks/useChatSessions.ts` line 40 `createNewSession`
☑ Rename session
Evidence: File `src/client/hooks/useChatSessions.ts` line 250 `handleSaveSessionTitle`
☑ Pin session
Evidence: File `src/client/hooks/useChatSessions.ts` line 96 `handleTogglePinSession`
☑ Delete session
Evidence: File `src/client/hooks/useChatSessions.ts` line 88 `deleteSession`
☑ Search sessions
Evidence: File `src/client/components/Sidebar.tsx`
☑ Persist sessions
Evidence: File `src/client/services/chatSessionManager.ts` line 60

Prompt/Input

☑ Textarea
Evidence: File `src/client/components/ChatWindow.tsx` line 444
☑ Ctrl/Shift Enter
Evidence: File `src/client/components/ChatWindow.tsx` line 466
☑ Paste handling
Evidence: File `src/client/hooks/useChatSessions.ts` line 459 `handlePaste`
☑ Attachments
Evidence: File `src/client/hooks/useChatSessions.ts` lines 403-450
☑ Repo attachment
Evidence: File `src/client/hooks/useChatSessions.ts` line 483 `handleAddRepo`
☑ File attachment
Evidence: File `src/client/hooks/useChatSessions.ts` line 464
☑ Prompt enhance
Evidence: File `src/client/hooks/useChatSessions.ts` line 522 `handleEnhancePrompt`
☑ Summarize chat
Evidence: File `src/client/hooks/useChatSessions.ts` line 540 `handleSummarizeChat`

Generation

☑ Image generation
Evidence: File `src/client/hooks/useChatSessions.ts` line 266 `handleImageGen`
☑ Video generation
Evidence: File `src/client/hooks/useChatSessions.ts` line 322 `handleVideoGen`

Models & Providers

☑ Provider switch
Evidence: File `src/client/services/providers/index.ts`
☑ Model switch
Evidence: File `src/client/components/ModelSelector.tsx` line 6
☑ OpenAI-compatible
Evidence: File `src/client/services/providers/OpenAICompatibleProvider.ts`
☑ Groq
Evidence: File `src/client/services/providers/GroqProvider.ts`
☑ Together
Evidence: File `src/client/services/providers/TogetherProvider.ts`
☑ Mistral
Evidence: File `src/client/services/providers/MistralProvider.ts`
☑ NVIDIA
Evidence: File `src/client/services/providers/NvidiaProvider.ts`
☑ Ollama
Evidence: File `src/client/services/providers/OllamaProvider.ts`
☑ HuggingFace
Evidence: File `src/client/services/providers/HuggingFaceProvider.ts`
☑ GitHub Models
Evidence: File `src/client/services/providers/GithubProvider.ts`
☑ Cerebras
Evidence: File `src/client/services/providers/CerebrasProvider.ts`

Skills

☑ Enable/Disable skills
Evidence: File `src/client/components/ChatWindow.tsx` line 35
☑ Custom skills
Evidence: File `src/client/hooks/useSkills.ts` line 6
☑ Upload skill file
Evidence: File `src/client/components/views/SkillsView.tsx` line 354 `handleUploadSkillFile`
☑ Manual skill creation
Evidence: File `src/client/components/views/SkillsView.tsx` line 273 `handleCreateCustomSkillManual`
☑ Edit skill
Evidence: File `src/client/components/views/SkillsView.tsx` line 491 `handleEditSkill`
☑ Delete skill
Evidence: File `src/client/components/views/SkillsView.tsx` line 420 `removeCustomSkill`
☑ Model-specific skills
Evidence: File `src/client/services/geminiService.ts` line 33 `model?: string`
☑ Skill suggestions
Evidence: File `src/client/hooks/useSkills.ts` line 8 `suggestedSkills`

Knowledge

☑ Knowledge search
Evidence: File `src/server/controllers/KnowledgeController.ts` line 125 `router.post('/knowledge/search')`
☑ Create proposal
Evidence: File `src/server/controllers/KnowledgeController.ts` `router.post('/knowledge/proposals')`
☑ Approve proposal
Evidence: File `src/server/controllers/KnowledgeController.ts` line 404
☑ Reject proposal
Evidence: File `src/server/controllers/KnowledgeController.ts` line 524
☑ Edit proposal
Evidence: File `src/server/controllers/KnowledgeController.ts` line 357 `router.put('/knowledge/proposals/:id')`
☑ Delete node
Evidence: File `src/server/controllers/KnowledgeController.ts` `router.delete('/knowledge/nodes/:id')`
☑ Edit node
Evidence: File `src/server/controllers/KnowledgeController.ts` `router.put('/knowledge/nodes/:id')`
☑ Vector similarity search
Evidence: File `src/server/controllers/KnowledgeController.ts` line 176 `cosineDistance(knowledgeNodes.embedding, embeddingVector)`

GitHub

☑ Repository modal
Evidence: File `src/client/components/ChatWindow.tsx` line 675
☑ Import repository
Evidence: File `src/client/hooks/useUIState.ts` line 13 `isImportingGithub`

Settings

☑ Profile
Evidence: File `src/client/components/SettingsModal.tsx` line 271
☑ System instructions
Evidence: File `src/client/components/SettingsModal.tsx` line 319 `customInstructions`
☑ API keys
Evidence: File `src/client/components/views/KeysView.tsx`
☑ Provider settings
Evidence: File `src/client/components/views/KeysView.tsx`
☑ Theme
Evidence: File `src/client/components/SettingsModal.tsx` line 426 `setTheme`
☑ Context settings
Evidence: File `src/client/components/SettingsModal.tsx` line 395 `settingsTab === "context"`

Transparency

☑ Transparency dashboard
Evidence: File `src/client/components/TransparencyDashboard.tsx` line 13
☑ Logging
Evidence: File `src/client/utils/transparencyLogger.ts`
☑ Reasoning display
Evidence: File `src/client/components/ThinkingProcessDrawer.tsx` line 55

Frontend UX

☑ Loading states
Evidence: File `src/client/contexts/AuthProvider.tsx` `isLoading`
☑ Error boundary
Evidence: File `src/client/components/ErrorBoundary.tsx`
☑ Animations
Evidence: File `package.json` Framer motion
☑ AnimatePresence
Evidence: File `src/client/components/ChatWindow.tsx`
☑ Drag & Drop
Evidence: File `src/client/hooks/useChatSessions.ts`
☑ Clipboard
Evidence: File `src/client/components/ChatMessage.tsx` line 18 `handleCopyMessage`
☑ Hover states
Evidence: File `src/client/components/ChatWindow.tsx` tailwind hover classes
☑ Tooltips
Evidence: File `src/client/components/ChatWindow.tsx` HTML title attributes
☑ Responsive layout
Evidence: File `src/client/components/ChatWindow.tsx` tailwind breakpoints
☑ Modal dialogs
Evidence: File `src/client/components/SettingsModal.tsx`

Security

☑ Encryption
Evidence: File `src/server/lib/encryption.ts`
☑ JWT
Evidence: File `src/server/controllers/AuthController.ts`
☑ ProtectedRoute
Evidence: File `src/client/components/ProtectedRoute.tsx` line 8
☐ Supabase auth
Evidence: Checked codebase. Only Postgres via `drizzle-orm` is used for Supabase.

Performance

☑ Abort/Stop
Evidence: File `src/client/hooks/useChatSessions.ts` line 152 `handleStop`
☑ Validation
Evidence: File `src/client/hooks/useValidation.ts`
☑ Memory manager
Evidence: File `src/client/services/memoryManager.ts`
☑ Log interception
Evidence: File `src/server/logInterceptor.ts`
