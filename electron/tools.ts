import type { BrowserView } from "electron";

const MAX_TEXT = 30_000;

export const TOOL_DEFS = [
  {
    name: "get_page",
    description: "Returns the URL, title, and visible text of the current tab. Truncated at 30K chars.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "navigate",
    description: "Open a URL in the tab. The URL should be absolute (https://...).",
    input_schema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    name: "click",
    description: "Click the first element matching a CSS selector.",
    input_schema: {
      type: "object",
      properties: { selector: { type: "string" } },
      required: ["selector"],
    },
  },
  {
    name: "type_into",
    description:
      "Type text into the first element matching a CSS selector. Optionally press Enter afterward.",
    input_schema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        text: { type: "string" },
        submit: { type: "boolean", default: false },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "screenshot",
    description: "Capture a PNG screenshot of the current tab and read it back to you as an image.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "wait",
    description: "Sleep for N milliseconds. Useful to let a page finish loading after navigation.",
    input_schema: {
      type: "object",
      properties: { ms: { type: "integer", minimum: 100, maximum: 10_000 } },
      required: ["ms"],
    },
  },
] as const;

export type ToolResult = { text: string } | { image: string };

export async function runTool(
  view: BrowserView,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case "get_page":
      return { text: await getPage(view) };
    case "navigate":
      return { text: await navigate(view, String(args.url)) };
    case "click":
      return { text: await click(view, String(args.selector)) };
    case "type_into":
      return {
        text: await typeInto(view, String(args.selector), String(args.text), Boolean(args.submit)),
      };
    case "screenshot":
      return { image: await screenshot(view) };
    case "wait":
      await sleep(Number(args.ms) || 500);
      return { text: `slept ${args.ms}ms` };
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

async function getPage(view: BrowserView): Promise<string> {
  const wc = view.webContents;
  const url = wc.getURL();
  const title = wc.getTitle();
  const text = await wc.executeJavaScript(
    `(() => { const t = document.body ? document.body.innerText : ""; return t.slice(0, ${MAX_TEXT}); })()`,
    true,
  );
  return `URL: ${url}\nTitle: ${title}\n\n${text}`;
}

async function navigate(view: BrowserView, url: string): Promise<string> {
  const final = /^https?:\/\//.test(url) ? url : `https://${url}`;
  await view.webContents.loadURL(final);
  return `loaded ${view.webContents.getURL()}`;
}

async function click(view: BrowserView, selector: string): Promise<string> {
  const escaped = JSON.stringify(selector);
  const ok = await view.webContents.executeJavaScript(
    `(() => { const el = document.querySelector(${escaped}); if (!el) return false; el.click(); return true; })()`,
    true,
  );
  if (!ok) throw new Error(`selector not found: ${selector}`);
  return `clicked ${selector}`;
}

async function typeInto(
  view: BrowserView,
  selector: string,
  text: string,
  submit: boolean,
): Promise<string> {
  const sel = JSON.stringify(selector);
  const val = JSON.stringify(text);
  const js = `(() => {
    const el = document.querySelector(${sel});
    if (!el) return false;
    el.focus();
    if ("value" in el) {
      el.value = ${val};
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      el.textContent = ${val};
    }
    return true;
  })()`;
  const ok = await view.webContents.executeJavaScript(js, true);
  if (!ok) throw new Error(`selector not found: ${selector}`);
  if (submit) {
    await view.webContents.executeJavaScript(
      `(() => { const el = document.querySelector(${sel}); if (!el) return; const form = el.closest("form"); if (form) form.submit(); else el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); })()`,
      true,
    );
  }
  return `typed into ${selector}${submit ? " + submit" : ""}`;
}

async function screenshot(view: BrowserView): Promise<string> {
  const image = await view.webContents.capturePage();
  return image.toPNG().toString("base64");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
