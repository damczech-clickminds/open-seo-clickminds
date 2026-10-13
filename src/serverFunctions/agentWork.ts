import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { AgentWorkService } from "@/server/features/agent-work/AgentWorkService";
import {
  startAgentWorkSchema,
  agentWorkIdSchema,
  reviewLearningPatternSchema,
} from "@/types/schemas/agentWork";

export const listAgentWork = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(z.object({ projectId: z.string() }))
  .handler(async ({ context }) => ({
    canReview: context.role
      .split(",")
      .some((role) => ["owner", "admin"].includes(role.trim())),
    runs: await AgentWorkService.listRuns(context.projectId),
    candidates: await AgentWorkService.listCandidates(context.projectId),
  }));
export const startAgentWork = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(startAgentWorkSchema)
  .handler(async ({ data, context }) =>
    AgentWorkService.start(
      {
        projectId: context.projectId,
        organizationId: context.organizationId,
        userId: context.userId,
        role: context.role,
      },
      data,
    ),
  );
export const compareOrganicPeriods = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(agentWorkIdSchema)
  .handler(async ({ data, context }) =>
    AgentWorkService.compareOrganic(context.projectId, data.runId),
  );
export const reviewLearningPattern = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(reviewLearningPatternSchema)
  .handler(async ({ data, context }) =>
    AgentWorkService.review(
      {
        projectId: context.projectId,
        organizationId: context.organizationId,
        userId: context.userId,
        role: context.role,
      },
      data,
    ),
  );
