# ClickMinds.dm edition: licensing and maintenance

## Provenance

- Upstream: https://github.com/every-app/open-seo
- Baseline commit: `89e5a00717cdf049b7c2b4e29646edb3a7d4995b`
- Baseline release: `v0.1.12` (repository package version)
- Review date: 2026-10-12
- Downstream maintainer: ClickMinds.dm
- Intended GitHub account: `damczech-clickminds`

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
- `origin`: the user's GitHub fork, once created and connected.
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
