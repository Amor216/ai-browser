# comet-clone

A small desktop browser with an AI side panel. The panel agent reads the current Chromium tab, navigates, clicks, types into forms, and takes screenshots through Anthropic SDK tool-use. Single window, split layout: tab on the left, conversation on the right.

Built with Electron, React, and TypeScript. No agent framework: the tool-use loop is wired up directly against the Anthropic SDK.

## What it does

Type a URL in the top bar and it navigates. Type a question and the agent picks tools and answers using what's on the page.

Examples that work today:

```
> summarize this page in three bullets
> open hackernews and read me the top 3 titles
> click the first headline
> search "rust async runtime" on the current page
```

## Tools the agent has

| Tool | Effect |
|---|---|
| `get_page` | URL, title, and visible text of the current tab (capped at 30K chars) |
| `navigate` | Load a URL in the tab |
| `click` | Click the first element matching a CSS selector |
| `type_into` | Type into an input by selector, optionally submit |
| `screenshot` | Capture the tab and feed the image back to the model |
| `wait` | Sleep N ms, useful after navigation |

The model uses these in a loop, max 12 steps, with token cost reported at the end of each conversation.

## Run

```bash
npm install
cp .env.example .env  # add ANTHROPIC_API_KEY
npm run dev
```

The first launch opens to news.ycombinator.com. The top bar accepts URLs and natural language. The right panel streams the agent's reply with tool-call chips for each action.

## Architecture

```
Main process (Node)
  ├── BrowserWindow (frame + react sidebar)
  │     └── Renderer: TopBar + Sidebar (streams events from IPC)
  │
  ├── BrowserView (Chromium tab, attached to BrowserWindow)
  │     └── webContents: loadURL, executeJavaScript, capturePage
  │
  └── AgentSession
        ├── @anthropic-ai/sdk streaming
        ├── runs tools against the BrowserView
        └── emits AgentEvent over IPC (text deltas, tool calls, results, done)
```

A few decisions worth calling out:

**The agent lives in the main process, not the renderer.** Keeps the API key out of the renderer, and the agent can drive the BrowserView directly through `webContents` instead of going through extra IPC hops.

**Tools are typed and shared with the model verbatim.** `electron/tools.ts` exports a `TOOL_DEFS` constant that is both what the agent sends to the API and what gets dispatched in `runTool`. One source of truth for names and schemas.

**IPC is one typed surface.** `shared/ipc.ts` defines `AgentEvent` and `ApiSurface`. The preload exposes a typed `window.api` to the renderer. Adding a new event kind is one type and one switch arm.

## Layout

```
electron/
  main.ts        BrowserWindow, BrowserView, IPC handlers
  preload.ts     contextBridge → window.api
  agent.ts       AgentSession: streaming tool-use loop
  tools.ts       6 tools, each calling into BrowserView
  pricing.ts     per-model token cost
src/
  App.tsx        layout + event subscriptions
  components/
    TopBar.tsx       combined URL / ask input
    Sidebar.tsx      chat panel
    ToolCallChip.tsx
  styles.css
shared/
  ipc.ts         AgentEvent and ApiSurface types
tests/
  pricing.test.ts
  tools.test.ts
```

## Limits

- Single tab. No bookmarks, no history, no profile separation.
- The agent does not have a browser-back tool. Use the top bar to navigate manually if it wanders off.
- No anti-bot measures: sites with strict bot detection (Cloudflare challenge pages, Google login) won't cooperate.
- Cookies persist for the session only.

## License

MIT.
