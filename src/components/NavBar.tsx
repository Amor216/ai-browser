import type { TabInfo } from "../../shared/ipc.js";
import { ArrowLeft, ArrowRight, MoreVertical, Reload, Sparkles, Star, Stop } from "../icons.js";
import { Omnibox } from "./Omnibox.js";

type Props = {
  tab: TabInfo | null;
  bookmarked: boolean;
  sidebarOpen: boolean;
  onNavigate(url: string): void;
  onToggleBookmark(): void;
  onToggleSidebar(): void;
  onOpenMenu(rect: DOMRect): void;
};

export function NavBar({
  tab,
  bookmarked,
  sidebarOpen,
  onNavigate,
  onToggleBookmark,
  onToggleSidebar,
  onOpenMenu,
}: Props) {
  const url = tab?.url ?? "";
  const loading = tab?.loading ?? false;
  const isInternal = tab !== null && tab.kind !== "web";

  return (
    <div className="navbar">
      <button
        className="nav-btn"
        disabled={!tab?.canGoBack}
        onClick={() => window.api.goBack()}
        aria-label="Back"
      >
        <ArrowLeft size={18} />
      </button>
      <button
        className="nav-btn"
        disabled={!tab?.canGoForward}
        onClick={() => window.api.goForward()}
        aria-label="Forward"
      >
        <ArrowRight size={18} />
      </button>
      <button
        className="nav-btn"
        onClick={() => (loading ? window.api.stop() : window.api.reload())}
        aria-label={loading ? "Stop" : "Reload"}
      >
        {loading ? <Stop size={18} /> : <Reload size={18} />}
      </button>

      <Omnibox url={url} loading={loading} onSubmit={onNavigate} />

      <button
        className={`nav-btn ${bookmarked ? "filled" : ""}`}
        onClick={onToggleBookmark}
        disabled={isInternal}
        aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        <Star size={18} />
      </button>
      <button
        className={`nav-btn ${sidebarOpen ? "active" : ""}`}
        onClick={onToggleSidebar}
        aria-label="Toggle AI sidebar"
        title="AI assistant"
      >
        <Sparkles size={18} />
      </button>
      <button
        className="nav-btn"
        onClick={(e) => onOpenMenu(e.currentTarget.getBoundingClientRect())}
        aria-label="Menu"
      >
        <MoreVertical size={18} />
      </button>
    </div>
  );
}
