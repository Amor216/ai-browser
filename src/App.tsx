import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  AgentEvent,
  Bookmark,
  Settings,
  TabInfo,
  TabsState,
  WindowState,
} from "../shared/ipc.js";
import { BookmarkBar } from "./components/BookmarkBar.js";
import { BookmarksPage } from "./components/BookmarksPage.js";
import { FindBar } from "./components/FindBar.js";
import { HistoryPage } from "./components/HistoryPage.js";
import { MenuDropdown, type MenuAction } from "./components/MenuDropdown.js";
import { NavBar } from "./components/NavBar.js";
import { NewTabPage } from "./components/NewTabPage.js";
import { SettingsPage } from "./components/SettingsPage.js";
import { Sidebar } from "./components/Sidebar.js";
import { TabStrip } from "./components/TabStrip.js";
import { Titlebar } from "./components/Titlebar.js";

export function App() {
  const [tabs, setTabs] = useState<TabsState>({ tabs: [], activeId: null });
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [windowState, setWindowState] = useState<WindowState | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [findOpen, setFindOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => window.api.onTabsState(setTabs), []);
  useEffect(() => window.api.onBookmarks(setBookmarks), []);
  useEffect(() => window.api.onSettings(setSettings), []);
  useEffect(() => window.api.onWindowState(setWindowState), []);
  useEffect(() => {
    return window.api.onAgentEvent((e) => {
      setEvents((prev) => [...prev, e]);
      if (e.kind === "done" || e.kind === "error") setBusy(false);
    });
  }, []);

  useEffect(() => {
    void window.api.bookmarkList().then(setBookmarks);
    void window.api.settingsGet().then(setSettings);
    void window.api.windowGetState().then(setWindowState);
  }, []);

  useEffect(() => {
    if (settings?.theme) {
      const resolved = resolveTheme(settings.theme);
      document.documentElement.setAttribute("data-theme", resolved);
    }
  }, [settings?.theme]);

  const activeTab = useMemo<TabInfo | null>(
    () => tabs.tabs.find((t) => t.id === tabs.activeId) ?? null,
    [tabs],
  );

  const showSidebar = settings?.showSidebar ?? true;
  const showBookmarkBar = settings?.showBookmarkBar ?? true;

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || activeTab?.kind !== "web") {
      void window.api.setContentBounds({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }
    const update = () => {
      const r = el.getBoundingClientRect();
      void window.api.setContentBounds({ x: r.left, y: r.top, width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [activeTab?.kind, activeTab?.id, showSidebar, showBookmarkBar]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "t") {
        e.preventDefault();
        void window.api.tabNew({ kind: "newtab" });
      } else if (mod && e.key === "w") {
        e.preventDefault();
        if (activeTab) void window.api.tabClose(activeTab.id);
      } else if (mod && e.key === "r") {
        e.preventDefault();
        void window.api.reload();
      } else if (mod && e.key === "l") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(".omnibox input");
        input?.focus();
      } else if (mod && e.key === "Tab") {
        e.preventDefault();
        cycleTab(tabs, e.shiftKey ? -1 : 1);
      } else if (mod && e.key === "f") {
        e.preventDefault();
        setFindOpen(true);
      } else if (mod && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault();
        void window.api.devToolsToggle();
      } else if (e.key === "F12") {
        e.preventDefault();
        void window.api.devToolsToggle();
      } else if (e.key === "Escape" && findOpen) {
        setFindOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab, tabs, findOpen]);

  function onNavigate(value: string) {
    if (!value.trim()) return;
    if (!activeTab) {
      void window.api.tabNew({ url: value });
      return;
    }
    if (activeTab.kind !== "web") {
      void window.api.tabSetInternal(activeTab.id, "web").then(() => window.api.navigate(value, activeTab.id));
    } else {
      void window.api.navigate(value, activeTab.id);
    }
  }

  function onAsk(prompt: string) {
    const p = prompt.trim();
    if (!p || busy) return;
    setEvents((prev) => [...prev, { kind: "text_delta", text: `\n> ${p}\n` }]);
    setBusy(true);
    void window.api.ask(p);
  }

  function onToggleBookmark() {
    if (!activeTab || activeTab.kind !== "web") return;
    const existing = bookmarks.find((b) => b.url === activeTab.url);
    if (existing) void window.api.bookmarkRemove(existing.id);
    else void window.api.bookmarkAdd(activeTab.url, activeTab.title);
  }

  function onMenuPick(action: MenuAction) {
    setMenuAnchor(null);
    if (!activeTab) return;
    if (action === "new-tab") void window.api.tabNew({ kind: "newtab" });
    else if (action === "history") void window.api.tabSetInternal(activeTab.id, "history");
    else if (action === "bookmarks") void window.api.tabSetInternal(activeTab.id, "bookmarks");
    else if (action === "settings") void window.api.tabSetInternal(activeTab.id, "settings");
    else if (action === "toggle-bookmark-bar" && settings)
      void window.api.settingsSet({ showBookmarkBar: !settings.showBookmarkBar });
    else if (action === "new-window") void window.api.tabNew({ kind: "newtab" });
  }

  function onToggleSidebar() {
    if (!settings) return;
    void window.api.settingsSet({ showSidebar: !settings.showSidebar });
  }

  const bookmarked = activeTab ? bookmarks.some((b) => b.url === activeTab.url) : false;

  return (
    <div className="app">
      <Titlebar state={windowState}>
        <TabStrip state={tabs} />
      </Titlebar>
      <NavBar
        tab={activeTab}
        bookmarked={bookmarked}
        sidebarOpen={showSidebar}
        onNavigate={onNavigate}
        onToggleBookmark={onToggleBookmark}
        onToggleSidebar={onToggleSidebar}
        onOpenMenu={(rect) => setMenuAnchor(rect)}
      />
      {showBookmarkBar ? <BookmarkBar bookmarks={bookmarks} /> : null}
      {findOpen ? <FindBar onClose={() => setFindOpen(false)} /> : null}
      <div className="body">
        <div className="content" ref={contentRef}>
          {activeTab?.kind === "newtab" ? <NewTabPage onNavigate={onNavigate} /> : null}
          {activeTab?.kind === "history" ? <HistoryPage onNavigate={onNavigate} /> : null}
          {activeTab?.kind === "bookmarks" ? (
            <BookmarksPage bookmarks={bookmarks} onNavigate={onNavigate} />
          ) : null}
          {activeTab?.kind === "settings" && settings ? (
            <SettingsPage settings={settings} onChange={(p) => window.api.settingsSet(p)} />
          ) : null}
        </div>
        {showSidebar ? (
          <Sidebar
            events={events}
            busy={busy}
            onAsk={onAsk}
            onCancel={() => window.api.cancel()}
          />
        ) : null}
      </div>
      {menuAnchor ? (
        <MenuDropdown anchor={menuAnchor} onClose={() => setMenuAnchor(null)} onPick={onMenuPick} />
      ) : null}
    </div>
  );
}

function cycleTab(state: TabsState, dir: 1 | -1): void {
  if (state.tabs.length < 2 || !state.activeId) return;
  const i = state.tabs.findIndex((t) => t.id === state.activeId);
  const next = state.tabs[(i + dir + state.tabs.length) % state.tabs.length];
  void window.api.tabActivate(next.id);
}

function resolveTheme(mode: Settings["theme"]): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}
