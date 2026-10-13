import { expect, it } from "vitest";
import { samBudget } from "./samBudget";
it("uses a smaller self-hosted budget without changing hosted defaults", () => {
  expect(samBudget(false, () => undefined)).toEqual({
    reasoningEffort: "low",
    maxSteps: 12,
    maxOutputTokens: 4000,
  });
  expect(samBudget(true, () => undefined)).toEqual({
    reasoningEffort: "max",
    maxSteps: 40,
    maxOutputTokens: 16000,
  });
});
it("accepts only bounded trusted overrides and rejects invalid values", () => {
  const values: Record<string, string> = {
    SAM_MAX_STEPS: "999",
    SAM_MAX_OUTPUT_TOKENS: "2000",
    SAM_REASONING_EFFORT: "unknown",
  };
  expect(samBudget(false, (key) => values[key])).toEqual({
    reasoningEffort: "low",
    maxSteps: 12,
    maxOutputTokens: 2000,
  });
});
