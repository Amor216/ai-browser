type Props = {
  name: string;
  args: Record<string, unknown>;
};

export function ToolCallChip({ name, args }: Props) {
  const summary = describe(name, args);
  return <div className="tool-call">{summary}</div>;
}

function describe(name: string, args: Record<string, unknown>): string {
  if (name === "navigate") return `navigate ${str(args.url)}`;
  if (name === "click") return `click ${str(args.selector)}`;
  if (name === "type_into") return `type "${trim(str(args.text))}" into ${str(args.selector)}`;
  if (name === "get_page") return "read current page";
  if (name === "screenshot") return "take screenshot";
  if (name === "wait") return `wait ${args.ms ?? "?"}ms`;
  return `${name}(${Object.keys(args).join(", ")})`;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function trim(s: string, max = 40): string {
  return s.length > max ? s.slice(0, max - 3) + "..." : s;
}
