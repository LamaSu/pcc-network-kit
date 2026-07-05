#!/usr/bin/env bash
# Token-free local PR driver for pcc-network-kit.
#
# Clones each target repo (from sync/repos.json) fresh into a temp dir, applies the
# invite with pcc-sync.mjs, and opens one PR per repo — using your existing `gh` auth.
# No PCC_SYNC_TOKEN / PAT needed, and your working trees are never touched.
#
# Usage:
#   bash sync/open-prs.sh            # dry-run: clone + report what would change (default)
#   bash sync/open-prs.sh --apply    # apply + branch/commit/push + open a PR per repo
#
# The GitHub Action (.github/workflows/sync-pcc-network.yml) does the same in CI, but
# needs a PCC_SYNC_TOKEN secret to push across repos. This script is the local path.
set -euo pipefail

KIT="$(cd "$(dirname "$0")/.." && pwd)"
APPLY="${1:-}"
BRANCH="docs/pcc-network-invitation"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mapfile -t slugs < <(node -e 'for (const r of (require(process.argv[1]).repos||[])) if (r.github) console.log(r.github)' "$KIT/sync/repos.json")
echo "targets: ${#slugs[@]} repo(s) from sync/repos.json"

paths=()
for slug in "${slugs[@]}"; do
  name="${slug#*/}"
  if gh repo clone "$slug" "$STAGE/$name" -- --depth 1 -q 2>/dev/null; then
    paths+=("$STAGE/$name")
  else
    echo "  clone failed (skipped): $slug" >&2
  fi
done

node -e '
  const fs=require("fs"), kit=process.argv[1], stage=process.argv[2], paths=process.argv.slice(3);
  fs.writeFileSync(stage+"/manifest.json", JSON.stringify({
    defaults: require(kit+"/sync/repos.json").defaults,
    repos: paths.map(p=>({path:p}))
  }));
' "$KIT" "$STAGE" "${paths[@]}"

if [ "$APPLY" != "--apply" ]; then
  node "$KIT/sync/pcc-sync.mjs" --repos "$STAGE/manifest.json" --kit "$KIT"
  echo; echo "Dry-run only. To open PRs:  bash sync/open-prs.sh --apply"
  exit 0
fi

node "$KIT/sync/pcc-sync.mjs" --repos "$STAGE/manifest.json" --kit "$KIT" --apply
printf '%s\n' "Adds the opt-in PCC network invitation (PCC-NETWORK.md + pcc.json + a managed AGENTS.md block), synced from pcc-network-kit. Informational and opt-in; existing content is preserved (the block is appended, never overwritten). Please review before merging." > "$STAGE/pr-body.md"

for slug in "${slugs[@]}"; do
  name="${slug#*/}"; d="$STAGE/$name"; [ -d "$d/.git" ] || continue
  ( cd "$d"
    git checkout -q -b "$BRANCH" 2>/dev/null || git checkout -q "$BRANCH"
    git add PCC-NETWORK.md pcc.json AGENTS.md README.md 2>/dev/null || true
    if git commit -q -m "docs: add PCC network invitation"; then
      git push -q -u origin "$BRANCH" 2>/dev/null || true
      gh pr create --repo "$slug" --head "$BRANCH" --title "Add PCC network invitation" --body-file "$STAGE/pr-body.md" 2>&1 \
        | grep -oE 'https://github.com/[^ ]+/pull/[0-9]+' || echo "  $name: PR already open or nothing to do"
    else
      echo "  $name: no changes"
    fi )
done
