# Regression Checklist

## Authentication
- [ ] Landing page renders correctly
- [ ] Login functionality works
- [ ] Guest login initializes properly
- [ ] GitHub OAuth callback succeeds
- [ ] Protected routes block unauthorized access
- [ ] Logout clears session and redirects
- [ ] JWT session remains valid during active use

## Navigation
- [ ] Sidebar toggles and displays correctly
- [ ] View switching (Chat, Settings, Knowledge, etc.) works
- [ ] Settings Modal opens and closes
- [ ] Admin Debug View is accessible
- [ ] Transparency Dashboard displays logs

## Chat
- [ ] Messages send successfully via click and Enter/Ctrl+Enter
- [ ] Responses stream in real-time
- [ ] Stop generation halts streaming
- [ ] Edit message updates context and triggers new generation
- [ ] Revert returns to previous message state
- [ ] Copy message and Copy full chat work
- [ ] Rating buttons record feedback
- [ ] Thinking process drawer renders agent thoughts
- [ ] Markdown, syntax highlighting, Mermaid, and Sandpack render correctly
- [ ] Auto scroll tracks new messages
- [ ] Conversation history loads properly

## Sessions
- [ ] Create new session creates blank slate
- [ ] Rename session updates title
- [ ] Pin session toggles pinned status
- [ ] Delete session removes it from list
- [ ] Search sessions filters correctly
- [ ] Sessions persist across reloads

## Prompt/Input & Generation
- [ ] Paste handles text and files
- [ ] File and Repo attachments upload and process
- [ ] Prompt enhance modifies input
- [ ] Summarize chat triggers background summarization
- [ ] Image and Video generation commands execute

## Models & Providers
- [ ] Provider switch updates available models
- [ ] Model selector changes active model
- [ ] API keys save and validate per provider

## Skills & Knowledge
- [ ] Toggle skill enables/disables it
- [ ] Custom skill creation and editing work
- [ ] Skill upload parses files
- [ ] Knowledge search returns relevant nodes
- [ ] Knowledge proposals can be created, approved, and rejected

## Settings & Integrations
- [ ] GitHub repo modal imports data
- [ ] Profile settings (name, instructions) save
- [ ] Theme toggles between light and dark modes

## General
- [ ] App builds successfully (`npm run build`)
- [ ] App lints successfully (`npm run lint`)
