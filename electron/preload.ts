import { contextBridge, ipcRenderer } from "electron";
import type { AgentEvent, ApiSurface } from "../shared/ipc.js";

const api: ApiSurface = {
  navigate: (url) => ipcRenderer.invoke("nav:goto", url),
  ask: (prompt) => ipcRenderer.invoke("agent:ask", prompt),
  cancel: () => ipcRenderer.invoke("agent:cancel"),
  onAgentEvent: (handler) => {
    const fn = (_: unknown, e: AgentEvent) => handler(e);
    ipcRenderer.on("agent:event", fn);
    return () => ipcRenderer.off("agent:event", fn);
  },
  onTabUrl: (handler) => {
    const fn = (_: unknown, url: string) => handler(url);
    ipcRenderer.on("tab:url", fn);
    return () => ipcRenderer.off("tab:url", fn);
  },
};

contextBridge.exposeInMainWorld("api", api);
