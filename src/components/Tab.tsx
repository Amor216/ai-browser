import type { DragEvent } from "react";
import type { TabInfo } from "../../shared/ipc.js";
import { Close, FaviconImg } from "../icons.js";

type Props = {
  tab: TabInfo;
  active: boolean;
  onActivate(): void;
  onClose(): void;
  onDropOn(fromId: string): void;
};

export function Tab({ tab, active, onActivate, onClose, onDropOn }: Props) {
  function onDragStart(e: DragEvent) {
    e.dataTransfer.setData("text/x-tab-id", tab.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: DragEvent) {
    if (e.dataTransfer.types.includes("text/x-tab-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }

  function onDrop(e: DragEvent) {
    const fromId = e.dataTransfer.getData("text/x-tab-id");
    if (fromId && fromId !== tab.id) onDropOn(fromId);
  }

  function onAuxClick(e: React.MouseEvent) {
    if (e.button === 1) {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div
      className={`tab ${active ? "active" : ""} ${tab.loading ? "loading" : ""}`}
      onClick={onActivate}
      onAuxClick={onAuxClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      title={tab.title}
    >
      <div className="tab-favicon">
        {tab.loading ? <Spinner /> : <FaviconImg url={tab.favicon} size={16} />}
      </div>
      <div className="tab-title">{tab.title}</div>
      <button
        className="tab-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close tab"
      >
        <Close size={14} />
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="spinner">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="14 42" strokeLinecap="round" />
    </svg>
  );
}
