import { describe, expect, it } from "vitest";
import { TOOL_DEFS } from "../electron/tools.js";

function requiredOf(t: { input_schema: object }): readonly string[] {
  const schema = t.input_schema as { required?: readonly string[] };
  return schema.required ?? [];
}

describe("tool definitions", () => {
  it("exposes the six expected tools", () => {
    const names = TOOL_DEFS.map((t) => t.name).sort();
    expect(names).toEqual(["click", "get_page", "navigate", "screenshot", "type_into", "wait"]);
  });

  it("every tool has a description and schema", () => {
    for (const t of TOOL_DEFS) {
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.input_schema.type).toBe("object");
    }
  });

  it("required args match the tool semantics", () => {
    const byName = Object.fromEntries(TOOL_DEFS.map((t) => [t.name, t]));
    expect(requiredOf(byName.navigate)).toContain("url");
    expect(requiredOf(byName.click)).toContain("selector");
    expect(requiredOf(byName.type_into)).toContain("text");
  });
});
