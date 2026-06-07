import { useEffect, useState } from "react";
import type { HistoryEntry } from "../../shared/ipc.js";
import { FaviconImg, Trash } from "../icons.js";

type Props = {
  onNavigate(url: string): void;
};

export function HistoryPage({ onNavigate }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const list = await window.api.historyList(1000);
    setEntries(list);
  }

  const visible = filter
    ? entries.filter(
        (e) =>
          e.url.toLowerCase().includes(filter.toLowerCase()) ||
          e.title.toLowerCase().includes(filter.toLowerCase()),
      )
    : entries;

  const grouped = groupByDay(visible);

  return (
    <div className="internal-page">
      <div className="internal-head">
        <h1>History</h1>
        <input
          className="internal-filter"
          placeholder="Search history"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button
          className="internal-action"
          onClick={async () => {
            if (confirm("Clear all browsing history?")) {
              await window.api.historyClear();
              await refresh();
            }
          }}
        >
          Clear all
        </button>
      </div>
      <div className="internal-body">
        {grouped.length === 0 ? (
          <div className="empty">Nothing here yet.</div>
        ) : (
          grouped.map(({ day, items }) => (
            <div key={day} className="history-day">
              <h2>{day}</h2>
              {items.map((e) => (
                <div key={e.url + e.visitedAt} className="history-row">
                  <span className="history-time">{formatTime(e.visitedAt)}</span>
                  <FaviconImg url={faviconOf(e.url)} size={16} />
                  <button className="history-link" onClick={() => onNavigate(e.url)}>
                    <span className="history-title">{e.title || e.url}</span>
                    <span className="history-url">{e.url}</span>
                  </button>
                  <button
                    className="history-remove"
                    onClick={async () => {
                      await window.api.historyRemove(e.url);
                      await refresh();
                    }}
                    aria-label="Remove"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function groupByDay(entries: HistoryEntry[]): { day: string; items: HistoryEntry[] }[] {
  const buckets = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    const day = dayLabel(e.visitedAt);
    const list = buckets.get(day) ?? [];
    list.push(e);
    buckets.set(day, list);
  }
  return Array.from(buckets, ([day, items]) => ({ day, items }));
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString();
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function faviconOf(url: string): string | null {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return null;
  }
}
