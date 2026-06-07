import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config as loadDotenv } from "dotenv";
import { AgentSession } from "./agent.js";
import { TabManager } from "./tabs.js";
import { Storage } from "./storage.js";
import type {
  ContentBounds,
  Settings,
  TabKind,
  TabsState,
  WindowState,
} from "../shared/ipc.js";

loadDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));

let win: BrowserWindow | null = null;
let tabs: TabManager | null = null;
const storage = new Storage();
const agent = new AgentSession();

async function createWindow(): Promise<void> {
  await storage.init();
  const settings = await storage.getSettings();
  const bounds = await storage.getWindowBounds();

  win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 800,
    minHeight: 500,
    title: "ai-browser",
    backgroundColor: "#202124",
    frame: process.platform === "darwin",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
    trafficLightPosition: process.platform === "darwin" ? { x: 12, y: 12 } : undefined,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      sandbox: false,
    },
  });
  if (bounds.maximized) win.maximize();

  tabs = new TabManager(win, storage, (s) => sendTabsState(s));

  win.on("maximize", emitWindowState);
  win.on("unmaximize", emitWindowState);
  win.on("enter-full-screen", emitWindowState);
  win.on("leave-full-screen", emitWindowState);

  let saveTimer: NodeJS.Timeout | null = null;
  const persistBounds = () => {
    if (!win) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!win) return;
      const [width, height] = win.getSize();
      const [x, y] = win.getPosition();
      void storage.saveWindowBounds({ width, height, x, y, maximized: win.isMaximized() });
    }, 400);
  };
  win.on("resize", persistBounds);
  win.on("move", persistBounds);
  win.on("maximize", persistBounds);
  win.on("unmaximize", persistBounds);

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) await win.loadURL(devUrl);
  else await win.loadFile(join(__dirname, "../renderer/index.html"));

  const saved = await storage.getSession();
  if (saved.tabs.length > 0) {
    for (const t of saved.tabs) tabs.create({ url: t.url, kind: "web", activate: false });
    const list = tabs.state().tabs;
    const target = list[Math.min(saved.activeIndex, list.length - 1)];
    if (target) tabs.activate(target.id);
  } else {
    tabs.create({ kind: settings.homepage === "about:newtab" ? "newtab" : "web", url: settings.homepage });
  }
}

function persistSession(): void {
  if (!tabs) return;
  void storage.saveSession(tabs.snapshot());
}

function sendTabsState(s: TabsState): void {
  win?.webContents.send("tabs:state", s);
  persistSession();
}

function emitWindowState(): void {
  if (!win) return;
  const s: WindowState = {
    maximized: win.isMaximized(),
    fullscreen: win.isFullScreen(),
    platform: process.platform,
  };
  win.webContents.send("window:state", s);
}

function emitBookmarks(): void {
  void storage.listBookmarks().then((b) => win?.webContents.send("bookmarks:list", b));
}

function emitSettings(s: Settings): void {
  win?.webContents.send("settings:state", s);
}

ipcMain.handle("tab:new", async (_, opts?: { url?: string; kind?: TabKind; activate?: boolean }) => {
  return tabs?.create(opts ?? {});
});
ipcMain.handle("tab:close", async (_, id: string) => tabs?.close(id));
ipcMain.handle("tab:activate", async (_, id: string) => tabs?.activate(id));
ipcMain.handle("tab:reorder", async (_, fromId: string, toId: string) => tabs?.reorder(fromId, toId));
ipcMain.handle("tab:setInternal", async (_, id: string, kind: TabKind) => tabs?.setInternal(id, kind));

ipcMain.handle("nav:goto", async (_, url: string, tabId?: string) => {
  await tabs?.navigate(normalizeUrl(url, await storage.getSettings()), tabId);
});
ipcMain.handle("nav:back", async (_, tabId?: string) => tabs?.goBack(tabId));
ipcMain.handle("nav:forward", async (_, tabId?: string) => tabs?.goForward(tabId));
ipcMain.handle("nav:reload", async (_, tabId?: string) => tabs?.reload(tabId));
ipcMain.handle("nav:stop", async (_, tabId?: string) => tabs?.stop(tabId));

ipcMain.handle("bookmarks:list", () => storage.listBookmarks());
ipcMain.handle("bookmarks:add", async (_, url: string, title: string) => {
  await storage.addBookmark(url, title);
  emitBookmarks();
});
ipcMain.handle("bookmarks:remove", async (_, id: string) => {
  await storage.removeBookmark(id);
  emitBookmarks();
});

ipcMain.handle("history:list", (_, limit?: number) => storage.listHistory(limit));
ipcMain.handle("history:mostVisited", (_, limit: number) => storage.mostVisited(limit));
ipcMain.handle("history:clear", () => storage.clearHistory());
ipcMain.handle("history:remove", (_, url: string) => storage.removeHistory(url));

ipcMain.handle("settings:get", () => storage.getSettings());
ipcMain.handle("settings:set", async (_, patch: Partial<Settings>) => {
  const next = await storage.patchSettings(patch);
  emitSettings(next);
  return next;
});

ipcMain.handle("window:minimize", () => win?.minimize());
ipcMain.handle("window:maxToggle", () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.handle("window:close", () => win?.close());
ipcMain.handle("window:getState", () => {
  if (!win) return null;
  return {
    maximized: win.isMaximized(),
    fullscreen: win.isFullScreen(),
    platform: process.platform,
  };
});

ipcMain.handle("layout:setBounds", (_, bounds: ContentBounds) => tabs?.setBounds(bounds));

ipcMain.handle("agent:ask", async (_, prompt: string) => {
  const wc = tabs?.activeWebContents();
  if (!wc || !win) return;
  const settings = await storage.getSettings();
  await agent.run(
    prompt,
    wc,
    { model: settings.agentModel, maxSteps: settings.agentMaxSteps },
    (event) => win?.webContents.send("agent:event", event),
  );
});
ipcMain.handle("agent:cancel", () => agent.cancel());

ipcMain.handle("devtools:toggle", () => {
  const wc = tabs?.activeWebContents();
  if (!wc) return;
  if (wc.isDevToolsOpened()) wc.closeDevTools();
  else wc.openDevTools({ mode: "right" });
});

ipcMain.handle("find:start", (_, query: string, forward: boolean) => {
  const wc = tabs?.activeWebContents();
  if (!wc || !query) return;
  wc.findInPage(query, { forward, findNext: false });
});

ipcMain.handle("find:next", (_, forward: boolean) => {
  const wc = tabs?.activeWebContents();
  if (!wc) return;
  wc.findInPage("", { forward, findNext: true });
});

ipcMain.handle("find:stop", () => {
  const wc = tabs?.activeWebContents();
  if (!wc) return;
  wc.stopFindInPage("clearSelection");
});

function normalizeUrl(raw: string, settings: Settings): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("about:") || trimmed.startsWith("file://")) return trimmed;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return searchUrl(trimmed, settings.searchEngine);
}

function searchUrl(query: string, engine: Settings["searchEngine"]): string {
  const q = encodeURIComponent(query);
  switch (engine) {
    case "google":
      return `https://www.google.com/search?q=${q}`;
    case "bing":
      return `https://www.bing.com/search?q=${q}`;
    case "duckduckgo":
    default:
      return `https://duckduckgo.com/?q=${q}`;
  }
}

app.whenReady().then(createWindow);

app.on("before-quit", () => persistSession());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
