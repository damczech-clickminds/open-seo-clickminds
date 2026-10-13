import { z } from "zod";

const date = z.iso.date();
export const startAgentWorkSchema = z
  .object({
    projectId: z.string().min(1),
    requestKey: z.string().trim().min(8).max(100),
    goal: z.string().trim().min(3).max(1000),
    startDate: date,
    endDate: date,
    contextChars: z.number().int().min(2000).max(24000).default(12000),
    outputTokens: z.number().int().min(500).max(4000).default(2000),
  })
  .refine((v) => v.startDate <= v.endDate, "Invalid date range")
  .refine(
    (v) => (Date.parse(v.endDate) - Date.parse(v.startDate)) / 86400000 < 90,
    "Use at most 90 days per work item",
  );

export const agentWorkIdSchema = z.object({
  projectId: z.string().min(1),
  runId: z.string().uuid(),
});
export const checkpointAgentWorkSchema = agentWorkIdSchema.extend({
  revision: z.number().int().nonnegative(),
  checkpoint: z.string().max(4000),
  status: z.enum(["ready", "blocked", "completed"]),
});
export const proposeLearningPatternSchema = z.object({
  projectId: z.string().min(1),
  mechanism: z.string().trim().min(10).max(1500),
  applicability: z.string().trim().min(10).max(1000),
  exceptions: z.string().trim().min(10).max(1000),
  // A pattern may transfer across these dimensions, but never becomes proof.
  market: z.string().trim().min(2).max(60),
  industry: z.string().trim().min(2).max(60),
});
export const reviewLearningPatternSchema = z.object({
  projectId: z.string().min(1),
  candidateId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  confirmsNoClientIdentifiers: z.literal(true),
});
