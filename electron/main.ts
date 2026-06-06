import { app, BrowserView, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config as loadDotenv } from "dotenv";
import { AgentSession } from "./agent.js";

loadDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));

const SIDEBAR_WIDTH = 380;
const TOPBAR_HEIGHT = 56;
const START_URL = "https://news.ycombinator.com";

let win: BrowserWindow | null = null;
let view: BrowserView | null = null;
const agent = new AgentSession();

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "comet-clone",
    backgroundColor: "#111",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  view = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      partition: "persist:tab",
    },
  });
  win.setBrowserView(view);
  layoutView();
  view.webContents.loadURL(START_URL);

  view.webContents.on("did-navigate", (_, url) => {
    win?.webContents.send("tab:url", url);
  });
  view.webContents.on("did-navigate-in-page", (_, url) => {
    win?.webContents.send("tab:url", url);
  });

  win.on("resize", layoutView);

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function layoutView() {
  if (!win || !view) return;
  const [w, h] = win.getContentSize();
  view.setBounds({
    x: 0,
    y: TOPBAR_HEIGHT,
    width: Math.max(0, w - SIDEBAR_WIDTH),
    height: Math.max(0, h - TOPBAR_HEIGHT),
  });
  view.setAutoResize({ width: false, height: true, horizontal: false, vertical: false });
}

ipcMain.handle("nav:goto", async (_, url: string) => {
  if (!view) return;
  await view.webContents.loadURL(normalizeUrl(url));
});

ipcMain.handle("agent:ask", async (_, prompt: string) => {
  if (!view || !win) return;
  await agent.run(prompt, view, (event) => win?.webContents.send("agent:event", event));
});

ipcMain.handle("agent:cancel", async () => {
  agent.cancel();
});

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(trimmed)) return `https://${trimmed}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
