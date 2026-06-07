import { useEffect, useRef, useState } from "react";
import type { HistoryEntry } from "../../shared/ipc.js";
import { Globe, Lock, Search } from "../icons.js";

type Props = {
  url: string;
  loading: boolean;
  onSubmit(value: string): void;
};

export function Omnibox({ url, loading, onSubmit }: Props) {
  const [draft, setDraft] = useState(url);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<HistoryEntry[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) setDraft(displayUrl(url));
  }, [url, focused]);

  useEffect(() => {
    if (!focused || draft.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const q = draft.toLowerCase();
    void window.api.historyList(200).then((list) => {
      if (cancelled) return;
      const matched = list
        .filter((e) => e.url.toLowerCase().includes(q) || e.title.toLowerCase().includes(q))
        .slice(0, 6);
      setSuggestions(matched);
      setHighlighted(-1);
    });
    return () => {
      cancelled = true;
    };
  }, [draft, focused]);

  function submit(value: string) {
    onSubmit(value);
    inputRef.current?.blur();
    setSuggestions([]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setHighlighted((h) => Math.min(suggestions.length - 1, h + 1));
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setHighlighted((h) => Math.max(-1, h - 1));
    } else if (e.key === "Escape") {
      setSuggestions([]);
      inputRef.current?.blur();
    }
  }

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (highlighted >= 0 && suggestions[highlighted]) submit(suggestions[highlighted].url);
    else submit(draft);
  }

  const isSecure = url.startsWith("https://");
  const isLocal = url.startsWith("about:") || url.startsWith("file://");

  return (
    <form className={`omnibox ${focused ? "focused" : ""}`} onSubmit={onSubmitForm}>
      <div className="omnibox-icon">
        {focused ? <Search size={14} /> : isLocal ? <Globe size={14} /> : isSecure ? <Lock size={14} /> : <Globe size={14} />}
      </div>
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onBlur={() => {
          setTimeout(() => setFocused(false), 120);
        }}
        onKeyDown={onKeyDown}
        placeholder="Search or enter address"
        spellCheck={false}
        autoComplete="off"
      />
      {loading ? <div className="omnibox-loading" /> : null}
      {focused && suggestions.length > 0 ? (
        <div className="omnibox-suggestions">
          {suggestions.map((s, i) => (
            <div
              key={s.url}
              className={`suggestion ${i === highlighted ? "highlighted" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(s.url);
              }}
            >
              <Globe size={14} />
              <span className="sug-title">{s.title || s.url}</span>
              <span className="sug-url">{s.url}</span>
            </div>
          ))}
        </div>
      ) : null}
    </form>
  );
}

function displayUrl(url: string): string {
  if (url.startsWith("about:")) return "";
  return url;
}
