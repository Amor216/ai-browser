import { useEffect, useRef, useState } from "react";
import type { AgentEvent } from "../../shared/ipc.js";
import { ToolCallChip } from "./ToolCallChip.js";

type Props = {
  events: AgentEvent[];
  busy: boolean;
  onAsk(prompt: string): void;
  onCancel(): void;
};

export function Sidebar({ events, busy, onAsk, onCancel }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    onAsk(draft);
    setDraft("");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span>Assistant</span>
        {busy ? <button onClick={onCancel}>cancel</button> : null}
      </div>
      <div className="sidebar-body" ref={scrollRef}>
        {events.length === 0 ? (
          <Hint />
        ) : (
          events.map((e, i) => <Event key={i} ev={e} />)
        )}
      </div>
      <form className="sidebar-input" onSubmit={submit}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          placeholder={busy ? "Working..." : "Ask the agent about this page..."}
          rows={2}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
    </aside>
  );
}

function Event({ ev }: { ev: AgentEvent }) {
  switch (ev.kind) {
    case "text_delta":
      return <span className="text">{ev.text}</span>;
    case "tool_call":
      return <ToolCallChip name={ev.name} args={ev.args} />;
    case "tool_result":
      return <div className={`tool-result ${ev.ok ? "" : "err"}`}>{ev.preview}</div>;
    case "done":
      return (
        <div className="usage">
          {ev.usage.in.toLocaleString()} in, {ev.usage.out.toLocaleString()} out,
          {" "}${ev.usage.cost.toFixed(4)}, {ev.usage.toolCalls} tool calls
        </div>
      );
    case "error":
      return <div className="error">error: {ev.message}</div>;
  }
}

function Hint() {
  return (
    <div className="hint">
      Type below to ask the agent about the current page.
      <br /><br />
      Examples:
      <br />- "Summarize this page in 3 bullets"
      <br />- "What are the top 3 stories?"
      <br />- "Click the first link"
    </div>
  );
}
