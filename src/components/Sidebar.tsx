import { useEffect, useRef } from "react";
import type { AgentEvent } from "../../shared/ipc.js";
import { ToolCallChip } from "./ToolCallChip.js";

type Props = {
  events: AgentEvent[];
  busy: boolean;
  onCancel(): void;
};

export function Sidebar({ events, busy, onCancel }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

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
      Try: "summarize this page", "open hackernews", "click the first headline".
      <br />
      Or paste a URL to navigate.
    </div>
  );
}
