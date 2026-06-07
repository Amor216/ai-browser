type IconProps = {
  size?: number;
  className?: string;
};

function svg(d: string) {
  return ({ size = 18, className }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}

export const ArrowLeft = svg("M19 12H5M12 19l-7-7 7-7");
export const ArrowRight = svg("M5 12h14M12 5l7 7-7 7");
export const Reload = svg("M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5");
export const Stop = svg("M18 6L6 18M6 6l12 12");
export const Star = svg("M12 2l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.13l-5-4.87 6.91-1L12 2z");
export const Plus = svg("M12 5v14M5 12h14");
export const Close = svg("M18 6L6 18M6 6l12 12");
export const MoreVertical = svg("M12 5v.01M12 12v.01M12 19v.01");
export const Lock = svg("M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4");
export const Globe = svg("M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20");
export const Search = svg("M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3");
export const Sidebar = svg("M3 4h18v16H3zM9 4v16");
export const History = svg("M3 12a9 9 0 1 0 9-9M3 12l3-3M3 12l3 3M12 7v5l3 3");
export const Bookmarks = svg("M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z");
export const Settings = svg("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z");
export const Sparkles = svg("M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z");
export const Trash = svg("M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14M10 11v6M14 11v6");

export function FaviconImg({ url, size = 16 }: { url: string | null; size?: number }) {
  if (!url) return <Globe size={size} className="favicon-fallback" />;
  return (
    <img
      src={url}
      width={size}
      height={size}
      alt=""
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
