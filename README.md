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
| `sync/pcc-sync.mjs` | — | fans templates into target repos (dry-run by default) |
| `sync/sync-pcc-network.yml` | `.github/workflows/` of this repo | opens PRs into target repos (manual dispatch) |
| `sync/repos.json` | — | the target list |

## Use it

```bash
# 1. curate the target list
$EDITOR sync/repos.json

# 2. see exactly what would change — writes nothing
node sync/pcc-sync.mjs

# 3. write the files + managed blocks locally
node sync/pcc-sync.mjs --apply

# 4. (optional) also branch + commit in each repo — never pushes
node sync/pcc-sync.mjs --apply --commit
```

For cross-repo **pull requests**, use the GitHub Action (`sync/sync-pcc-network.yml`) —
manual dispatch, needs a `PCC_SYNC_TOKEN` secret. It defaults to dry-run.

## The single-source rule

Edit templates in this kit only. Synced copies carry a managed block that is regenerated
on every run — hand-edits downstream are lost. Bump `version` in `pcc.json` + the footer
date in `PCC-NETWORK.md` when the message changes.

Apache-2.0.
