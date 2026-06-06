import { describe, expect, it } from "vitest";
import { costUsd } from "../electron/pricing.js";

describe("costUsd", () => {
  it("prices sonnet", () => {
    expect(costUsd("claude-sonnet-4-5", 1_000_000, 1_000_000)).toBeCloseTo(18.0, 4);
  });

  it("prices opus higher than sonnet", () => {
    const opus = costUsd("claude-opus-4-5", 1000, 1000);
    const sonnet = costUsd("claude-sonnet-4-5", 1000, 1000);
    expect(opus).toBeGreaterThan(sonnet);
  });

  it("returns 0 for unknown models", () => {
    expect(costUsd("not-a-model", 100, 100)).toBe(0);
  });
});
