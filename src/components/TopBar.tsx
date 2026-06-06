import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onNavigate(url: string): void;
};

export function TopBar({ value, onNavigate }: Props) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onNavigate(draft);
    if (ref.current) ref.current.blur();
  }

  return (
    <form className="topbar" onSubmit={submit}>
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Enter URL..."
        spellCheck={false}
        autoComplete="off"
      />
      <button type="submit">Go</button>
    </form>
  );
}
