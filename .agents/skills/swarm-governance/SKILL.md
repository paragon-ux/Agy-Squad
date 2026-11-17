---
name: swarm-governance
description: >-
  [Execution Modifier: pairs with /pr-review, /full-review, or /self-diagnosis on /swarm]
  Apply Agy-Squad governance, role separation, Pointer-Over-Wire reporting, and
  SHA-256 proof bundling on top of Antigravity native /swarm execution.
---

# Agy-Squad Swarm Governance (Native `/swarm` Execution Modifier)

Governs Antigravity native `/swarm` orchestration (`swarm`, `post_message`, `read_board`, `swarm_wait`, `swarm_monitor`) alongside any **Task Spec** ([`pr-review`](../pr-review/SKILL.md), [`full-review`](../full-review/SKILL.md), or [`self-diagnosis`](../self-diagnosis/SKILL.md)). For ecosystem modifiers (`/teamwork` exclusion, `run_workflow`, `/goal`, `antislop` R-02 carve-out, `permissioned-github`), see [ecosystem & modifiers](./references/ecosystem-and-modifiers.md). Also consult [Core workflows](../../../docs/core-workflows.md) and [Roles & skill workflows](../../../docs/roles-and-workflows.md#swarm-governance).

---

## Invariants

1. **Tool & Surface Boundaries:** Plan `/swarm` cohorts via `squad_planner` (MCP) or `node bin/agy-squad.mjs plan` (omit `squadId` to plan all squads; never pass `all_l1`). Use `dispatch_squad` / `agy-squad dispatch` only for `invoke_subagent` fallback (`executionMode: "subagent"`). Never execute `mcp/handoffs.mjs` as a CLI or retired `agy-squad run` (`L17`). See [planner & dispatch commands](./references/intake-and-planning.md#planner-and-dispatch-commands), [model caveats](./references/intake-and-planning.md#model-pinning-and-subagent-caveats), and [manifest limits](../../../docs/tools.md#manifest-structure-rules).
2. **Strict Role Separation & Canonical Audit Slots:** Working leads/coordinators own deliverables and strict single-line `Content Verdict: PASS | FAIL | BLOCKED`; independent flat peers (`audit-<id>`) own trace/digest audits, `Target Squad: <id>`, and strict `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` (`scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md` single-squad; `squad-integrity_auditor-<id>/specialist-1/report.md` multi-squad). See [role separation & slots](./references/bundling-and-wire-format.md#canonical-auditor-slots-and-verdicts).
3. **Pointer-Over-Wire, Board Scoping & `L6` Isolation:** Workers write reports to assigned `scratch/` slots, post zero mid-flight chatter, and emit one single-line `<= 500` UTF-8 byte receipt addressed to `@coordinator` (flat) or compiled `@<leadWorkerName>` (layered; e.g. 24-char slug in `handoffInstructionLine`, recorded verbatim in `handoffs[].message`). Never call unfiltered `read_board()`; pass `since: <cohortBaseSeq>` (from `boardSince` / pre-launch `read_board{since: ...}`) or exact `seqs: [...]` (`boardSeqs`). Never copy `.system_generated/` logs into `scratch/` (`L6`). See [wire format](./references/bundling-and-wire-format.md#pointer-over-wire-convention) and [large swarms](./references/large-swarms.md#shared-board-on2-broadcast-and-zero-mid-flight-chatter).
4. **`open_board`, `swarm_wait`, Immediate Kill & Quota Recovery:** Emit only the verbatim `open_board` string returned by `swarm` on active launch turns and in-flight updates (never craft `sidecar://...` URLs; never emit `open_board` after workers are killed). Launch turns emit `open_board` and yield cleanly (`swarm_wait` arrives one turn after `swarm add`, showing `"waiting for my reply"` until worker wakeup or `swarm_monitor`; never use `schedule` watchdogs); subsequent quiet turns park via `swarm_wait`. Execute `swarm{action: "kill"}` immediately on explicit user kill requests; recover waiting-worker model quota via `swarm{action: "model"}`. See [UI turn lifecycle](./references/intake-and-planning.md#swarm-ui-and-turn-lifecycle) and [kill vs normal shutdown](./references/large-swarms.md#immediate-user-directed-kill-vs-normal-shutdown).
5. **Cryptographic File-Integrity Boundary:** Default `requireIntegrityAudit: true` binds SHA-256 digests of coordinator-assembled `verifiedFiles`, reports, `Evidence Digest`, and `auditPolicy` (`bundle`/`verify`); see [bundle schema & CLI](./references/bundling-and-wire-format.md#bundle-record-schema-and-cli).

---

## Workflow

### Step 0: Pre-Flight Intake (Ask When Unspecified)
Ask once via `ask_question` before compiling plans whenever any of these four settings are unspecified (see [Step 0 templates](./references/intake-and-planning.md#step-0-intake-question-templates)):
1. **Topology (neutral, no default bias):** `Flat` (specialists -> coordinator) vs `Layered` (specialists -> domain squad leads -> coordinator).
2. **Workspace Isolation (`workspaceIsolation`):** `inherit` (shared workspace for read-only or disjoint `scopeFiles`) vs `share` (shared-storage copy) vs `branch` (isolated clone).
3. **Evidence Retention (`Scope 2` / `Scope 3`):** Keep loose specialist reports (`--keep-reports` on `prune` / defer `--teardown`) vs prune/tear down after verified bundling.
4. **Model:** Defaults to the **coordinator's active model** (`model` / `--model` omitted) unless the user specifies another model ID (`swarm{action: "models"}` + `knownModels` allowlist).

### Stage 1: Plan, Launch & Park
1. Capture `<cohortBaseSeq>` if the board already exists, run `squad_planner` (with `boardSince`/`boardSeqs` when scoping follow-up waves) or `node bin/agy-squad.mjs plan` ([commands](./references/intake-and-planning.md#planner-and-dispatch-commands)), spawn via `swarm{action: "add"}`, record `provenanceScaffold`, and verify `swarm{action: "status"}`.
2. Yield launch turn with verbatim `open_board` (`"waiting for my reply"` clears on wakeup); use `swarm_wait` on subsequent quiet turns.

### Stage 2: Content Gate & Flat Integrity Audit
1. Collect isolated `share`/`branch` slots (`agy-squad collect`), scope board checks via `read_board{since|seqs}`, verify claims against primary files/tests, and write `lead/report.md` (`Content Verdict: ...`).
2. Run `agy-squad fingerprint`, `bundle-init --digest` (or `bundle-init` + `digest`), then wake `@audit-<id>` (`[agy-transcript-access: allow]` on leads/auditors, `deny` on leaf specialists; single-pass `agy-context transcript list|query --summary|read --last-turns 10` or coordinator `export --sanitized`) to emit `Target Squad: <id>`, `Evidence Digest: <64-hex>`, and strict `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` ([transcript fallback](./references/bundling-and-wire-format.md#coordinator-extracted-transcript-index-native-swarm-fallback)).

### Stage 3: Bundle, Multi-Cycle Continuation, or Final Close
1. Run `verdict` / `inspect` / `verdict --integrity` / `bundle` / `verify --prune [--keep-reports]` (or separate `verify` + `prune`) independently per working squad ([bundle schema](./references/bundling-and-wire-format.md#bundle-record-schema-and-cli)).
2. Keep waiting workers idle for multi-cycle fixes via `post_message` (`occupiedWorkerNames` if adding workers; fresh conversation between major waves). On normal completion, finish [pre-kill collection](./references/large-swarms.md#pre-kill-checklist-for-share-and-branch-worktrees), post `[done] <summary>`, kill workers + `monitor` (`swarm{action: "kill"}`), complete Section 5, and omit `open_board`.

---

## 5. Runtime Closure Checklist (Pre-Handoff Gate)

`bundle`/`verify` check disk SHA-256 digests only; before ending any session, verify all four live runtime checks:

1. `swarm{action: "status"}`: every worker including `monitor` reports `state: "killed"` (kill `monitor` after `[done]`).
2. `manage_subagents(Action='list')` (when exposed in toolset): `0 active subagent(s): []`.
3. `manage_task(Action='list')`: `No background tasks are currently running.` (catches lingering `swarm_monitor` crons).
4. Child commands: any worker-launched builds, servers, or watchers exited cleanly.
