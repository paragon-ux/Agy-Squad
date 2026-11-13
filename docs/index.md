# Agy-Squad

Agy-Squad is a staged subagent orchestration, self-diagnosis, and review harness for **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** on **Linux and WSL2 (macOS support is best-effort and untested)**. It compiles coding or review tasks into scoped specialist or lead cohorts (`dispatch_squad`), enforces a `500` UTF-8 byte `Pointer-Over-Wire` receipt ceiling, bundles SHA-256 input and report digests via `node mcp/handoffs.mjs`, and pairs with `Agy-Context-Saver` (`v1.8.1+`) for `RTK` command rewriting and Reactive Wakeup governance.

## Start here

- **[Getting started (Desktop IDE & CLI on POSIX / WSL2)](getting-started.md):** Host and companion compatibility matrix, clone-and-verify preflight, Antigravity Desktop IDE registration, and CLI commands for offline tests (`npm test`), payload preview (without `--launch`), and live delegation (`--launch`).
- **[Core workflows](core-workflows.md):** Task-proportional orchestration, recursive harness [`self-diagnosis`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md), the ten-category [`pr-review` Standard v1.3.0](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md), and the 3-scope evidence-retention and teardown contract.
- **[Concepts and terminology](concepts.md):** Plain-language definitions for stages (`all_l1` vs. `<squadId>` vs. `integrity_auditor`), report slots, `Pointer-Over-Wire` receipts, SHA-256 bundles, Reactive Wakeup, `RTK`, and decision ledger codes (`L1` through `L42`).
- **[Manifest and tool contract](tools.md):** Schema and CLI flags for `dispatch_squad`, `node bin/agy-squad.mjs`, and `node mcp/handoffs.mjs`.
- **[Benchmarks](benchmarks.md):** Canonical comparison table, unit definitions, and reproduction guide for the November 8, 2026 audit against Antigravity `/teamwork`.

## Core capabilities

1. **Proportional subagent dispatch (Desktop IDE & CLI):** Compile direct specialists (`1` to `N`) or domain squad leads (`all_l1`) that write full evidence to `scratch/agy-squad/.../report.md` and return a single-line `<= 500` B `READY` receipt.
2. **Recursive harness self-diagnosis (`/self-diagnosis`):** Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` for a zero-subagent health and token-budget check, or dispatch supervised specialist cohorts to audit skills, runtime contracts, and execution efficiency.
3. **Repository PR review standard (`/pr-review` v1.3.0):** Enforce commit and session provenance, architecture-before-runtime tracing, ten review categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`), and `1 ID = 1 Row` durable finding ledgers under `docs/reviews/`.
4. **Governed evidence retention and teardown:** Clean up temporary CLI session registrations on exit, verify SHA-256 source and report digests before pruning loose specialist reports, and gate `diagnose.mjs --teardown` on a verified bundle and updated `docs/reviews/` ledger.

## Companion integration: Agy-Context-Saver

`Agy-Squad` and `Agy-Context-Saver` remain separate packages ([`L31`](plans/LEDGER.md)) that connect across four execution stages:

1. **Staged compilation (`Agy-Squad`):** `dispatch_squad` compiles workspace report slots (`scratch/agy-squad/...`) and `<= 500` UTF-8 byte `Pointer-Over-Wire` briefs (`TypeName: "self"`, `Workspace: "inherit"`).
2. **Subagent execution governance (`Agy-Context-Saver`):** Inside Antigravity Desktop IDE sessions or when `--launch` is active in the CLI, `Agy-Context-Saver`'s PreToolUse hook rewrites child `run_command` calls via pinned `RTK` (`v0.51.0`), routes workspace file reads to `rtk read`, and enforces proportional backoff on `manage_task` and `schedule`. During CLI payload preview (`agy-squad run` without `--launch`), `bin/agy-squad.mjs` sets `inheritCustomizations: false` so read-only workspace inspection works without `run_command`, then enables `inheritCustomizations: true` (plus `schedule` and `call_mcp_tool`) on `--launch`.
3. **Cryptographic bundling and pruning (`Agy-Squad`):** `node bin/agy-squad.mjs` (`verdict -> fingerprint -> inspect -> bundle -> verify -> prune [--keep-reports]`) enforces strict single-line verdicts, binds `integrityAudit` SHA-256 digests (`CLEAN` + `Target Squad`), records digests of every specialist report and cited `verifiedFiles` in `report.sources.json`, and optionally removes loose specialist reports (`L1, L2, L42`).
4. **Session and child transcript forensics (`Agy-Context-Saver`):** Lazy MCP tools (`get_installation_status`, `sync_installation`, `check_context_health`, `read_transcript`, `query_transcript`) audit parent or subagent `conversationId` telemetry without reading `.system_generated/` directly (`L6`). Run `sync_installation` once on a new host so the pinned `rtk` binary is active before live dispatch.

## Recorded comparison vs. Antigravity `/teamwork`

In one recorded sequential audit on November 8, 2026 against the six-defect event-relay fixture ([`benchmarks.md`](benchmarks.md)), both arms caught all six planted defect categories (`6 / 6`). **Agy-Squad + Agy-Context-Saver (`v1.8.1`, `rtk 0.51.0`)** finished in **`6m 15s` (`375s`) vs. `26m 19s` (`1,579s`, `4.2x` faster)**, used **`64` vs. `645` transcript steps** (`90.1%` fewer steps), generated **`148.2 KB` vs. `817.4 KB` of raw transcripts** (`81.9%` smaller), and sent **`249 B` vs. `4,940 B` into the parent context** (`95.0%` fewer wakeup bytes). The squad lead verified the cited fixture lines directly and ran a `20 ms` SHA-256 bundle digest check (`handoffs.mjs verify`) before pruning loose reports under the 3-scope teardown contract.

See [Benchmarks](benchmarks.md) for the full metric table, unit definitions, prompts, and offline vs. live verification steps.
