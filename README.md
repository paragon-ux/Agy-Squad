# Agy-Squad

[![npm version](https://img.shields.io/npm/v/agy-squad.svg)](https://www.npmjs.com/package/agy-squad)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-Zensical-purple.svg)](https://paragon-ux.github.io/Agy-Squad/)
[![Tests](https://img.shields.io/badge/tests-100%25%20passing-brightgreen.svg)](https://github.com/paragon-ux/Agy-Squad/actions)

`Agy-Squad` is a multi-agent `/swarm` planner, code-review harness, and SHA-256 proof bundler (`agy-squad`) for **Google Antigravity** (`agy`) on Linux, macOS, and Windows (`Node.js >= 22`, zero external npm dependencies). It pairs with [Agy-Context-Saver](https://github.com/paragon-ux/Agy-Context-Saver) (`>= 2.0.1`) to assign non-overlapping file scopes, keep board handoffs under `500` bytes, audit worker tool traces, and verify every report with SHA-256 digests.

![Agy-Squad, Antigravity, and Agy-Context-Saver architecture](docs/assets/architecture-overview.svg)

The repository ships four components:

- **Cohort planner & MCP server ([`mcp/planner.mjs`](mcp/planner.mjs), [`mcp/dispatch.mjs`](mcp/dispatch.mjs), [`mcp/index.js`](mcp/index.js)):** Compiles flat (`1–3` workers) and layered (`4+` workers with Squad Leads) `/swarm` cohorts via `squad_planner` (or `dispatch_squad` for `invoke_subagent`), enforcing disjoint writable file scopes, 24-character roster names, explicit model pinning, and first-line `[agy-transcript-access: allow|deny]` directives.
- **Verification & proof CLI ([`bin/agy-squad.mjs`](bin/agy-squad.mjs), [`mcp/handoffs.mjs`](mcp/handoffs.mjs), [`mcp/verdicts.mjs`](mcp/verdicts.mjs)):** Collects isolated worktree slots, initializes records, fingerprints verified source files, reconciles `<= 500` byte `Pointer-Over-Wire` board receipts, computes canonical `Evidence Digest` hashes for independent integrity auditors (`audit-<id>`), and writes tamper-evident `.sources.json` bundles (`plan`, `dispatch`, `collect`, `bundle-init`, `fingerprint`, `inspect`, `digest`, `verdict`, `bundle`, `verify`, `prune`).
- **Review & governance skills ([`.agents/skills/`](.agents/skills/)):** Installs [`pr-review`](.agents/skills/pr-review/SKILL.md) (branch/PR diffs), [`full-review`](.agents/skills/full-review/SKILL.md) (non-diff triage and direction decisions), and [`swarm-governance`](.agents/skills/swarm-governance/SKILL.md) (role separation, proof bundling, and 4-check runtime closure) using the 10-category [PR Review Standard v1.4.0](.agents/skills/pr-review/references/pr-review-standard.md).
- **Zero-subagent harness profiler ([`self-diagnosis`](.agents/skills/self-diagnosis/SKILL.md), [`diagnose.mjs`](.agents/skills/self-diagnosis/scripts/diagnose.mjs)):** Audits skill token budgets, prompt template byte ceilings (`<= 1800 B` specialist, `<= 3300 B` lead), review ledger invariants, and package boundaries in `< 200 ms` with zero model cost.

## Quickstart

![Six-step swarm lifecycle and dual-verdict gate](docs/assets/swarm-lifecycle.svg)

### Prerequisites

- **Node.js:** `>= 22.0.0` (Linux, macOS, or Windows)
- **Google Antigravity:** Antigravity 2.0+ (Desktop IDE or `agy` CLI with `/swarm` / `invoke_subagent`)
- **Agy-Context-Saver:** `>= 2.0.1` with **RTK (`>= 1.1.0`)** (`npx --package=agy-context-saver agy-context setup`)

### Install and verify

```bash
# Install via npx (registers plugin, skills, MCP server, and agy-squad CLI shim)
npx --package=agy-squad agy-squad setup

# Or from a local checkout
npm run setup

# Check plugin, skills, MCP registration, and CLI shim status
agy-squad status
```

To remove the plugin link, MCP server entry, and CLI shims:

```bash
agy-squad uninstall
# Or restore pre-install .bak configuration files:
agy-squad uninstall --restore-backups
```

### Plan, audit, and bundle a cohort

```bash
# Plan a layered /swarm cohort from a manifest or freeform task
agy-squad plan --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  --topology layered --mode swarm

# Parse strict content and integrity verdicts
agy-squad verdict scratch/agy-squad/squad-<id>/lead/report.md
agy-squad verdict --integrity scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md

# Compute canonical Evidence Digest, write .sources.json proof bundle, and verify SHA-256 hashes
agy-squad fingerprint src/app.js docs/tools.md
agy-squad inspect scratch/agy-squad/<id>-record.json
agy-squad digest scratch/agy-squad/<id>-record.json
agy-squad bundle scratch/agy-squad/<id>-record.json --replace
agy-squad verify scratch/agy-squad/squad-<id>/lead/report.sources.json
```

## CLI, MCP, and skills summary

| Surface | Purpose | Common usage |
| :--- | :--- | :--- |
| `agy-squad setup` / `status` / `uninstall` / `restore-backups` | Install, audit, restore `.bak` configs, or remove plugin, skills, MCP entry, and CLI shim | `agy-squad setup` / `agy-squad status` / `agy-squad setup --check` |
| `agy-squad plan` / `squad_planner` (MCP) | Compile flat or layered `/swarm` cohorts with scope checks and `provenanceScaffold` | `agy-squad plan --manifest <path> [--topology flat\|layered]` |
| `agy-squad dispatch` / `dispatch_squad` (MCP) | Compile `invoke_subagent` payloads (`all_l1`, `<squadId>`, `integrity_auditor[:<id>]`) | `agy-squad dispatch --squad <id> --manifest <path>` |
| `agy-squad collect` / `bundle-init` | Copy `share`/`branch` report slots into coordinator workspace and build `<record.json>` | `agy-squad collect --plan plan.json --from ../wt1` / `bundle-init --plan plan.json src/app.js` |
| `agy-squad fingerprint` / `inspect` / `digest` | Hash verified files, check `< 500 B` `READY` receipts, and compute `Evidence Digest` | `agy-squad digest scratch/agy-squad/<id>-record.json` |
| `agy-squad verdict` / `bundle` / `verify` / `prune` | Parse `PASS` / `CLEAN` verdicts, write `.sources.json` proofs, and prune loose reports | `agy-squad bundle <record.json> --replace` / `agy-squad verify <sources.json>` |
| `/pr-review` & `/full-review` (`v1.4.0`) | 10-category commit-pinned diff review (`pr-review`) or non-diff triage (`full-review`) | Pair with `/swarm-governance` on `/swarm` |
| `/self-diagnosis` (`diagnose.mjs`) | Zero-subagent profiler checking skill token budgets, prompt sizes, and review ledgers | `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` |

## Benchmark summary vs. Antigravity `/teamwork`

In a matched-effort sequential audit (`Gemini 4 Hydrogen (High)` on all parents and workers, November 15, 2026) against the six-defect event-relay fixture ([`benchmarks/teamwork-vs-squad/`](benchmarks/teamwork-vs-squad/README.md)) using native `/swarm` + `Agy-Context-Saver 2.0.1` (`rtk 1.1.0`), both arms caught all six planted defect categories (`6 / 6`):

| Metric (Parent + All Workers End-to-End) | Agy-Squad + Agy-Context-Saver (`flat /swarm`) | Antigravity `/teamwork` (`[skip-interview]`) | Difference |
| :--- | :--- | :--- | :--- |
| Planted defect categories caught | `6 / 6` (`21` defects: `10 P1`, `11 P2`) | `6 / 6` (`16` defects: `8 P1`, `8 P2`) | Equal recall; Arm 1 found 5 more defects |
| Total sessions (parent + child workers) | `4` (`1` coordinator + `3` workers) | `9` (`1` parent + `8` subagents) | `2.25x` fewer sessions (`3` vs `8` children) |
| Wall-clock runtime | `6m 30s` (`390s`) | `22m 41s` (`1,361s`) | `3.49x` faster (`71.3%` less time) |
| Combined transcript steps | `178` (`88` parent + `90` workers) | `655` (`19` parent + `636` subagents) | `3.68x` fewer steps (`72.8%` reduction) |
| Combined assistant turns | `49` (`25` parent + `24` workers) | `319` (`8` parent + `311` subagents) | `6.51x` fewer turns (`84.6%` reduction) |
| Combined tool calls | `117` (`57` parent + `60` workers) | `311` (`6` parent + `305` subagents) | `2.66x` fewer tool calls (`62.4%` reduction) |
| Combined raw transcript size | `336.8 KB` (`183.6 KB` workers) | `801.8 KB` (`773.7 KB` subagents) | `58.0%` smaller overall (`76.3%` child-only) |
| Parent inbox wakeup bytes | `1,629 B` (`5` notices; `647 B` handoffs) | `18,322 B` (`4` wakeups) | `91.1%` fewer parent wakeup bytes (`11.2x`) |
| Independent proof & quality outcome | SHA-256 bundle (`ad876bd4...` Digest) + `audit-ab-audit` `CLEAN` | `Victory Auditor` approved Sentinel-fabricated snippets; caught by parent (`Steps 11–17`) | Cryptographic proof vs. unverified QA |
| Scratch files left after run | `4` proof/report files (`72.3 KB`, gitignored) | `33` files (`183.7 KB` in `.agents/teamwork/`) | `29` fewer scratch files |

See [Benchmarks](docs/benchmarks.md) for the per-agent breakdown of the November 15 matched-`High` retest and the historical November 8 Phase 1 baseline (`6m 15s` vs. `26m 19s`, `148.2 KB` vs. `817.4 KB` subagent-only).

## Documentation

Full documentation is hosted at [paragon-ux.github.io/Agy-Squad](https://paragon-ux.github.io/Agy-Squad/) (built with Zensical) and in [`docs/`](docs/):

- [Overview](docs/index.md)
- [Getting started](docs/getting-started.md)
- [Core workflows: orchestrate, self-diagnose, review, and tear down](docs/core-workflows.md)
- [Roles, skill workflows, and runtime closure checklist](docs/roles-and-workflows.md)
- [Concepts and terminology](docs/concepts.md)
- [Manifest and tool contract](docs/tools.md)
- [Stopping agents and child processes](docs/stopping-agents.md)
- [Benchmarks vs. Antigravity Teamwork](docs/benchmarks.md)
- [Cross-Platform & WSL Verification](docs/plans/wsl-cli-verification.md)
- [Architecture decision ledger](docs/plans/LEDGER.md)
- [Native enforcement ledger](docs/plans/native-enforcement-ledger.md)

## Development

Run `node scripts/release-preflight.mjs`, `npm test`, and `npm run verify:package` with Node.js `>= 22`. Runs all 10 test suites (`tests/test-verdicts-and-pivot.mjs`, `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, `tests/test-run.mjs`, `tests/test-server.mjs`, `tests/test-comparative-dossier.mjs`, `tests/test-lifecycle-installer.mjs`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs`, and `tests/verify-package.mjs`) in isolated temporary directories without mutating your live `~/.gemini` configuration.

## License

MIT License. Copyright (c) 2026 paragon-ux.
