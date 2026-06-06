const PRICING: Record<string, [number, number]> = {
  "claude-opus-4-5": [15.0, 75.0],
  "claude-sonnet-4-5": [3.0, 15.0],
  "claude-haiku-4-5": [1.0, 5.0],
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  for (const [prefix, [inP, outP]] of Object.entries(PRICING)) {
    if (model.startsWith(prefix)) {
      return (inputTokens / 1_000_000) * inP + (outputTokens / 1_000_000) * outP;
    }
  }
  return 0;
}
