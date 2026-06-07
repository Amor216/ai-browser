import type { WindowState } from "../../shared/ipc.js";

type Props = {
  state: WindowState | null;
  children?: React.ReactNode;
};

export function Titlebar({ state, children }: Props) {
  const isMac = state?.platform === "darwin";
  return (
    <div className={`titlebar ${isMac ? "mac" : "win"}`}>
      <div className="drag-region">{children}</div>
      {isMac ? null : <WindowControls maximized={state?.maximized ?? false} />}
    </div>
  );
}

function WindowControls({ maximized }: { maximized: boolean }) {
  return (
    <div className="window-controls">
      <button className="wc-btn" onClick={() => window.api.windowMinimize()} aria-label="Minimize">
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" /></svg>
      </button>
      <button className="wc-btn" onClick={() => window.api.windowMaximizeToggle()} aria-label="Maximize">
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 0h8v8H8M0 2h8v8H0z" fill="none" stroke="currentColor" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" />
          </svg>
        )}
      </button>
      <button className="wc-btn wc-close" onClick={() => window.api.windowClose()} aria-label="Close">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0 0l10 10M10 0L0 10" stroke="currentColor" />
        </svg>
      </button>
    </div>
  );
}
