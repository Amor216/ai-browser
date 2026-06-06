import { useEffect, useState } from "react";
import { TopBar } from "./components/TopBar.js";
import { Sidebar } from "./components/Sidebar.js";
import type { AgentEvent } from "../shared/ipc.js";

export function App() {
  const [tabUrl, setTabUrl] = useState("");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return window.api.onTabUrl(setTabUrl);
  }, []);

  useEffect(() => {
    return window.api.onAgentEvent((e) => {
      setEvents((prev) => [...prev, e]);
      if (e.kind === "done" || e.kind === "error") setBusy(false);
    });
  }, []);

  function onSubmit(value: string) {
    const v = value.trim();
    if (!v) return;
    if (isLikelyUrl(v)) {
      window.api.navigate(v);
      return;
    }
    setEvents((prev) => [...prev, { kind: "text_delta", text: `> ${v}\n` }]);
    setBusy(true);
    window.api.ask(v);
  }

  return (
    <div className="app">
      <TopBar value={tabUrl} onSubmit={onSubmit} busy={busy} />
      <div className="body">
        <div className="tab-slot" />
        <Sidebar events={events} busy={busy} onCancel={() => window.api.cancel()} />
      </div>
    </div>
  );
}

function isLikelyUrl(s: string): boolean {
  if (/^https?:\/\//.test(s)) return true;
  if (/\s/.test(s)) return false;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(s);
}
