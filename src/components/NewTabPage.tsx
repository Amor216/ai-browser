import { useEffect, useState } from "react";
import type { HistoryEntry } from "../../shared/ipc.js";
import { FaviconImg, Search } from "../icons.js";

type Props = {
  onNavigate(url: string): void;
};

export function NewTabPage({ onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [shortcuts, setShortcuts] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    void window.api.historyMostVisited(8).then(setShortcuts);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) onNavigate(query);
  }

  return (
    <div className="newtab">
      <div className="newtab-logo">ai-browser</div>
      <form className="newtab-search" onSubmit={onSubmit}>
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the web or enter a URL"
          autoFocus
        />
      </form>
      <div className="shortcuts">
        {shortcuts.map((s) => (
          <button key={s.url} className="shortcut" onClick={() => onNavigate(s.url)}>
            <div className="shortcut-icon">
              <FaviconImg url={faviconOf(s.url)} size={20} />
            </div>
            <div className="shortcut-title">{shortTitle(s)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function shortTitle(e: HistoryEntry): string {
  if (e.title && e.title !== e.url) return e.title.slice(0, 24);
  try {
    return new URL(e.url).hostname.replace(/^www\./, "");
  } catch {
    return e.url.slice(0, 24);
  }
}

function faviconOf(url: string): string | null {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return null;
  }
}
