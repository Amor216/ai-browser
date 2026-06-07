import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Close, Search } from "../icons.js";

type Props = {
  onClose(): void;
};

export function FindBar({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    return () => {
      void window.api.findStop();
    };
  }, []);

  useEffect(() => {
    if (!query) {
      void window.api.findStop();
      return;
    }
    void window.api.findStart(query, true);
  }, [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (query) void window.api.findNext(!e.shiftKey);
    }
  }

  return (
    <div className="findbar">
      <Search size={14} />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Find in page"
        spellCheck={false}
      />
      <button onClick={() => query && window.api.findNext(false)} aria-label="Previous">
        <ArrowLeft size={14} />
      </button>
      <button onClick={() => query && window.api.findNext(true)} aria-label="Next">
        <ArrowRight size={14} />
      </button>
      <button onClick={onClose} aria-label="Close">
        <Close size={14} />
      </button>
    </div>
  );
}
