import { useEffect, useRef } from "react";
import { Bookmarks, History, Plus, Settings as SettingsIcon } from "../icons.js";

type Props = {
  anchor: DOMRect;
  onClose(): void;
  onPick(action: MenuAction): void;
};

export type MenuAction =
  | "new-tab"
  | "new-window"
  | "history"
  | "bookmarks"
  | "settings"
  | "toggle-bookmark-bar";

export function MenuDropdown({ anchor, onClose, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const style = {
    top: anchor.bottom + 4,
    right: window.innerWidth - anchor.right,
  };

  return (
    <div className="menu-dropdown" style={style} ref={ref}>
      <Item icon={<Plus size={16} />} label="New tab" shortcut="Ctrl+T" onClick={() => onPick("new-tab")} />
      <Divider />
      <Item icon={<History size={16} />} label="History" onClick={() => onPick("history")} />
      <Item icon={<Bookmarks size={16} />} label="Bookmarks" onClick={() => onPick("bookmarks")} />
      <Item label="Show bookmarks bar" onClick={() => onPick("toggle-bookmark-bar")} />
      <Divider />
      <Item icon={<SettingsIcon size={16} />} label="Settings" onClick={() => onPick("settings")} />
    </div>
  );
}

function Item({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick(): void;
}) {
  return (
    <button className="menu-item" onClick={onClick}>
      <span className="menu-icon">{icon}</span>
      <span className="menu-label">{label}</span>
      {shortcut ? <span className="menu-shortcut">{shortcut}</span> : null}
    </button>
  );
}

function Divider() {
  return <div className="menu-divider" />;
}
