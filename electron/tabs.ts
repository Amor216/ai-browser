import { WebContentsView, type BrowserWindow, type WebContents } from "electron";
import type { ContentBounds, TabInfo, TabKind, TabsState } from "../shared/ipc.js";
import type { Storage } from "./storage.js";

type Tab = {
  id: string;
  kind: TabKind;
  view: WebContentsView | null;
  title: string;
  url: string;
  favicon: string | null;
  loading: boolean;
};

type Emit = (state: TabsState) => void;

export class TabManager {
  private tabs: Tab[] = [];
  private activeId: string | null = null;
  private bounds: ContentBounds = { x: 0, y: 0, width: 0, height: 0 };

  constructor(private win: BrowserWindow, private storage: Storage, private emit: Emit) {}

  state(): TabsState {
    return {
      activeId: this.activeId,
      tabs: this.tabs.map((t) => this.infoOf(t)),
    };
  }

  activeWebContents(): WebContents | null {
    const active = this.findActive();
    return active?.view?.webContents ?? null;
  }

  setBounds(bounds: ContentBounds): void {
    this.bounds = bounds;
    this.applyBoundsToActive();
  }

  create(opts: { url?: string; kind?: TabKind; activate?: boolean } = {}): string {
    const id = randomId();
    const kind: TabKind = opts.kind ?? (opts.url ? "web" : "newtab");
    const url = opts.url ?? internalUrl(kind);
    const tab: Tab = {
      id,
      kind,
      title: titleFor(kind, url),
      url,
      favicon: null,
      loading: false,
      view: kind === "web" ? this.spawnView(id) : null,
    };
    this.tabs = [...this.tabs, tab];
    if (opts.activate !== false) this.activate(id);
    if (tab.view && opts.url) tab.view.webContents.loadURL(opts.url);
    this.notify();
    return id;
  }

  close(id: string): void {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    if (tab.view) {
      this.win.contentView.removeChildView(tab.view);
      tab.view.webContents.close();
    }
    this.tabs = this.tabs.filter((t) => t.id !== id);
    if (this.activeId === id) {
      this.activeId = null;
      const next = this.tabs[this.tabs.length - 1];
      if (next) this.activate(next.id);
      else this.create({ kind: "newtab" });
    }
    this.notify();
  }

  activate(id: string): void {
    if (this.activeId === id) return;
    const prev = this.findActive();
    if (prev?.view) this.win.contentView.removeChildView(prev.view);
    const next = this.tabs.find((t) => t.id === id);
    if (!next) return;
    this.activeId = id;
    if (next.view) {
      this.win.contentView.addChildView(next.view);
      this.applyBoundsToActive();
    }
    this.notify();
  }

  reorder(fromId: string, toId: string): void {
    if (fromId === toId) return;
    const from = this.tabs.findIndex((t) => t.id === fromId);
    const to = this.tabs.findIndex((t) => t.id === toId);
    if (from < 0 || to < 0) return;
    const moved = this.tabs[from];
    const without = this.tabs.filter((_, i) => i !== from);
    const insertAt = to > from ? to : to;
    this.tabs = [...without.slice(0, insertAt), moved, ...without.slice(insertAt)];
    this.notify();
  }

  setInternal(id: string, kind: TabKind): void {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    if (tab.view) {
      this.win.contentView.removeChildView(tab.view);
      tab.view.webContents.close();
      tab.view = null;
    }
    tab.kind = kind;
    tab.url = internalUrl(kind);
    tab.title = titleFor(kind, tab.url);
    tab.favicon = null;
    tab.loading = false;
    this.notify();
  }

  async navigate(url: string, tabId?: string): Promise<void> {
    const tab = this.targetTab(tabId);
    if (!tab) return;
    if (!tab.view) {
      tab.view = this.spawnView(tab.id);
      tab.kind = "web";
      if (this.activeId === tab.id) {
        this.win.contentView.addChildView(tab.view);
        this.applyBoundsToActive();
      }
    }
    tab.url = url;
    await tab.view.webContents.loadURL(url);
  }

  goBack(tabId?: string): void {
    const wc = this.targetTab(tabId)?.view?.webContents;
    if (wc?.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
  }

  goForward(tabId?: string): void {
    const wc = this.targetTab(tabId)?.view?.webContents;
    if (wc?.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
  }

  reload(tabId?: string): void {
    this.targetTab(tabId)?.view?.webContents.reload();
  }

  stop(tabId?: string): void {
    this.targetTab(tabId)?.view?.webContents.stop();
  }

  private targetTab(tabId?: string): Tab | undefined {
    return tabId ? this.tabs.find((t) => t.id === tabId) : this.findActive();
  }

  private findActive(): Tab | undefined {
    return this.activeId ? this.tabs.find((t) => t.id === this.activeId) : undefined;
  }

  private applyBoundsToActive(): void {
    const tab = this.findActive();
    if (!tab?.view) return;
    tab.view.setBounds({
      x: Math.round(this.bounds.x),
      y: Math.round(this.bounds.y),
      width: Math.max(0, Math.round(this.bounds.width)),
      height: Math.max(0, Math.round(this.bounds.height)),
    });
  }

  private spawnView(tabId: string): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        partition: "persist:tab",
      },
    });
    const wc = view.webContents;
    wc.setWindowOpenHandler(({ url }) => {
      this.create({ url, kind: "web", activate: true });
      return { action: "deny" };
    });
    wc.on("page-title-updated", (_, title) => this.patch(tabId, { title }));
    wc.on("page-favicon-updated", (_, icons) => this.patch(tabId, { favicon: icons[0] ?? null }));
    wc.on("did-start-loading", () => this.patch(tabId, { loading: true }));
    wc.on("did-stop-loading", () => this.patch(tabId, { loading: false }));
    wc.on("did-navigate", (_, url) => {
      this.patch(tabId, { url });
      void this.storage.recordVisit(url, wc.getTitle());
    });
    wc.on("did-navigate-in-page", (_, url, isMainFrame) => {
      if (isMainFrame) this.patch(tabId, { url });
    });
    return view;
  }

  private patch(tabId: string, patch: Partial<Tab>): void {
    const idx = this.tabs.findIndex((t) => t.id === tabId);
    if (idx < 0) return;
    this.tabs = this.tabs.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    this.notify();
  }

  private infoOf(t: Tab): TabInfo {
    const wc = t.view?.webContents;
    return {
      id: t.id,
      kind: t.kind,
      url: t.url,
      title: t.title,
      favicon: t.favicon,
      loading: t.loading,
      canGoBack: wc?.navigationHistory.canGoBack() ?? false,
      canGoForward: wc?.navigationHistory.canGoForward() ?? false,
    };
  }

  private notify(): void {
    this.emit(this.state());
  }
}

function internalUrl(kind: TabKind): string {
  switch (kind) {
    case "newtab":
      return "about:newtab";
    case "history":
      return "about:history";
    case "settings":
      return "about:settings";
    case "bookmarks":
      return "about:bookmarks";
    default:
      return "about:blank";
  }
}

function titleFor(kind: TabKind, url: string): string {
  switch (kind) {
    case "newtab":
      return "New Tab";
    case "history":
      return "History";
    case "settings":
      return "Settings";
    case "bookmarks":
      return "Bookmarks";
    default:
      return url;
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 11);
}
