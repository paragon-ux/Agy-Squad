# Roles, skill workflows, and runtime closure

This page is the single repository reference for Agy-Squad skill composition, MCP/CLI tool boundaries, roles, cross-role handoff flows, and the runtime closure checklist. Other docs and skill files (`.agents/skills/*/SKILL.md`) link here instead of repeating role graphs.

## Skill composition & tool surface map

| Dimension | Choice / Surface | Canonical Scope & Usage |
| --- | --- | --- |
| **Task Spec** (what to inspect) | [`pr-review`](skills/pr-review.md), [`full-review`](skills/full-review.md), [`day-one-review`](skills/day-one-review.md), [`self-diagnosis`](skills/self-diagnosis.md) | Use `pr-review` for branch/PR diffs, `full-review` for non-diff evidence & direction decisions, `day-one-review` for raw, unguided cold first-time-user launch reviews and iterative remediation (no `/swarm` by default; flat category `/swarm` opt-in only), and `self-diagnosis` for Agy-Squad health & optimization. |
| **Execution Modifier** (how teams run) | [`swarm-governance`](skills/swarm-governance.md) | Pair with any Task Spec on `/swarm` or multi-agent teams (opt-in only for `day-one-review`). Governs slot receipts (`<= 500` B), flat `audit-<id>`, `agy-squad` proof bundles, and 4-check closure. |
| **Topology & Step 0 intake** | `Flat` for inline tasks; staged `layered` for manifests | Inline `task` plans default to `flat`, while manifests with `lead` blocks compile staged `layered` waves (Wave 1 specialists -> Wave 2 leads -> Wave 3 auditors) unless `--topology flat` (`topology: "flat"`) is passed. On `/swarm`, `swarm-governance` starts immediately with defaults on read-only and overlap-free runs, calling `ask_question` only when writable `siblingOverlaps` exist on `inherit` or run settings are ambiguous. |
| **`/swarm` planner** | `squad_planner` / `agy-squad plan` | Default planner for `/swarm` (`swarmAdd`, `readOnly: true` overlap exemptions, `verificationPipeline`). Supports `all` manifest squads when `squadId` is omitted (`all_l1` is invalid here). |
| **`invoke_subagent` compiler** | `dispatch_squad` / `agy-squad dispatch` | Explicit `invoke_subagent` stage compiler (`all_l1` leads, `<squadId>` specialists, or `integrity_auditor[:<target>]` slot; legacy `adversarial_*` modes removed). |
| **Verification library** | `mcp/handoffs.mjs` | Library imported by `agy-squad` (`collect`, `bundle-init`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`); standalone CLI removed, so always invoke `agy-squad` (or `node bin/agy-squad.mjs` inside a local checkout). |

## 1. Canonical role inventory

Agy-Squad runs inside Google Antigravity's native `/swarm` runtime without replacing it, structuring roles, file scopes, board receipts, and dual-gate verification on top of the shared board:

![Native Antigravity /swarm vs. Agy-Squad roles and configuration additions](assets/swarm-vs-agy-squad-roles.svg)

| Role | Active in | Verdict or primary output | Authority and boundary |
| --- | --- | --- | --- |
| **Operator / Primary Agent** | All workflows | Compiles plans, delivers structured reviews (in chat, artifacts, or opt-in `docs/reviews/`), runs `finalize`/`bundle`/`prune`, stops agents | Owns user intake, final reporting, and teardown; never fabricates specialist evidence |
| **Coordinator (`/swarm`)** | `swarm-governance` | Writes `.system_generated/swarm/plan.json` (`swarm_pane`), launches waves (`add`), writes `lead/report.md` in flat mode, runs `agy-squad` | Applies Step 0 defaults, stages worker waves, runs top-down resume (`coordinator -> leads -> workers` layered or `coordinator -> workers` flat, re-emitting verbatim `open_board` on launch/resume/request), and kills workers on close; never delegates coordination to `monitor` |
| **Working Lead** | `swarm-governance` (Wave-2 layered), `self-diagnosis` (`all_l1`) | `Content Verdict: PASS \| FAIL \| BLOCKED` (legacy alias `Verdict: ...`) | Spawned in Wave 2 after specialist `READY` receipts arrive; reviews specialist slot reports against cited files/tests and re-checks after integrity `CLEAN`; never audits its own integrity |
| **Specialist** | `swarm-governance`, `self-diagnosis`, `pr-review`, `full-review`, `day-one-review` | Writes `specialist-<N>/report.md` + `<= 500` B receipt (`READY`, `PARTIAL`, `NO_REPORT`) | Inspects assigned `scopeFiles` via executed tools/commands (`Subagent Alignment Policy`), skips Turn-1 `read_board`, and never guesses from memory |
| **Flat Integrity Auditor** | All skills (`/swarm`: `audit-<id>`, slot: `integrity_auditor:<id>`) | `Target Squad: <id>` and `Integrity Verdict: CLEAN \| INTEGRITY VIOLATION` | Independent Wave-3 flat peer auditing tool traces in one batch pass (reading `~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl` and `transcript_full.jsonl` directly standalone, or using `agy-context transcript list`/`query`/`read`/`export` when optional `Agy-Context-Saver` `2.1.2+` is installed, where transcript access defaults to `OPEN` and operators can opt into `[agy-transcript-access: allow\|deny\|self-only]` manually on line 1 or via `agy-context transcript access`), scope isolation, and SHA-256 hashes; fails closed with `INTEGRITY VIOLATION` if execution traces are unavailable and cannot approve content (`PASS`) |
| **Review Lead / Responsible Reviewer** | `pr-review`, `full-review`, `day-one-review` | `APPROVE \| REQUEST_CHANGES`, `PASS \| FAIL \| BLOCKED`, or 4-tier Day-1 Ship Verdict (`SHIP NOW \| SHIP WITH MINOR POLISH \| FIX BEFORE RELEASE \| HOLD BEFORE PUBLIC RELEASE`) (+ Section 7 Direction decision when requested) | Evaluates repository architecture contracts and ADRs (when present), 11 review categories (`ARCH`..`DEP`, `SEC`), and `1 ID = 1 Row` review ledgers; issues provisional verdict before audit and final verdict only after `CLEAN` |
| **Implementer / Author** | `pr-review`, `day-one-review`, `self-diagnosis` remediation | Code, test, or doc changes at a new commit/revision | Fixes recorded findings separately from review acceptance (`day-one-review` auto-fixes P0-P3 and pauses only on Section 8 residuals, defaulting to a single worker for heavy indexers/daemons); resumes only interrupted subagents cleanly on interruption and re-checks fixes |
| **Monitor (`swarm_monitor`)** | Antigravity native `/swarm` | `@coordinator [stall]` or `@<member> [stall]` alerts when all members stop moving | Runs a `*/3` daemon cron (`schedule` with `IsDaemon: true`) and checks `read_board`; never receives task briefs, edits files, or touches verdicts |
| **Swarm Overview (`swarm_pane`)** | Antigravity native `/swarm` | `.system_generated/swarm/plan.json` (`{ goal, tasks, threads }`) | Populates the Swarm UI Overview directly from `planSquadCohort`'s `swarmPane` output without spawning a narrator worker |

## 2. Role workflows by skill

![Skill role workflows and dual-verdict closure flow](assets/skill-role-workflows.svg)

Every multi-agent workflow separates content evaluation from integrity auditing: a provisional content verdict runs before the flat integrity auditor checks execution authenticity, and acceptance requires the lead or reviewer to re-check final artifacts after `Integrity Verdict: CLEAN` (see [Review roles](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/references/review-roles.md)).

Each built-in skill has its own dedicated guide under **Skills**:

| Skill | Kind | Dedicated guide |
| --- | --- | --- |
| `pr-review` | Task Spec | [PR & branch review (Standard v1.5.0)](skills/pr-review.md) |
| `full-review` | Task Spec | [Non-diff audits, evidence triage & direction decisions](skills/full-review.md) |
| `day-one-review` | Task Spec | [Cold first-time-user launch audit & remediation](skills/day-one-review.md) |
| `swarm-governance` | Execution Modifier | [Native `/swarm` orchestration, receipts & SHA-256 bundling](skills/swarm-governance.md) |
| `self-diagnosis` | Task Spec (repo-only maintainer skill, excluded from npm package) | [Agy-Squad harness profiler & optimization cohorts](skills/self-diagnosis.md) |

## 3. Runtime closure checklist and hook boundary

Running `agy-squad finalize`, `agy-squad bundle`, and `agy-squad verify` confirms **file integrity (`SHA-256`)** for a coordinator-assembled record; those CLI commands do not query live Antigravity agents, timers, or child OS processes. Every coordinator or operator must execute this 4-check closure checklist before reporting completion:

### Four-check runtime closure gate (active checklist)

1. **`swarm{action: "status"}` (native `/swarm`):** Confirm every non-coordinator member shows `state: "killed"`, `killed: true`.
   - **Monitor retirement rule:** Native `/swarm` instructions leave `monitor` (or any `monitor-*` worker) alive waiting up to 3 minutes on a `*/3` daemon cron after `[done]` (`swarm_monitor` goes dormant only on its next cron tick). Under `Agy-Squad` governed runs, explicitly call `swarm{action: "kill", name: "monitor"}` (or the active monitor's exact roster name from `swarm{action: "status"}`) once `[done]` is posted so no background cron lingers.
2. **`manage_subagents(Action='list')`:** Confirm `0 active subagent(s): []`.
3. **`manage_task(Action='list')`:** Confirm `No background tasks are currently running.` (catches any lingering `schedule` daemon cron or timer).
4. **Child commands ([Stopping agents](stopping-agents.md)):** Confirm any dev servers, builds, or watchers started by agents exited cleanly.

### Current hook boundary and propagation behavior

- **Zero hooks installed by `Agy-Squad`:** `Agy-Squad` itself installs zero Antigravity hooks. Global `~/.gemini/config/hooks.json` applies only when optional `Agy-Context-Saver` (`v2.1.2+`) is installed (its plugin `hooks.json` is `{}`), limiting its `PreToolUse` matcher to noisy shell runners, large `read_file` bounds (`> 300` lines / `> 24 KiB`), `.system_generated/` access, and polling timers (`manage_task`, `schedule`), so live `swarm`, `post_message`, and agent exit events remain governed by the active closure checklist above.
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
| **Board receipt & path headroom** | **Hard ceiling:** single line, `<= 500` UTF-8 bytes (`messageLimit = 500`); accepts optional leading `@mention` + `[done]` prefixes (`@lead [done] READY <slot> - <obs>`) and spaced ASCII ` - ` or ` -- ` alongside ` — ` (`U+2014`); `reportPath()` reserves `33` bytes (`SWARM_MENTION_RESERVE_BYTES = 33` for `@<24-char-name> [done] `) + `16` B observation headroom (`<= 451` B prefix budget) so `PARTIAL <path> — ` fits | [`mcp/handoffs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/handoffs.mjs) |
| **MCP stdio payload size** | **Hard ceiling:** `10 MiB` (`10 * 1024 * 1024` bytes default, configurable via positive integer `AGY_MAX_STDIO_PAYLOAD_BYTES`) | [`mcp/index.js`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/index.js) |
| **Models & worker types** | `executionMode: "swarm"` pins arbitrary model IDs (optionally validated against `knownModels`); `executionMode: "subagent"` only accepts `inherit`, `flash_lite`, `flash`, `pro`; built-ins `research`, `browser`, `image-generator` are rejected; manifest agent `workspace` must be `inherit` | [`mcp/briefs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/briefs.mjs), [`mcp/planner.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/planner.mjs) |
| **Workspace isolation** | `share` and `branch` require `executionMode: "swarm"` (`subagent` allows `inherit` only); concurrent editors must avoid `inherit` overlaps or split `scopeFiles` | [`mcp/planner.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/mcp/planner.mjs) |
| **Shared board broadcast & UI scaling** | **Host / practical limit:** Antigravity attaches one append-only board (`board: "local"`) per conversation and disables `channel` partitioning when `swarm` omits `action: "channel"`. Every board post is ingested by all active workers (quadratic token growth), and Antigravity's built-in `/swarm` guidance suggests splitting areas above ~8 workers; start a fresh conversation per major wave to keep boards responsive | [Concepts: shared swarm board](concepts.md#shared-swarm-board-and-channel-limits) |
| **Model quota & rate limits** | **Host limit:** Running many workers pinned to one model shares host quota; check `swarm{action: "models"}` upfront and switch `waiting` workers with `swarm{action: "model"}` on quota exhaustion | [Tools contract](tools.md) |
