# Antigravity Ecosystem Integration & Modifier Composition

Companion reference for [`.agents/skills/swarm-governance/SKILL.md`](../SKILL.md). Documents how `Agy-Squad` composes with Antigravity native orchestration primitives, built-in workflow modes, slash modifiers, and installed utility skills.

---

## 1. `native_swarm`, Monitors, Narrators & Channel Capabilities

- **Conditional `swarm_monitor` and `swarm_narrator`:** Enable or address `swarm_monitor` (`monitor`) and `swarm_narrator` (`narrator`) **only when they appear in the active session's skill list**. Never reply to `monitor` `[stall]` posts; post `[done] <summary>` (no `@`) **before** reporting to the user whenever queued worker work finishes (even if keeping working specialists `waiting` pending user input) so `monitor`'s `*/3` cron cancels cleanly, and immediately call `swarm{action: "kill", name: "monitor"}` (or the active `monitor-*` roster name) when shutting down so zero extra cron ticks fire. Wake a paused monitor via `@monitor resume` only when actively needed.
- **Narrator addressing & `swarm_view/` Safe Harbor:** Send user-facing progress updates to `@narrator user feedback: ...` **without `@` prefixes on worker member names** inside the message body so Antigravity does not spuriously wake idle workers. Narrator state files under `swarm_view/` (such as `view.json`) fall under `Agy-Context-Saver` Safe Harbor (`read_file` allowed without slice bounds) and should avoid em dashes in human prose (see Section 5 if `antislop` is installed).
- **`channel` partitioning vs. stripped hosts:** Use `channel` routing only when the active host `swarm` tool schema explicitly declares a `channel` field; omit `channel` parameters when the host exposes only `status`, `models`, `add`, `model`, `kill`, and `title` on a single shared local board.
- **Worker helper spawning & slot mapping:** Workers compiled by `squad_planner` (`specialist-<N>`, `<squad>-lead`, or 24-char truncated `workerName` slugs) execute their assigned scope directly and **do not** spawn nested subagents or extra `/swarm` workers on their own unless a plan explicitly allocates lead delegation (`dispatch_squad` in `subagent` mode). Map every `fork` / `tasks` / `n` launch slot cleanly in `provenanceScaffold` to a pre-declared manifest `specialist-<N>/report.md` slot (`bundleReports` rejects undeclared `tasks`/`n` shards outside the manifest).
- **Flat vs. Layered wakeup routing:** Workers post final receipts to `@coordinator` in **Flat** mode and `@<leadWorkerName>` (compiled 24-char lead `workerName` from `handoffInstructionLine`, e.g., `@skill-and-pr-review-audi`) in **Layered** mode (`mcp/handoffs.mjs` accepts leading `@mention` tokens ahead of `READY`, `PARTIAL`, or `NO_REPORT`).

---

## 2. `/teamwork` Mutual Exclusion

- **Never stack `/teamwork` with `Agy-Squad`:** Do **not** invoke `squad_planner`, `/swarm` + `swarm-governance`, or `audit-<id>` inside an Antigravity `/teamwork` session, and do **not** launch `/teamwork` inside an `Agy-Squad` `/swarm` cohort. `/teamwork` maintains its own `.agents/teamwork/` state directory and `Victory Auditor`; mixing the two orchestrators duplicates coordination layers and breaks report-slot ownership.

---

## 3. `run_workflow` & Bundled Workflow Composition

- **Hidden main agents, `finish` schemas, and fail-fast `parallel()`:** `run_workflow` steps execute inside hidden workflow-managed agent contexts, collect structured outputs through `finish` JSON `schema` contracts, and abort sibling branches when fail-fast `parallel()` errors occur.
- **Model aliases, bundled Python & `ToolError.denied`:** Workflow subagent calls share `invoke_subagent`'s alias constraints (`inherit`, `flash_lite`, `flash`, `pro`), may invoke Antigravity's bundled Python environment where configured, and surface hook/policy blocks as `ToolError.denied`.
- **Transcript-isolated trace inspection:** Inspect workflow or child runs exclusively via `agy-context transcript` (`list --parent <id> --lineage`, `query --id <id> --summary`, `read`, `step`, or coordinator `export --parent <id> --sanitized --out scratch/...`). Never read `.system_generated/` raw files (`transcript.jsonl` / `transcript_full.jsonl`) directly.

---

## 4. Slash Modifiers (`/plan`, `/grill-me`, `/goal`, `/boost`)

- **`/plan` and `/grill-me`:** Front-load scope clarification before code edits, but when pairing with `/swarm`, keep `swarm-governance` Step 0 intake neutral (ask once if topology, `workspaceIsolation`, retention, or model remain unspecified).
- **`/goal` (`continuation_active` & inherited fork cancellation):** `/goal` loops preserve `continuation_active` across turns and may cancel inherited forks when objectives shift. Keep `swarm-governance` [Step 0](../SKILL.md#step-0-pre-flight-intake-ask-when-unspecified) and [Invariants 2, 4, and 5](../SKILL.md#invariants) (flat `audit-<id>`, immediate `kill`, 4-check Runtime Closure Checklist, and fresh conversation between major waves) active regardless of `/goal` state.
- **`/boost`:** Use `/boost` for multi-pass improvement or gap discovery; record concrete gaps as discrete ledger/review IDs (`1 ID = 1 Row`) rather than skipping verification gates.

---

## 5. Optional Companion & Third-Party Skill Compatibility (Only When Installed)

The interoperability guidance below applies **only** if the corresponding optional companion or third-party skill is installed in your Antigravity environment:

- **If `context-governance` (`Agy-Context-Saver >= 2.0.1`, `2.0.4+` recommended, + `RTK >= 1.1.0`) is installed:** Follow its 3-tier workspace inspection policy (`rtk grep`/`rtk find`/`rtk ls` for discovery, bounded `<= 150`-line `read_file` slices for editable workspace files, unchained `rtk read` strictly for step spillovers and completed task logs, `agy-context transcript` for session traces, and zero `schedule` polling alongside `swarm_wait` or `invoke_subagent`). Installed `Agy-Squad` skills link to canonical hosted Zensical documentation URLs and skill-local `./references/` files so links work at any mount depth and under Windows copy-fallback.
- **If `antislop` is installed (R-02 Carve-Out, R-23 Visual Gate & Delivery Gate):**
  - **R-02 machine-protocol carve-out:** `mcp/handoffs.mjs` requires the literal UTF-8 em-dash separator (` — `, `U+2014`) in single-line Pointer-Over-Wire receipts (`READY <path> — <observation>`, `PARTIAL <path> — <observation and blocker>`, `NO_REPORT — <reason>`). Keep that exact ` — ` delimiter in machine receipts, while avoiding em dashes in human prose, documentation, review ledgers, and `swarm_narrator` `view.json`.
  - **Mode resolution, R-23 & Delivery Gate:** Resolve `antislop` mode upfront when editing UI/docs/copy; per `R-23`, never fabricate new SVGs, logos (`assets/logo.svg`), or visual branding without explicit design confirmation; satisfy the non-delegable Delivery Gate by personally verifying cited files and commands before declaring completion.
- **If `permissioned-github` is installed:** Pass `-R <OWNER>/<REPO>` explicitly on `gh` commands, never pipe or redirect `gh` output, never run blocking CI watch loops (`gh pr checks --watch`, `gh run watch`) inside `run_command` (use one-shot `gh pr checks` or `gh run list` snapshots instead), use HTTPS-only `git` remotes, call `ask_custom_permission` reactively only after an action fails with missing permission, and use `git.read` / `workflow.read` / `dispatch` tools within approved scopes.
