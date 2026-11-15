# Swarm Governance: Step 0 Intake, Planning Commands & Turn Lifecycle

Reference details for [`.agents/skills/swarm-governance/SKILL.md`](../SKILL.md). Links use section anchors so [`SKILL.md`](../SKILL.md) remains concise while preserving full CLI flags, model caveats, and UI lifecycle rules.

## Step 0 Intake Question Templates

When launching `/swarm` and any of the four execution choices below are unspecified by the user or Task Spec, ask once via `ask_question` without biasing `Flat` vs. `Layered` topology (`squad_planner` sets `topology.defaultBias: "none (ask user if unspecified)"`):

```json
{
  "questions": [
    {
      "question": "Which swarm topology should coordinate this run?",
      "is_multi_select": false,
      "options": [
        "Flat — specialists report directly to the swarm coordinator (fewer coordination hops)",
        "Layered — domain squad leads review specialists before reporting to the coordinator (isolates multi-domain syntheses)"
      ]
    },
    {
      "question": "Which workspaceIsolation mode should workers use?",
      "is_multi_select": false,
      "options": [
        "inherit — shared coordinator workspace (use for read-only audits or strictly disjoint scopeFiles)",
        "share — isolated per-worker working copy sharing repository storage (use for concurrent edits)",
        "branch — isolated clone per worker (use when independent git history/branches are required)"
      ]
    },
    {
      "question": "Which evidence retention policy should apply after verification?",
      "is_multi_select": false,
      "options": [
        "Keep loose specialist reports (`--keep-reports` on prune / defer `--teardown` during active waves)",
        "Prune loose specialist reports after SHA-256 bundle + verify succeed (and `--teardown` after ledger update)"
      ]
    },
    {
      "question": "Which model should spawned workers use?",
      "is_multi_select": false,
      "options": [
        "(Recommended) Coordinator default — omit `model` / `--model` so workers inherit the active session model",
        "Custom explicit model ID — inspect `swarm{action: \"models\"}` first and pin the chosen ID"
      ]
    }
  ]
}
```

## Planner and Dispatch Commands

`Agy-Squad` is a workspace-private package (`"private": true`), so always invoke the CLI from the workspace root with `node bin/agy-squad.mjs` (legacy `agy-squad run` and the standalone `node mcp/handoffs.mjs` CLI are retired; `mcp/handoffs.mjs` is an internal JS library only).

### Manifest & Task Planning (`squad_planner` / `agy-squad plan`)

```bash
# Plan all working squads from a manifest, inheriting coordinator default model:
node bin/agy-squad.mjs plan \
  --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  --topology flat \
  --workspace-isolation inherit

# Plan from a manifest while pinning an explicit user-requested model ID:
node bin/agy-squad.mjs plan \
  --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  --model gemini-4-hydrogen-high \
  --known-model gemini-4-hydrogen-high

# Plan a freeform task with repeatable custom roles, scopes, and shared worktrees:
node bin/agy-squad.mjs plan \
  --mode swarm \
  --scope src/app.js --scope docs/tools.md \
  --role "Implementer" --role "Reviewer" \
  --workspace-isolation share \
  "Verify Phase 2 runtime fixes and update documentation."

# Add a follow-up wave onto an already-active /swarm board without name collisions:
node bin/agy-squad.mjs plan \
  --manifest docs/custom-manifest.json \
  --occupied-worker storage-lead --occupied-worker audit-storage \
  --report-root scratch/agy-squad-wave2
```

- **Multi-squad vs. single-squad:** Omit `squadId` (`--squad`) to compile all non-audit squads in the manifest; never pass `all_l1` to `squad_planner` or `agy-squad plan`.
- **Custom per-worker roles, scopes, models, and `readOnly`:** Inline `task` shares one `scopeFiles` list across `--role` titles and compiles a flat `task_squad`. For distinct per-worker `scopeFiles`, custom `objective`/`instructions`, per-worker `model`, `readOnly: true` overlap exemptions, or domain `lead`s, use `manifest` (inline) or `--manifest <path>`. Never pass `roles` or `scopeFiles` alongside `manifest` or `manifestPath`.
- **Hard planner/wire caps ([docs/tools.md](../../../../docs/tools.md#manifest-structure-rules)):** There is no hardcoded cap on squad count or workers per squad, but code enforces `MAX_SWARM_NAME_LENGTH = 24` chars (deduplicated with `-2`, `-3`, ...), `squad-<encodeURIComponent(id)>` directory names `<= 255` UTF-8 bytes, `reportPath()` headroom so `READY <path> — ` plus `SWARM_MENTION_RESERVE_BYTES = 26` stays under `500` UTF-8 bytes, and `10 MiB` (`AGY_MAX_STDIO_PAYLOAD_BYTES`) on MCP stdio.

### `invoke_subagent` Fallback (`dispatch_squad` / `agy-squad dispatch`)

Use `dispatch_squad` (MCP) or `node bin/agy-squad.mjs dispatch` only when explicitly targeting `invoke_subagent` (`executionMode: "subagent"`):

```bash
node bin/agy-squad.mjs dispatch --squad all_l1 --manifest task-01-manifest.json
node bin/agy-squad.mjs dispatch --squad storage --manifest task-01-manifest.json
node bin/agy-squad.mjs dispatch --squad integrity_auditor:storage --manifest task-01-manifest.json
```

## Model Pinning and Subagent Caveats

- **Under `executionMode: "swarm"` (default):** `squad_planner` emits `swarmAdd` payloads. When pinning an explicit non-default model (`model` / `--model`), call `swarm{action: "models"}` upfront (or pass `knownModels` / `--known-model`) so typos fail before spawn, then run `swarm{action: "status"}` immediately after `swarm{action: "add"}` to verify each running worker's actual model ID. When inheriting the coordinator default, omit `model` / `--model`.
- **Under `executionMode: "subagent"`:** `invoke_subagent` accepts only the four aliases `inherit`, `flash_lite`, `flash`, or `pro`. Any exact model ID other than those four aliases falls back to `inherit`, and `modelProvenance` warns that neither `agy-context transcript read` nor `manage_subagents` exposes resolved per-child model IDs.
- **L6 transcript isolation (`provenanceScaffold`):** Record parent-known worker roster names, report slots, and native `conversationId`s in `provenanceScaffold` and pass them to the flat integrity auditor (`audit-<id>`). **Never** copy raw `.system_generated/` transcripts into `scratch/` or lead/leaf directories (`L6`); compiled briefs stamp `[agy-transcript-access: allow]` on leads/auditors and `[agy-transcript-access: deny]` on leaf specialists so auditors use single-pass `agy-context transcript query --id <id> --summary` / `agy-context transcript read --id <id> --last-turns 10` or `read_board` / `swarm{action: "status"}`.

## Swarm UI and Turn Lifecycle

1. **Active Launch Turn (`open_board`, no `swarm_wait`):**
   - Right after spawning workers via `swarm{action: "add"}` and confirming models via `swarm{action: "status"}`, end the launch turn with the live board link from `open_board` on its own line:
     - Standard board view: `[Open the Swarm UI](sidecar://swarm/swarm_board/)`
     - Mention graph view: `[Open Swarm Graph](sidecar://swarm/swarm_board/?tab=graph)` (use `?tab=graph` when inspecting or explaining the `@mention` routing graph)
   - **Do not** call `swarm_wait` silently on the launch turn; ending the turn renders the Swarm UI pill immediately for the user.
   - **Explicit UI warning:** Ending the turn without calling `swarm_wait` causes Antigravity to show `"waiting for my reply"` / `"waiting for user reply"` until a worker post (`@coordinator`) or scheduled watchdog wakes the coordinator. Mention or account for this behavior cleanly rather than waiting passively for user input.
2. **In-Flight Quiet Turns (`swarm_wait`):**
   - On intermediate quiet turns while waiting for active workers, park via `swarm_wait` (`since` = highest board `seq` seen) instead of emitting repeated user turns or polling `read_board`.
   - Emit `open_board` only on active launch turns or active in-flight user status updates while workers are running or waiting.
3. **Multi-Cycle & Remediation Swarms (Stage 3 Continuation):**
   - When fixing findings or running a second verification wave against the same codebase, **keep waiting `/swarm` workers idle** and wake the same specialists via `post_message` so they re-verify deltas with preserved context.
   - If adding extra cohorts onto an already-active board, pass existing roster names via `occupiedWorkerNames` (`--occupied-worker`) to prevent 24-character name collisions.
   - Because Antigravity keeps one append-only board (`board: "local"`) per conversation (and `channel` is host-gated), close the finished swarm and start a **fresh conversation** between major waves when you want a clean Swarm UI board.
4. **Final Shutdown (`kill` + No `open_board`):**
   - If the user asks to stop or kill workers, call `swarm{action: "kill"}` immediately without delaying for bundling or worktree collection.
   - Otherwise, on normal coordinator completion (after verified bundles are saved and any `share`/`branch` worktree slots/diffs are collected), post `[done] <summary>`, kill workers **including `monitor`** via `swarm{action: "kill"}`, run the 4-check runtime closure checklist, and **never emit `open_board` after all swarm workers are killed**.
