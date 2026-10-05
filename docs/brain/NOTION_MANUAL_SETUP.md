# DevGenie Brain: Official Hosted Notion MCP with PAT Setup Guide

This guide details the non-interactive setup for connecting **DevGenie Brain** in Notion Cloud to Gemini CLI / DevGenie Agent using Notion's official hosted Remote MCP server with a **Personal Access Token (PAT)**.

---

## 1. Overview

- **Endpoint**: `https://mcp.notion.com/mcp`
- **Transport**: Streamable HTTP
- **Authentication**: Bearer Token (`Authorization: Bearer $NOTION_PAT`)
- **OAuth Browser Callbacks**: **NOT REQUIRED** (avoids localhost redirect timeouts in headless cloud environments)
- **Local npm server packages**: **NOT REQUIRED** (uses Notion's hosted remote infrastructure)
- **Security**: The token is never stored in source code, Git, or client bundles. It is loaded securely at runtime via the environment variable `NOTION_PAT`.

---

## 2. Manual Actions Required

### Step 1: Create a Notion Internal Integration / Personal Access Token
1. Go to [https://www.notion.so/profile/integrations](https://www.notion.so/profile/integrations).
2. Click **"+ New integration"**.
3. Configure the integration:
   - **Name**: `DevGenie Brain Agent`
   - **Associated workspace**: Select your target Notion workspace
   - **Type**: Internal integration
   - **Capabilities**:
     - Read content: `Checked`
     - Update content: `Checked`
     - Insert content: `Checked`
     - User information: `No user information`
4. Click **Submit** (or **Save**).
5. Copy the generated token (`secret_...` or `ntn_...`).
   - *Never commit this secret to Git or share it.*

### Step 2: Grant Access to the DevGenie Brain Page
1. Open Notion in your web browser or desktop app.
2. Navigate to your top-level **DevGenie Brain** page (create one if it does not yet exist).
3. Click the `...` menu in the upper-right corner of the page.
4. Scroll to **Connections** (or **Add connections**).
5. Search for `DevGenie Brain Agent` (the integration created in Step 1) and confirm.
   - *Note: In Notion's security model, the token can only access pages and databases explicitly shared with it.*

### Step 3: Add the Secret to Google AI Studio
1. In the Google AI Studio UI, open the **Secrets / Environment Variables** panel.
2. Add a new secret:
   - **Key**: `NOTION_PAT`
   - **Value**: `<paste your secret_... or ntn_... token here>`
3. Save the secret. Google AI Studio will automatically inject `process.env.NOTION_PAT` into the running container environment.

---

## 3. Configuration in Project

The project is pre-configured in `.gemini/settings.json`:
```json
{
  "mcpServers": {
    "notion": {
      "url": "https://mcp.notion.com/mcp",
      "type": "http",
      "headers": {
        "Authorization": "Bearer $NOTION_PAT"
      }
    }
  }
}
```

At runtime, the MCP client expands `$NOTION_PAT` from the environment and sends it as a standard HTTP `Authorization: Bearer <token>` header to `https://mcp.notion.com/mcp`.

---

## 4. Connectivity Verification

Once `NOTION_PAT` is added in AI Studio Secrets, run the safe connectivity verification script or probe:
```bash
gemini mcp list
```
And verify that the official Notion MCP tools (`notion-search`, `notion-fetch`, `notion-create-pages`, `notion-update-page`) can access the scoped `DevGenie Brain` workspace without any OAuth popups.
