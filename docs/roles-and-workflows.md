# Roles, skill workflows, and runtime closure

This page is the single repository reference for Agy-Squad skill composition, MCP/CLI tool boundaries, roles, cross-role handoff flows, and the runtime closure checklist. Other docs and skill files (`.agents/skills/*/SKILL.md`) link here instead of repeating role graphs.

## Skill composition & tool surface map

| Dimension | Choice / Surface | Canonical Scope & Usage |
| --- | --- | --- |
| **Task Spec** (what to inspect) | `pr-review`, `full-review`, `self-diagnosis` | Use `pr-review` for branch/PR diffs, `full-review` for non-diff evidence & direction decisions, `self-diagnosis` for Agy-Squad health & optimization. |
| **Execution Modifier** (how teams run) | `swarm-governance` | Pair with any Task Spec on `/swarm` or multi-agent teams. Governs slot receipts (`<= 500` B), flat `audit-<id>`, `bin/agy-squad.mjs` bundles, and 4-check closure. |
| **Topology rule (no default bias)** | `Flat` vs `Layered` vs single-agent | Neither topology is forced by default; ask the user once if unspecified. `squad_planner` reports neutral tradeoffs via `topology.defaultBias: "none (ask user if unspecified)"`. |
| **`/swarm` planner** | `squad_planner` / `agy-squad plan` | Default planner for `/swarm` (`swarmAdd`, `readOnly: true` overlap exemptions, `provenanceScaffold`). Supports `all` manifest squads when `squadId` is omitted (`all_l1` is invalid here). |
| **`invoke_subagent` compiler** | `dispatch_squad` / `agy-squad dispatch` | Explicit `invoke_subagent` stage compiler (`all_l1` leads, `<squadId>` specialists, or `integrity_auditor[:<target>]` slot; legacy `adversarial_*` modes removed). |
| **Verification library** | `mcp/handoffs.mjs` | Library imported by `bin/agy-squad.mjs` (`fingerprint`, `inspect`, `bundle`, `verify`, `prune`); standalone CLI removed—always invoke `node bin/agy-squad.mjs`. |

## 1. Canonical role inventory

| Role | Active in | Verdict or primary output | Authority and boundary |
| --- | --- | --- | --- |
| **Operator / Primary Agent** | All workflows | Compiles plans, updates `docs/reviews/`, runs `bundle`/`--teardown`, stops agents | Owns user intake, final reporting, and teardown; never fabricates specialist evidence |
| **Coordinator (`/swarm`)** | `swarm-governance` | Briefs workers on the shared board (`post_message`), writes `lead/report.md` in flat mode, runs `bin/agy-squad.mjs` | Owns single-squad orchestration and worker `kill` cleanup; never delegates coordination to `monitor` or `narrator` |
| **Working Lead** | `swarm-governance` (layered), `self-diagnosis` (`all_l1`) | `Content Verdict: PASS \| FAIL \| BLOCKED` (legacy alias `Verdict: ...`) | Reviews specialist slot reports against cited files/tests and re-checks after integrity `CLEAN`; never audits its own integrity |
| **Specialist** | `swarm-governance`, `self-diagnosis`, `pr-review`, `full-review` | Writes `specialist-<N>/report.md` + `<= 500` B receipt (`READY`, `PARTIAL`, `NO_REPORT`) | Inspects assigned `scopeFiles` via executed tools/commands (`Subagent Alignment Policy`); never guesses from memory |
| **Flat Integrity Auditor** | All skills (`/swarm`: `audit-<id>`, slot: `integrity_auditor:<id>`) | `Target Squad: <id>` and `Integrity Verdict: CLEAN \| INTEGRITY VIOLATION` | Independent flat peer auditing tool traces (`query_transcript summaryOnly=true` / `lastTurns=10`), scope isolation, and SHA-256 hashes; cannot approve content (`PASS`) |
| **Review Lead / Responsible Reviewer** | `pr-review`, `full-review` | `APPROVE \| REQUEST_CHANGES` or `PASS \| FAIL \| BLOCKED` (+ Section 7 Direction decision when requested) | Evaluates repository contracts (`L1` through `L43`), 10 review categories, and `1 ID = 1 Row` ledgers; issues provisional verdict before audit and final verdict only after `CLEAN` |
| **Implementer / Author** | `pr-review`, `self-diagnosis` remediation | Code, test, or doc changes at a new commit/revision | Fixes recorded findings separately from review acceptance (`Implementation status updates are separate from the review`); same reviewer/cohort re-checks fixes |
| **Monitor (`swarm_monitor`)** | Antigravity native `/swarm` | `@coordinator [stall]` or `@<member> [stall]` alerts when all members stop moving | Runs a `*/3` daemon cron (`schedule` with `IsDaemon: true`) and checks `read_board`; never receives task briefs, edits files, or touches verdicts |
| **Narrator** | Antigravity native `/swarm` | Maintains the user-facing Swarm UI overview | Summarizes board progress for the Swarm UI; never edits files, briefs workers, or touches verdicts |

## 2. Role workflows by skill

![Skill role workflows and dual-verdict closure flow](assets/skill-role-workflows.svg)

Every multi-agent workflow separates content evaluation from integrity auditing: a provisional content verdict runs before the flat integrity auditor checks execution authenticity, and acceptance requires the lead or reviewer to re-check final artifacts after `Integrity Verdict: CLEAN` (see [Review roles](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/references/review-roles.md)).

### `swarm-governance`

Source specification: [`.agents/skills/swarm-governance/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/swarm-governance/SKILL.md).

1. **Plan and pin (`Coordinator`):** Call `squad_planner` (or `node bin/agy-squad.mjs plan --manifest <path> --model <id> --known-model <id>`) to generate `swarmAdd` payloads, check writable `scopeFiles` overlaps, and build an `L6`-safe `provenanceScaffold` + `bundleRecordTemplates`.
2. **Spawn, surface Swarm UI, and park (`Coordinator` -> `Specialists` + optional `monitor` / `narrator`):** Launch workers via `swarm{action: "add"}` (`inherit`, `share`, or `branch`), verify active model IDs via `swarm{action: "status"}`, end the launch turn cleanly with `open_board` (`[Open the Swarm UI](sidecar://swarm/swarm_board/)` or `?tab=graph`) on its own line so the UI pill renders immediately (only call `swarm_wait` on intermediate quiet turns, not when launching or replying to the user).
3. **Slot report and pointer (`Specialists` -> `Working Lead` / `Coordinator`):** Each specialist writes its evidence to `scratch/agy-squad/squad-<id>/specialist-<N>/report.md` and posts one single-line `<= 500` UTF-8 byte pointer (`@lead READY ...`) on the board.
4. **Content gate and flat integrity audit (`Working Lead` <-> `Flat Integrity Auditor`):** The lead (or coordinator in flat single-squad mode) verifies cited files and tests, records `Content Verdict: PASS | FAIL | BLOCKED` in `lead/report.md`, and spawns a flat `audit-<id>` worker (writing to `scratch/agy-squad/squad-integrity_auditor-<id>/`). `audit-<id>` emits `Target Squad: <id>` and `Integrity Verdict: CLEAN | INTEGRITY VIOLATION`. Any `INTEGRITY VIOLATION` blocks acceptance until fixed and re-audited.
5. **Bundle, verify, prune, and close (`Coordinator`):** Run `node bin/agy-squad.mjs verdict`, `verdict --integrity`, `fingerprint`, `inspect`, `bundle` (`report.sources.json`), `verify`, and `prune`, post `[done] <summary>`, and run the 4-check closure checklist below (explicitly killing `monitor` via `swarm{action: "kill", name: "monitor"}` or any `monitor-*` instance). Because Antigravity keeps one append-only board per conversation and does not expose user-configurable channels when `swarm` lacks `action: "channel"`, start a new conversation for the next major wave if you want a fresh Swarm UI board ([Shared swarm board and channel limits](concepts.md#shared-swarm-board-and-channel-limits)).

### `self-diagnosis`

Source specification: [`.agents/skills/self-diagnosis/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md) and [`self-diagnosis-manifest.json`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json).

1. **Pre-flight intake and profiler (`Operator`):** Ask neutrally (`Flat` vs `Layered` vs single squad vs local dry-run—no default topology bias) alongside teardown mode (`--keep-reports` vs `--teardown`) and integrity audit rigor (`audit-<id>` / `integrity_auditor`), then run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` (`L7`, zero subagents).
2. **Plan or compile diagnostic cohort:** Primary `/swarm` runs compile via `squad_planner` (`diagnose.mjs --print-plan`); explicit `invoke_subagent` runs compile via `dispatch_squad` (`diagnose.mjs --print-dispatch <all_l1|all_specialists|squadId>`):
   - `Skill & PR-Review Standard Lead` (`skill_and_pr_review_audit`) -> 2 `readOnly: true` specialists (`SKILL`, `DOC`, `ARCH`, `SCRIPT`).
   - `Runtime & Contract Diagnostics Lead` (`runtime_and_contract_diagnosis`) -> 2 `readOnly: true` specialists (`MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`).
   - `Token & Execution Optimization Lead` (`token_and_execution_optimization`) -> 2 `readOnly: true` specialists (`RUN`, `SKILL`, `SVC`, `ARCH`).
3. **Report, patrol, and bundle (`Specialists` -> `Working Leads / Coordinator` -> `Operator`):** Specialists write `specialist-<N>/report.md` and send `<= 500` B `READY` messages (`post_message` / `send_message`). Leads/coordinator verify leaf traces against source files and `npm test`, write `lead/report.md` (`Content Verdict: PASS`), and pair with flat `audit-<id>` / `integrity_auditor:<id>` (`Integrity Verdict: CLEAN`).
4. **Ledger, teardown, remediation, and re-verification (`Operator` -> `Same Cohort`):** The operator bundles (`node bin/agy-squad.mjs`), transcribes every `P0` through `P3` item `1-to-1` into `docs/reviews/<slug>.md` (Sections 1, 8, and 9), runs `diagnose.mjs --teardown all --ledger docs/reviews/<slug>.md`, keeps spawned workers/subagents `idle` if fixing code, messages the **same** specialists to re-verify fixes, flips ledger rows to `Closed`, kills workers/leads (`swarm{action: "kill"}` / `manage_subagents`), and runs the 4-check runtime closure gate.

### `pr-review`

Source specification: [`.agents/skills/pr-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md) (`Standard v1.3.0`).

1. **Intake and provenance (`Operator / Review Lead`):** Ask neutrally when topology (`Flat` vs `Layered` vs single-agent) is unspecified via `ask_question`, pin PR/branch base and head SHAs, CI SHAs, and the append-only `Session Provenance` table in `docs/reviews/<slug>.md`.
2. **Architecture trace and category review (`Review Lead` + optional `Category Specialists`):** Trace `design thesis -> LEDGER.md (L1-L7, L21, L29-L31, L40-L43; L17 retired) -> public contract -> code -> verification` across all ten mandatory categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`), recording `1 ID = 1 Row` findings (`P0` through `P2` 10-field blocks; `P3` table; Section 8 mandatory residual/deferred sink).
3. **Independent audit before final approval (`Review Lead` <-> `Integrity Auditor`):** Run an independent integrity auditor when a cohort ran or integrity verification is selected. Only after `Integrity Verdict: CLEAN` does the review lead finalize `Approve` or `Request Changes`.
4. **Remediation loop (`Implementer / Author` -> `Review Lead`):** Implementation changes happen separately from the review; the review lead (or same review cohort) re-verifies the delta at the new SHA before moving rows from `Open (Pre-Remediation)` to `Closed`.

### `full-review`

Source specification: [`.agents/skills/full-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/SKILL.md) and [`review-roles.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/references/review-roles.md).

1. **Frame and evidence intake (`Responsible Reviewer`):** Pin a one-sentence decision/review question, `Session Provenance`, and an `Evidence manifest` (`EID | Artifact | Locator | SHA-256 / size | Class | Access | Examined`), ingesting logs and transcripts in targeted batch windows.
2. **Category coverage and optional cohort (`Working Cohort` -> `Responsible Reviewer`):** Trace contracts and evaluate all ten categories explicitly (`Not applicable` or `Not assessed` when omitted, never skipped). For direction questions, populate Section 7's 7-part `Direction decision`. Write a **provisional** content verdict.
3. **Two-plane gate (`Responsible Reviewer` <-> `Independent Integrity Auditor`):** The integrity auditor inspects traces, batch queries, and file hashes to emit `CLEAN` or `INTEGRITY VIOLATION` (never content `PASS`). On `CLEAN`, flow returns to the **Responsible Reviewer** to re-check final artifacts and issue the **final** content verdict.

## 3. Runtime closure checklist and hook boundary

Running `node bin/agy-squad.mjs bundle` and `verify` confirms **file integrity (`SHA-256`)** for a coordinator-assembled record; those CLI commands do not query live Antigravity agents, timers, or child OS processes (`L1`, [native-enforcement-ledger.md](plans/native-enforcement-ledger.md)). Every coordinator or operator must execute this 4-check closure checklist before reporting completion:

### Four-check runtime closure gate (active checklist)

1. **`swarm{action: "status"}` (native `/swarm`):** Confirm every non-coordinator member shows `state: "killed"`, `killed: true`.
   - **Monitor retirement rule:** Native `/swarm` instructions leave `monitor` (or any `monitor-*` worker) alive waiting up to 3 minutes on a `*/3` daemon cron after `[done]` (`swarm_monitor` goes dormant only on its next cron tick). Under `Agy-Squad` governed runs, explicitly call `swarm{action: "kill", name: "monitor"}` (or the active monitor's exact roster name from `swarm{action: "status"}`) once `[done]` is posted so no background cron lingers.
2. **`manage_subagents(Action='list')`:** Confirm `0 active subagent(s): []`.
3. **`manage_task(Action='list')`:** Confirm `No background tasks are currently running.` (catches any lingering `schedule` daemon cron or timer).
4. **Child commands ([Stopping agents](stopping-agents.md)):** Confirm any dev servers, builds, or watchers started by agents exited cleanly.

### Why checklist now vs. hook enforcement after Spike `S5`

- **Current hook coverage (`V-02` in [native-enforcement-ledger.md](plans/native-enforcement-ledger.md)):** `~/.gemini/config/hooks.json` registers `PreToolUse` on file and shell tools (`run_command`, `view_file`, `manage_task`, `schedule`, etc.), not on `swarm`, `post_message`, or agent exit events. Workspace-local `.agents/hooks.json` discovery is unverified (`Spike S5`).
- **Planned graduation path (`V-07`, `S5`, `NE-04`):** Antigravity SDK `V-07` exposes `StopHook`, `PostToolCallHook`, and `PreTurnHook`. Once `Spike S5` verifies Desktop IDE hook firing across `.agents/hooks.json` or plugin hooks, this 4-check closure gate can graduate into a deterministic `StopHook` + `PostToolUse` guard that blocks yielding a final turn while any worker, subagent, or daemon cron remains active.
