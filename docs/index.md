# Agy-Squad

Agy-Squad is a subagent planning, self-diagnosis, and review harness for **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** across **Linux, macOS, and Windows**.

`squad_planner` and `dispatch_squad` assign scoped tasks to specialist or lead cohorts, cap `Pointer-Over-Wire` receipts at `500` UTF-8 bytes, run standalone native JSONL Integrity Audits directly on Antigravity session transcripts, and pair with the `agy-squad` CLI (`mcp/handoffs.mjs`) to verify SHA-256 input and report digests. Optionally pairing with `Agy-Context-Saver` (`2.1.2+` recommended) adds a single global `~/.gemini/config/hooks.json` guard hook with a narrow high-ROI RTK pre-gate (`rtk >= 1.1.0`), `300L / 24 KiB` workspace `read_file` bounds, Reactive Wakeup backoff, and opt-in transcript access directives.

![Agy-Squad, Antigravity, and Agy-Context-Saver architecture](assets/architecture-overview.svg)

## Start here

- **[Getting started (Linux, macOS & Windows)](getting-started.md):** Host and companion compatibility matrix, `npx` install, `PATH` & IDE reload guidance, Uninstall & Rollback, and CLI commands (`setup`, `status`, `plan`, `dispatch`, `collect`, `bundle-init`, `verdict`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`).
- **[Core workflows](core-workflows.md):** Task-proportional delegation, recursive [`self-diagnosis`](skills/self-diagnosis.md), the eleven-category [`pr-review` Standard v1.5.0](skills/pr-review.md), cold [`day-one-review`](skills/day-one-review.md), and the 3-scope evidence-retention and teardown contract.
- **[Roles, skill workflows, and runtime closure](roles-and-workflows.md):** Single canonical definition of every role, Task-Spec vs. Execution-Modifier skill composition ([`swarm-governance`](skills/swarm-governance.md), [`pr-review`](skills/pr-review.md), [`full-review`](skills/full-review.md), [`day-one-review`](skills/day-one-review.md), [`self-diagnosis`](skills/self-diagnosis.md)), and the 4-check runtime closure checklist.
- **[Concepts and terminology](concepts.md):** Definitions for stages (`all_l1` vs. `<squadId>` vs. `integrity_auditor` / `audit-<id>`), `squad_planner`, report slots, `Pointer-Over-Wire` receipts, SHA-256 bundles, Reactive Wakeup, and `RTK`.
- **[Manifest and tool contract](tools.md):** Schema and CLI flags for `squad_planner` (`plan`), `dispatch_squad` (`dispatch`), `agy-squad`, and `mcp/handoffs.mjs` (library module).
- **[Benchmarks](benchmarks.md):** Canonical metric tables, per-agent telemetry, and reproduction guide for the November 15, 2026 matched-`High` `/swarm` retest and November 8, 2026 Phase 1 baseline against Antigravity `/teamwork`.

## Core capabilities

1. **Proportional `/swarm` planning and subagent dispatch:** `squad_planner` writes full plans to disk (`outPath` / `--out`), starts immediately with defaults unless writable scopes overlap on `inherit` (`flat` for inline tasks, staged `layered` waves for manifests with `lead` blocks unless `--topology flat`), emits `swarmPane` Overview JSON, pins worker models, verifies read-only files stayed unchanged (`readOnlyBaseline`), and outputs batch closeout commands. `dispatch_squad` (`invoke_subagent`) routes worker evidence to `scratch/agy-squad/.../report.md` and returns a single-line `<= 500` B `READY` receipt.
2. **Maintainer harness self-diagnosis (`/self-diagnosis`, repo-only):** Excluded from end-user npm installs; inside an `Agy-Squad` source checkout, `node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--json]` runs a read-only skill, link, hygiene, and byte-budget check, and `agy-squad plan --manifest ...` / `agy-squad dispatch --manifest ...` compile targeted audit cohorts for operator-supervised inspection.
3. **Repository review standards (`/pr-review`, `/full-review`, & `/day-one-review`, v1.5.0):** Reviewers apply commit and session provenance, architecture-before-runtime tracing, eleven mandatory categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`, `SEC`), and `1 ID = 1 Row` structured reports (in chat, Antigravity artifacts, `scratch/day-one-review/` for Day-1 reviews, or `docs/reviews/` when requested or already adopted).
4. **Governed evidence retention and teardown:** `agy-squad` verifies SHA-256 source and report digests before pruning loose specialist reports (`finalize --prune`, `verify --prune --expected-sha256 <sha256>`, or `bundle` + `verify` + `prune`), binds flat integrity audit `CLEAN` verdicts (`audit-<id>` on `/swarm`, `integrity_auditor[:<id>]` via slot), and clears finished `scratch/agy-squad/` directories only after archiving findings into `docs/reviews/`.

## How Agy-Squad extends native `/swarm`

Agy-Squad configures Antigravity's native `/swarm` runtime rather than replacing it, adding non-overlapping scopes, file-backed report slots, and independent integrity auditing on top of the built-in shared board (see [Roles, skill workflows, and runtime closure](roles-and-workflows.md)):

![Native Antigravity /swarm vs. Agy-Squad roles and configuration additions](assets/swarm-vs-agy-squad-roles.svg)

## Optional companion: Agy-Context-Saver

`Agy-Squad` runs 100% standalone with native Antigravity, including full live Integrity Audits over native session JSONL transcripts (`--no-integrity` and `--allow-unaudited` are explicit opt-outs, never required for standalone runs). `Agy-Context-Saver` (`2.1.2+` recommended) is a completely optional companion package that adds hook-enforced context, shell, and transcript governance across the execution lifecycle:

| Stage | Owner | Mechanism and tools |
| --- | --- | --- |
| 1. Cohort planning and compilation | `Agy-Squad` | `squad_planner` and `dispatch_squad` assign scoped briefs, report slots (`scratch/agy-squad/...`), and `<= 500` B `Pointer-Over-Wire` receipts (`TypeName: "self"`, `Workspace: "inherit"` for `invoke_subagent`; explicit `model` pinning and `share`/`branch` isolation for `/swarm`). |
| 2. Optional execution governance | `Agy-Context-Saver` (`2.1.2+`, optional) | When installed, registers a single global `~/.gemini/config/hooks.json` `PreToolUse` hook (its plugin `hooks.json` is `{}`), runs a narrow high-ROI RTK pre-gate (`rtk >= 1.1.0`) on noisy runners while leaving `rg`, `grep`, `find`, `ls`, `wc`, `diff`, and `git diff` native and lossless, unblocks native `grep_search`/`find_by_name`/`list_dir` on workspaces, allows `<= 300`-line / `<= 24 KiB` `read_file` calls without bounds (`<= 300`-line slices on larger files; `rtk read` for `.system_generated/` spillovers and completed task logs), and applies backoff on `manage_task` and `schedule`. |
| 3. Cryptographic bundling and pruning | `Agy-Squad` | `agy-squad` (`plan -> dispatch -> collect -> bundle-init -> verdict -> finalize [--prune]`, or granular `fingerprint -> inspect -> digest -> verdict --integrity -> bundle -> verify -> prune [--keep-reports]`) validates single-line verdicts, binds `integrityAudit` digests (`CLEAN` + `Target Squad`), writes `report.sources.json`, and optionally removes loose reports. |
| 4. Dual-path transcript auditing | `Agy-Squad` standalone or optional `Agy-Context-Saver` (`2.1.2+`) | Standalone Integrity Auditors read `~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl` (and matching `transcript_full.jsonl` lines) directly in one batch pass. When optional `Agy-Context-Saver` is installed, auditors use single-pass `agy-context transcript` CLI calls (`list`, `query`, `read`, `export --sanitized`); transcript access defaults to `OPEN`, and operators can opt into `[agy-transcript-access: allow|deny]` on line 1 of worker prompts or via `agy-context transcript access`. |

If you want hook-enforced context and shell governance alongside `Agy-Squad`, install `Agy-Context-Saver` separately with `npx --package=agy-context-saver agy-context setup`.

## Recorded comparison vs. Antigravity `/teamwork`

On November 15, 2026, a matched-effort sequential retest (`Gemini 4 Hydrogen (High)` on all parents and child workers) compared native `/swarm` (`Agy-Squad` + `Agy-Context-Saver 2.0.1`, `rtk 1.1.0`) against `/teamwork [skip-interview]` on the six-defect event-relay fixture ([`benchmarks.md`](benchmarks.md)). Both arms caught all six planted defect categories (`6 / 6`):

- **Runtime and steps (end-to-end parent + all workers):** **Agy-Squad `/swarm`** finished in **`6m 30s` (`390s`) vs. `22m 41s` (`1,361s`, `3.49x` faster)** and executed **`178` vs. `655` combined transcript steps** (`72.8%` fewer steps; `90` vs. `636` child-only steps).
- **Context, transcript size, and wakeups:** Combined raw transcripts totaled **`336.8 KB` (`183.6 KB` child-only) vs. `801.8 KB` (`773.7 KB` child-only)** (`58.0%` smaller overall, `76.3%` smaller child-only), and parent wakeup payloads totaled **`1,629 B` vs. `18,322 B`** (`91.1%` fewer parent bytes).
- **Verification and evidence quality:** Agy-Squad found **`21` unique defects (`10 P1`, `11 P2`)** backed by SHA-256 bundle `4c28db49...` and an independent `audit-ab-audit` `CLEAN` verdict, whereas `/teamwork` found **`16` defects (`8 P1`, `8 P2`)** and its `Victory Auditor` approved Sentinel-fabricated snippets that the parent session had to catch and fix in Steps 11-17.

See [Benchmarks](benchmarks.md) for the complete November 15 matched-`High` per-agent table, methodology scope (hand-scoped two-specialist `/swarm` + `Agy-Context-Saver` compared against 8-subagent `/teamwork`, including governance step share), the historical November 8, 2026 Phase 1 baseline (`6m 15s` vs. `26m 19s`, `148.2 KB` vs. `817.4 KB` subagent-only), unit definitions, and reproduction steps.
