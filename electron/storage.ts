import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Bookmark, HistoryEntry, Settings } from "../shared/ipc.js";

export type WindowBounds = {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
};

export type SavedTab = { url: string; title: string };
export type SavedSession = { tabs: SavedTab[]; activeIndex: number };

const DEFAULTS: Settings = {
  theme: "dark",
  showBookmarkBar: true,
  showSidebar: true,
  searchEngine: "duckduckgo",
  homepage: "about:newtab",
  agentModel: process.env.COMET_MODEL || "claude-sonnet-4-5",
  agentMaxSteps: 12,
};

const HISTORY_CAP = 10_000;

class JsonStore<T> {
  private cache: T | null = null;
  private writing: Promise<void> = Promise.resolve();

  constructor(private file: string, private fallback: T) {}

  async load(): Promise<T> {
    if (this.cache !== null) return this.cache;
    try {
      const raw = await readFile(this.file, "utf8");
      this.cache = JSON.parse(raw) as T;
    } catch {
      this.cache = structuredClone(this.fallback);
    }
    return this.cache;
  }

  async save(value: T): Promise<void> {
    this.cache = value;
    this.writing = this.writing.then(() =>
      writeFile(this.file, JSON.stringify(value, null, 2), "utf8"),
    );
    await this.writing;
  }
}

const DEFAULT_BOUNDS: WindowBounds = { width: 1400, height: 900, maximized: false };
const DEFAULT_SESSION: SavedSession = { tabs: [], activeIndex: 0 };

export class Storage {
  private settings: JsonStore<Settings>;
  private bookmarks: JsonStore<Bookmark[]>;
  private history: JsonStore<HistoryEntry[]>;
  private window: JsonStore<WindowBounds>;
  private session: JsonStore<SavedSession>;

  constructor() {
    const dir = app.getPath("userData");
    this.settings = new JsonStore(join(dir, "settings.json"), DEFAULTS);
    this.bookmarks = new JsonStore(join(dir, "bookmarks.json"), []);
    this.history = new JsonStore(join(dir, "history.json"), []);
    this.window = new JsonStore(join(dir, "window.json"), DEFAULT_BOUNDS);
    this.session = new JsonStore(join(dir, "session.json"), DEFAULT_SESSION);
  }

  async init(): Promise<void> {
    await mkdir(app.getPath("userData"), { recursive: true });
    await this.settings.load();
    await this.bookmarks.load();
    await this.history.load();
    await this.window.load();
    await this.session.load();
  }

  async getWindowBounds(): Promise<WindowBounds> {
    return { ...DEFAULT_BOUNDS, ...(await this.window.load()) };
  }

  async saveWindowBounds(bounds: WindowBounds): Promise<void> {
    await this.window.save(bounds);
  }

  async getSession(): Promise<SavedSession> {
    return { ...DEFAULT_SESSION, ...(await this.session.load()) };
  }

  async saveSession(s: SavedSession): Promise<void> {
    await this.session.save(s);
  }

  async getSettings(): Promise<Settings> {
    const stored = await this.settings.load();
    return { ...DEFAULTS, ...stored };
  }

  async patchSettings(patch: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const next = { ...current, ...patch };
    await this.settings.save(next);
    return next;
  }

  async listBookmarks(): Promise<Bookmark[]> {
    return [...(await this.bookmarks.load())];
  }

  async addBookmark(url: string, title: string): Promise<Bookmark[]> {
    const list = await this.bookmarks.load();
    if (list.some((b) => b.url === url)) return [...list];
    const next: Bookmark[] = [
      ...list,
      { id: randomId(), url, title: title || url, addedAt: Date.now() },
    ];
    await this.bookmarks.save(next);
    return next;
  }

  async removeBookmark(id: string): Promise<Bookmark[]> {
    const list = await this.bookmarks.load();
    const next = list.filter((b) => b.id !== id);
    await this.bookmarks.save(next);
    return next;
  }

  async recordVisit(url: string, title: string): Promise<void> {
    if (url.startsWith("about:") || url.startsWith("data:")) return;
    const list = await this.history.load();
    const existing = list.find((e) => e.url === url);
    const now = Date.now();
    const next: HistoryEntry[] =
      existing !== undefined
        ? list.map((e) =>
            e.url === url ? { ...e, title: title || e.title, visitedAt: now, visits: e.visits + 1 } : e,
          )
        : [...list, { url, title: title || url, visitedAt: now, visits: 1 }];
    const trimmed = next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next;
    await this.history.save(trimmed);
  }

  async listHistory(limit = 500): Promise<HistoryEntry[]> {
    const list = await this.history.load();
    return [...list].sort((a, b) => b.visitedAt - a.visitedAt).slice(0, limit);
  }

  async mostVisited(limit: number): Promise<HistoryEntry[]> {
    const list = await this.history.load();
    return [...list].sort((a, b) => b.visits - a.visits).slice(0, limit);
  }

  async clearHistory(): Promise<void> {
    await this.history.save([]);
  }

  async removeHistory(url: string): Promise<void> {
    const list = await this.history.load();
    await this.history.save(list.filter((e) => e.url !== url));
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 11);
}
