export type TabKind = "web" | "newtab" | "history" | "settings" | "bookmarks";

export type TabInfo = {
  id: string;
  kind: TabKind;
  url: string;
  title: string;
  favicon: string | null;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
};

export type TabsState = {
  tabs: TabInfo[];
  activeId: string | null;
};

export type Bookmark = {
  id: string;
  url: string;
  title: string;
  addedAt: number;
};

export type HistoryEntry = {
  url: string;
  title: string;
  visitedAt: number;
  visits: number;
};

export type ThemeMode = "light" | "dark" | "system";
export type SearchEngine = "google" | "duckduckgo" | "bing";

export type Settings = {
  theme: ThemeMode;
  showBookmarkBar: boolean;
  showSidebar: boolean;
  searchEngine: SearchEngine;
  homepage: string;
  agentModel: string;
  agentMaxSteps: number;
};

export type WindowState = {
  maximized: boolean;
  fullscreen: boolean;
  platform: NodeJS.Platform;
};

export type ContentBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AgentEvent =
  | { kind: "text_delta"; text: string }
  | { kind: "tool_call"; name: string; args: Record<string, unknown> }
  | { kind: "tool_result"; name: string; preview: string; ok: boolean }
  | { kind: "done"; usage: { in: number; out: number; cost: number; toolCalls: number } }
  | { kind: "error"; message: string };

export type ApiSurface = {
  tabNew(opts?: { url?: string; kind?: TabKind; activate?: boolean }): Promise<string>;
  tabClose(id: string): Promise<void>;
  tabActivate(id: string): Promise<void>;
  tabReorder(fromId: string, toId: string): Promise<void>;
  tabSetInternal(id: string, kind: TabKind): Promise<void>;
  onTabsState(handler: (s: TabsState) => void): () => void;

  navigate(url: string, tabId?: string): Promise<void>;
  goBack(tabId?: string): Promise<void>;
  goForward(tabId?: string): Promise<void>;
  reload(tabId?: string): Promise<void>;
  stop(tabId?: string): Promise<void>;

  bookmarkList(): Promise<Bookmark[]>;
  bookmarkAdd(url: string, title: string): Promise<void>;
  bookmarkRemove(id: string): Promise<void>;
  onBookmarks(handler: (b: Bookmark[]) => void): () => void;

  historyList(limit?: number): Promise<HistoryEntry[]>;
  historyMostVisited(limit: number): Promise<HistoryEntry[]>;
  historyClear(): Promise<void>;
  historyRemove(url: string): Promise<void>;

  settingsGet(): Promise<Settings>;
  settingsSet(patch: Partial<Settings>): Promise<Settings>;
  onSettings(handler: (s: Settings) => void): () => void;

  windowMinimize(): Promise<void>;
  windowMaximizeToggle(): Promise<void>;
  windowClose(): Promise<void>;
  windowGetState(): Promise<WindowState>;
  onWindowState(handler: (s: WindowState) => void): () => void;

  setContentBounds(bounds: ContentBounds): Promise<void>;

  ask(prompt: string): Promise<void>;
  cancel(): Promise<void>;
  onAgentEvent(handler: (e: AgentEvent) => void): () => void;

  devToolsToggle(): Promise<void>;
  findStart(query: string, forward: boolean): Promise<void>;
  findNext(forward: boolean): Promise<void>;
  findStop(): Promise<void>;
};

declare global {
  interface Window {
    api: ApiSurface;
  }
}
