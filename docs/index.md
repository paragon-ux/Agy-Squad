# Agy-Squad

Agy-Squad is a subagent planning, self-diagnosis, and review harness for **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** across **Linux, macOS, and Windows**.

`squad_planner` and `dispatch_squad` assign scoped tasks to specialist or lead cohorts, cap `Pointer-Over-Wire` receipts at `500` UTF-8 bytes, and pair with the `agy-squad` CLI (`mcp/handoffs.mjs`) to verify SHA-256 input and report digests. During live Desktop IDE runs, `Agy-Context-Saver` (`>= 2.0.1`, `2.0.4+` recommended) rewrites shell commands through `rtk >= 1.1.0` (`rtk hook antigravity`), enforces 5-tier transcript access governance, and applies Reactive Wakeup backoff.

![Agy-Squad, Antigravity, and Agy-Context-Saver architecture](assets/architecture-overview.svg)

## Start here

- **[Getting started (Linux, macOS & Windows)](getting-started.md):** Host and companion compatibility matrix, `npx` install, `PATH` & IDE reload guidance, Uninstall & Rollback, and CLI commands (`setup`, `status`, `plan`, `dispatch`, `collect`, `bundle-init`, `verdict`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`).
- **[Core workflows](core-workflows.md):** Task-proportional delegation, recursive [`self-diagnosis`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md), the ten-category [`pr-review` Standard v1.4.0](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md), and the 3-scope evidence-retention and teardown contract.
- **[Roles, skill workflows, and runtime closure](roles-and-workflows.md):** Single canonical definition of every role, Task-Spec vs. Execution-Modifier skill composition (`swarm-governance`, `pr-review`, `full-review`, `self-diagnosis`), and the 4-check runtime closure checklist.
- **[Concepts and terminology](concepts.md):** Definitions for stages (`all_l1` vs. `<squadId>` vs. `integrity_auditor` / `audit-<id>`), `squad_planner`, report slots, `Pointer-Over-Wire` receipts, SHA-256 bundles, Reactive Wakeup, and `RTK`.
- **[Manifest and tool contract](tools.md):** Schema and CLI flags for `squad_planner` (`plan`), `dispatch_squad` (`dispatch`), `agy-squad`, and `mcp/handoffs.mjs` (library module).
- **[Benchmarks](benchmarks.md):** Canonical metric tables, per-agent telemetry, and reproduction guide for the November 15, 2026 matched-`High` `/swarm` retest and November 8, 2026 Phase 1 baseline against Antigravity `/teamwork`.

## Core capabilities

1. **Proportional `/swarm` planning and subagent dispatch:** `squad_planner` (`/swarm` default with explicit `model` pinning, `readOnly`-aware scope-overlap checks, and transcript-safe `provenanceScaffold`) and `dispatch_squad` (`invoke_subagent`) route worker evidence to `scratch/agy-squad/.../report.md` and return a single-line `<= 500` B `READY` receipt. Ask the user upfront when `Flat` vs `Layered` topology is unspecified.
2. **Maintainer harness self-diagnosis (`/self-diagnosis`):** Inside an `Agy-Squad` source checkout, `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` runs a zero-subagent health and token-budget check, or builds targeted audit cohorts (`--print-plan` or `--print-dispatch`) for operator-supervised inspection.
3. **Repository review standards (`/pr-review` & `/full-review`, v1.4.0):** Reviewers apply commit and session provenance, architecture-before-runtime tracing, ten mandatory categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`), and `1 ID = 1 Row` structured reports (in chat, Antigravity artifacts, or `docs/reviews/` when requested or already adopted).
4. **Governed evidence retention and teardown:** `agy-squad` verifies SHA-256 source and report digests before pruning loose specialist reports (`finalize --prune` or `bundle` + `verify` + `prune`), binds flat integrity audit `CLEAN` verdicts (`audit-<id>` on `/swarm`, `integrity_auditor[:<id>]` via slot), and gates `diagnose.mjs --teardown` on a verified bundle and updated `docs/reviews/` ledger.

## How Agy-Squad extends native `/swarm`

Agy-Squad configures Antigravity's native `/swarm` runtime rather than replacing it, adding non-overlapping scopes, file-backed report slots, and independent integrity auditing on top of the built-in shared board (see [Roles, skill workflows, and runtime closure](roles-and-workflows.md)):

![Native Antigravity /swarm vs. Agy-Squad roles and configuration additions](assets/swarm-vs-agy-squad-roles.svg)

## Companion integration: Agy-Context-Saver

`Agy-Squad` and `Agy-Context-Saver` remain separate packages that interact across four execution stages:

| Stage | Owner | Mechanism and tools |
| --- | --- | --- |
| 1. Cohort planning and compilation | `Agy-Squad` | `squad_planner` and `dispatch_squad` assign scoped briefs, report slots (`scratch/agy-squad/...`), and `<= 500` B `Pointer-Over-Wire` receipts (`TypeName: "self"`, `Workspace: "inherit"` for `invoke_subagent`; explicit `model` pinning and `share`/`branch` isolation for `/swarm`). |
| 2. Subagent execution governance | `Agy-Context-Saver` (`>= 2.0.1`, `2.0.4+` recommended) | Inside Desktop IDE sessions, `Agy-Context-Saver`'s `PreToolUse` hook delegates child `run_command` rewrites to `rtk >= 1.1.0` (`rtk hook antigravity`), bounds workspace `read_file` slices (`<= 150` lines), and applies backoff on `manage_task` and `schedule`. |
| 3. Cryptographic bundling and pruning | `Agy-Squad` | `agy-squad` (`plan -> dispatch -> collect -> bundle-init -> verdict -> finalize [--prune]`, or granular `fingerprint -> inspect -> digest -> verdict --integrity -> bundle -> verify -> prune [--keep-reports]`) validates single-line verdicts, binds `integrityAudit` digests (`CLEAN` + `Target Squad`), writes `report.sources.json`, and optionally removes loose reports. |
| 4. Session and transcript forensics | `Agy-Context-Saver` (`>= 2.0.1`, `2.0.4+` recommended) | The `agy-context` CLI (`agy-context status`, `agy-context setup`, `agy-context transcript read|query|step|health|list|export|access`) inspects parent or child `conversationId` records without reading `.system_generated/` directly, enforcing `[agy-transcript-access: allow|deny]` directives per worker. |

Run `agy-context setup` once on a new host so the `rtk >= 1.1.0` binary and `agy-context` CLI shim are active before launching live workers.

## Recorded comparison vs. Antigravity `/teamwork`

On November 15, 2026, a matched-effort sequential retest (`Gemini 4 Hydrogen (High)` on all parents and child workers) compared native `/swarm` (`Agy-Squad` + `Agy-Context-Saver 2.0.1`, `rtk 1.1.0`) against `/teamwork [skip-interview]` on the six-defect event-relay fixture ([`benchmarks.md`](benchmarks.md)). Both arms caught all six planted defect categories (`6 / 6`):

- **Runtime and steps (end-to-end parent + all workers):** **Agy-Squad `/swarm`** finished in **`6m 30s` (`390s`) vs. `22m 41s` (`1,361s`, `3.49x` faster)** and executed **`178` vs. `655` combined transcript steps** (`72.8%` fewer steps; `90` vs. `636` child-only steps).
- **Context, transcript size, and wakeups:** Combined raw transcripts totaled **`336.8 KB` (`183.6 KB` child-only) vs. `801.8 KB` (`773.7 KB` child-only)** (`58.0%` smaller overall, `76.3%` smaller child-only), and parent wakeup payloads totaled **`1,629 B` vs. `18,322 B`** (`91.1%` fewer parent bytes).
- **Verification and evidence quality:** Agy-Squad found **`21` unique defects (`10 P1`, `11 P2`)** backed by SHA-256 bundle `4c28db49...` and an independent `audit-ab-audit` `CLEAN` verdict, whereas `/teamwork` found **`16` defects (`8 P1`, `8 P2`)** and its `Victory Auditor` approved Sentinel-fabricated snippets that the parent session had to catch and fix in Steps 11–17.

See [Benchmarks](benchmarks.md) for the complete November 15 matched-`High` per-agent table, the historical November 8, 2026 Phase 1 baseline (`6m 15s` vs. `26m 19s`, `148.2 KB` vs. `817.4 KB` subagent-only), unit definitions, and reproduction steps.
