# Agy-Squad

[![npm version](https://img.shields.io/npm/v/agy-squad.svg)](https://www.npmjs.com/package/agy-squad)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-Zensical-purple.svg)](https://paragon-ux.github.io/Agy-Squad/)
[![Tests](https://img.shields.io/badge/tests-100%25%20passing-brightgreen.svg)](https://github.com/paragon-ux/Agy-Squad/actions)

`Agy-Squad` is a multi-agent `/swarm` planner, code-review harness, and SHA-256 proof bundler (`agy-squad`) for **Google Antigravity** (`agy`) on Linux, macOS, and WSL2 (`Node.js >= 22`, zero external npm dependencies). It pairs with [Agy-Context-Saver](https://github.com/paragon-ux/Agy-Context-Saver) (`>= 2.0.1`) to assign non-overlapping file scopes, keep board handoffs under `500` bytes, audit worker tool traces, and verify every report with SHA-256 digests.

![Agy-Squad, Antigravity, and Agy-Context-Saver architecture](docs/assets/architecture-overview.svg)

The repository ships four components:

- **Cohort planner & MCP server ([`mcp/planner.mjs`](mcp/planner.mjs), [`mcp/dispatch.mjs`](mcp/dispatch.mjs), [`mcp/index.js`](mcp/index.js)):** Compiles flat (`1–3` workers) and layered (`4+` workers with Squad Leads) `/swarm` cohorts via `squad_planner` (or `dispatch_squad` for `invoke_subagent`), enforcing disjoint writable file scopes, 24-character roster names, explicit model pinning, and first-line `[agy-transcript-access: allow|deny]` directives.
- **Verification & proof CLI ([`bin/agy-squad.mjs`](bin/agy-squad.mjs), [`mcp/handoffs.mjs`](mcp/handoffs.mjs), [`mcp/verdicts.mjs`](mcp/verdicts.mjs)):** Fingerprints verified source files, reconciles `<= 500` byte `Pointer-Over-Wire` board receipts, computes canonical `Evidence Digest` hashes for independent integrity auditors (`audit-<id>`), and writes tamper-evident `.sources.json` bundles (`plan`, `dispatch`, `fingerprint`, `inspect`, `digest`, `verdict`, `bundle`, `verify`, `prune`).
- **Review & governance skills ([`.agents/skills/`](.agents/skills/)):** Installs [`pr-review`](.agents/skills/pr-review/SKILL.md) (branch/PR diffs), [`full-review`](.agents/skills/full-review/SKILL.md) (non-diff triage and direction decisions), and [`swarm-governance`](.agents/skills/swarm-governance/SKILL.md) (role separation, proof bundling, and 4-check runtime closure) using the 10-category [PR Review Standard v1.4.0](.agents/skills/pr-review/references/pr-review-standard.md).
- **Zero-subagent harness profiler ([`self-diagnosis`](.agents/skills/self-diagnosis/SKILL.md), [`diagnose.mjs`](.agents/skills/self-diagnosis/scripts/diagnose.mjs)):** Audits skill token budgets, prompt template byte ceilings (`<= 1800 B` specialist, `<= 3300 B` lead), review ledger invariants, and package boundaries in `< 200 ms` with zero model cost.

## Quickstart

![Six-step swarm lifecycle and dual-verdict gate](docs/assets/swarm-lifecycle.svg)

### Prerequisites

- **Node.js:** `>= 22.0.0` (Linux, macOS, or WSL2 on Windows)
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
| `agy-squad setup` / `status` / `uninstall` | Install, audit, or remove plugin link, skills, MCP entry, and CLI shim | `agy-squad setup` / `agy-squad status` / `agy-squad setup --check` |
| `agy-squad plan` / `squad_planner` (MCP) | Compile flat or layered `/swarm` cohorts with scope checks and `provenanceScaffold` | `agy-squad plan --manifest <path> [--topology flat\|layered]` |
| `agy-squad dispatch` / `dispatch_squad` (MCP) | Compile `invoke_subagent` payloads (`all_l1`, `<squadId>`, `integrity_auditor[:<id>]`) | `agy-squad dispatch --squad <id> --manifest <path>` |
| `agy-squad fingerprint` / `inspect` / `digest` | Hash verified files, check `< 500 B` `READY` receipts, and compute `Evidence Digest` | `agy-squad digest scratch/agy-squad/<id>-record.json` |
| `agy-squad verdict` / `bundle` / `verify` / `prune` | Parse `PASS` / `CLEAN` verdicts, write `.sources.json` proofs, and prune loose reports | `agy-squad bundle <record.json> --replace` / `agy-squad verify <sources.json>` |
| `/pr-review` & `/full-review` (`v1.4.0`) | 10-category commit-pinned diff review (`pr-review`) or non-diff triage (`full-review`) | Pair with `/swarm-governance` on `/swarm` |
| `/self-diagnosis` (`diagnose.mjs`) | Zero-subagent profiler checking skill token budgets, prompt sizes, and review ledgers | `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` |

## Benchmark summary vs. Antigravity `/teamwork`

In a recorded head-to-head audit against the six-defect event-relay fixture ([`benchmarks/teamwork-vs-squad/`](benchmarks/teamwork-vs-squad/README.md)), both arms caught all six planted defect categories (`6 / 6`):

| Metric | Agy-Squad + Agy-Context-Saver | Antigravity `/teamwork` | Difference |
| :--- | :--- | :--- | :--- |
| Planted defect categories caught | `6 / 6` | `6 / 6` | Parity |
| Subagents spawned | `3` | `8` | `5` fewer |
| Wall-clock runtime | `6m 15s` (`375s`) | `26m 19s` (`1,579s`) | `4.2x` faster |
| Transcript steps | `64` | `645` | `90.1%` fewer steps |
| Raw transcript size | `148.2 KB` | `817.4 KB` | `81.9%` smaller |
| Parent context wakeup bytes | `249 B` | `4,940 B` | `95.0%` fewer bytes |
| Git-untracked files left (`git status`) | `0` | `41` | `41` fewer |

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
- [WSL CLI verification and live trial](docs/plans/wsl-cli-verification.md)
- [Architecture decision ledger](docs/plans/LEDGER.md)
- [Native enforcement ledger](docs/plans/native-enforcement-ledger.md)

## Development

Run `node scripts/release-preflight.mjs`, `npm test`, and `npm run verify:package` with Node.js `>= 22`. Runs all 10 test suites (`tests/test-verdicts-and-pivot.mjs`, `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, `tests/test-run.mjs`, `tests/test-server.mjs`, `tests/test-comparative-dossier.mjs`, `tests/test-lifecycle-installer.mjs`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs`, and `tests/verify-package.mjs`) in isolated temporary directories without mutating your live `~/.gemini` configuration.

## License

MIT License. Copyright (c) 2026 paragon-ux.
