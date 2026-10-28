# ClickMinds.dm edition: licensing and maintenance

## Provenance

- Upstream: https://github.com/every-app/open-seo
- Baseline commit: `89e5a00717cdf049b7c2b4e29646edb3a7d4995b`
- Baseline release: `v0.1.12` (repository package version)
- Review date: 2026-10-12
- Downstream maintainer: ClickMinds.dm
- GitHub account: `damczech-clickminds`

The root LICENSE is MIT, with copyright © 2026 Ben Senescu. It permits use,
modification, commercial use, distribution, sublicensing and sale, provided
its copyright and permission notice accompany copies or substantial portions.
It contains no requirement to publish private changes or offer network users
source code. It disclaims warranties. This is an assessment of the repository's
license text, not an exhaustive audit of all dependencies, assets or services.

Keep LICENSE unchanged and ship NOTICE alongside it. ClickMinds.dm attribution
covers this edition and its own original additions, not ownership of the core.
MIT does not expressly grant trademark rights. Use independently branded assets
for future product branding; do not imply upstream endorsement. Dependency
licenses, including any separate licenses inside vendored skills, still apply.
DataForSEO, Cloudflare and other providers have separate terms and charges.

## Git layout

- `upstream`: original every-app/open-seo repository; fetching only.
- `origin`: https://github.com/damczech-clickminds/open-seo-clickminds.git
- `main`: original baseline, reserved for upstream history.
- `clickminds/main`: edition with ClickMinds changes, used for instance builds.

The full upstream Git history is retained, so community changes merged into
upstream can be integrated with ordinary Git merges. Unmerged community PRs
require individual review; they are not automatically accepted.

After creating the GitHub fork, connect and publish:

```sh
git remote add origin https://github.com/damczech-clickminds/open-seo-clickminds.git
git push -u origin clickminds/main
```

If `origin` already exists, inspect `git remote -v` and set it to the actual fork
URL. Set the fork's default branch to `clickminds/main` in GitHub settings.
Do not reset the edition branch to upstream/main or force-push over custom work.

## Integrate updates

Start with a clean working tree. Fetch changes and inspect them first:

```sh
git fetch upstream --tags
git log --oneline HEAD..upstream/main
git diff HEAD...upstream/main -- LICENSE package.json pnpm-lock.yaml drizzle deploy
# Replace YYYYMMDD with the actual update date; use an unused branch name.
git switch -c update/upstream-YYYYMMDD clickminds/main
git merge --no-ff upstream/main
```

Resolve conflicts while preserving upstream notices and ClickMinds additions.
Follow the current upstream local-development prerequisites, install the locked
pnpm dependencies, then run the relevant checks:

```sh
pnpm install --frozen-lockfile
pnpm run ci:check
pnpm run test:ci
```

Review configuration and migration changes and smoke-test a staging copy of the
instance, including health, authentication and the SEO workflows you use. Check
LICENSE again on every update. Commit any conflict resolution and open a pull
request from the update branch into `clickminds/main` on the fork. Merge it only
after review and validation. Nothing in this setup automatically deploys updates.

## Build and update the ClickMinds instance

The upstream Compose file defaults to the upstream GHCR image. Pulling that image
will not include ClickMinds changes. Build from the reviewed edition commit:

```sh
git switch clickminds/main
# Configure .env with your own provider credentials, following upstream docs.
# Create it once with: cp .env.example .env
# Keep .env and credentials out of Git and source archives.
git rev-parse --short=12 HEAD
# Substitute that commit ID for COMMIT in both commands.
docker build -f deploy/docker/Dockerfile -t clickminds/open-seo:COMMIT .
OPEN_SEO_IMAGE=clickminds/open-seo:COMMIT docker compose up -d
```

Persist the chosen `OPEN_SEO_IMAGE` tag in the private `.env` file so later Compose
commands keep the edition image. The existing Docker setup binds to localhost
and uses `local_noauth`; internet access needs an authenticated reverse proxy or
an appropriately configured Cloudflare deployment. Follow the current upstream
[Docker](../SELF_HOSTING_DOCKER.md) or
[Cloudflare](../SELF_HOSTING_CLOUDFLARE.md) guide for the chosen environment.

Before each instance update, record the running image tag and back up the actual
persistent database/volume and private configuration. Keep the Compose project
name stable so updates reuse the existing volume. Stop database writes while
making a consistent backup; keep backups outside Git and source packages.

After updating, check `docker compose ps`, container logs and `/api/health`, then
verify user workflows. Retain the previous image tag. A rollback may need both
the old image and the pre-migration database backup: old code may not understand
a migrated schema. Do not use `docker compose down -v` during updates.

## Contribution and publication

Keep customization commits small and focused. Submit generally useful fixes to
upstream through separate PRs when desired. A public GitHub fork publishes
committed changes; keep private credentials, customer data and internal business
material outside it. Keep the original project and contributor notices in all
redistributed source or image packages.

## Easy upstream updates

After the automation PR is reviewed and merged, set `clickminds/main` as the
repository default branch. GitHub schedules and manual workflow dispatch require
the workflow on the default branch. Enable Actions for the fork and, in Actions
settings, allow GitHub Actions to create pull requests. The workflow uses the
built-in GITHUB_TOKEN; no personal token or provider keys are needed.

Open **Actions → ClickMinds upstream update → Run workflow** for an on-demand
check. It also checks every Monday at 06:23 UTC (07:23 Warsaw winter time,
08:23 summer time). GitHub can delay schedules and disables schedules in public
repositories after extended inactivity; the manual button remains the fallback.

If upstream has no new commits, the run ends without a PR. If an update PR is
already open, the run links it and waits for it to be merged or closed rather
than opening duplicates. License changes and merge conflicts fail preparation
and appear in the failed Actions run. Review these manually; no candidate is
published. Closing a rejected update allows it to be proposed again on the next
run; there is no permanent ignore list.

A candidate is validated by the same reusable CI as normal pull requests, using
its exact commit SHA. Successful validation creates a review PR; failure creates
a draft PR with logs. The `ClickMinds / upstream quality` commit status refers to
that SHA only. Tests run with a read-only token, without inherited deployment
secrets; the separate reporting job has permission to create the PR and status.
GITHUB_TOKEN-created PRs do not start ordinary PR workflows, so this workflow
calls CI explicitly rather than relying on those events.

Require the CI jobs and code-owner review in a branch ruleset before treating
these checks as merge enforcement. This proposal does not configure a ruleset:
without one, the repository owner can still merge failing PRs. CODEOWNERS names
`@damczech-clickminds` as this fork's reviewer for control-plane and plugin files.
No outside upstream maintainer is asked to administer the fork.

Green checks mean the automated checks passed, not that every regression is
excluded. Database migrations, external API compatibility and production data
need staging verification. This workflow builds but does not start the Docker
image or deploy to any instance. Keep the backup and rollback procedure above.

## New Mac / host contract
Domain: independent SEO tooling. Canonical checkout:
`~/ClickMinds-Workspace/40-tools/Open SEO/open-seo-clickminds`; origin above,
accepted edition branch `clickminds/main`. Read current PROJECT_REGISTRY,
WORK_RUNTIME and Control Plane CURRENT; select each client's own PROJECT_OS only
for an authorized client task. Apply neutral Codex instructions and this repo's
AGENTS. Native capabilities: existing pnpm scripts, OpenSEO plugin skills/MCP;
setup and validation commands remain those documented above and in package.json.
Use pnpm 10.30.1, the supported Node prerequisite and the existing locked install,
then `pnpm run ci:check` and `pnpm run test:ci` when reactivating development.
Operational state is PAUSED: do not start server, providers, paid APIs, deployments
or MCP automatically during host bootstrap. No Bridge dependency for ordinary SEO.
Provider credentials and tenant data must be rebound through authorized native
setup, never copied from an old Codex profile. Update via reviewed branch/PR and
required CI within budget, then accepted edition main, scoped install and actual
loaded acceptance. Existing update/backup/rollback instructions above own rollback;
never overwrite state databases or bypass tenant boundaries to pass readiness.
