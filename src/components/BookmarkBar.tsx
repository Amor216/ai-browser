import type { Bookmark } from "../../shared/ipc.js";
import { FaviconImg } from "../icons.js";

type Props = {
  bookmarks: Bookmark[];
};

export function BookmarkBar({ bookmarks }: Props) {
  if (bookmarks.length === 0) {
    return (
      <div className="bookmark-bar">
        <span className="bookmark-empty">No bookmarks yet — click the star to add this page.</span>
      </div>
    );
  }
  return (
    <div className="bookmark-bar">
      {bookmarks.map((b) => (
        <button
          key={b.id}
          className="bookmark"
          onClick={() => window.api.navigate(b.url)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (confirm(`Remove "${b.title}"?`)) window.api.bookmarkRemove(b.id);
          }}
          title={b.url}
        >
          <FaviconImg url={faviconOf(b.url)} size={14} />
          <span>{b.title}</span>
        </button>
      ))}
    </div>
  );
}

function faviconOf(url: string): string | null {
  try {
    const host = new URL(url).origin;
    return `${host}/favicon.ico`;
  } catch {
    return null;
  }
}
