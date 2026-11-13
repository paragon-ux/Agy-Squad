# Agy-Squad

Agy-Squad adds scoped cohort planning, role-separated auditing, and SHA-256 evidence bundling to **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** on **Linux and WSL2 (macOS support is best-effort and untested)**.

`squad_planner` (and `dispatch_squad` for `invoke_subagent`) assigns each worker a workspace scope and a file-backed report slot (`scratch/agy-squad/.../report.md`). Specialists write full evidence to disk and post a single-line `Pointer-Over-Wire` receipt under 500 UTF-8 bytes. A parent or squad lead checks the cited code and tests directly, pairs with a flat integrity auditor (`audit-<id>` on `/swarm` or `integrity_auditor` via slot; emits `Integrity Verdict: CLEAN`), and runs `node bin/agy-squad.mjs bundle` to record SHA-256 digests for verified inputs, specialist reports, and the audit report.

![Agy-Squad, Antigravity, and Agy-Context-Saver architecture](docs/assets/architecture-overview.svg)

The repository ships four core components:

- **[`swarm-governance`](.agents/skills/swarm-governance/SKILL.md) (Execution Modifier) and `bin/agy-squad.mjs`:** Role separation, `Pointer-Over-Wire` receipts, and offline CLI (`dispatch`, `plan`, `verdict`, `fingerprint`, `inspect`, `bundle`, `verify`, `prune`) layered over Antigravity native `/swarm`.
- **[`self-diagnosis`](.agents/skills/self-diagnosis/SKILL.md) (Task Spec):** Zero-subagent diagnostic profiler (`diagnose.mjs`) and three specialist audit cohorts for operator-supervised skill, runtime, and token checks.
- **[`pr-review`](.agents/skills/pr-review/SKILL.md) & [`full-review`](.agents/skills/full-review/SKILL.md) (Task Specs — [Standard v1.3.0](.agents/skills/pr-review/references/pr-review-standard.md)):** Ten-category branch/PR diff review (`pr-review`) and non-diff evidence/direction triage (`full-review`), producing commit-pinned `1 ID = 1 Row` ledgers under `docs/reviews/`.
- **[Evidence retention and teardown](docs/core-workflows.md#4-three-scope-evidence-retention-and-teardown-contract):** SHA-256 bundle verification, report pruning, and ledger-gated `diagnose.mjs --teardown`. Native `/swarm` owns worker lifecycle and `kill` cleanup; Phase 1 temporary CLI session registrations retired with the launcher (`L17`).

## Skill composition & tool surface map

| Surface | Type & Purpose | When to Use |
| --- | --- | --- |
| `pr-review` / `full-review` / `self-diagnosis` | **Task Specs** (what to check & report) | Use `pr-review` for PR/branch diffs, `full-review` for non-diff triage/direction decisions, `self-diagnosis` for repo/harness health audits. |
| `swarm-governance` | **Execution Modifier** (how teams execute) | Pair with any Task Spec when running on `/swarm` or teams (adds slot receipts, flat `audit-<id>`, `bin/agy-squad.mjs` bundles, and 4-check closure). Ask user once if `Flat` vs `Layered` topology is unspecified. |
| `squad_planner` / `node bin/agy-squad.mjs plan` | **`/swarm` & unified planner** | Default planner for `/swarm` (`swarmAdd` + `provenanceScaffold` + `bundleRecordTemplates`); omit `squadId` to plan all manifest squads (`readOnly: true` exempts read-only slots from overlap warnings). |
| `dispatch_squad` / `node bin/agy-squad.mjs dispatch` | **`invoke_subagent` compiler** | Explicit `invoke_subagent` stage compiler (`all_l1` leads, `<squadId>` specialists, or `integrity_auditor[:<target>]` audit slot; legacy `adversarial_*` modes removed). |
| `mcp/handoffs.mjs` | **Internal verification library** | Imported by `bin/agy-squad.mjs` for `fingerprint`, `inspect`, `bundle`, `verify`, `prune`; standalone CLI removed in favor of `node bin/agy-squad.mjs`. |

## Documentation

- [Getting started (Desktop IDE & CLI on POSIX / WSL2)](docs/getting-started.md)
- [Core workflows: orchestrate, self-diagnose, review, and tear down](docs/core-workflows.md)
- [Roles, skill workflows, and runtime closure checklist](docs/roles-and-workflows.md)
- [Concepts and terminology](docs/concepts.md)
- [Manifest and tool contract](docs/tools.md)
- [Stopping agents and child processes](docs/stopping-agents.md)
- [Benchmarks vs. Antigravity Teamwork](docs/benchmarks.md) ([benchmark folder](benchmarks/teamwork-vs-squad/README.md))
- [WSL CLI verification and live trial](docs/plans/wsl-cli-verification.md)
- [Architecture decision ledger](docs/plans/LEDGER.md)
- [Native enforcement ledger](docs/plans/native-enforcement-ledger.md)

## Quickstart

Live runs follow a six-step cycle across Antigravity `/swarm` execution and `bin/agy-squad.mjs` verification:

![Six-step swarm lifecycle and dual-verdict gate](docs/assets/swarm-lifecycle.svg)

### Prerequisites

- **Operating system:** Linux or WSL2 on Windows (`Node.js >= 22`); macOS is best-effort and untested.
- **Antigravity environment:** Antigravity Desktop (IDE) with `/swarm` and/or `invoke_subagent`.
- **Companion governor:** `Agy-Context-Saver` (`>= 1.8.1`) reporting `HEALTHY & ACTIVE` with pinned `RTK` (`0.51.0`). Run its `sync_installation` MCP tool once on a new host if `rtk` is missing; see [Getting started](docs/getting-started.md#host-and-companion-compatibility-matrix).

### 1. Clone and run offline checks

`Agy-Squad` runs from a local checkout (`package.json` sets `"private": true`). Clone the repository and run the offline suite (zero subagents, zero model cost):

```bash
git clone https://github.com/paragon-ux/Agy-Squad.git
cd Agy-Squad
node --version
node bin/agy-squad.mjs --help
npm test
```

### 2. Register the MCP server in Antigravity Desktop (IDE)

In **Antigravity Desktop (IDE)** (or any workspace on Linux, macOS, or WSL2), add `agy-squad` to `.agents/mcp_config.json` (or your IDE MCP config) using the absolute path from `command -v node`:

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

Once connected, call `squad_planner` (for `/swarm` cohorts with explicit `model` pinning, `readOnly`-aware scope-overlap checks, and `L6`-safe `provenanceScaffold`) or `dispatch_squad` (`invoke_subagent`), or run `/swarm-governance`, `/pr-review`, `/full-review`, or `/self-diagnosis` in chat.

### 3. Plan and verify via the Governance CLI (`bin/agy-squad.mjs`)

Run `node bin/agy-squad.mjs` from the workspace root. Legacy `agy-squad run` (`bin/terminal.py`) and the standalone `node mcp/handoffs.mjs` CLI were retired in PR #5 (`L17`, `L42`, `L43`).

```bash
# Plan a swarm cohort with explicit model pinning and L6 provenance scaffold:
node bin/agy-squad.mjs plan --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  --model gemini-4-hydrogen-high

# Or compile an invoke_subagent stage via dispatch:
node bin/agy-squad.mjs dispatch --squad skill_and_pr_review_audit \
  --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json

# Verify strict verdicts, fingerprint verified files, and bundle/verify/prune SHA-256 evidence:
node bin/agy-squad.mjs verdict scratch/agy-squad/squad-<id>/lead/report.md
node bin/agy-squad.mjs verdict --integrity scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md
node bin/agy-squad.mjs bundle <bundle-record.json>
node bin/agy-squad.mjs verify scratch/agy-squad/squad-<id>/lead/report.sources.json
```

Use `manage_subagents` or `/swarm` status (`swarm{action: "status"}`) to inspect active workers or stop children ([Stopping agents](docs/stopping-agents.md)).

## Core workflows: orchestrate, diagnose, and review

- **Govern native `/swarm` or dispatch tasks:** Pair Antigravity native `/swarm` and `squad_planner` with [`swarm-governance`](.agents/skills/swarm-governance/SKILL.md) (or dispatch `invoke_subagent` stages via `dispatch_squad` and flat `integrity_auditor:<target>`), collect `<= 500` B `READY` pointers, enforce strict verdicts, and bundle SHA-256 digests with `node bin/agy-squad.mjs` (`dispatch`, `plan`, `verdict`, `fingerprint`, `inspect`, `bundle`, `verify`, `prune`) ([Core workflows](docs/core-workflows.md#1-orchestrate-proportional-specialist-or-lead-cohorts)).
- **Self-diagnose the harness:** Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` for a zero-subagent health and token-budget check, or compile targeted audit cohorts with `--print-plan` (`--print-dispatch` for subagents) ([`self-diagnosis` skill](.agents/skills/self-diagnosis/SKILL.md)).
- **Review pull requests or evidence bundles:** Apply the ten-category `v1.3.0` repository review standard ([`pr-review`](.agents/skills/pr-review/SKILL.md) for diffs, [`full-review`](.agents/skills/full-review/SKILL.md) for non-diff triage/direction) and record `1 ID = 1 Row` ledgers in `docs/reviews/` before running `diagnose.mjs --teardown`.

## Positioning and benchmark summary

| Approach | Work allocation | Best fit | Handoff, verification, and teardown |
| --- | --- | --- | --- |
| **Agy-Squad + Agy-Context-Saver (`v1.8.1+`)** | Task-proportional stage compile (`squad_planner` / `dispatch_squad`) for direct specialists or domain leads in Desktop IDE or CLI | Scoped coding or review tasks on POSIX / WSL2 needing compact receipts, SHA-256 bundles, `self-diagnosis`, `pr-review` (`v1.3.0`), and governed teardown | `<= 500` B `Pointer-Over-Wire` receipt, parent code/test verification + 20 ms SHA-256 digest check (`bin/agy-squad.mjs verify`), and 3-scope teardown contract |
| **Antigravity `/teamwork`** (or `/teamwork-preview`) | Autonomous wrapper, internal orchestrator, exploratory workers, and semantic review fleet | Long multi-milestone campaigns suited to autonomous planning and LLM reviewer/auditor subagents | Top-level milestone delegation with internal Sentinel updates and dedicated LLM review agents |
| **Antigravity native subagents** (`invoke_subagent`) | Direct manual delegation | One-off parallel tasks without a manifest or report-bundle pipeline | Native subagent return messages |

### Recorded head-to-head audit vs. Antigravity `/teamwork`

On November 8, 2026, a recorded sequential audit ran both arms against the six-defect event-relay fixture ([`benchmarks/teamwork-vs-squad/`](benchmarks/teamwork-vs-squad/README.md)). Both caught all six planted defect categories (`6 / 6`).

| Metric | Agy-Squad + Agy-Context-Saver 1.8.1 (`rtk 0.51.0`) | Antigravity `/teamwork` | Difference |
| --- | --- | --- | --- |
| Planted defect categories caught | `6 / 6` | `6 / 6` | Parity |
| Subagents spawned | `3` | `8` | `5` fewer |
| Wall-clock runtime | `6m 15s` (`375s`) | `26m 19s` (`1,579s`) | `4.2x` faster |
| Transcript steps | `64` | `645` | `90.1%` fewer steps |
| Raw transcript size | `148.2 KB` | `817.4 KB` | `81.9%` smaller |
| Parent context wakeup bytes | `249 B` | `4,940 B` | `95.0%` fewer bytes |
| Git-untracked files left (`git status`) | `0` | `41` | `41` fewer |

In the Agy-Squad arm, the squad lead inspected cited source files directly and verified SHA-256 input/report digests in `20 ms` (`handoffs.mjs verify`) before pruning loose specialist reports under the 3-scope teardown policy.

See [docs/benchmarks.md](docs/benchmarks.md) for the canonical comparison table, unit definitions, prompts, and live reproduction protocol. Run `node benchmarks/teamwork-vs-squad/verify-benchmark.mjs` to execute the offline fixture, manifest compilation, and telemetry ledger check.

## Development

Run `npm test` with Node.js `>= 22`. The suite tests the MCP server, `dispatch_squad` compiler, `squad_planner` planner, handoff bundler, `/self-diagnosis` profiler, and offline benchmark verifier without launching live subagents.

## License

MIT
