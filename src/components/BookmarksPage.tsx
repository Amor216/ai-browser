import type { Bookmark } from "../../shared/ipc.js";
import { FaviconImg, Trash } from "../icons.js";

type Props = {
  bookmarks: Bookmark[];
  onNavigate(url: string): void;
};

export function BookmarksPage({ bookmarks, onNavigate }: Props) {
  return (
    <div className="internal-page">
      <div className="internal-head">
        <h1>Bookmarks</h1>
      </div>
      <div className="internal-body">
        {bookmarks.length === 0 ? (
          <div className="empty">No bookmarks saved.</div>
        ) : (
          bookmarks.map((b) => (
            <div key={b.id} className="bookmark-row">
              <FaviconImg url={faviconOf(b.url)} size={16} />
              <button className="bookmark-link" onClick={() => onNavigate(b.url)}>
                <span className="bookmark-title">{b.title}</span>
                <span className="bookmark-url">{b.url}</span>
              </button>
              <button
                className="history-remove"
                onClick={() => window.api.bookmarkRemove(b.id)}
                aria-label="Remove"
              >
                <Trash size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function faviconOf(url: string): string | null {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return null;
  }
}
