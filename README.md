# pcc-network-kit

Single source of truth for the **"join the Physical Capability Cloud"** invitation that
ships into every repo and agent-facing surface we own. Author once here; fan out with
the sync tool.

## Why this exists

Any repo, MCP server, or package another developer's agent might read is a doorway to
the network. This kit places an honest, opt-in invitation at each doorway — pointing at
the live front door (<https://capability.network/start>) — without duplicating the API
docs and without clobbering anything.

**Read [GOVERNANCE.md](./GOVERNANCE.md) first.** It's the honesty contract that keeps
this an invitation, not prompt injection.

## What's in the box

| File | Goes where | Purpose |
|---|---|---|
| `templates/PCC-NETWORK.md` | repo root | the invitation — hand-held "how to join + why" doc |
| `templates/pcc.json` | repo root | machine-readable manifest (agents parse this) |
| `templates/AGENTS.snippet.md` | managed block in `AGENTS.md` / `README.md` | short pointer to the two files above |
| `templates/mcp-instructions.snippet.md` | an MCP server's `instructions` field | same invitation for agents that connect over MCP |
| `sync/pcc-sync.mjs` | — | engine: fans templates into target repos (dry-run by default) |
| `sync/open-prs.sh` | — | token-free local driver: clone → apply → one PR per repo (uses your `gh` auth) |
| `.github/workflows/sync-pcc-network.yml` | this repo's CI | opens PRs into target repos (manual dispatch; needs `PCC_SYNC_TOKEN`) |
| `sync/repos.json` | — | the target list |

## Use it

```bash
# 1. curate the target list (repos.json uses "github": "owner/name" entries)
$EDITOR sync/repos.json

# 2. see exactly what would change across every target — clones + reports, writes nothing
bash sync/open-prs.sh

# 3. open one PR per repo (clone → apply → branch/commit/push → PR) using your gh auth
bash sync/open-prs.sh --apply
```

`open-prs.sh` is the token-free local path — it uses your existing `gh` login and never
touches your working trees. For hands-off CI runs, the GitHub Action
(`.github/workflows/sync-pcc-network.yml`, manual dispatch, dry-run default) does the same
but needs a `PCC_SYNC_TOKEN` secret with cross-repo push + PR rights.

`sync/pcc-sync.mjs` is the underlying engine — call it directly with a manifest whose
entries carry local `path`s to apply into checkouts you already have.

## The single-source rule

Edit templates in this kit only. Synced copies carry a managed block that is regenerated
on every run — hand-edits downstream are lost. Bump `version` in `pcc.json` + the footer
date in `PCC-NETWORK.md` when the message changes.

Apache-2.0.
