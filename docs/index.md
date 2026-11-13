# Agy-Squad

Agy-Squad is a subagent planning, self-diagnosis, and review harness for **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** on **Linux and WSL2 (macOS support is best-effort and untested)**.

`squad_planner` and `dispatch_squad` assign scoped tasks to specialist or lead cohorts, cap `Pointer-Over-Wire` receipts at `500` UTF-8 bytes, and pair with `node bin/agy-squad.mjs` (`mcp/handoffs.mjs`) to verify SHA-256 input and report digests. During live Desktop IDE runs, `Agy-Context-Saver` (`1.8.1+`) rewrites shell commands through `rtk 0.51.0` and enforces Reactive Wakeup backoff.

![Agy-Squad, Antigravity, and Agy-Context-Saver architecture](assets/architecture-overview.svg)

## Start here

- **[Getting started (Desktop IDE & CLI on POSIX / WSL2)](getting-started.md):** Host and companion compatibility matrix, clone-and-verify preflight, Desktop IDE MCP registration, and CLI commands (`dispatch`, `plan`, `verdict`, `fingerprint`, `inspect`, `bundle`, `verify`, `prune`).
- **[Core workflows](core-workflows.md):** Task-proportional delegation, recursive [`self-diagnosis`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md), the ten-category [`pr-review` Standard v1.3.0](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md), and the 3-scope evidence-retention and teardown contract.
- **[Roles, skill workflows, and runtime closure](roles-and-workflows.md):** Single canonical definition of every role, Task-Spec vs. Execution-Modifier skill composition (`swarm-governance`, `pr-review`, `full-review`, `self-diagnosis`), and the 4-check runtime closure checklist.
- **[Concepts and terminology](concepts.md):** Definitions for stages (`all_l1` vs. `<squadId>` vs. `integrity_auditor` / `audit-<id>`), `squad_planner`, report slots, `Pointer-Over-Wire` receipts, SHA-256 bundles, Reactive Wakeup, `RTK`, and decision ledger codes (`L1` through `L43`).
- **[Manifest and tool contract](tools.md):** Schema and CLI flags for `squad_planner` (`plan`), `dispatch_squad` (`dispatch`), `node bin/agy-squad.mjs`, and `mcp/handoffs.mjs` (library module).
- **[Native enforcement ledger](plans/native-enforcement-ledger.md):** Host hook boundary (`PreToolUse`, `StopHook`), `/swarm` channel limits, and Spike status.
- **[Benchmarks](benchmarks.md):** Canonical metric table, unit definitions, and reproduction guide for the November 8, 2026 audit against Antigravity `/teamwork`.

## Core capabilities

1. **Proportional `/swarm` planning and subagent dispatch:** `squad_planner` (`/swarm` default with explicit `model` pinning, `readOnly`-aware scope-overlap checks, and `L6`-safe `provenanceScaffold`) and `dispatch_squad` (`invoke_subagent`) route worker evidence to `scratch/agy-squad/.../report.md` and return a single-line `<= 500` B `READY` receipt. Ask the user upfront when `Flat` vs `Layered` topology is unspecified.
2. **Harness self-diagnosis (`/self-diagnosis`):** `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` runs a zero-subagent health and token-budget check, or builds targeted audit cohorts (`--print-plan` or `--print-dispatch`) for operator-supervised inspection.
3. **Repository review standards (`/pr-review` & `/full-review`, v1.3.0):** Reviewers apply commit and session provenance, architecture-before-runtime tracing, ten mandatory categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`), and `1 ID = 1 Row` ledgers under `docs/reviews/`.
4. **Governed evidence retention and teardown:** `bin/agy-squad.mjs` verifies SHA-256 source and report digests before pruning loose specialist reports, binds flat integrity audit `CLEAN` verdicts (`audit-<id>` on `/swarm`, `integrity_auditor[:<id>]` via slot), and gates `diagnose.mjs --teardown` on a verified bundle and updated `docs/reviews/` ledger.

## Companion integration: Agy-Context-Saver

`Agy-Squad` and `Agy-Context-Saver` remain separate packages ([`L31`](plans/LEDGER.md)) that interact across four execution stages:

| Stage | Owner | Mechanism and tools |
| --- | --- | --- |
| 1. Cohort planning and compilation | `Agy-Squad` | `squad_planner` and `dispatch_squad` assign report slots (`scratch/agy-squad/...`) and `<= 500` B briefs (`TypeName: "self"`, `Workspace: "inherit"` for `invoke_subagent`; explicit `model` pinning and `share`/`branch` isolation for `/swarm`). |
| 2. Subagent execution governance | `Agy-Context-Saver` (`1.8.1`) | Inside Desktop IDE sessions, `Agy-Context-Saver`'s `PreToolUse` hook rewrites child `run_command` calls via pinned `rtk 0.51.0`, routes workspace reads to `rtk read`, and applies backoff on `manage_task` and `schedule`. |
| 3. Cryptographic bundling and pruning | `Agy-Squad` | `node bin/agy-squad.mjs` (`dispatch -> plan -> verdict -> fingerprint -> inspect -> bundle -> verify -> prune [--keep-reports]`) validates single-line verdicts, binds `integrityAudit` digests (`CLEAN` + `Target Squad`), writes `report.sources.json`, and optionally removes loose reports (`L1`, `L2`, `L42`, `L43`). |
| 4. Session and transcript forensics | `Agy-Context-Saver` (`1.8.1`) | MCP tools (`get_installation_status`, `sync_installation`, `check_context_health`, `read_transcript`, `query_transcript`) inspect parent or subagent `conversationId` records without reading `.system_generated/` directly (`L6`). |

Run `sync_installation` once on a new host so the pinned `rtk 0.51.0` binary is active before launching live workers.

## Recorded comparison vs. Antigravity `/teamwork`

On November 8, 2026, a sequential audit compared both approaches on the six-defect event-relay fixture ([`benchmarks.md`](benchmarks.md)). Both caught all six planted defect categories (`6 / 6`).

- **Runtime and steps:** **Agy-Squad + Agy-Context-Saver (`1.8.1`, `rtk 0.51.0`)** finished in **`6m 15s` (`375s`) vs. `26m 19s` (`1,579s`, `4.2x` faster)** and executed **`64` vs. `645` transcript steps** (`90.1%` fewer steps).
- **Context and transcript size:** Raw transcripts totaled **`148.2 KB` vs. `817.4 KB`** (`81.9%` smaller), and parent context wakeup payloads totaled **`249 B` vs. `4,940 B`** (`95.0%` fewer wakeup bytes).
- **Verification and cleanup:** The squad lead verified cited fixture lines directly and ran a 20 ms SHA-256 bundle digest check (`handoffs.mjs verify` during the Phase 1 trial; now `node bin/agy-squad.mjs verify`) before pruning loose reports under the 3-scope teardown policy.

See [Benchmarks](benchmarks.md) for the full metric table, unit definitions, prompts, and offline vs. live reproduction steps.
