# Roles, skill workflows, and runtime closure

This page is the single repository reference for Agy-Squad skill composition, MCP/CLI tool boundaries, roles, cross-role handoff flows, and the runtime closure checklist. Other docs and skill files (`.agents/skills/*/SKILL.md`) link here instead of repeating role graphs.

## Skill composition & tool surface map

| Dimension | Choice / Surface | Canonical Scope & Usage |
| --- | --- | --- |
| **Task Spec** (what to inspect) | `pr-review`, `full-review`, `day-one-review`, `self-diagnosis` | Use `pr-review` for branch/PR diffs, `full-review` for non-diff evidence & direction decisions, `day-one-review` for raw, unguided cold first-time-user launch reviews and iterative remediation (no `/swarm` by default; flat category `/swarm` opt-in only), and `self-diagnosis` for Agy-Squad health & optimization. |
| **Execution Modifier** (how teams run) | `swarm-governance` | Pair with any Task Spec on `/swarm` or multi-agent teams (opt-in only for `day-one-review`). Governs slot receipts (`<= 500` B), flat `audit-<id>`, `agy-squad` proof bundles, and 4-check closure. |
| **Topology rule (no default bias)** | `Flat` vs `Layered` vs single-agent | Neither topology is forced by default; ask the user once if unspecified. `squad_planner` reports neutral tradeoffs via `topology.defaultBias: "none (ask user if unspecified)"`. |
| **`/swarm` planner** | `squad_planner` / `agy-squad plan` | Default planner for `/swarm` (`swarmAdd`, `readOnly: true` overlap exemptions, `provenanceScaffold`). Supports `all` manifest squads when `squadId` is omitted (`all_l1` is invalid here). |
| **`invoke_subagent` compiler** | `dispatch_squad` / `agy-squad dispatch` | Explicit `invoke_subagent` stage compiler (`all_l1` leads, `<squadId>` specialists, or `integrity_auditor[:<target>]` slot; legacy `adversarial_*` modes removed). |
| **Verification library** | `mcp/handoffs.mjs` | Library imported by `agy-squad` (`collect`, `bundle-init`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`); standalone CLI removed, so always invoke `agy-squad` (or `node bin/agy-squad.mjs` inside a local checkout). |

## 1. Canonical role inventory

Agy-Squad runs inside Google Antigravity's native `/swarm` runtime without replacing it, structuring roles, file scopes, board receipts, and dual-gate verification on top of the shared board:

![Native Antigravity /swarm vs. Agy-Squad roles and configuration additions](assets/swarm-vs-agy-squad-roles.svg)

| Role | Active in | Verdict or primary output | Authority and boundary |
| --- | --- | --- | --- |
| **Operator / Primary Agent** | All workflows | Compiles plans, delivers structured reviews (in chat, artifacts, or opt-in `docs/reviews/`), runs `finalize`/`bundle`/`--teardown`, stops agents | Owns user intake, final reporting, and teardown; never fabricates specialist evidence |
| **Coordinator (`/swarm`)** | `swarm-governance` | Briefs workers on the shared board (`post_message`), writes `lead/report.md` in flat mode, runs `agy-squad` | Owns single-squad orchestration and worker `kill` cleanup; never delegates coordination to `monitor` or `narrator` |
| **Working Lead** | `swarm-governance` (layered), `self-diagnosis` (`all_l1`) | `Content Verdict: PASS \| FAIL \| BLOCKED` (legacy alias `Verdict: ...`) | Reviews specialist slot reports against cited files/tests and re-checks after integrity `CLEAN`; never audits its own integrity |
| **Specialist** | `swarm-governance`, `self-diagnosis`, `pr-review`, `full-review`, `day-one-review` | Writes `specialist-<N>/report.md` + `<= 500` B receipt (`READY`, `PARTIAL`, `NO_REPORT`) | Inspects assigned `scopeFiles` via executed tools/commands (`Subagent Alignment Policy`); never guesses from memory |
| **Flat Integrity Auditor** | All skills (`/swarm`: `audit-<id>`, slot: `integrity_auditor:<id>`) | `Target Squad: <id>` and `Integrity Verdict: CLEAN \| INTEGRITY VIOLATION` | Independent flat peer auditing tool traces (`agy-context transcript list --parent <id> --lineage`, `query --id <id> --summary`, or `read --id <id> --last-turns 10` with `[agy-transcript-access: allow]`, or coordinator `export --parent <id> --sanitized --out scratch/...` index), scope isolation, and SHA-256 hashes; fails closed with `INTEGRITY VIOLATION` if execution traces are unavailable and cannot approve content (`PASS`) |
| **Review Lead / Responsible Reviewer** | `pr-review`, `full-review`, `day-one-review` | `APPROVE \| REQUEST_CHANGES`, `PASS \| FAIL \| BLOCKED`, or Day-1 Ship Verdict (+ Section 7 Direction decision when requested) | Evaluates repository architecture contracts and ADRs (when present), 11 review categories (`ARCH`–`DEP`, `SEC`), and `1 ID = 1 Row` review ledgers; issues provisional verdict before audit and final verdict only after `CLEAN` |
| **Implementer / Author** | `pr-review`, `day-one-review`, `self-diagnosis` remediation | Code, test, or doc changes at a new commit/revision | Fixes recorded findings separately from review acceptance (`Implementation status updates are separate from the review`); resumes only interrupted subagents cleanly on interruption and re-checks fixes |
| **Monitor (`swarm_monitor`)** | Antigravity native `/swarm` | `@coordinator [stall]` or `@<member> [stall]` alerts when all members stop moving | Runs a `*/3` daemon cron (`schedule` with `IsDaemon: true`) and checks `read_board`; never receives task briefs, edits files, or touches verdicts |
| **Narrator** | Antigravity native `/swarm` | Maintains the user-facing Swarm UI overview | Summarizes board progress for the Swarm UI; never edits files, briefs workers, or touches verdicts |

## 2. Role workflows by skill

![Skill role workflows and dual-verdict closure flow](assets/skill-role-workflows.svg)

Every multi-agent workflow separates content evaluation from integrity auditing: a provisional content verdict runs before the flat integrity auditor checks execution authenticity, and acceptance requires the lead or reviewer to re-check final artifacts after `Integrity Verdict: CLEAN` (see [Review roles](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/references/review-roles.md)).

### `swarm-governance`

Source specification: [`.agents/skills/swarm-governance/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/swarm-governance/SKILL.md).

1. **Plan and pin (`Coordinator`):** Call `squad_planner` (or `agy-squad plan --manifest <path> --model <id> --known-model <id>`) to generate `swarmAdd` payloads, check writable `scopeFiles` overlaps, and build a transcript-safe `provenanceScaffold` + `bundleRecordTemplates`.
2. **Spawn, surface Swarm UI, and park (`Coordinator` -> `Specialists` + optional `monitor` / `narrator`):** Launch workers via `swarm{action: "add"}` (`inherit`, `share`, or `branch`), verify active model IDs via `swarm{action: "status"}`, and defer `open_board` to `native_swarm` (emit verbatim `open_board` on the launch turn when yielding before `swarm_wait` arrives, or when the user asks what the swarm is doing; never repeat `open_board` on Reactive Wakeups or craft links yourself; call `swarm_wait` on quiet follow-up turns).
3. **Slot report and pointer (`Specialists` -> `Working Lead` / `Coordinator`):** Each specialist writes its evidence to `scratch/agy-squad/squad-<id>/specialist-<N>/report.md` and posts one single-line `<= 500` UTF-8 byte pointer (`@lead READY ...`) on the board.
4. **Content gate and flat integrity audit (`Working Lead` <-> `Flat Integrity Auditor`):** The lead (or coordinator in flat single-squad mode) verifies cited files and tests, records `Content Verdict: PASS | FAIL | BLOCKED` in `lead/report.md`, and spawns a flat `audit-<id>` worker (writing to `scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md` for single-squad cohorts, or `scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md` for multi-squad manifests). `audit-<id>` emits `Target Squad: <id>` and `Integrity Verdict: CLEAN | INTEGRITY VIOLATION`. Any `INTEGRITY VIOLATION` blocks acceptance until fixed and re-audited.
5. **Bundle, verify, prune, and close (`Coordinator`):** Run `agy-squad collect` (when isolated), `verdict`, `bundle-init --digest` (or `fingerprint`, `inspect`, `digest`), `verdict --integrity`, and `agy-squad finalize <record.json> [--prune]` (or granular `bundle`, `verify`, `prune`). Whenever queued worker work finishes (both before pausing with `waiting` workers awaiting user direction and before final close), post `[done] <summary>` (no `@`) so `monitor` retires its `*/3` cron instead of ticking `[stall]`, and on close immediately run the 4-check closure checklist (`swarm{action: "kill"}` on all workers plus `monitor` / `monitor-*`, skipping extra cron ticks). Because Antigravity keeps one append-only board per conversation and does not expose user-configurable channels when `swarm` lacks `action: "channel"`, start a new conversation for the next major wave if you want a fresh Swarm UI board ([Shared swarm board and channel limits](concepts.md#shared-swarm-board-and-channel-limits)).

### `self-diagnosis`

Source specification: [`.agents/skills/self-diagnosis/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md) and [`self-diagnosis-manifest.json`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json) (maintainer-only; run inside an `Agy-Squad` source checkout).

1. **Pre-flight intake and profiler (`Operator`):** Ask neutrally (`Flat` vs `Layered` vs single squad vs local dry-run; no default topology bias) alongside teardown mode (`--keep-reports` vs `--teardown`) and integrity audit rigor (`audit-<id>` / `integrity_auditor`), then run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` (zero-subagent profiler).
2. **Plan or compile diagnostic cohort:** Primary `/swarm` runs compile via `squad_planner` (`diagnose.mjs --print-plan`); explicit `invoke_subagent` runs compile via `dispatch_squad` (`diagnose.mjs --print-dispatch <all_l1|all_specialists|squadId>`):
   - `Skill & PR-Review Standard Lead` (`skill_and_pr_review_audit`) -> 2 `readOnly: true` specialists (`SKILL`, `DOC`, `ARCH`, `SCRIPT`).
   - `Runtime & Contract Diagnostics Lead` (`runtime_and_contract_diagnosis`) -> 2 `readOnly: true` specialists (`MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`).
   - `Token & Execution Optimization Lead` (`token_and_execution_optimization`) -> 2 `readOnly: true` specialists (`RUN`, `SKILL`, `SVC`, `ARCH`).
3. **Report, patrol, and bundle (`Specialists` -> `Working Leads / Coordinator` -> `Operator`):** Specialists write `specialist-<N>/report.md` and send `<= 500` B `READY` messages (`post_message` / `send_message`). Leads/coordinator verify leaf traces against source files and `npm test`, write `lead/report.md` (`Content Verdict: PASS`), and pair with flat `audit-<id>` / `integrity_auditor:<id>` (`Integrity Verdict: CLEAN`).
4. **Ledger, teardown, remediation, and re-verification (`Operator` -> `Same Cohort`):** The operator bundles (`agy-squad finalize` or `agy-squad bundle`), transcribes every `P0` through `P3` item `1-to-1` into `docs/reviews/<slug>.md` (Sections 1, 8, and 9), runs `diagnose.mjs --teardown all --ledger docs/reviews/<slug>.md`, keeps spawned workers/subagents `idle` if fixing code, messages the **same** specialists to re-verify fixes, flips ledger rows to `Closed`, kills workers/leads (`swarm{action: "kill"}` / `manage_subagents`), and runs the 4-check runtime closure gate.

### `pr-review`

Source specification: [`.agents/skills/pr-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md) (`Standard v1.5.0`).

1. **Intake and provenance (`Operator / Review Lead`):** Ask neutrally when topology (`Flat` vs `Layered` vs single-agent) is unspecified via `ask_question`, and pin PR/branch base and head SHAs, CI SHAs, and the append-only `Session Provenance` table in the structured v1.5.0 report (delivered in chat, an Antigravity artifact, or `docs/reviews/<slug>.md` when requested or already adopted in the repository).
2. **Architecture trace and category review (`Review Lead` + optional `Category Specialists`):** Trace `design thesis -> architecture decision -> public contract -> code -> verification` across all eleven mandatory categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`, `SEC`), recording `1 ID = 1 Row` findings (`P0` through `P2` 10-field blocks; `P3` table; Section 8 mandatory residual/deferred sink).
3. **Independent audit before final approval (`Review Lead` <-> `Integrity Auditor`):** Run an independent integrity auditor when a cohort ran or integrity verification is selected. Only after `Integrity Verdict: CLEAN` does the review lead finalize `Approve` or `Request Changes`.
4. **Remediation loop (`Implementer / Author` -> `Review Lead`):** Implementation changes happen separately from the review; the review lead (or same review cohort) re-verifies the delta at the new SHA before moving rows from `Open (Pre-Remediation)` to `Closed`.

### `full-review`

Source specification: [`.agents/skills/full-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/SKILL.md) and [`review-roles.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/references/review-roles.md).

1. **Frame and evidence intake (`Responsible Reviewer`):** Pin a one-sentence decision/review question, `Session Provenance`, and an `Evidence manifest` (`EID | Artifact | Locator | SHA-256 / size | Class | Access | Examined`), ingesting logs and transcripts in targeted batch windows.
2. **Category coverage and optional cohort (`Working Cohort` -> `Responsible Reviewer`):** Trace contracts and evaluate all eleven categories (`ARCH`–`DEP`, `SEC`) explicitly (`Not applicable` or `Not assessed` when omitted, never skipped). For direction questions, populate Section 7's 7-part `Direction decision`. Write a **provisional** content verdict.
3. **Two-plane gate (`Responsible Reviewer` <-> `Independent Integrity Auditor`):** The integrity auditor inspects traces, batch queries, and file hashes to emit `CLEAN` or `INTEGRITY VIOLATION` (never content `PASS`). On `CLEAN`, flow returns to the **Responsible Reviewer** to re-check final artifacts and issue the **final** content verdict.

### `day-one-review`

Source specification: [`.agents/skills/day-one-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/day-one-review/SKILL.md) and [`day-one-protocol.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/day-one-review/references/day-one-protocol.md) (`Standard v1.5.0`).

1. **Designated `scratch/` workspace (no `/swarm` by default):** Start under `scratch/day-one-review/` (or a user-designated path) using direct `invoke_subagent` or single-agent execution to prevent `/swarm` overhead and digression. Confirm the audit directory is excluded from commits and release packages unless the user asks for `docs/reviews/`.
2. **Raw, unguided initial review (`r1`):** Inspect the requested repository cold from the outside in (First 60s -> Install/Upgrade/Rollback -> External-Repo Usage -> `4.11 SEC` Security & Trust -> Packaging/Release) without reading prior review ledgers, planning docs, or maintainer hints. Write `scratch/day-one-review/day-one-review-r1.md` across all eleven Standard `v1.5.0` categories (`ARCH`–`DEP`, `SEC`), the Cold Day-1 User-Journey Trace Matrix, and a Ship Verdict (`SHIP NOW` | `SHIP WITH QUICK FIXES` | `HOLD BEFORE PUBLIC RELEASE`).
3. **Scoped remediation & interruption-safe selective resume:** Checkpoint clean git state, confirm remediation scope, and assign recorded atomic finding IDs to coding subagents. If interrupted, inspect `manage_subagents(Action='list')` and resume **only** the interrupted subagent(s) without interrupting active workers or launching duplicate replacements (running a read-only git + transcript recovery audit first only if a worker permanently died mid-edit).
4. **Cumulative follow-ups & explicit `/swarm` opt-in:** Follow-up reviews (`day-one-review-r2.md`, `r3`, ...) explicitly build on `r1` in the same audit directory (carrying forward every prior ID, re-verifying fixes, and surfacing Section 8 residuals; optional unanchored `day-one-review-raw-final.md` before final release). Only when the user **explicitly requests `/swarm`**, compile a flat category-specialist `/swarm` via `squad_planner` tailored to the target repository plus one flat `audit-<id>` Integrity Auditor (`swarm-governance`).

## 3. Runtime closure checklist and hook boundary

Running `agy-squad finalize`, `agy-squad bundle`, and `agy-squad verify` confirms **file integrity (`SHA-256`)** for a coordinator-assembled record; those CLI commands do not query live Antigravity agents, timers, or child OS processes. Every coordinator or operator must execute this 4-check closure checklist before reporting completion:

### Four-check runtime closure gate (active checklist)

1. **`swarm{action: "status"}` (native `/swarm`):** Confirm every non-coordinator member shows `state: "killed"`, `killed: true`.
   - **Monitor retirement rule:** Native `/swarm` instructions leave `monitor` (or any `monitor-*` worker) alive waiting up to 3 minutes on a `*/3` daemon cron after `[done]` (`swarm_monitor` goes dormant only on its next cron tick). Under `Agy-Squad` governed runs, explicitly call `swarm{action: "kill", name: "monitor"}` (or the active monitor's exact roster name from `swarm{action: "status"}`) once `[done]` is posted so no background cron lingers.
2. **`manage_subagents(Action='list')`:** Confirm `0 active subagent(s): []`.
3. **`manage_task(Action='list')`:** Confirm `No background tasks are currently running.` (catches any lingering `schedule` daemon cron or timer).
4. **Child commands ([Stopping agents](stopping-agents.md)):** Confirm any dev servers, builds, or watchers started by agents exited cleanly.

### Current hook boundary and propagation behavior

- **Current live hook coverage:** Global `~/.gemini/config/hooks.json` currently limits its `PreToolUse` matcher to file, shell, and task tools (`run_command`, `view_file`, `read_file`, `manage_task`, `schedule`, etc.), so live `swarm`, `post_message`, and agent exit events remain governed by the active closure checklist above.
- **CLI hook propagation findings (`agy 1.5.9` CLI, 2026-11-16):** Controlled probes on `agy 1.5.9` CLI (`"matcher": "*"`) confirmed that workspace `.agents/hooks.json` and global `~/.gemini/config/hooks.json` propagate `SessionStart`, `PreInvocation`, `PreToolUse`, `PostToolUse`, and `Stop` to both `invoke_subagent` children and `/swarm` workers (with `PreToolUse` `deny` blocking `invoke_subagent` and worker `post_message`), whereas plugin `hooks.json` does **not** fire inside `/swarm` workers. Reusable `Agy-Squad` `.agents/hooks.json` enforcement gates and Desktop IDE verification remain pending before removing the advisory closure checklist.

## 4. Scaling swarms, custom role configurations, and limits

You can request larger swarms or arbitrary custom role layouts in any session; **Agy-Squad imposes no hardcoded cap on squad count or workers per squad** (`mcp/planner.mjs`, `mcp/dispatch.mjs`). Choose the configuration surface that matches how differentiated each worker needs to be:

### Ways to configure larger swarms and custom roles

1. **Quick custom roles on an ad-hoc task (`task` + `roles`):** Pass an arbitrary non-empty `roles` list (`--role "<title>"` repeatable on CLI, or `roles: [...]` in `squad_planner`), such as `["Security Reviewer", "Performance Auditor", "Test Verifier", "Docs Checker"]`, with optional `readOnly: true` (`--read-only`) and per-role `roleScopes` (`--role-scope <role=path>`, repeatable). `deriveTaskSquads` (`mcp/planner.mjs`) compiles one `specialist-<N>` per role under `task_squad`, falling back to `scopeFiles` (`["."]` by default) for roles without `roleScopes` and pairing with `audit-task_squad`. Use this for flat cohorts where custom per-worker objectives or per-worker models are unnecessary.
2. **Custom manifests (`manifest` inline object or `manifestPath` file):** Define any number of named squads under `squads.<id>`, each with a custom `specialists` array (`role`, tailored `objective`, dedicated `scopeFiles`, optional `instructions`, optional `expectedDeliverable`, optional `readOnly: true`, optional `model`, and `typeName: "self"` or a custom writable subagent) plus an optional `lead` (or inline lead fields). Omit `squadId` in `squad_planner` to launch all squads in one `/swarm` wave, override structure with `topology: "flat"` (strips leads) or `"layered"` (requires leads), or customize `integrity_auditor` with multiple audit specialists (`mcp/dispatch.mjs`).
   - Note: `roles`, `scopeFiles`, `readOnly`, and `roleScopes` cannot be passed alongside `manifest` or `manifestPath`; place per-role overrides inside the manifest itself.
3. **Multi-wave scaling on an active board (`occupiedWorkerNames`) & native sharding:** When adding a second squad or helper cohort to a running `/swarm` board, pass existing roster names via `occupiedWorkerNames` (`--occupied-worker`) so `allocateWorkerName` avoids name collisions. Native `/swarm` also supports `tasks` (sharded `<name>-1..-<len(tasks)>`), `n` (homogeneous copies), `fork: "<member>"`, and `monitor` (`swarm_monitor`), though every governed worker bundled with `agy-squad` still needs an explicit `specialist-<N>/report.md` slot.

### Hard code limits vs. host & practical limits

| Boundary | Exact limit or rule | Governing source |
| --- | --- | --- |
| **Squads & workers per cohort** | **Hard minimum:** `>= 1` working squad and `>= 1` specialist per squad; **no hardcoded maximum count** | [`mcp/dispatch.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/dispatch.mjs), [`mcp/planner.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/planner.mjs) |
| **Swarm member name length** | **Hard ceiling:** `24` characters (`MAX_SWARM_NAME_LENGTH = 24`); lowercased `[a-z0-9-]+` slugs deduplicated via `-2`, `-3`, ... suffixes | [`mcp/planner.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/planner.mjs) |
| **Squad ID & directory name** | Must match `/^[A-Za-z0-9_.-]*[A-Za-z0-9_-]$/` (no trailing `.`, excluding `.`, `..`, `__proto__`, `constructor`, `prototype`, `all_l1`, `adversarial_*`, `integrity_auditor*`); `squad-<encodeURIComponent(id)>` must be `<= 255` UTF-8 bytes | [`mcp/verdicts.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/verdicts.mjs), [`mcp/handoffs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/handoffs.mjs) |
| **Board receipt & path headroom** | **Hard ceiling:** single line, `<= 500` UTF-8 bytes (`messageLimit = 500`); `reportPath()` also reserves `26` bytes (`SWARM_MENTION_RESERVE_BYTES = 26` for `@<24-char-name> `) so `PARTIAL <path> — ` fits | [`mcp/handoffs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/handoffs.mjs) |
| **MCP stdio payload size** | **Hard ceiling:** `10 MiB` (`10 * 1024 * 1024` bytes default, configurable via positive integer `AGY_MAX_STDIO_PAYLOAD_BYTES`) | [`mcp/index.js`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/index.js) |
| **Models & worker types** | `executionMode: "swarm"` pins arbitrary model IDs (optionally validated against `knownModels`); `executionMode: "subagent"` only accepts `inherit`, `flash_lite`, `flash`, `pro`; built-ins `research`, `browser`, `image-generator` are rejected; manifest agent `workspace` must be `inherit` | [`mcp/briefs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/briefs.mjs), [`mcp/planner.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/planner.mjs) |
| **Workspace isolation** | `share` and `branch` require `executionMode: "swarm"` (`subagent` allows `inherit` only); concurrent editors must avoid `inherit` overlaps or split `scopeFiles` | [`mcp/planner.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/planner.mjs) |
| **Shared board broadcast & UI scaling** | **Host / practical limit:** Antigravity attaches one append-only board (`board: "local"`) per conversation and disables `channel` partitioning when `swarm` omits `action: "channel"`. Every board post is ingested by all active workers (quadratic token growth), and Antigravity's built-in `/swarm` guidance suggests splitting areas above ~8 workers; start a fresh conversation per major wave to keep boards responsive | [Concepts: shared swarm board](concepts.md#shared-swarm-board-and-channel-limits) |
| **Model quota & rate limits** | **Host limit:** Running many workers pinned to one model shares host quota; check `swarm{action: "models"}` upfront and switch `waiting` workers with `swarm{action: "model"}` on quota exhaustion | [Tools contract](tools.md) |
