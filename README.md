# ai-browser

A desktop browser with multi-tab Chromium under the hood and an AI side panel. The panel agent reads the active tab, navigates, clicks, types into forms, and takes screenshots through Anthropic SDK tool-use. Frameless window with a Chrome-style tab strip, omnibox, bookmark bar, history, and settings — all rendered from React, no Chrome code reused.

Built with Electron, React, and TypeScript. No agent framework: the tool-use loop is wired up directly against the Anthropic SDK.

## What it does

Open as many tabs as you want (Ctrl+T, drag to reorder, middle-click to close). The omnibox accepts URLs or queries — queries go to the configured search engine. Star a page to bookmark it; history is recorded automatically. Toggle the AI sidebar from the navbar and ask the agent to act on whatever tab is currently in front.

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
  ├── BrowserWindow (frameless on Win/Linux, hiddenInset on macOS)
  │     └── Renderer: Titlebar + TabStrip + NavBar + Sidebar
  │           Renderer reports the content viewport rect → main sets bounds.
  │
  ├── TabManager
  │     └── WebContentsView per web tab; internal tabs (newtab/history/
  │         bookmarks/settings) have no view and are rendered in React.
  │
  ├── Storage (JSON in app.getPath('userData'))
  │     └── settings.json, bookmarks.json, history.json (10k cap)
  │
  └── AgentSession
        ├── @anthropic-ai/sdk streaming
        ├── runs tools against the active tab's webContents
        └── emits AgentEvent over IPC
```

A few decisions worth calling out:

**Layout is renderer-driven.** Instead of hardcoding sidebar/topbar dimensions in the main process, the renderer measures the content `<div>` with a ResizeObserver and sends bounds to main. Toggling the sidebar or the bookmark bar just works — no IPC for layout state.

**Internal pages are React, not chrome://.** Tabs have a `kind`: `web` tabs own a WebContentsView, `newtab`/`history`/`bookmarks`/`settings` don't. When the active tab is internal, the content `<div>` shows the React page; otherwise it's empty and the WebContentsView covers it.

**The agent lives in the main process.** API key stays out of the renderer, and the agent drives `webContents` directly without an extra IPC hop per tool call.

**Tools are typed and shared with the model verbatim.** `electron/tools.ts` exports a `TOOL_DEFS` constant that is both what the agent sends to the API and what gets dispatched in `runTool`. One source of truth.

## Layout

```
electron/
  index.ts       BrowserWindow, IPC handlers, search normalization
  tabs.ts        TabManager: WebContentsView per tab, drag-reorder, internal tabs
  storage.ts     JSON-backed settings/bookmarks/history
  agent.ts       AgentSession: streaming tool-use loop
  tools.ts       6 tools, each calling into a WebContents
  preload.ts     contextBridge → window.api
  pricing.ts     per-model token cost
src/
  App.tsx        orchestration, content-bounds resize observer, keyboard shortcuts
  icons.tsx      inline SVG icons (no icon library)
  components/
    Titlebar.tsx, TabStrip.tsx, Tab.tsx
    NavBar.tsx, Omnibox.tsx, BookmarkBar.tsx, MenuDropdown.tsx
    NewTabPage.tsx, HistoryPage.tsx, BookmarksPage.tsx, SettingsPage.tsx
    Sidebar.tsx, ToolCallChip.tsx
  styles.css     light + dark themes via [data-theme]
shared/
  ipc.ts         TabsState, AgentEvent, ApiSurface — one typed surface
```

## Keyboard

| Shortcut | Action |
|---|---|
| Ctrl+T | New tab |
| Ctrl+W | Close tab |
| Ctrl+L | Focus omnibox |
| Ctrl+R | Reload |
| Ctrl+Tab / Ctrl+Shift+Tab | Cycle tabs |
| Middle-click on tab | Close tab |

## Limits

- No profiles / no incognito split (one persisted partition for all tabs).
- No DevTools shortcut wired in the UI.
- No extension support.
- Sites with strict bot detection (Cloudflare interstitials, Google login) won't cooperate with the agent.

## License

MIT.
