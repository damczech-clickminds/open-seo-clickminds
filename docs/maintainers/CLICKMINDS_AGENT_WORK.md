# ClickMinds local agent work

The canonical code is `damczech-clickminds/open-seo-clickminds`, default branch
`clickminds/main`. Develop on a feature branch and review before merging.
Framework code, migrations, tools and skills belong in Git. Client data belongs
in the instance database and its private backup, never in Git or source archives.
The upstream-update workflow runs the same test suite, including agent-work
regressions, for update candidates.

## Start locally and connect Codex

Use the pinned pnpm version from package.json. From the repository root:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm run db:migrate:local
# .env.local: AUTH_MODE=local_noauth, PORT=3001
corepack pnpm exec vite dev --host 127.0.0.1 --port 3001
codex mcp add clickminds-openseo-local --url http://127.0.0.1:3001/mcp
```

For a lean Codex connection, add an allowlist to the same table in your private
Codex config (see [official MCP configuration](https://developers.openai.com/codex/mcp)):

```toml
[mcp_servers.clickminds-openseo-local]
url = "http://127.0.0.1:3001/mcp"
enabled_tools = [
  "whoami", "list_projects", "create_project",
  "get_project_context", "update_project_context",
  "start_seo_work", "get_seo_work_context", "list_seo_work",
  "checkpoint_seo_work", "compare_organic_periods", "propose_learning_pattern",
  "list_reports", "get_report", "save_report", "get_search_console_performance",
  "get_google_analytics_organic_overview",
  "get_google_analytics_organic_landing_pages",
  "get_google_analytics_measurement_health",
]
```

This 18-tool profile excludes paid research, destructive cleanup and public
sharing. It is a client-side allowlist, not server authorization or a global
spend cap: the UI and other MCP connections retain their normal capabilities.
Enable additional operations explicitly when needed. Do not configure the full
plugin MCP connection alongside this profile if you intend to keep its narrow
tool surface; the plugin's server catalog is broader.

The fork's plugin `.mcp.json` also defaults to this loopback endpoint. Set a
different endpoint explicitly for another secured instance. A client must reach
loopback on the machine running the server; a cloud Codex runtime cannot reach
your laptop's localhost. Reopen/reload the Codex session if it cached its tool
catalog. Use the repository/plugin `clickminds-seo-work` skill for the workflow.

No DataForSEO or OpenRouter key is needed for storing work, context retrieval,
learning candidates or report storage. The app may show a DataForSEO setup
banner because other research features need it. Real GSC comparisons require
the Google OAuth setup and a GSC property connected to that project; see
[the existing setup guide](../SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md). No mock
metrics are inserted into client analysis when that connection is absent.

Local trust is explicit: `local_noauth` is one trusted operator, not separate
client logins. Bind to loopback. Use authenticated deployments and appropriate
organization memberships when sharing with other people. Logical project
scoping prevents accidental mixing through these tools; it does not isolate
data from a local process that can read the whole database or from an operator
who has access to both projects. Use separate organizations/instances when
independent security boundaries are required.

## Available workflow

- `start_seo_work`: explicit project, goal, date range up to 90 days, stable
  requestKey. Repeated identical requests reuse one work item; changed payloads
  with that key fail.
- `list_seo_work`: latest 10 compact summaries, project-scoped.
- `get_seo_work_context`: task/checkpoint, immutable comparison evidence, project
  memory, then reviewed organization learning. Default text selection budget
  12,000 characters, configurable 2,000–24,000. Partial/omitted sources are
  explicit. The reported token count is an estimate, not tokenizer billing.
- `compare_organic_periods`: exactly two sequential aggregate GSC queries, final
  web search, equal adjacent periods. Saves one comparison and returns it on
  retries. No DataForSEO, crawl or backend LLM. Missing rows are unknown, not
  zero. It produces a factual comparison, not a complete causal diagnosis.
- `checkpoint_seo_work`: bounded 4,000-character checkpoint with optimistic
  revision checking. Cannot overwrite a running comparison.
- `propose_learning_pattern`: private project-local candidate; human approval
  is deliberately absent from MCP/SAM tools.

SAM and external MCP reuse the same handlers. The Context UI uses the same
service and shows work/checkpoints and candidate review. SAM now has report
list/read/save tools, so a private report can be delivered through either agent
surface and read in the existing Reports UI. Public sharing and report deletion
are not added to SAM by this feature.

If evidence was saved before a checkpoint interruption, another MCP comparison
call recovers the completed checkpoint without contacting Google again.
A process failure before saving evidence can leave `running`. Inspect the work and
stored evidence before recovery; there is no automatic lease expiry that could
repeat an external operation. A normal handled GSC error writes `blocked`.
After fixing the cause, explicitly checkpoint it to `ready` at its current
revision. The UI currently supports creation, execution, result inspection and
learning review; checkpoint editing/recovery is available through MCP.

## Learning boundary

Candidates are project data. The organization-wide catalog contains only a
reviewed mechanism, applicability, exceptions, market/industry labels and
review metadata. It contains no raw evidence or source-client foreign key.
Owners/admins review candidates in Context, check every field for identifiers,
and explicitly confirm removal before publication. Simple domain/email checks
are defense in depth; they cannot recognize every company name or private
metric. The human review is necessary. Rejected candidates are never published.
A review interrupted during publication can be retried with the same decision;
a concurrent opposite decision cannot replace it.

Learning crosses clients, markets and industries within the organization.
Applicability and failure conditions travel with the pattern; transfer remains
a hypothesis requiring local evidence. The catalog is not shared with other
organizations. Candidate approval is immutable; further correction, revocation
and richer provenance/lifecycle tooling are future work. Do not approve a
candidate unless its published content can remain useful without client data.

## Costs and context

The new deterministic workflow makes **zero backend model calls and zero paid
SEO-provider calls**. Google API quotas and ordinary host/database costs still
apply. There is no hidden autonomous scheduler or multi-agent fan-out.

The Codex skill routes calculations to tools, extraction to light reasoning and
material ambiguity to stronger reasoning, with progressive context loading and
checkpointing. It does not choose the user's Codex model, count all of Codex's
tokens or enforce a subscription spend cap. Its 500–4,000 output-token target
is guidance. Existing research tools used outside this bounded workflow retain
their own charging/approval contracts; there is no global USD reservation layer.

SAM self-host defaults are low reasoning, 12 steps and 4,000 output tokens per
step. Trusted deployment overrides: `SAM_REASONING_EFFORT=low|max`,
`SAM_MAX_STEPS=4..40`, `SAM_MAX_OUTPUT_TOKENS=500..16000`. Invalid values fall back
to defaults. Hosted defaults remain max/40/16,000. These bound the agent loop,
not an exact USD amount. Token usage, provider pricing and tool spend vary.
Conversation compaction continues to use the upstream runtime safeguards.

## Verification and backups

```sh
corepack pnpm exec vitest run
corepack pnpm exec tsc --noEmit
corepack pnpm exec oxlint . --type-aware
corepack pnpm exec knip
node scripts/smoke-agent-work.mjs
# Optional: writes one clearly marked, idempotent synthetic work item locally.
node scripts/smoke-agent-work.mjs --write-fixture
```

The real SQLite service tests cover project scoping, concurrent execution,
idempotency, stale revisions, missing data, blocked GSC calls, private candidates,
owner approval and organization isolation. Schema parity covers both dialects;
this does not replace an integration test against a running Postgres instance.
Live smoke tests do not contact paid providers. Live client correctness still
requires configured GSC and a known real data case.

The local Vite runtime persists SQLite databases, objects and sessions in
`../Klienci/_app-state`, outside the source repository. On the migrated local
installation, `.wrangler/state` is a symlink to the same directory, so Wrangler
CLI commands and Vite use the same state. Preserve database identifiers and WAL
files. Local cache and AuditScratchpad symlinks point into `../runtime` instead
of durable client storage. These machine-local links are not tracked by Git.

Keep the workspace outside iCloud Drive, Desktop and Documents. Git synchronizes
application source; it does not synchronize client data. `.wrangler/`, .env files
and credentials are ignored. Back up client state privately while the app is
stopped, or use a consistent SQLite backup. Do not commit it or add it to a source
bundle. For Postgres, use normal database backup/restore procedures. Applying
migrations is not a backup. No client-memory files from Ads Auditor were imported
or published.
