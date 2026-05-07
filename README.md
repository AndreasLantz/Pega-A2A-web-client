# Pega Agents Chat

A web app for chatting with [A2A](https://google.github.io/A2A/) agents and invoking [MCP](https://modelcontextprotocol.io/) tools hosted on Pega. Users sign in with their own Pega account via OAuth 2.0 Authorization Code (with PKCE), so each user's permissions, agents, and data follow them into the chat.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- `iron-session` — encrypted httpOnly cookie holding the user's Pega tokens
- A ported A2A client (originally from `../Agent2Agent`) under `src/lib/a2a`
- Conversation list persisted in `localStorage` (demo-grade)

## Setup

### 1. Register an OAuth client in Pega

In your Pega instance, create an OAuth 2.0 Client Registration with:

- **Grant type:** Authorization Code
- **Redirect URI:** `http://localhost:3000/api/auth/callback` (must match the Redirect URI in settings exactly)
- **PKCE:** enabled, `S256`
- **Scopes:** whatever you need (e.g. `openid profile` if Pega is OIDC-enabled)

If the client is **confidential**, note its client secret. If **public**, PKCE is the only proof — leave the client secret blank.

### 2. Create the config file

Copy the example file to create your local config:

```bash
cp .aiapp-config.json.example .aiapp-config.json
```

Then edit `.aiapp-config.json` and fill in the real values for your Pega instance. The file is gitignored and chmod'd to `600` on first save.

| Field | What it is |
|---|---|
| `pegaBaseUrl` | Pega context root, e.g. `https://your-host/prweb`. The app appends `/PRRestService/oauth2/v1/{authorize,token}` and `/api/application/v2/ai-agents` to it. |
| `pegaAppAlias` | Application alias used in MCP URLs (the path segment after `/app/`, e.g. `register-test`). Required to use the MCP feature. |
| `pegaClientId` | Client ID from your Pega OAuth registration. |
| `pegaClientSecret` | Only for confidential clients (leave blank for public + PKCE). |
| `pegaRedirectUri` | Must match what's registered in Pega. |
| `sessionSecret` | Auto-generated on first run if absent — you don't need to set this manually. |

You can also set the same values via env vars (`PEGA_BASE_URL`, `PEGA_APP_ALIAS`, `PEGA_CLIENT_ID`, `PEGA_CLIENT_SECRET`, `PEGA_REDIRECT_URI`, `PEGA_SCOPES`). When both are present, `.aiapp-config.json` takes precedence.

### 3. Run the app

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. If config is missing or incomplete, you'll be redirected to **/settings** where you can fill in or edit values through the UI — saves go back to the same `.aiapp-config.json`.

Once the required fields are set, click **Sign in →** to start the OAuth flow. After signing in you land on `/chat`; the **MCP** tab is also available from the sidebar once `pegaAppAlias` is configured.

## How it works

```
Browser ─▶ /api/auth/login    → 302 to Pega /authorize (with PKCE)
        ◀─ Pega redirects back to /api/auth/callback?code=…
Browser ─▶ /api/auth/callback → exchanges code for tokens, stores them in session cookie
                                redirects to /chat
Browser ─▶ /api/agents        → server fetches the AI-agents list using the user's token
Browser ─▶ /api/agent-card    → server fetches a single agent's A2A card
Browser ─▶ /api/chat          → server uses A2AClient with the user's bearer token,
                                preserves contextId per conversation, returns reply
Browser ─▶ /api/mcp/call      → server proxies an MCP tool invocation to Pega
```

Tokens never leave the server. Refresh tokens (if Pega issues them) are used transparently when the access token is within 30s of expiring.

## Project layout

```
src/
  app/
    api/
      auth/{login,callback,logout,me}/route.ts   OAuth flow
      agents/route.ts                            agent discovery
      agent-card/route.ts                        single-agent A2A card
      chat/route.ts                              send message
      mcp/call/route.ts                          MCP tool invocation
      config/route.ts                            read/write app config
    chat/page.tsx + ChatClient.tsx               chat UI
    mcp/page.tsx + McpClient.tsx                 MCP tools UI
    settings/page.tsx + SettingsClient.tsx       config form
    login/page.tsx                               login screen
    page.tsx                                     redirects based on auth/config
  components/
    Sidebar.tsx                                  shared navigation
  lib/
    a2a/                                         ported A2A client + schemas
    config.ts                                    file + env config loader
    session.ts                                   iron-session helpers
    pega-oauth.ts                                PKCE, code exchange, refresh
```

## Potential roadmap/improvements

- File attachments (the A2A client port has the upload helper available)
- Server-side conversation persistence (currently localStorage)
- Streaming responses if the Pega A2A endpoint adds SSE
- Rich rendering of structured `DataPart` / `FilePart` content
