import Anthropic from "@anthropic-ai/sdk";
import type { BrowserView } from "electron";
import type { AgentEvent } from "../shared/ipc.js";
import { costUsd } from "./pricing.js";
import { runTool, TOOL_DEFS } from "./tools.js";

const MODEL = process.env.COMET_MODEL || "claude-sonnet-4-5";
const MAX_TOKENS = 1536;
const MAX_STEPS = 12;

const SYSTEM = `You are a browser-resident assistant in a desktop app. The user sees a real Chromium tab on the left; you can read it and act on it through tools.

Rules:
- Prefer tools over guessing. Use get_page before answering questions about the current page.
- Be terse. The user is reading your replies in a side panel.
- For multi-step tasks: call wait after navigate so pages can load.
- Surface errors verbatim and stop, do not retry blindly.
- If a request is ambiguous (e.g. "log me in"), ask one clarifying question and stop.`;

type Emit = (event: AgentEvent) => void;

export class AgentSession {
  private client = new Anthropic();
  private cancelled = false;
  private history: Anthropic.MessageParam[] = [];

  cancel() {
    this.cancelled = true;
  }

  async run(prompt: string, view: BrowserView, emit: Emit): Promise<void> {
    this.cancelled = false;
    this.history.push({ role: "user", content: prompt });

    let totalIn = 0;
    let totalOut = 0;
    let toolCalls = 0;

    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        if (this.cancelled) {
          emit({ kind: "error", message: "cancelled" });
          return;
        }

        let final: Anthropic.Message | undefined;
        await this.client.messages
          .stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: SYSTEM,
            tools: TOOL_DEFS as unknown as Anthropic.Tool[],
            messages: this.history,
          })
          .on("text", (text) => emit({ kind: "text_delta", text }))
          .on("finalMessage", (msg) => {
            final = msg;
          })
          .finalMessage();

        if (!final) throw new Error("no final message from stream");

        totalIn += final.usage.input_tokens;
        totalOut += final.usage.output_tokens;
        this.history.push({ role: "assistant", content: serializeBlocks(final.content) });

        if (final.stop_reason !== "tool_use") {
          emit({
            kind: "done",
            usage: {
              in: totalIn,
              out: totalOut,
              cost: costUsd(MODEL, totalIn, totalOut),
              toolCalls,
            },
          });
          return;
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of final.content) {
          if (block.type !== "tool_use") continue;
          toolCalls += 1;
          emit({
            kind: "tool_call",
            name: block.name,
            args: block.input as Record<string, unknown>,
          });
          const result = await safeRunTool(view, block.name, block.input as Record<string, unknown>);
          emit({
            kind: "tool_result",
            name: block.name,
            preview: previewOf(result.value),
            ok: !result.error,
          });
          toolResults.push(toToolResultBlock(block.id, result));
        }
        this.history.push({ role: "user", content: toolResults });
      }
      emit({ kind: "error", message: `tool loop exceeded ${MAX_STEPS} steps` });
    } catch (e) {
      emit({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }
}

type ToolOutcome = { value: { text?: string; image?: string }; error?: string };

async function safeRunTool(
  view: BrowserView,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolOutcome> {
  try {
    const out = await runTool(view, name, args);
    return { value: out };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { value: { text: msg }, error: msg };
  }
}

function previewOf(v: { text?: string; image?: string }): string {
  if (v.image) return "(screenshot captured)";
  if (!v.text) return "";
  return v.text.length > 240 ? v.text.slice(0, 237) + "..." : v.text;
}

function toToolResultBlock(
  useId: string,
  outcome: ToolOutcome,
): Anthropic.ToolResultBlockParam {
  if (outcome.value.image) {
    return {
      type: "tool_result",
      tool_use_id: useId,
      is_error: !!outcome.error,
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: "image/png", data: outcome.value.image },
        },
      ],
    };
  }
  return {
    type: "tool_result",
    tool_use_id: useId,
    is_error: !!outcome.error,
    content: outcome.value.text ?? "",
  };
}

function serializeBlocks(blocks: Anthropic.ContentBlock[]): Anthropic.ContentBlockParam[] {
  return blocks.map((b): Anthropic.ContentBlockParam => {
    if (b.type === "text") return { type: "text", text: b.text };
    if (b.type === "tool_use") {
      return { type: "tool_use", id: b.id, name: b.name, input: b.input };
    }
    return b as unknown as Anthropic.ContentBlockParam;
  });
}
