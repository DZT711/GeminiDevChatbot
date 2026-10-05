title:: Tech Stack
type:: [[type/knowledge]]

- # Tech Stack

- ## Frontend
  - **Framework**: React 19 (`react: ^19.0.1`, `react-dom: ^19.0.1`)
  - **Build Tool**: Vite 6 (`vite: ^6.2.3`, `@vitejs/plugin-react: ^5.0.4`)
  - **Styling**: Tailwind CSS v4 (`@tailwindcss/vite: ^4.1.14`, `tailwindcss: ^4.1.14`)
  - **Icons**: Lucide React (`lucide-react: ^0.546.0`)
  - **Animation**: Motion (`motion: ^12.38.0`)
  - **Markdown & Code Rendering**:
    - `react-markdown: ^10.1.0`
    - `remark-gfm: ^4.0.1`
    - `remark-math: ^6.0.0`
    - `rehype-katex: ^7.0.1` & `katex: ^0.18.9`
    - `react-syntax-highlighter: ^16.1.1`
    - `mermaid: ^11.14.0`

- ## Backend & Runtime
  - **Server**: Express 4 (`express: ^4.21.2`) on Node.js (`@types/node: ^22.14.0`)
  - **Execution & Transpilation**: `tsx: ^4.21.0`, `esbuild: ^0.28.0`
  - **Auth & Tokens**: `jose: ^6.2.8`, `bcryptjs: ^3.0.3`
  - **Database & ORM**: PostgreSQL (`pg: ^8.20.0`), `drizzle-orm: ^0.45.2`, `drizzle-kit: ^0.31.10`
  - **Archiving**: JSZip (`jszip: ^3.10.1`)

- ## AI & SDK Layer
  - **Primary SDK**: `@google/genai: ^1.29.0`
  - **Secondary / Multi-provider API clients**: `openai: ^6.49.0`
  - **Sandboxing**: `@codesandbox/sandpack-react: ^2.20.0`, `@e2b/code-interpreter: ^2.5.0`
  - **Agent Architecture**: Fully decoupled core in `src/agent/` without vendor SDK imports.
