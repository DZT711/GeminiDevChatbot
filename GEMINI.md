# react-example — project context

## Stack
- React 19
- TypeScript
- Vite 6
- Tailwind CSS v4
- @google/genai
- Express
- Drizzle ORM
- Postgres

## Code rules
- All new files: TypeScript, no `any`, explicit return types
- Components: functional only, hooks for state
- Never call APIs client-side — always use the server proxy
- Never commit secrets; use environment variables only

## File structure
- src/components/ # Reusable UI components
- src/hooks/ # Custom React hooks
- src/pages/ # Defined pages for react-router-dom
- src/db/ # Database connection and schema
- src/api.ts # Express / API logic

## What NOT to do
- Do not eject Vite configuration.
- Do not call APIs directly from components.
- Do not use any for types.
- Do not put business logic directly in UI components.

@./src/agent/SKILLS.md
