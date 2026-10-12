import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(
  process.env.OPENSEO_LOCAL_MCP_URL || "http://127.0.0.1:3001/mcp",
);
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname),
  "This smoke check is for a loopback instance only",
);
const client = new Client({ name: "clickminds-local-smoke", version: "1.0.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  const { tools } = await client.listTools();
  for (const name of [
    "start_seo_work",
    "get_seo_work_context",
    "list_seo_work",
    "checkpoint_seo_work",
    "compare_organic_periods",
    "propose_learning_pattern",
    "save_report",
  ])
    assert(
      tools.some((t) => t.name === name),
      `Missing ${name}`,
    );
  assert(
    !tools.some((t) => /approve.*pattern|review_learning_pattern/.test(t.name)),
    "Human pattern approval must not be available to the model",
  );
  const projects = await client.callTool({
    name: "list_projects",
    arguments: {},
  });
  assert(!projects.isError, "Could not read projects");
  if (process.argv.includes("--write-fixture")) {
    const rows = projects.structuredContent?.projects;
    assert(Array.isArray(rows) && rows[0]?.id, "Create a local project first");
    const projectId = rows[0].id;
    const args = {
      projectId,
      requestKey: "clickminds-local-smoke-v1",
      goal: "Local installation smoke check — no client analysis",
      startDate: "2026-08-01",
      endDate: "2026-08-28",
      contextChars: 2000,
      outputTokens: 500,
    };
    const first = await client.callTool({
      name: "start_seo_work",
      arguments: args,
    });
    assert(!first.isError, JSON.stringify(first));
    const id = first.structuredContent.result.id;
    const retry = await client.callTool({
      name: "start_seo_work",
      arguments: args,
    });
    assert.equal(retry.structuredContent.result.id, id);
    const pack = await client.callTool({
      name: "get_seo_work_context",
      arguments: { projectId, runId: id },
    });
    assert(!pack.isError, JSON.stringify(pack));
    assert(pack.structuredContent.result.chars <= 2000);
    assert.equal(pack.structuredContent.result.policy.backendLlmCalls, 0);
    const absent = await client.callTool({
      name: "get_seo_work_context",
      arguments: { projectId, runId: "00000000-0000-4000-8000-000000000001" },
    });
    assert(absent.isError, "Unknown run must not resolve");
    console.log(
      JSON.stringify({
        ok: true,
        tools: tools.length,
        projectId,
        runId: id,
        contextChars: pack.structuredContent.result.chars,
        localOnly: true,
        providerCalls: 0,
      }),
    );
  } else
    console.log(
      JSON.stringify({
        ok: true,
        tools: tools.length,
        localOnly: true,
        readOnly: true,
      }),
    );
} finally {
  await client.close();
}
