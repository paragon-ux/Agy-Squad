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

1. **Tool & Surface Boundaries:** Plan `/swarm` cohorts via `squad_planner` (MCP) or `node bin/agy-squad.mjs plan` (omit `squadId` to compile all squads; never pass `all_l1`). Use `dispatch_squad` / `agy-squad dispatch` only for `invoke_subagent` fallback (`executionMode: "subagent"`). Never run `mcp/handoffs.mjs` as a CLI (it is an internal JS library), and never invoke retired `agy-squad run` (`L17`). See [planner & dispatch commands](./references/intake-and-planning.md#planner-and-dispatch-commands) and [model caveats](./references/intake-and-planning.md#model-pinning-and-subagent-caveats) (including `invoke_subagent` `inherit|flash_lite|flash|pro` limits and [tools contract](../../../docs/tools.md#manifest-structure-rules) `24`-char names, `500` B pointers, `10 MiB` stdio cap, and no hardcoded worker count ceiling).
2. **Strict Role Separation & Canonical Audit Slots:** Never merge content acceptance with integrity auditing:
   - **Working Lead / Coordinator** (`<squad>-lead` layered, or coordinator flat): verifies deliverables and tests, owns strict single-line `Content Verdict: PASS | FAIL | BLOCKED`.
   - **Integrity Auditor** (`audit-<id>` -> `scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md` single-squad; `audit-<id>` -> `scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md` multi-squad): independent flat peer verifying tool traces and `Evidence Digest`, owns `Target Squad: <id>` and strict `Integrity Verdict: CLEAN | INTEGRITY VIOLATION`. Reject hedged verdicts (`CONDITIONAL PASS`, `PASS with Advisories`). See [role separation & slots](./references/bundling-and-wire-format.md#canonical-auditor-slots-and-verdicts).
3. **Pointer-Over-Wire & `L6` Transcript Isolation:** Workers write full Markdown reports to assigned `scratch/` slots (collected via `agy-squad collect` from `share`/`branch` copies before bundling or `kill`) and post **zero mid-flight chatter**: only one single-line `< 500` UTF-8 byte pointer (`@coordinator` flat or `@<squad>-lead` layered: `READY <path> — <observation>`, `PARTIAL <path> — <observation and blocker>`, or `NO_REPORT — <reason>`). Record raw board posts verbatim in `handoffs[].message` for `agy-squad inspect` (detected post-hoc, not board-enforced). Never copy `.system_generated/` logs into `scratch/` (`L6`). See [wire format](./references/bundling-and-wire-format.md#pointer-over-wire-convention) and [large swarms](./references/large-swarms.md#shared-board-on2-broadcast-and-zero-mid-flight-chatter).
4. **`open_board`, `swarm_wait`, Immediate Kill & Quota Recovery:** Emit only the verbatim `open_board` string returned by `swarm` (**never craft a `sidecar://...` board URL or command yourself**, per `native_swarm`) **only on active `/swarm` launch turns and in-flight user updates**, and **never emit `open_board` after all swarm workers are killed**. Because `swarm_wait`, `post_message`, and `read_board` arrive one turn after the first `swarm add`, the launch turn spawns workers, emits `open_board` verbatim, and yields; **warn explicitly** that ending a launch turn without `swarm_wait` displays `"waiting for my reply"` / `"waiting for user reply"` in Antigravity until a worker message (`@coordinator`) or `swarm_monitor` trigger wakes the coordinator (**never** use a one-shot `schedule` watchdog timer to poll `/swarm`, which `Agy-Context-Saver` denies). Use `swarm_wait` on subsequent intermediate quiet turns. **User-directed kill override:** Whenever the user explicitly asks to kill or stop workers, execute `swarm{action: "kill"}` immediately without delaying for worktree collection or bundling; for quota exhaustion on active `waiting` workers, switch models in place via `swarm{action: "model"}` rather than `kill` + `add`. See [UI turn lifecycle](./references/intake-and-planning.md#swarm-ui-and-turn-lifecycle) and [large-swarm reference](./references/large-swarms.md#immediate-user-directed-kill-vs-normal-shutdown).
5. **Cryptographic File-Integrity Boundary:** `bundle` and `verify` enforce `requireIntegrityAudit: true` by default and attest SHA-256 digests of coordinator-assembled inputs (`verifiedFiles`, reports, `Evidence Digest`), not host authorship or unverified claim truth. Never ask LLMs to copy-paste 64-hex hashes; see [bundle schema & CLI](./references/bundling-and-wire-format.md#bundle-record-schema-and-cli).

---

## Workflow

### Step 0: Pre-Flight Intake (Ask When Unspecified)
Ask once via `ask_question` before compiling plans whenever any of these four settings are unspecified (see [Step 0 templates](./references/intake-and-planning.md#step-0-intake-question-templates)):
1. **Topology (neutral, no default bias):** `Flat` (specialists -> coordinator) vs `Layered` (specialists -> domain squad leads -> coordinator).
2. **Workspace Isolation (`workspaceIsolation`):** `inherit` (shared workspace for read-only or disjoint `scopeFiles`) vs `share` (shared-storage copy) vs `branch` (isolated clone).
3. **Evidence Retention (`Scope 2` / `Scope 3`):** Keep loose specialist reports (`--keep-reports` on `prune` / defer `--teardown`) vs prune/tear down after verified bundling.
4. **Model:** Defaults to the **coordinator's active model** (`model` / `--model` omitted) unless the user specifies another model ID (`swarm{action: "models"}` + `knownModels` allowlist).

### Stage 1: Plan, Launch & Park
1. Run `squad_planner` (or `node bin/agy-squad.mjs plan` per [planner commands](./references/intake-and-planning.md#planner-and-dispatch-commands)); check `swarm{action: "models"}` first if pinning non-default model IDs.
2. Spawn workers via `swarm{action: "add"}`, record roster names and IDs in `provenanceScaffold`, and verify running models via `swarm{action: "status"}`.
3. End the launch turn with the verbatim `open_board` string returned by `swarm` on its own line (`swarm_wait` arrives on the turn after the first `swarm add`; `"waiting for my reply"` clears on worker wakeup). On subsequent quiet turns while active, park via `swarm_wait`.

### Stage 2: Content Gate & Flat Integrity Audit
1. Run `agy-squad collect --plan <plan.json> --from <worktree>...` for `share`/`branch` slots, verify worker claims against primary files and tests, and write `lead/report.md` (`Content Verdict: ...`).
2. Run `agy-squad fingerprint`, `bundle-init`, and `digest` (`Evidence Digest: <64-hex>`). With `Agy-Context-Saver >= 2.0.1`, `squad_planner` stamps `[agy-transcript-access: allow]` on `audit-<id>` and `<squad>-lead` briefs (and `deny` on leaf specialists) so `audit-<id>` can run single-pass `agy-context transcript list --parent <id> --lineage`, `query --id <id> --summary`, or `read --id <id> --last-turns 10` (or verify coordinator `export --parent <id> --sanitized --out scratch/...`; never raw logs) before emitting `Target Squad: <id>` and strict `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` (re-execution alone cannot satisfy `CLEAN`). See [transcript index protocol](./references/bundling-and-wire-format.md#coordinator-extracted-transcript-index-native-swarm-fallback).

### Stage 3: Bundle, Multi-Cycle Continuation, or Final Close
1. Run the CLI gate (`collect` if isolated, `verdict`, `fingerprint`, `bundle-init`, `inspect`, `digest`, `verdict --integrity`, `bundle`, `verify`, `prune [--keep-reports]`) independently per working squad ([bundle schema](./references/bundling-and-wire-format.md#bundle-record-schema-and-cli)).
2. **Remediation / multi-cycle swarms:** For follow-up fixes or re-verification on the same codebase, keep waiting `/swarm` workers idle and wake them with `post_message` (pass `occupiedWorkerNames` to `squad_planner` if spawning extra workers onto the active board; start a fresh conversation between major waves for a clean UI board).
3. **Final shutdown:** Unless the user requested an immediate kill (which executes `swarm{action: "kill"}` at once), finish normal `share`/`branch` teardown per the [pre-kill checklist](./references/large-swarms.md#pre-kill-checklist-for-share-and-branch-worktrees), post `[done] <summary>`, kill workers with `swarm{action: "kill"}`, complete Section 5 below, and do **not** emit `open_board`.

---

## 5. Runtime Closure Checklist (Pre-Handoff Gate)

`bundle`/`verify` check disk SHA-256 digests only; before ending any session, verify all four live runtime checks:

1. `swarm{action: "status"}`: every worker **including `monitor`** (exact monitor roster name in status, killed via `swarm{action: "kill", name: "monitor"}` after `[done]`) reports `state: "killed"`.
2. `manage_subagents(Action='list')`: `0 active subagent(s): []`.
3. `manage_task(Action='list')`: `No background tasks are currently running.` (catches lingering `swarm_monitor` daemon crons).
4. Child commands: any worker-launched builds, servers, or watchers exited cleanly.
