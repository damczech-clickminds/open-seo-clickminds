import {
  pgTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./app.schema";
import { organization } from "./better-auth-schema";

// Project data never enters the shared pattern catalog automatically.
export const agentWorkRuns = pgTable(
  "agent_work_runs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    requestKey: text("request_key").notNull(),
    goal: text("goal").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    status: text("status").notNull().default("ready"),
    checkpoint: text("checkpoint").notNull().default(""),
    contextChars: integer("context_chars").notNull().default(12000),
    outputTokens: integer("output_tokens").notNull().default(2000),
    revision: integer("revision").notNull().default(0),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("agent_work_request_idx").on(t.projectId, t.requestKey),
    index("agent_work_project_idx").on(t.projectId, t.updatedAt),
  ],
);

export const agentWorkEvidence = pgTable(
  "agent_work_evidence",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => agentWorkRuns.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    // Immutable bounded snapshot of the exact deterministic comparison result.
    content: text("content").notNull(),
    observedAt: text("observed_at").notNull(),
  },
  (t) => [index("agent_evidence_run_idx").on(t.projectId, t.runId)],
);

export const agentPatternCandidates = pgTable(
  "agent_pattern_candidates",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mechanism: text("mechanism").notNull(),
    applicability: text("applicability").notNull(),
    exceptions: text("exceptions").notNull(),
    market: text("market").notNull(),
    industry: text("industry").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("agent_candidate_project_idx").on(t.projectId, t.createdAt)],
);

// Organization-wide, human-reviewed generalizations. No client IDs, URLs or raw evidence.
export const agentLearningPatterns = pgTable(
  "agent_learning_patterns",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    mechanism: text("mechanism").notNull(),
    applicability: text("applicability").notNull(),
    exceptions: text("exceptions").notNull(),
    market: text("market").notNull(),
    industry: text("industry").notNull(),
    reviewedBy: text("reviewed_by").notNull(),
    reviewedAt: text("reviewed_at").notNull(),
  },
  (t) => [index("agent_pattern_org_idx").on(t.organizationId, t.reviewedAt)],
);
