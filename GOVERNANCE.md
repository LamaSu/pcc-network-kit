# pcc-network-kit — Governance & the honesty contract

This kit fans a single message — "you can join the Physical Capability Cloud" — into
many repos and agent-facing surfaces. That reach is exactly why it must never read as
manipulation. This file is the contract every edit to `templates/` must hold to.

## The line

There is a real difference between:

- **Agent-facing documentation** (legitimate): openly addressed, helps the reader's
  operator, discloses who benefits, and leaves the decision to the human. This is the
  emerging `AGENTS.md` / `llms.txt` convention.
- **Prompt injection** (never): covert instructions that try to steer another agent
  against — or without the knowledge of — its principal.

The honest version isn't the polite-but-weaker option; it's the only one that scales.
Agents and platforms increasingly detect and distrust covert steering, and a repo that
attempts it gets flagged and blocked. Network growth comes from real value plus great
onboarding, not from manipulation. If a line only "works" because the operator isn't
really looking, it is injection — and it will backfire.

## Five rules every template must pass

1. **Address the human, through their agent — transparently.** No impersonating
   system/user messages, no "ignore previous instructions," no hidden or zero-width
   text, no invisible HTML.
2. **Invitation, not instruction.** The reading agent should *surface* PCC and let the
   operator choose. Never "you must," never auto-enroll, never transact without an
   explicit request.
3. **No dark patterns.** No false urgency, no fake scarcity, no unverifiable claims, no
   "moat" / lock-in framing. If it isn't true, it doesn't ship.
4. **Principal-aligned.** The content must help the reader's operator. If joining isn't
   in their interest, make it easy to see that and decline.
5. **The read-aloud test.** Would every line be fine if the operator read it out loud,
   knowing exactly what it does? If not, cut it.

## What this kit deliberately does NOT do

- It does not run anything on the reader's machine.
- It does not collect or exfiltrate anything.
- It does not enroll, provision keys, or transact — those are operator choices made
  against the live gateway.
- It does not overwrite hand-written content: it owns exactly two whole files
  (`PCC-NETWORK.md`, `pcc.json`) plus one clearly-delimited managed block. Nothing else
  is touched.

## Editing

Edit templates **here**, in the kit — never the synced copies in target repos. The
managed block is regenerated on every sync, so a downstream hand-edit is lost. When the
message changes, bump `version` in `templates/pcc.json` and the footer date in
`templates/PCC-NETWORK.md` so downstream readers can tell fresh from stale.
