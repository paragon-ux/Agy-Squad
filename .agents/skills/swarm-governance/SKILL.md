---
name: swarm-governance
description: >-
  [Execution Modifier: /swarm + /pr-review, /full-review, or opt-in
  /day-one-review] Governance, role separation, Pointer-Over-Wire receipts,
  and SHA-256 bundling for Antigravity native /swarm.
---

# Agy-Squad Swarm Governance

Native `/swarm` modifier paired with [`pr-review`](../pr-review/SKILL.md), [`full-review`](../full-review/SKILL.md), opt-in flat [`day-one-review`](../day-one-review/SKILL.md), or maintainer-only `self-diagnosis` (repo-only).

Guides: [interop](./references/ecosystem-and-modifiers.md)

## Invariants

1. **Tool Boundaries:** Plan `/swarm` with `squad_planner` / `agy-squad plan` (omit `squadId` for all squads; never `all_l1`); reserve `dispatch_squad` / `agy-squad dispatch` for `invoke_subagent` fallback ([commands](./references/intake-and-planning.md#planner-and-dispatch-commands)).
2. **Role Separation:** Leads/coordinators own `Content Verdict: PASS | FAIL | BLOCKED`. Flat peers (`audit-<id>`) own trace audits, `Target Squad: <id>`, `Evidence Digest: <64-hex>`, and `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` ([slots](./references/bundling-and-wire-format.md#canonical-auditor-slots-and-verdicts)).
3. **Pointer-Over-Wire & Board Scope:** Write reports to `scratch/` slots, post zero mid-flight chatter, and emit one single-line <= 500 B receipt accepting `-`, `--`, or `—` (`READY <slot> - <note>`, `PARTIAL`, `NO_REPORT`) to `@coordinator` (flat) or `@<leadWorkerName>` (layered). Scope `read_board{since|seqs}`; never copy `.system_generated/` into `scratch/` ([wire](./references/bundling-and-wire-format.md#pointer-over-wire-convention)).
4. **Monitor, Resume, Kill & Quota:** Emit verbatim `open_board` (`[Open the Swarm UI](sidecar://swarm/swarm_board/?auto_open=false)`) on its own line on **launch turns, resume turns**, and whenever asked while active (never on routine wakeups); park quiet turns via `swarm_wait` (no `schedule` timers); post `[done] <summary>` (no `@`) before pausing/closing so `monitor` stops. Resume paused swarms top-down (**coordinator -> leads -> workers** layered; **coordinator -> workers** flat) with `resume your assigned work from where you left off` (never rush unfinished workers straight to posting reports). Call `swarm{action: "kill"}` immediately on user stop; recover quota via `swarm{action: "model"}` ([lifecycle](./references/intake-and-planning.md#turn-lifecycle-and-done-control)).
5. **Integrity & ACS Opt-In:** Default `requireIntegrityAudit: true` binds SHA-256 digests (`finalize --prune`; `verify <bundle> --prune` requires `--expected-sha256 <sha256>`). For non-code or exploratory research swarms where forensic trace auditing is unnecessary, opt into `--no-integrity` / `--allow-unaudited` (keeping bounded slots, receipts, and final synthesis). Zero `[agy-transcript-access: ...]` tags emit by default; with optional `Agy-Context-Saver`, opt in via line-1 `[agy-transcript-access: allow|deny]` or `agy-context transcript access` ([bundling](./references/bundling-and-wire-format.md#bundle-record-schema-and-cli)).

## Workflow

- **Step 0 (Intake):** Trigger one `ask_question` call **iff any** of `topology`, `model`, `workspace isolation`, or `report retention` is missing from the `/swarm` prompt, asking **only** for missing item(s) with defaults first (`flat` inline / `layered` manifest with leads, coordinator model, `inherit`, `--prune`). Skip **only** when all 4 are explicit ([overrides](./references/intake-and-planning.md#step-0-sensible-defaults-and-overrides)).
- **Stage 1:** Record `<cohortBaseSeq>`, run `plan`, `swarm{action: "add"}`, emit `open_board`, park via `swarm_wait`.
- **Stage 2:** `collect` (if isolated), read `read_board{since|seqs}`, verify files/tests, write `lead/report.md`, run `verdict` + `bundle-init --digest`, and (unless `--no-integrity`) wake `@audit-<id>` for [dual-path traces](./references/bundling-and-wire-format.md#dual-path-trace-inspection).
- **Stage 3 (Deliver & Close):** Per squad, run `verdict --integrity` + `finalize [--prune]` (or, under `--no-integrity`, skip `verdict --integrity` and run `finalize --allow-unaudited [--prune]`). **Synthesize all verified `lead/report.md` outputs into one complete user-facing deliverable** (full research report, review, or change summary as an artifact or in chat) and lead the final reply with it; keep verdicts, bundle hashes, and Section 5 closure in a compact verification footer (never return governance telemetry alone; [deliverable-first](./references/intake-and-planning.md#deliverable-first-closing)). Post `[done]` before pausing; on resume, cascade top-down and re-emit `open_board`. On close: [pre-kill collection](./references/large-swarms.md#pre-kill-checklist-for-share-and-branch-worktrees), `[done]`, `kill` all workers + `monitor`, Section 5.

## 5. Runtime Closure Checklist (Pre-Handoff Gate)

Confirm all four checks before ending any session:

1. `swarm{action: "status"}`: every worker including `monitor` is `state: "killed"`.
2. `manage_subagents(Action='list')` (when exposed): `0 active subagent(s): []`.
3. `manage_task(Action='list')`: `No background tasks are currently running.`
4. Child commands: all builds, servers, or watchers exited cleanly.
