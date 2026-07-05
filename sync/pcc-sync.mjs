#!/usr/bin/env node
// pcc-sync.mjs — fan the PCC network invitation into target repos from a single source.
// Dry-run by default. Idempotent. Only touches files it owns + one delimited managed block.
//
// Usage:
//   node pcc-sync.mjs                     # dry-run against sync/repos.json (writes nothing)
//   node pcc-sync.mjs --apply             # write files + managed blocks
//   node pcc-sync.mjs --apply --commit    # + git branch & commit per repo (never pushes)
//
// Flags:
//   --apply           actually write (default: dry-run)
//   --commit          with --apply, create a branch and commit in each repo (no push)
//   --branch <name>   branch for --commit (default: chore/pcc-network-kit)
//   --repos <path>    repos manifest (default: repos.json next to this script)
//   --kit <path>      kit root holding templates/ (default: parent of this script)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const APPLY = has('--apply');
const COMMIT = has('--commit');
const BRANCH = val('--branch', 'chore/pcc-network-kit');
const reposPath = resolve(val('--repos', join(HERE, 'repos.json')));
const KIT = resolve(val('--kit', resolve(HERE, '..')));

const START = '<!-- PCC-NETWORK:START (managed by pcc-network-kit — edit in the kit, not here) -->';
const END = '<!-- PCC-NETWORK:END -->';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sha = (s) => createHash('sha256').update(s).digest('hex');
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);

function loadJSON(p) {
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { console.error(`FATAL: cannot read ${p}: ${e.message}`); process.exit(1); }
}

const manifest = loadJSON(reposPath);
const defaults = manifest.defaults || { inject_into: ['AGENTS.md', 'README.md'], copy_files: ['PCC-NETWORK.md', 'pcc.json'] };

const snippet = read(join(KIT, 'templates', 'AGENTS.snippet.md'));
if (!snippet) { console.error(`FATAL: missing templates/AGENTS.snippet.md under ${KIT}`); process.exit(1); }
const inner = snippet.slice(snippet.indexOf(START) + START.length, snippet.indexOf(END)).trim();
const MANAGED = `${START}\n${inner}\n${END}`;

const plan = []; // { repo, action, file, status, _write?: [path, content] }

function planCopy(repoPath, file) {
  const src = read(join(KIT, 'templates', file));
  if (src == null) { plan.push({ repo: repoPath, action: 'copy', file, status: `SKIP (no source)` }); return; }
  const dst = join(repoPath, file);
  const cur = read(dst);
  if (cur != null && sha(cur) === sha(src)) { plan.push({ repo: repoPath, action: 'copy', file, status: 'unchanged' }); return; }
  plan.push({ repo: repoPath, action: 'copy', file, status: cur == null ? 'CREATE' : 'UPDATE', _write: [dst, src] });
}

function planInject(repoPath, file, allowCreate) {
  const dst = join(repoPath, file);
  const cur = read(dst);
  if (cur == null) {
    // Only create an agent-facing file (AGENTS.md) when missing; never spawn a bare
    // README that contains nothing but our block.
    if (!allowCreate) { plan.push({ repo: repoPath, action: 'inject', file, status: 'skip (absent)' }); return; }
    plan.push({ repo: repoPath, action: 'inject', file, status: 'CREATE', _write: [dst, MANAGED + '\n'] }); return;
  }
  let next;
  if (cur.includes(START) && cur.includes(END)) {
    next = cur.replace(new RegExp(`${esc(START)}[\\s\\S]*?${esc(END)}`), MANAGED);
  } else {
    next = cur.trimEnd() + `\n\n${MANAGED}\n`;
  }
  if (sha(next) === sha(cur)) { plan.push({ repo: repoPath, action: 'inject', file, status: 'unchanged' }); return; }
  plan.push({ repo: repoPath, action: 'inject', file, status: cur.includes(START) ? 'UPDATE block' : 'APPEND block', _write: [dst, next] });
}

for (const r of manifest.repos || []) {
  if (!r.path) { plan.push({ repo: r.github || '(remote)', action: '-', file: '-', status: 'remote-only (handled by Action)' }); continue; }
  const repoPath = resolve(r.path);
  if (!existsSync(repoPath)) { plan.push({ repo: repoPath, action: '-', file: '-', status: 'MISSING repo path' }); continue; }
  for (const f of (r.copy_files || defaults.copy_files)) planCopy(repoPath, f);
  for (const f of (r.inject_into || defaults.inject_into)) planInject(repoPath, f, /^agents\.md$/i.test(f));
}

console.log(`\npcc-network-kit sync — ${APPLY ? 'APPLY' : 'DRY-RUN (writes nothing)'}`);
console.log(`kit:   ${KIT}`);
console.log(`repos: ${reposPath}\n`);
let changes = 0;
for (const p of plan) {
  const changed = /CREATE|UPDATE|APPEND|MISSING/.test(p.status);
  if (changed) changes++;
  console.log(`  [${changed ? '*' : ' '}] ${basename(p.repo).padEnd(24)} ${p.action.padEnd(7)} ${String(p.file).padEnd(16)} ${p.status}`);
}
console.log(`\n${changes} change(s) across ${(manifest.repos || []).length} repo(s).`);

if (!APPLY) {
  console.log('\nDry-run only. Re-run with --apply to write, --apply --commit to branch+commit (never pushes).\n');
  process.exit(0);
}

const touched = new Map();
for (const p of plan) {
  if (!p._write) continue;
  const [dst, content] = p._write;
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, content);
  if (!touched.has(p.repo)) touched.set(p.repo, []);
  touched.get(p.repo).push(dst);
}
console.log(`\nWrote ${[...touched.values()].reduce((a, b) => a + b.length, 0)} file(s).`);

if (COMMIT) {
  for (const [repoPath, files] of touched) {
    try {
      const git = (...a) => execFileSync('git', ['-C', repoPath, ...a], { stdio: 'pipe' }).toString().trim();
      git('rev-parse', '--is-inside-work-tree');
      try { git('checkout', '-b', BRANCH); } catch { git('checkout', BRANCH); }
      git('add', ...files);
      git('commit', '-m', 'chore: sync PCC network invitation from pcc-network-kit');
      console.log(`  committed ${files.length} file(s) on ${BRANCH} in ${basename(repoPath)} (not pushed)`);
    } catch (e) {
      console.log(`  SKIP commit in ${basename(repoPath)}: ${String(e.message).split('\n')[0]}`);
    }
  }
  console.log('\nCommits are local only. Review, then push + open PRs yourself or via the Action.\n');
}
