# Antigravity Ecosystem Integration & Modifier Composition

Companion reference for [`.agents/skills/swarm-governance/SKILL.md`](../SKILL.md). Documents how `Agy-Squad` composes with Antigravity native orchestration primitives, built-in workflow modes, slash modifiers, and installed utility skills.

---

## 1. `native_swarm`, Monitors, Narrators & Channel Capabilities

- **Conditional `swarm_monitor` and `swarm_narrator`:** Enable or address `swarm_monitor` (`monitor`) and `swarm_narrator` (`narrator`) **only when they appear in the active session's skill list**. If `monitor` was spawned, kill its exact status name (`swarm{action: "kill", name: "monitor"}`) after posting `[done] <summary>`, and wake a paused monitor via `@monitor resume` only when actively needed.
- **Narrator addressing & `swarm_view/` Safe Harbor:** Send user-facing progress updates to `@narrator user feedback: ...` **without `@` prefixes on worker member names** inside the message body so Antigravity does not spuriously wake idle workers. Narrator state files under `swarm_view/` (such as `view.json`) fall under `Agy-Context-Saver` Safe Harbor (`read_file` allowed without slice bounds) and must follow `antislop` R-02 (avoid em dashes in prose).
- **`channel` partitioning vs. stripped hosts:** Use `channel` routing only when the active host `swarm` tool schema explicitly declares a `channel` field; omit `channel` parameters when the host exposes only `status`, `models`, `add`, `model`, `kill`, and `title` on a single shared local board.
- **Worker helper spawning & slot mapping:** Workers compiled by `squad_planner` (`specialist-<N>`, `<squad>-lead`, `audit-<id>`) execute their assigned scope directly and **do not** spawn nested subagents or extra `/swarm` workers on their own unless a plan explicitly allocates lead delegation (`dispatch_squad` in `subagent` mode). Map every `fork` / `tasks` / `n` launch slot cleanly in `provenanceScaffold` to its compiled `reportSlot`.
- **Flat vs. Layered wakeup routing:** Workers post final receipts to `@coordinator` in **Flat** mode and `@<squad>-lead` in **Layered** mode (`mcp/handoffs.mjs` accepts leading `@mention` tokens ahead of `READY`, `PARTIAL`, or `NO_REPORT`).

---

## 2. `/teamwork` Mutual Exclusion

- **Never stack `/teamwork` with `Agy-Squad`:** Do **not** invoke `squad_planner`, `/swarm` + `swarm-governance`, or `audit-<id>` inside an Antigravity `/teamwork` session, and do **not** launch `/teamwork` inside an `Agy-Squad` `/swarm` cohort. `/teamwork` maintains its own `.agents/teamwork/` state directory and `Victory Auditor`; mixing the two orchestrators duplicates coordination layers and breaks report-slot ownership.

---

## 3. `run_workflow` & Bundled Workflow Composition

- **Hidden main agents, `finish` schemas, and fail-fast `parallel()`:** `run_workflow` steps execute inside hidden workflow-managed agent contexts, collect structured outputs through `finish` JSON `schema` contracts, and abort sibling branches when fail-fast `parallel()` errors occur.
- **Model aliases, bundled Python & `ToolError.denied`:** Workflow subagent calls share `invoke_subagent`'s alias constraints (`inherit`, `flash_lite`, `flash`, `pro`), may invoke Antigravity's bundled Python environment where configured, and surface hook/policy blocks as `ToolError.denied`.
- **Trace inspection under `L6`:** Inspect workflow or child runs exclusively via `agy-context transcript` (`list --parent <id> --lineage`, `query --id <id> --summary`, `read`, `step`, or coordinator `export --parent <id> --sanitized --out scratch/...`). Never read `.system_generated/` raw files (`transcript.jsonl` / `transcript_full.jsonl`) directly.

---

## 4. Slash Modifiers (`/plan`, `/grill-me`, `/goal`, `/boost`)

- **`/plan` and `/grill-me`:** Front-load scope clarification before code edits, but when pairing with `/swarm`, keep `swarm-governance` Step 0 intake neutral (ask once if topology, `workspaceIsolation`, retention, or model remain unspecified).
- **`/goal` (`continuation_active` & inherited fork cancellation):** `/goal` loops preserve `continuation_active` across turns and may cancel inherited forks when objectives shift. Regardless of active `/goal` state, the coordinator **must not** skip:
  1. Step 0 neutral intake (when unspecified),
  2. Independent flat `audit-<id>` integrity verification (unless `--allow-unaudited` was explicitly chosen),
  3. Immediate `swarm{action: "kill"}` execution whenever the user explicitly asks to kill or stop workers,
  4. The 4-check Runtime Closure Checklist (`swarm status` including `monitor`, `manage_subagents`, `manage_task`, child processes), and
  5. Starting a **fresh conversation** (never reusing a clogged board) between major swarm waves.
- **`/boost`:** Use `/boost` for multi-pass improvement or gap discovery; record concrete gaps as discrete ledger/review IDs (`1 ID = 1 Row`) rather than skipping verification gates.

---

## 5. Utility Skills (`context-governance`, `antislop`, `permissioned-github`)

- **`context-governance` (`Agy-Context-Saver >= 2.0.1` + `RTK >= 1.1.0`):** Use `rtk grep`, `rtk find`, and `rtk ls` for discovery, bounded `<= 150`-line `read_file` slices (or `1..TotalLines` on files `<= 800` lines and `<= 45 KiB`) for edits, unchained `rtk read` for spillovers and completed `tasks/*.log`, and `agy-context transcript` (`list --parent --lineage`, `export --sanitized`) for traces. Never pair `swarm_wait` or `invoke_subagent` with `schedule` polling timers.
- **`antislop` (R-02 Carve-Out, R-23 Visual Gate & Delivery Gate):**
  - **R-02 machine-protocol carve-out:** `mcp/handoffs.mjs` requires the exact ASCII-escaped em-dash separator in single-line Pointer-Over-Wire receipts (`READY <path> — <observation>`, `PARTIAL <path> — <observation and blocker>`, `NO_REPORT — <reason>`). Keep that exact ` — ` delimiter in machine receipts, while avoiding em dashes in human prose, documentation, review ledgers, and `swarm_narrator` `view.json`.
  - **Mode resolution, R-23 & Delivery Gate:** Resolve `antislop` mode upfront when editing UI/docs/copy; per `R-23`, never fabricate new SVGs, logos (`assets/logo.svg`), or visual branding without explicit design confirmation; satisfy the non-delegable Delivery Gate by personally verifying cited files and commands before declaring completion.
- **`permissioned-github`:** Always pass `-R <OWNER>/<REPO>` explicitly on `gh` commands, never pipe or redirect `gh` output, use HTTPS-only `git` remotes, call `ask_custom_permission` reactively only after an action fails with missing permission, and use `git.read` / `workflow.read` / `dispatch` tools cleanly within approved scopes.
