import { z } from "zod";
import { AgentWorkService } from "@/server/features/agent-work/AgentWorkService";
import { withMcpProjectAuth } from "@/server/mcp/project-auth";
import { buildProjectMeta } from "@/server/mcp/context";
import { mcpResponse } from "@/server/mcp/formatters";
import {
  startAgentWorkSchema,
  checkpointAgentWorkSchema,
  agentWorkIdSchema,
  proposeLearningPatternSchema,
} from "@/types/schemas/agentWork";

const outputSchema = z.object({ result: z.unknown() }).passthrough();
const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};
const writeAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
};

export const startAgentWorkTool = {
  name: "start_seo_work",
  config: {
    title: "Start SEO work",
    description:
      "Create an idempotent, project-scoped SEO work item. Use a stable requestKey for retries. No LLM or paid data calls. Defaults: 12,000 context characters, 2,000 output-token target; these do not cap external Codex billing. Next call get_seo_work_context, then compare_organic_periods or existing tools. Arbitrary goals are stored, not automatically executed.",
    inputSchema: startAgentWorkSchema,
    outputSchema,
    annotations: writeAnnotations,
  },
  handler: withMcpProjectAuth(
    async (args: z.input<typeof startAgentWorkSchema>, ctx) =>
      mcpResponse({
        text: "Work item saved. Read its bounded context before analysis.",
        meta: buildProjectMeta(
          ctx,
          args.projectId,
          `/p/${args.projectId}/context`,
        ),
        structuredContent: {
          result: await AgentWorkService.start(
            { ...ctx.auth, projectId: args.projectId },
            args,
          ),
        },
      }),
  ),
};
export const getAgentWorkContextTool = {
  name: "get_seo_work_context",
  config: {
    title: "Read bounded SEO work context",
    description:
      "Read the selected project's checkpoint, evidence, shared memory and organization-reviewed generalized patterns within a text budget. Reports omitted and partial sources; never treat them as complete or as proof of absence. Patterns suggest hypotheses, not client facts. No credits or LLM calls.",
    inputSchema: agentWorkIdSchema,
    outputSchema,
    annotations: readAnnotations,
  },
  handler: withMcpProjectAuth(
    async (args: z.infer<typeof agentWorkIdSchema>, ctx) =>
      mcpResponse({
        text: "Bounded work context. Reopen partial sources when they can change a decision.",
        structuredContent: {
          result: await AgentWorkService.context(
            { ...ctx.auth, projectId: args.projectId },
            args.runId,
          ),
        },
      }),
  ),
};
export const listAgentWorkTool = {
  name: "list_seo_work",
  config: {
    title: "List project work",
    description:
      "List the latest 10 work item summaries for the selected project. No cross-client raw data. No credits.",
    inputSchema: z.object({ projectId: z.string().min(1) }),
    outputSchema,
    annotations: readAnnotations,
  },
  handler: withMcpProjectAuth(async (args: { projectId: string }) =>
    mcpResponse({
      text: "Project work items.",
      structuredContent: {
        result: (await AgentWorkService.listRuns(args.projectId))
          .slice(0, 10)
          .map(({ id, goal, startDate, endDate, status, revision }) => ({
            id,
            goal: goal.slice(0, 256),
            startDate,
            endDate,
            status,
            revision,
          })),
      },
    }),
  ),
};
export const checkpointAgentWorkTool = {
  name: "checkpoint_seo_work",
  config: {
    title: "Checkpoint SEO work",
    description:
      "Save a concise checkpoint with FACT/INTERPRETATION/HYPOTHESIS labels, sources, unresolved contradictions, next step and stop condition. Supply current revision; stale writes and running-work overwrites are refused. No credits.",
    inputSchema: checkpointAgentWorkSchema,
    outputSchema,
    annotations: writeAnnotations,
  },
  handler: withMcpProjectAuth(
    async (args: z.infer<typeof checkpointAgentWorkSchema>) =>
      mcpResponse({
        text: "Checkpoint saved.",
        structuredContent: {
          result: await AgentWorkService.checkpoint(args.projectId, args),
        },
      }),
  ),
};
export const compareOrganicPeriodsTool = {
  name: "compare_organic_periods",
  config: {
    title: "Compare organic traffic periods",
    description:
      "Execute the work item's bounded deterministic workflow: two GSC final web-search aggregate queries for equally long adjacent periods (maximum 90 days), save immutable comparison evidence, and checkpoint. No LLM or paid research providers. Repeated calls return saved evidence. Requires the project's GSC connection. This is a factual comparison, not a causal diagnosis. Use save_report separately for a private report; never share without authorization.",
    inputSchema: agentWorkIdSchema,
    outputSchema,
    annotations: { ...writeAnnotations, openWorldHint: true },
  },
  handler: withMcpProjectAuth(async (args: z.infer<typeof agentWorkIdSchema>) =>
    mcpResponse({
      text: "GSC period comparison; inspect evidence and caveats before diagnosing.",
      structuredContent: {
        result: await AgentWorkService.compareOrganic(
          args.projectId,
          args.runId,
        ),
      },
    }),
  ),
};
export const proposeLearningPatternTool = {
  name: "propose_learning_pattern",
  config: {
    title: "Propose generalized learning",
    description:
      "Save a private project-local candidate for cross-client/market/industry learning. Include mechanism, applicability and failure conditions. Never include client names, identifiers, URLs, private metrics or raw evidence. Not shared until a human owner/admin reviews it in the project's Context UI. Domain/email validation is only a partial safeguard, not anonymization proof. No credits.",
    inputSchema: proposeLearningPatternSchema,
    outputSchema,
    annotations: writeAnnotations,
  },
  handler: withMcpProjectAuth(
    async (args: z.infer<typeof proposeLearningPatternSchema>) =>
      mcpResponse({
        text: "Candidate saved privately; human review required before learning catalog publication.",
        structuredContent: {
          result: await AgentWorkService.propose(args.projectId, args),
        },
      }),
  ),
};
