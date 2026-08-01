# Manual Test Plan

## 1. Authentication & Routing
- Navigate to `/`. Verify Landing page.
- Click Login. Attempt Guest Login.
- Verify redirect to `/chat` (DevEngine view).
- Refresh page. Verify session persists.
- Click Logout. Verify redirect to `/`.

## 2. Core Chat & Code Rendering
- Send a simple message: "Write a hello world in Python".
- Verify streaming response.
- Verify syntax highlighting on the Python code block.
- Click "Copy Message" and verify clipboard content.
- Edit the user message to "Write it in JS instead" and submit.
- Verify new response overrides the old one.
- Revert to the Python version using the version history.

## 3. Session Management
- Click "New Chat" in the sidebar.
- Verify chat window clears.
- Send a message in the new chat.
- Rename the chat via the sidebar.
- Pin the chat.
- Switch back to the previous chat, then delete it.

## 4. Models & Providers
- Open Settings -> API Keys.
- Add a valid key for a provider (e.g., Groq or Together).
- Select a model from that provider in the chat window.
- Send a message to verify the provider integration works.

## 5. Skills & Knowledge
- Open Settings -> Skills.
- Create a manual skill with a system prompt.
- Enable the skill in the chat window.
- Ask a question to verify the skill's system prompt is applied.
- Open Settings -> Knowledge.
- Create a knowledge proposal. 
- Approve the proposal and verify it enters the knowledge base.

## 6. Attachments & Enhancements
- Drag and drop a `.txt` file into the chat.
- Verify file attachment appears.
- Use the "Enhance Prompt" button on a vague input and verify it expands.
- Toggle the GitHub Repo modal, input a public repo URL, and verify import.

## 7. UI & UX
- Toggle Light/Dark mode in Settings and verify global color updates.
- Verify mobile responsiveness by shrinking the browser window.
- Check the Transparency Dashboard for recent logs.
