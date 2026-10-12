#!/usr/bin/env bash
# Run from a clean checkout of clickminds/main. No upstream code is executed here.
set -euo pipefail
: "${GITHUB_OUTPUT:?GITHUB_OUTPUT must point to the workflow output file}"
: "${CANDIDATE_BRANCH:?CANDIDATE_BRANCH is required}"
git check-ref-format --branch "$CANDIDATE_BRANCH" >/dev/null
if [[ -n "$(git status --porcelain)" ]]; then
  echo "::error::Candidate preparation requires a clean checkout."
  exit 1
fi
base_sha=$(git rev-parse HEAD)
git fetch https://github.com/every-app/open-seo.git main
upstream_sha=$(git rev-parse FETCH_HEAD)
if git merge-base --is-ancestor "$upstream_sha" "$base_sha"; then
  echo "changed=false" >> "$GITHUB_OUTPUT"
  echo "Upstream is already included."
  exit 0
fi
# Fail closed on any licensing change, including removal of the original notice.
if ! diff -u <(git show "$base_sha:LICENSE") <(git show "$upstream_sha:LICENSE"); then
  echo "::error::Upstream LICENSE changed; manual license review is required."
  exit 1
fi
git switch -c "$CANDIDATE_BRANCH"
git -c user.name='ClickMinds updater' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
  -c core.hooksPath=/dev/null merge --no-ff --no-edit "$upstream_sha"
if ! git diff --quiet "$base_sha" HEAD -- LICENSE NOTICE; then
  echo "::error::Merged candidate changed LICENSE or ClickMinds NOTICE."
  exit 1
fi
{
  echo "changed=true"
  echo "sha=$(git rev-parse HEAD)"
  echo "branch=$CANDIDATE_BRANCH"
  echo "upstream=$upstream_sha"
} >> "$GITHUB_OUTPUT"
