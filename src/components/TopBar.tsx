import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  busy: boolean;
  onSubmit(value: string): void;
};

export function TopBar({ value, busy, onSubmit }: Props) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(draft);
    if (ref.current) ref.current.blur();
  }

  return (
    <form className="topbar" onSubmit={submit}>
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type a URL or ask anything about the current page..."
        spellCheck={false}
        autoComplete="off"
      />
      <button type="submit" disabled={busy}>
        {busy ? "..." : "Go"}
      </button>
    </form>
  );
}
