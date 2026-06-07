import { contextBridge, ipcRenderer } from "electron";
import type {
  AgentEvent,
  ApiSurface,
  Bookmark,
  ContentBounds,
  Settings,
  TabsState,
  WindowState,
} from "../shared/ipc.js";

function on<T>(channel: string, handler: (value: T) => void): () => void {
  const fn = (_: unknown, value: T) => handler(value);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.off(channel, fn);
}

const api: ApiSurface = {
  tabNew: (opts) => ipcRenderer.invoke("tab:new", opts) as Promise<string>,
  tabClose: (id) => ipcRenderer.invoke("tab:close", id),
  tabActivate: (id) => ipcRenderer.invoke("tab:activate", id),
  tabReorder: (fromId, toId) => ipcRenderer.invoke("tab:reorder", fromId, toId),
  tabSetInternal: (id, kind) => ipcRenderer.invoke("tab:setInternal", id, kind),
  onTabsState: (h) => on<TabsState>("tabs:state", h),

  navigate: (url, tabId) => ipcRenderer.invoke("nav:goto", url, tabId),
  goBack: (tabId) => ipcRenderer.invoke("nav:back", tabId),
  goForward: (tabId) => ipcRenderer.invoke("nav:forward", tabId),
  reload: (tabId) => ipcRenderer.invoke("nav:reload", tabId),
  stop: (tabId) => ipcRenderer.invoke("nav:stop", tabId),

  bookmarkList: () => ipcRenderer.invoke("bookmarks:list") as Promise<Bookmark[]>,
  bookmarkAdd: (url, title) => ipcRenderer.invoke("bookmarks:add", url, title),
  bookmarkRemove: (id) => ipcRenderer.invoke("bookmarks:remove", id),
  onBookmarks: (h) => on<Bookmark[]>("bookmarks:list", h),

  historyList: (limit) => ipcRenderer.invoke("history:list", limit),
  historyMostVisited: (limit) => ipcRenderer.invoke("history:mostVisited", limit),
  historyClear: () => ipcRenderer.invoke("history:clear"),
  historyRemove: (url) => ipcRenderer.invoke("history:remove", url),

  settingsGet: () => ipcRenderer.invoke("settings:get") as Promise<Settings>,
  settingsSet: (patch) => ipcRenderer.invoke("settings:set", patch) as Promise<Settings>,
  onSettings: (h) => on<Settings>("settings:state", h),

  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowMaximizeToggle: () => ipcRenderer.invoke("window:maxToggle"),
  windowClose: () => ipcRenderer.invoke("window:close"),
  windowGetState: () => ipcRenderer.invoke("window:getState") as Promise<WindowState>,
  onWindowState: (h) => on<WindowState>("window:state", h),

  setContentBounds: (bounds: ContentBounds) => ipcRenderer.invoke("layout:setBounds", bounds),

  ask: (prompt) => ipcRenderer.invoke("agent:ask", prompt),
  cancel: () => ipcRenderer.invoke("agent:cancel"),
  onAgentEvent: (h) => on<AgentEvent>("agent:event", h),

  devToolsToggle: () => ipcRenderer.invoke("devtools:toggle"),
  findStart: (query, forward) => ipcRenderer.invoke("find:start", query, forward),
  findNext: (forward) => ipcRenderer.invoke("find:next", forward),
  findStop: () => ipcRenderer.invoke("find:stop"),
};

contextBridge.exposeInMainWorld("api", api);
