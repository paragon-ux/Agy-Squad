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
3. **Pointer-Over-Wire & Board Scope:** Write reports to `scratch/` slots, post zero mid-flight chatter, and emit one single-line <= 500 B receipt accepting `-`, `--`, or `—` (`READY <slot> - <note>`, `PARTIAL`, `NO_REPORT`; append `wt=<abs-worktree-root>` under `share`/`branch`) to `@coordinator`. Skip Turn-1 `read_board` (Step 1 holds the brief); scope post-wakeup `read_board{since|seqs}` strictly to receipts and never copy `.system_generated/` into `scratch/` ([wire](./references/bundling-and-wire-format.md#pointer-over-wire-convention)).
4. **Monitor, Resume, Kill & Quota:** Emit verbatim `open_board` (`[Open the Swarm UI](sidecar://swarm/swarm_board/?auto_open=false)`) on its own line on **launch turns, resume turns**, and whenever asked while active (never on routine wakeups); park quiet turns via `swarm_wait` (no `schedule` timers); post `[done] <summary>` (no `@`) before pausing/closing so `monitor` stops. Resume paused swarms top-down (**coordinator -> leads -> workers** layered; **coordinator -> workers** flat) with `resume your assigned work from where you left off` (never rush unfinished workers straight to posting reports). Call `swarm{action: "kill"}` immediately on user stop; recover quota via `swarm{action: "model"}` ([lifecycle](./references/intake-and-planning.md#turn-lifecycle-and-done-control)).
5. **Integrity & ACS Opt-In:** Default `requireIntegrityAudit: true` binds SHA-256 digests (`finalize --prune`; `verify <bundle> --prune` requires `--expected-sha256 <sha256>`). For non-code or exploratory research swarms where forensic trace auditing is unnecessary, opt into `--no-integrity` / `--allow-unaudited` (keeping bounded slots, receipts, and final synthesis). Zero `[agy-transcript-access: ...]` tags emit by default; with optional `Agy-Context-Saver`, opt in via line-1 `[agy-transcript-access: allow|deny|self-only]` or `agy-context transcript access` ([bundling](./references/bundling-and-wire-format.md#bundle-record-schema-and-cli)).

## Workflow

- **Step 0 (Risk-Gated Defaults, 1 turn):** Read only `SKILL.md` (and `swarm{action: "models"}` when pinning an explicit model; skip pre-reading reference docs or historical `docs/reviews/` files). Apply safe defaults immediately (`flat` inline / wave-gated `layered` manifest, coordinator model, `inherit`, `--prune`) on read-only and overlap-free runs; call `ask_question` **only** when `squad_planner` detects writable `siblingOverlaps` on `inherit`, destructive state ambiguity, or an explicit user request to customize run settings ([overrides](./references/intake-and-planning.md#step-0-sensible-defaults-and-overrides)).
- **Stage 1 (Wave-Gated Launch & `swarm_pane`):** Run `agy-squad plan --out scratch/plan.json` (or `squad_planner` with `outPath`; optional `--swarm-pane-out <appDataDir>/brain/<convId>/.system_generated/swarm/plan.json`), write `swarmPane` from the compact summary to `.system_generated/swarm/plan.json` (`swarm_pane` replaces `narrator`), read `scratch/plan.wave1.json` (or `--emit-wave 1`) to launch **Wave 1 (`specialists`)** via `swarm{action: "add"}`, emit `open_board`, and park via `swarm_wait`. In **layered mode**, after squad specialist `READY` receipts arrive, run `agy-squad collect --plan scratch/plan.json --handoffs scratch/handoffs.json` first if `share`/`branch` (merging writable worker diffs), then read `scratch/plan.wave2.json` and spawn **Wave 2 (`leads`)** so leads read specialist report slots directly with zero premature repo reads.
- **Stage 2 (Collect, Digest & Wave-3 Audit):** Run `agy-squad collect --plan scratch/plan.json --handoffs scratch/handoffs.json` (flat `share`/`branch` or new slots), read receipt-scoped `read_board{since|seqs}`, verify files/tests (flat mode: write `lead/report.md`), run `agy-squad bundle-init --plan scratch/plan.json --all-squads --handoffs scratch/handoffs.json --from-scope --digest` (which enforces content verdicts and emits digest-bound `auditSwarmAdd` briefs), and (unless `--no-integrity`) run **Wave 3 (`audit-<id>`)** for [dual-path traces](./references/bundling-and-wire-format.md#dual-path-trace-inspection).
- **Stage 3 (Non-Circular Deliver & Close):** First, run `agy-squad finalize <record.json...> [--strict-citations]` **without `--prune`** (or under `--no-integrity`, `finalize <record.json...> --allow-unaudited [--strict-citations]`) so verified bundle SHA-256 hashes are ready while loose reports stay readable on disk. Next, **synthesize all verified `lead/report.md` outputs into one complete user-facing deliverable** with the verified bundle hashes: in **layered mode**, open raw `specialist-N/report.md` only when `citations.uncarriedUrls` is non-empty, a verdict is non-`PASS`, or specific raw detail is needed; in **flat mode**, synthesize directly from `specialist-N/report.md`, carrying forward cited `## Sources` URLs/`file:line`. Finally, when report retention is `--prune`, run `agy-squad prune --records <record.json>=<accepted-sha256>... --clean-records` (or single-step `finalize --prune` when no post-bundle SHA-256 needs to be embedded before pruning). Lead the final reply with the deliverable and keep verdicts, bundle hashes, and Section 5 closure in a compact verification footer ([deliverable-first](./references/intake-and-planning.md#deliverable-first-closing)). Post `[done]` before pausing; on resume, cascade top-down and re-emit `open_board`. On close: [pre-kill collection](./references/large-swarms.md#pre-kill-checklist-for-share-and-branch-worktrees), `[done]`, `kill` all workers + `monitor`, Section 5.

## 5. Runtime Closure Checklist (Pre-Handoff Gate)

Confirm all four checks before ending any session:

1. `swarm{action: "status"}`: every worker including `monitor` is `state: "killed"`.
2. `manage_subagents(Action='list')` (when exposed): `0 active subagent(s): []`.
3. `manage_task(Action='list')`: `No background tasks are currently running.`
4. Child commands: all builds, servers, or watchers exited cleanly.
