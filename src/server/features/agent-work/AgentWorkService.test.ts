import { readFileSync } from "node:fs";
import type { Client } from "@libsql/client";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AgentWorkService } from "./AgentWorkService";
import { boundedContext, comparisonPeriod } from "./contextBudget";

const state = vi.hoisted(() => ({
  client: null as Client | null,
  gsc: vi.fn(),
  memory: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  state.client = createClient({ url: "file::memory:" });
  return { db: drizzle(state.client) };
});
vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: { getPerformance: state.gsc },
}));
vi.mock(
  "@/server/features/project-context/services/ProjectContextService",
  () => ({
    ProjectContextService: {
      getProjectContext: state.memory,
      renderProjectContextMarkdown: (v: string) => v,
    },
  }),
);
const scope = {
  projectId: "client-a",
  organizationId: "org-a",
  userId: "operator",
  role: "owner",
};
const work = (projectId = "client-a", requestKey = "stable-request") => ({
  projectId,
  requestKey,
  goal: "Compare organic traffic",
  startDate: "2026-08-01",
  endDate: "2026-08-28",
});
const candidate = {
  projectId: "client-a",
  mechanism: "A change in query mix can reduce aggregate click-through rate",
  applicability: "Compare equivalent search segments and periods first",
  exceptions: "Seasonality and result layout changes may confound it",
  market: "cross-market",
  industry: "cross-industry",
};

beforeAll(async () => {
  await state.client!.executeMultiple(
    "PRAGMA foreign_keys=ON; CREATE TABLE projects(id TEXT PRIMARY KEY); CREATE TABLE organization(id TEXT PRIMARY KEY); INSERT INTO projects VALUES ('client-a'), ('client-b'); INSERT INTO organization VALUES ('org-a'), ('org-b');",
  );
  await state.client!.executeMultiple(
    readFileSync("drizzle/sqlite/0055_flimsy_sauron.sql", "utf8"),
  );
});
afterAll(() => state.client!.close());
beforeEach(async () => {
  await state.client!.executeMultiple(
    "DELETE FROM agent_work_runs; DELETE FROM agent_pattern_candidates; DELETE FROM agent_learning_patterns;",
  );
  state.memory.mockImplementation(async (projectId: string) =>
    projectId === "client-a" ? "CLIENT_A_MEMORY" : "CLIENT_B_SECRET",
  );
  state.gsc.mockResolvedValue({
    siteUrl: "sc-domain:example.test",
    request: { dimensions: [] },
    rows: [{ clicks: 20, impressions: 200 }],
  });
});

describe("local agent work with real SQLite queries", () => {
  it("keeps a stable request idempotent and refuses reusing it for different work", async () => {
    const first = await AgentWorkService.start(scope, work());
    expect((await AgentWorkService.start(scope, work())).id).toBe(first.id);
    await expect(
      AgentWorkService.start(scope, { ...work(), goal: "Different goal" }),
    ).rejects.toThrow("different request");
  });
  it("refuses foreign work ids before reading context or contacting GSC", async () => {
    const a = await AgentWorkService.start(scope, work());
    await expect(
      AgentWorkService.context({ ...scope, projectId: "client-b" }, a.id),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      AgentWorkService.compareOrganic("client-b", a.id),
    ).rejects.toThrow("NOT_FOUND");
    expect(state.memory).not.toHaveBeenCalled();
    expect(state.gsc).not.toHaveBeenCalled();
  });
  it("allows only one concurrent comparison and reuses its immutable evidence", async () => {
    const run = await AgentWorkService.start(scope, work());
    const results = await Promise.allSettled([
      AgentWorkService.compareOrganic(scope.projectId, run.id),
      AgentWorkService.compareOrganic(scope.projectId, run.id),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const result = await AgentWorkService.compareOrganic(
      scope.projectId,
      run.id,
    );
    expect(result.cached).toBe(true);
    expect(state.gsc).toHaveBeenCalledTimes(2);
    expect(state.gsc.mock.calls[0]?.[0]).toMatchObject({
      projectId: "client-a",
      dimensions: [],
      rowLimit: 1,
      dataState: "final",
    });
    expect(JSON.parse(result.evidence.content)).toMatchObject({
      comparison: { clicks: { absoluteChange: 0 } },
    });
  });
  it("recovers a saved comparison after an interrupted checkpoint without repeating Google calls", async () => {
    const run = await AgentWorkService.start(scope, work());
    await AgentWorkService.compareOrganic(scope.projectId, run.id);
    await state.client!.execute({
      sql: "UPDATE agent_work_runs SET status='running' WHERE id=?",
      args: [run.id],
    });
    const result = await AgentWorkService.compareOrganic(
      scope.projectId,
      run.id,
    );
    expect(result.run.status).toBe("completed");
    expect(state.gsc).toHaveBeenCalledTimes(2);
  });
  it("refuses grouped results if upstream changes aggregate-request behavior", async () => {
    state.gsc.mockResolvedValue({
      siteUrl: "sc-domain:example.test",
      request: { dimensions: ["query"] },
      rows: [{ clicks: 20, impressions: 200 }],
    });
    const run = await AgentWorkService.start(scope, work());
    await expect(
      AgentWorkService.compareOrganic(scope.projectId, run.id),
    ).rejects.toThrow("grouped data");
  });
  it("keeps missing data unknown instead of reporting zero traffic", async () => {
    state.gsc.mockResolvedValue({
      siteUrl: "sc-domain:example.test",
      request: { dimensions: [] },
      rows: [],
    });
    const run = await AgentWorkService.start(scope, work());
    const result = await AgentWorkService.compareOrganic(
      scope.projectId,
      run.id,
    );
    expect(JSON.parse(result.evidence.content)).toMatchObject({
      comparison: null,
      missingCurrentData: true,
      missingPreviousData: true,
    });
  });
  it("records a blocked checkpoint when GSC is unavailable", async () => {
    state.gsc.mockRejectedValue(new Error("GSC unavailable"));
    const run = await AgentWorkService.start(scope, work());
    await expect(
      AgentWorkService.compareOrganic(scope.projectId, run.id),
    ).rejects.toThrow("GSC unavailable");
    expect(
      (await AgentWorkService.getRun(scope.projectId, run.id)).status,
    ).toBe("blocked");
  });
  it("prevents a stale agent checkpoint from overwriting newer UI changes", async () => {
    const run = await AgentWorkService.start(scope, work());
    await AgentWorkService.checkpoint(scope.projectId, {
      projectId: scope.projectId,
      runId: run.id,
      revision: 0,
      status: "ready",
      checkpoint: "New decision",
    });
    await expect(
      AgentWorkService.checkpoint(scope.projectId, {
        projectId: scope.projectId,
        runId: run.id,
        revision: 0,
        status: "ready",
        checkpoint: "Old decision",
      }),
    ).rejects.toThrow("Stale revision");
  });
  it("shares only reviewed patterns within an organization, never another client's memory", async () => {
    const proposed = await AgentWorkService.propose(scope.projectId, candidate);
    const runB = await AgentWorkService.start(
      { ...scope, projectId: "client-b" },
      work("client-b"),
    );
    const readB = () =>
      AgentWorkService.context({ ...scope, projectId: "client-b" }, runB.id);
    expect(JSON.stringify(await readB())).not.toContain(candidate.mechanism);
    await expect(
      AgentWorkService.review(
        { ...scope, role: "member" },
        {
          projectId: scope.projectId,
          candidateId: proposed.candidateId,
          decision: "approve",
          confirmsNoClientIdentifiers: true,
        },
      ),
    ).rejects.toThrow("FORBIDDEN");
    await AgentWorkService.review(scope, {
      projectId: scope.projectId,
      candidateId: proposed.candidateId,
      decision: "approve",
      confirmsNoClientIdentifiers: true,
    });
    const pack = JSON.stringify(await readB());
    expect(pack).toContain(candidate.mechanism);
    expect(pack).not.toContain("CLIENT_A_MEMORY");
    expect(
      JSON.stringify(
        await AgentWorkService.context(
          { ...scope, projectId: "client-b", organizationId: "org-b" },
          runB.id,
        ),
      ),
    ).not.toContain(candidate.mechanism);
  });
  it("refuses obvious identifiers in every learning field", async () => {
    await expect(
      AgentWorkService.propose(scope.projectId, {
        ...candidate,
        mechanism: "Check https://private-client.test first",
      }),
    ).rejects.toThrow("Remove client");
  });
});

it("keeps context within budget and explicitly marks partial or omitted sources", () => {
  const pack = boundedContext(
    [
      { source: "critical", content: "x".repeat(3000) },
      { source: "another", content: "private" },
    ],
    2000,
  );
  expect(pack.chars).toBeLessThanOrEqual(2000);
  expect(pack.selected[0]?.partial).toBe(true);
  expect(pack.omitted).toEqual(["another"]);
});
it("compares equal-length adjacent periods across a leap-day boundary", () => {
  expect(comparisonPeriod("2024-03-01", "2024-03-28")).toEqual({
    startDate: "2024-02-02",
    endDate: "2024-02-29",
  });
});
