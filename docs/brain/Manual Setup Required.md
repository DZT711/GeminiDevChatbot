# DevGenie Brain: Manual Setup Status

No API key or MCP server is required for the current filesystem-based DevGenie Brain setup.

---

## Optional: Opening the Graph in Logseq Desktop App

If you wish to view and navigate this knowledge graph visually using the Logseq desktop application:

1. **What is required**:
   - Open the directory `docs/brain/` as a local graph in the Logseq desktop app.
2. **Why it is required**:
   - Logseq stores graph configurations and views markdown files directly on disk. To view the 2D/3D visual graph or use interactive query tables in Logseq's GUI, Logseq must point to this folder.
3. **Exact setup steps**:
   - Open Logseq desktop app.
   - Click the top-left graph dropdown menu and select **"Add new graph"** (or **"Open local folder"**).
   - Navigate to and select the `<project-root>/docs/brain/` directory.
   - Logseq will automatically detect `logseq/config.edn` and load all notes under `pages/` and `journals/`.
4. **How to verify**:
   - The Home page opens directly to [[contents]], showing the DevGenie Brain Dashboard.
   - Graph view displays connected clusters for Components, Services, Flows, and ADRs.
5. **Requirement Level**:
   - **Optional**: All notes are standard UTF-8 Markdown and can be directly read, searched (`grep`), and edited by developers or AI coding agents directly in the filesystem without Logseq running.
