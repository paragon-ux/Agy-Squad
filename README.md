# Agy-Squad

Staged subagent orchestration, self-diagnosis, and review governance for **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** on **Linux and WSL2 (with best-effort, untested macOS support)**.

`Agy-Squad` compiles coding or review tasks into scoped Antigravity subagent assignments (`dispatch_squad`) and serves as the governance, role-separation (`integrity_auditor`), and SHA-256 proof-bundle layer (`bin/agy-squad.mjs` + `.agents/skills/swarm-governance/SKILL.md`) on top of Antigravity native `/swarm`. Each specialist writes a file-backed report (`scratch/agy-squad/.../report.md`) and returns a single-line receipt under `500` UTF-8 bytes (`Pointer-Over-Wire`) with a concrete observation and its report path. The parent or squad lead checks the cited code and tests directly, pairs with a flat `integrity_auditor` (`Integrity Verdict: CLEAN`), and bundles SHA-256 input, report, and audit digests via `node bin/agy-squad.mjs bundle` (or `node mcp/handoffs.mjs`).

Beyond task delegation, the core harness includes:

- **[`self-diagnosis`](.agents/skills/self-diagnosis/SKILL.md):** A zero-subagent diagnostic profiler (`diagnose.mjs`) and three targeted specialist cohorts for operator-supervised harness auditing and token/runtime optimization.
- **[`pr-review`](.agents/skills/pr-review/SKILL.md) ([Standard v1.3.0](.agents/skills/pr-review/references/pr-review-standard.md)):** The repository's review specification covering ten mandatory categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`), commit and session provenance, and `1 ID = 1 Row` durable finding ledgers under `docs/reviews/`.
- **[Evidence retention and teardown lifecycle](docs/core-workflows.md#4-three-scope-evidence-retention-and-teardown-contract):** SHA-256-verified report bundling and pruning, and ledger-gated `diagnose.mjs --teardown` before child termination. Native `/swarm` owns worker lifecycle and `kill` cleanup; the Phase 1 temporary CLI session registrations were retired with the launcher (`L17`).

## Documentation

- [Getting started (Desktop IDE & CLI on POSIX / WSL2)](docs/getting-started.md)
- [Core workflows: orchestrate, self-diagnose, review, and tear down](docs/core-workflows.md)
- [Concepts and terminology](docs/concepts.md)
- [Manifest and tool contract](docs/tools.md)
- [Stopping agents and child processes](docs/stopping-agents.md)
- [Benchmarks vs. Antigravity Teamwork](docs/benchmarks.md) ([benchmark folder](benchmarks/teamwork-vs-squad/README.md))
- [WSL CLI verification and live trial](docs/plans/wsl-cli-verification.md)
- [Architecture decision ledger](docs/plans/LEDGER.md)

## Quickstart

### Prerequisites

- **Operating system:** Linux or WSL2 on Windows (primary verified targets; macOS is best-effort and untested; `Node.js >= 22`).
- **Antigravity environment:** Antigravity Desktop (IDE) with `/swarm` and/or `invoke_subagent`.
- **Companion governor:** `Agy-Context-Saver` (`>= 1.8.1`) reporting `HEALTHY & ACTIVE` with pinned `RTK` (`0.51.0`). Run its `sync_installation` MCP tool once on a new host if `rtk` is missing; see [Getting started](docs/getting-started.md#host-and-companion-compatibility-matrix).

### 1. Clone and run offline checks

`Agy-Squad` runs from a local checkout (`package.json` sets `"private": true`). Run the offline test suite (zero subagents, zero model cost):

```bash
git clone https://github.com/paragon-ux/Agy-Squad.git
cd Agy-Squad
node --version
node bin/agy-squad.mjs --help
npm test
```

### 2. Use in Antigravity Desktop (IDE) or MCP registration

In **Antigravity Desktop (IDE)** (or any workspace on Linux, macOS, or WSL2), register the MCP server in `.agents/mcp_config.json` (or your IDE MCP config) using the absolute path from `command -v node`:

```json
{
  "mcpServers": {
    "agy-squad": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/Agy-Squad/mcp/index.js"],
      "env": {
        "AGY_SQUAD_WORKSPACE": "/absolute/path/to/workspace"
      },
      "tools": {
        "dispatch_squad": { "eager": true },
        "squad_planner": { "eager": true }
      }
    }
  }
}
```

Once connected, call `squad_planner` (to plan `/swarm` cohorts with explicit `model` pinning, scope-overlap warnings, and `L6`-safe `provenanceScaffold`) or `dispatch_squad` (`invoke_subagent`), or invoke `/self-diagnosis` and `/pr-review` directly in chat.

### 3. Plan & Verify via the Governance CLI (`bin/agy-squad.mjs`)

Use `node bin/agy-squad.mjs` directly from the workspace root (legacy `agy-squad run` / `terminal.py` was retired in Phase 2 per [`L17`/`L42`/`L43`](docs/plans/LEDGER.md)):

```bash
# Plan a swarm cohort with explicit model pinning and L6 provenance scaffold:
node bin/agy-squad.mjs plan --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  --model gemini-4-hydrogen-high

# Verify strict verdicts, fingerprint verified files, and bundle/verify/prune SHA-256 evidence:
node bin/agy-squad.mjs verdict scratch/agy-squad/squad-<id>/lead/report.md
node bin/agy-squad.mjs verdict --integrity scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md
node bin/agy-squad.mjs bundle <bundle-record.json>
node bin/agy-squad.mjs verify scratch/agy-squad/squad-<id>/lead/report.sources.json
```

Use `manage_subagents` or `/swarm` status (`swarm{action: "status"}`) to inspect active workers or stop children ([Stopping agents](docs/stopping-agents.md)).

## Core workflows: orchestrate, diagnose, and review

- **Govern native `/swarm` or orchestrate tasks:** Pair Antigravity native `/swarm` + `squad_planner` with [`swarm-governance`](.agents/skills/swarm-governance/SKILL.md) (or dispatch specialists/leads via `dispatch_squad` and flat `integrity_auditor:<target>`), collect `<= 500` B `READY` pointers, enforce strict verdicts, and bundle SHA-256 digests with `node bin/agy-squad.mjs` (`plan`, `verdict`, `fingerprint`, `inspect`, `bundle`, `verify`, `prune`) ([Core workflows](docs/core-workflows.md#1-orchestrate-proportional-specialist-or-lead-cohorts)).
- **Self-diagnose the harness:** Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` for a zero-subagent health and token-budget check, or compile targeted audit cohorts with `--print-dispatch` ([`self-diagnosis` skill](.agents/skills/self-diagnosis/SKILL.md)).
- **Review pull requests:** Apply the ten-category `v1.3.0` repository review standard ([`pr-review` skill](.agents/skills/pr-review/SKILL.md)) and record `1 ID = 1 Row` findings in `docs/reviews/` before running `diagnose.mjs --teardown`.

## Positioning and benchmark summary

| Approach | Work allocation | Best fit | Handoff, verification, and teardown |
| --- | --- | --- | --- |
| **Agy-Squad + Agy-Context-Saver (`v1.8.1+`)** | Task-proportional stage compile (`dispatch_squad`) for direct specialists or domain leads in Desktop IDE or CLI | Scoped coding/review tasks on POSIX / WSL2 where compact receipts, SHA-256 bundles, `self-diagnosis`, `pr-review` (`v1.3.0`), and governed teardown matter | `<= 500` B `Pointer-Over-Wire` receipt, parent code/test verification + `20 ms` SHA-256 digest check (`mcp/handoffs.mjs`), and 3-scope teardown contract |
| **Antigravity `/teamwork`** (or `/teamwork-preview`) | Autonomous wrapper, internal orchestrator, exploratory workers, and semantic review fleet | Long multi-milestone campaigns that benefit from built-in autonomous planning and LLM reviewer/auditor subagents | Top-level milestone delegation with internal Sentinel updates and dedicated LLM review agents |
| **Antigravity native subagents** (`invoke_subagent`) | Direct manual delegation | Quick one-off parallel tasks without a manifest or report-bundle pipeline | Native subagent return messages |

### Recorded head-to-head audit vs. Antigravity `/teamwork`

In one recorded sequential audit on November 8, 2026 against the six-defect event-relay fixture ([`benchmarks/teamwork-vs-squad/`](benchmarks/teamwork-vs-squad/README.md)), both arms caught all six planted defect categories (`6 / 6`). Pairing **Agy-Squad** with **Agy-Context-Saver 1.8.1 (`rtk 0.51.0`)** used `3` vs. `8` subagents, finished in **`6m 15s` (`375s`) vs. `26m 19s` (`1,579s`, `4.2x` faster)**, executed **`64` vs. `645` transcript steps** (`90.1%` fewer steps), generated **`148.2 KB` vs. `817.4 KB` of raw transcripts** (`81.9%` smaller), and sent **`249 B` vs. `4,940 B` into the parent context** (`95.0%` fewer parent wakeup bytes).

In the Agy-Squad arm, the squad lead inspected the cited source files directly and verified SHA-256 input/report digests in `20 ms` (`handoffs.mjs verify`, which checks cryptographic artifact integrity alongside the lead's semantic review) before pruning loose specialist reports under the 3-scope teardown policy (`0` vs. `41` Git-untracked files remaining as secondary `git status` telemetry).

See [docs/benchmarks.md](docs/benchmarks.md) for the canonical comparison table, unit definitions, prompts, and live reproduction protocol. Run `node benchmarks/teamwork-vs-squad/verify-benchmark.mjs` to execute the offline fixture, manifest compilation, and telemetry ledger consistency check.

## Development

Run `npm test` with Node.js `>= 22`. The suite tests the MCP server, `dispatch_squad` compiler, `squad_planner` provenance/overlap planner, handoff bundler, `/self-diagnosis` profiler, and offline benchmark verifier without launching live subagents.

## License

MIT
