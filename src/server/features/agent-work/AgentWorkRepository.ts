import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agentWorkRuns as runs,
  agentWorkEvidence as evidence,
  agentPatternCandidates as candidates,
  agentLearningPatterns as patterns,
} from "@/db/schema";

async function getRun(projectId: string, id: string) {
  return (
    (
      await db
        .select()
        .from(runs)
        .where(and(eq(runs.projectId, projectId), eq(runs.id, id)))
        .limit(1)
    )[0] ?? null
  );
}
async function createRun(values: typeof runs.$inferInsert) {
  await db
    .insert(runs)
    .values(values)
    .onConflictDoNothing({ target: [runs.projectId, runs.requestKey] });
  return (
    await db
      .select()
      .from(runs)
      .where(
        and(
          eq(runs.projectId, values.projectId),
          eq(runs.requestKey, values.requestKey),
        ),
      )
      .limit(1)
  )[0];
}
async function listRuns(projectId: string) {
  return db
    .select()
    .from(runs)
    .where(eq(runs.projectId, projectId))
    .orderBy(desc(runs.updatedAt))
    .limit(30);
}
async function updateRun(
  projectId: string,
  id: string,
  revision: number,
  values: { status: string; checkpoint: string },
  currentStatus: string,
) {
  return (
    (
      await db
        .update(runs)
        .set({
          ...values,
          revision: sql`${runs.revision} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(runs.projectId, projectId),
            eq(runs.id, id),
            eq(runs.revision, revision),
            eq(runs.status, currentStatus),
          ),
        )
        .returning()
    )[0] ?? null
  );
}
async function listEvidence(projectId: string, runId: string) {
  return db
    .select()
    .from(evidence)
    .where(and(eq(evidence.projectId, projectId), eq(evidence.runId, runId)))
    .orderBy(desc(evidence.observedAt))
    .limit(10);
}
async function addEvidence(values: typeof evidence.$inferInsert) {
  await db.insert(evidence).values(values);
}
async function proposePattern(values: typeof candidates.$inferInsert) {
  await db.insert(candidates).values(values);
  return values.id;
}
async function listCandidates(projectId: string) {
  return db
    .select()
    .from(candidates)
    .where(
      and(
        eq(candidates.projectId, projectId),
        sql`${candidates.status} in ('pending', 'approving', 'rejecting')`,
      ),
    )
    .orderBy(desc(candidates.createdAt))
    .limit(30);
}
async function getCandidate(projectId: string, id: string) {
  return (
    (
      await db
        .select()
        .from(candidates)
        .where(and(eq(candidates.projectId, projectId), eq(candidates.id, id)))
        .limit(1)
    )[0] ?? null
  );
}
async function setCandidateStatus(
  projectId: string,
  id: string,
  status: string,
  expected = "pending",
) {
  return (
    (
      await db
        .update(candidates)
        .set({ status })
        .where(
          and(
            eq(candidates.projectId, projectId),
            eq(candidates.id, id),
            eq(candidates.status, expected),
          ),
        )
        .returning()
    )[0] ?? null
  );
}
// Candidate id is also the catalog id: retries cannot create a second pattern.
async function publishPattern(values: typeof patterns.$inferInsert) {
  await db
    .insert(patterns)
    .values(values)
    .onConflictDoNothing({ target: patterns.id });
}
async function listPatterns(organizationId: string) {
  return db
    .select({
      id: patterns.id,
      mechanism: patterns.mechanism,
      applicability: patterns.applicability,
      exceptions: patterns.exceptions,
      market: patterns.market,
      industry: patterns.industry,
      reviewedAt: patterns.reviewedAt,
    })
    .from(patterns)
    .where(eq(patterns.organizationId, organizationId))
    .orderBy(desc(patterns.reviewedAt))
    .limit(20);
}
export const AgentWorkRepository = {
  getRun,
  createRun,
  listRuns,
  updateRun,
  listEvidence,
  addEvidence,
  proposePattern,
  listCandidates,
  getCandidate,
  setCandidateStatus,
  publishPattern,
  listPatterns,
};
