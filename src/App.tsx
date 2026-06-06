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

  function onNavigate(url: string) {
    if (!url.trim()) return;
    window.api.navigate(url);
  }

  function onAsk(prompt: string) {
    const p = prompt.trim();
    if (!p || busy) return;
    setEvents((prev) => [...prev, { kind: "text_delta", text: `\n> ${p}\n` }]);
    setBusy(true);
    window.api.ask(p);
  }

  return (
    <div className="app">
      <TopBar value={tabUrl} onNavigate={onNavigate} />
      <div className="body">
        <div className="tab-slot" />
        <Sidebar
          events={events}
          busy={busy}
          onAsk={onAsk}
          onCancel={() => window.api.cancel()}
        />
      </div>
    </div>
  );
}
