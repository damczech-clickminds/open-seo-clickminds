import { getEnvValueSync } from "@/server/lib/runtime-env";

// Trusted deployment config; never set by a model or by retrieved content.
export function samBudget(
  hosted: boolean,
  read: (key: string) => string | undefined,
) {
  const bounded = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(read(key));
    return Number.isInteger(value) && value >= min && value <= max
      ? value
      : fallback;
  };
  const reasoning = read("SAM_REASONING_EFFORT");
  return {
    reasoningEffort:
      reasoning === "max" || reasoning === "low"
        ? reasoning
        : hosted
          ? ("max" as const)
          : ("low" as const),
    maxSteps: bounded("SAM_MAX_STEPS", hosted ? 40 : 12, 4, 40),
    maxOutputTokens: bounded(
      "SAM_MAX_OUTPUT_TOKENS",
      hosted ? 16000 : 4000,
      500,
      16000,
    ),
  };
}

export function readSamBudget(env: object, hosted?: boolean) {
  const read = (key: string) => getEnvValueSync(env, key);
  const { reasoningEffort, ...turnLimits } = samBudget(
    hosted ?? read("AUTH_MODE") === "hosted",
    read,
  );
  return { reasoningEffort, turnLimits };
}
