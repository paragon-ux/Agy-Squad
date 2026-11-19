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
        "Flat: specialists report directly to the swarm coordinator (fewer coordination hops)",
        "Layered: domain squad leads review specialists before reporting to the coordinator (isolates multi-domain syntheses)"
      ]
    },
    {
      "question": "Which workspaceIsolation mode should workers use?",
      "is_multi_select": false,
      "options": [
        "inherit: shared coordinator workspace (use for read-only audits or strictly disjoint scopeFiles)",
        "share: isolated per-worker working copy sharing repository storage (use for concurrent edits)",
        "branch: isolated clone per worker (use when independent git history/branches are required)"
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
        "(Recommended) Coordinator default: omit `model` / `--model` so workers inherit the active session model",
        "Custom explicit model ID: inspect `swarm{action: \"models\"}` first and pin the chosen ID"
      ]
    }
  ]
}
```

## Planner and Dispatch Commands

`Agy-Squad` can be invoked either over MCP (`squad_planner` / `dispatch_squad`; pass `workspace: "<repo-root>"` when running from a global plugin install so relative `manifestPath` resolves to the active repository) or from the workspace root via the global `agy-squad` CLI shim (legacy `agy-squad run` and the standalone `node mcp/handoffs.mjs` CLI are retired; `mcp/handoffs.mjs` is an internal JS library only). Skill references use canonical hosted Zensical documentation URLs and skill-local `./references/` links so every reference resolves cleanly at any plugin mount depth and under Windows copy-fallback.

### Manifest & Task Planning (`squad_planner` / `agy-squad plan`)

```bash
# Plan all working squads from a manifest, inheriting coordinator default model:
agy-squad plan \
  --manifest swarm-manifest.json \
  --topology flat \
  --workspace-isolation inherit

# Plan from a manifest while pinning an explicit user-requested model ID:
agy-squad plan \
  --manifest swarm-manifest.json \
  --model gemini-4-hydrogen-high \
  --known-model gemini-4-hydrogen-high

# Plan a freeform task with repeatable custom roles, scopes, and shared worktrees:
agy-squad plan \
  --mode swarm \
  --scope src/app.js --scope docs/tools.md \
  --role "Implementer" --role "Reviewer" \
  --workspace-isolation share \
  "Audit authentication flow and update documentation."

# Add a follow-up wave onto an already-active /swarm board without name collisions or full-board reads:
agy-squad plan \
  --manifest docs/custom-manifest.json \
  --occupied-worker storage-lead --occupied-worker audit-storage \
  --board-since 60 \
  --report-root scratch/agy-squad-wave2
```

- **Multi-squad vs. single-squad:** Omit `squadId` (`--squad`) to compile all non-audit squads in the manifest; never pass `all_l1` to `squad_planner` or `agy-squad plan`.
- **Board message scoping (`boardSince` / `boardSeqs`):** Record the board sequence cursor (`<cohortBaseSeq>`) before spawning workers and pass `boardSince` (`--board-since`) or explicit `boardSeqs` (`--board-seq`) so compiled briefs instruct `read_board{since: ...}` or `read_board{seqs: [...]}` and forbid bare unfiltered `read_board()`.
- **Custom per-worker roles, scopes, models, and `readOnly`:** Inline `task` shares one `scopeFiles` list across `--role` titles and compiles a flat `task_squad`. For distinct per-worker `scopeFiles`, custom `objective`/`instructions`, per-worker `model`, `readOnly: true` overlap exemptions, or domain `lead`s, use `manifest` (inline) or `--manifest <path>`. Never pass `roles` or `scopeFiles` alongside `manifest` or `manifestPath`.
- **Hard planner/wire caps ([docs/tools.md](https://paragon-ux.github.io/Agy-Squad/tools/#manifest-structure-rules)):** There is no hardcoded cap on squad count or workers per squad, but code enforces `MAX_SWARM_NAME_LENGTH = 24` chars (deduplicated with `-2`, `-3`, ...), `squad-<encodeURIComponent(id)>` directory names `<= 255` UTF-8 bytes, `reportPath()` headroom so `PARTIAL <path> — ` plus `SWARM_MENTION_RESERVE_BYTES = 26` and `MIN_OBSERVATION_BYTES = 16` stays `<= 500` UTF-8 bytes, and `10 MiB` (`AGY_MAX_STDIO_PAYLOAD_BYTES`) on MCP stdio.

### `invoke_subagent` Fallback (`dispatch_squad` / `agy-squad dispatch`)

Use `dispatch_squad` (MCP) or `agy-squad dispatch` only when explicitly targeting `invoke_subagent` (`executionMode: "subagent"`):

```bash
agy-squad dispatch --squad all_l1 --manifest task-01-manifest.json
agy-squad dispatch --squad storage --manifest task-01-manifest.json
agy-squad dispatch --squad integrity_auditor:storage --manifest task-01-manifest.json
```

## Model Pinning and Subagent Caveats

- **Under `executionMode: "swarm"` (default):** `squad_planner` emits `swarmAdd` payloads. When pinning an explicit non-default model (`model` / `--model`), call `swarm{action: "models"}` upfront (or pass `knownModels` / `--known-model`) so typos fail before spawn, then run `swarm{action: "status"}` immediately after `swarm{action: "add"}` to verify each running worker's actual model ID. When inheriting the coordinator default, omit `model` / `--model`.
- **Under `executionMode: "subagent"`:** `invoke_subagent` accepts only the four aliases `inherit`, `flash_lite`, `flash`, or `pro`. Any exact model ID other than those four aliases falls back to `inherit`, and `modelProvenance` warns that neither `agy-context transcript read` nor `manage_subagents` exposes resolved per-child model IDs.
- **Transcript isolation (`provenanceScaffold`):** Record parent-known worker roster names, report slots, and native `conversationId`s in `provenanceScaffold` and pass them to the flat integrity auditor (`audit-<id>`). **Never** copy raw `.system_generated/` transcripts into `scratch/` or lead/leaf directories; compiled briefs stamp `[agy-transcript-access: allow]` on leads/auditors and `[agy-transcript-access: deny]` on leaf specialists so auditors use single-pass `agy-context transcript query --id <id> --summary` / `agy-context transcript read --id <id> --last-turns 10` or `read_board` / `swarm{action: "status"}`.

## Swarm UI and Turn Lifecycle

1. **Follow `native_swarm` for `open_board` (launch turn & explicit user asks only):**
   - Defer Swarm UI link emission to `native_swarm`: emit the exact verbatim `open_board` string returned by `swarm` only on the turn that creates the swarm and when the user explicitly asks what the swarm is doing while workers remain active (never fabricate a `sidecar://...` link, and **do not** emit `open_board` on Reactive Wakeup turns or progress replies).
   - **Antigravity tool-availability note:** Because `swarm_wait`, `post_message`, and `read_board` arrive one turn after the first `swarm add`, ending the launch turn with verbatim `open_board` renders the Swarm UI pill right away, and the UI may show `"waiting for my reply"` / `"waiting for user reply"` until a worker message (`@coordinator`) or `swarm_monitor` trigger wakes you (**never** create a one-shot `schedule` watchdog timer to poll `/swarm`, which `Agy-Context-Saver` denies). Park subsequent quiet turns with `swarm_wait` (`since` = highest board `seq` seen).
2. **Pausing for User Decision & Multi-Cycle Continuation (`[done]` before user handoff):**
   - Whenever queued worker tasks finish and you yield to report findings or ask the user whether to remediate or close (keeping `/swarm` workers `waiting` with preserved context), **first post a single-line `[done] <summary>` with NO `@` anywhere in it** before answering the user. Otherwise `monitor` keeps running its `*/3 * * * *` cron tick every 3 minutes, burning quota and posting `@coordinator [stall]` alerts. (Note: because an active monitor sleeps on `mentions_only: true`, it cancels its cron on its next `*/3` tick after `[done]` unless explicitly `kill`ed; any later `@worker` post wakes a kept-dormant monitor and re-arms its cron.)
   - When waking idle `/swarm` workers for follow-up fixes, target those specialists via `post_message` so they re-verify deltas with preserved context; if adding extra cohorts onto an already-active board, pass existing roster names via `occupiedWorkerNames` (`--occupied-worker`) to prevent 24-character name collisions.
   - Because Antigravity keeps one append-only board (`board: "local"`) per conversation (and `channel` is host-gated), close the finished swarm and start a **fresh conversation** between major waves when you want a clean Swarm UI board.
3. **Final Shutdown (`[done]` -> immediate `kill`):**
   - If the user asks to stop or kill workers, call `swarm{action: "kill"}` immediately without delaying for bundling or worktree collection.
   - Otherwise, on normal coordinator completion (after verified bundles are saved and any `share`/`branch` worktree slots/diffs are collected), post `[done] <summary>`, immediately call `swarm{action: "kill"}` on all workers **including `monitor` / `monitor-*`** (stopping its cron right away instead of waiting for its next 3-minute tick), and complete the 4-check runtime closure checklist.
