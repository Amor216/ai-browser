export type AgentEvent =
  | { kind: "text_delta"; text: string }
  | { kind: "tool_call"; name: string; args: Record<string, unknown> }
  | { kind: "tool_result"; name: string; preview: string; ok: boolean }
  | { kind: "done"; usage: { in: number; out: number; cost: number; toolCalls: number } }
  | { kind: "error"; message: string };

export type ApiSurface = {
  navigate(url: string): Promise<void>;
  ask(prompt: string): Promise<void>;
  cancel(): Promise<void>;
  onAgentEvent(handler: (e: AgentEvent) => void): () => void;
  onTabUrl(handler: (url: string) => void): () => void;
};

declare global {
  interface Window {
    api: ApiSurface;
  }
}
