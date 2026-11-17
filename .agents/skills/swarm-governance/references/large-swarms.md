# Large-Swarm Scaling, Worktree Collection, and Recovery

Standalone reference for running larger `/swarm` cohorts (`8+` workers, concurrent code editors, or multi-squad waves) under [`.agents/skills/swarm-governance/SKILL.md`](../SKILL.md).

## Immediate User-Directed Kill vs. Normal Shutdown

- **User-directed kill (highest priority):** Whenever the user explicitly asks to kill, stop, cancel, or abort workers, invoke `swarm{action: "kill"}` (including `monitor`) immediately in that turn. Never delay or block a user-requested stop on copying `share`/`branch` files, merging diffs, auditing, or bundling. Preserve any already-collected partial reports if present, and note clearly that uncollected edits inside terminated `share`/`branch` worktrees are discarded upon `kill`.
- **Normal coordinator completion:** When the coordinator (rather than an explicit user stop request) is closing a completed `share` or `branch` run, follow the 4-step pre-kill collection checklist below before calling `kill`.

## Pre-Kill Checklist for `share` and `branch` Worktrees

`swarm{action: "kill"}` permanently deletes worker `share` and `branch` copies along with any unmerged code edits or uncollected `report.md` slots inside them. During normal completion of a `share` or `branch` swarm (for example, 10–20 concurrent workers), complete all four steps **in order** before calling `kill`:

1. **Collect report slots (`agy-squad collect`):** Run `node bin/agy-squad.mjs collect --plan <plan.json> --from <worktree-dir>...` (or `--record`/`--squad`) to stage every `scratch/agy-squad/squad-<id>/specialist-<N>/report.md`, `lead/report.md`, and `audit-<id>` slot from each worker's `share` or `branch` copy into the coordinator workspace.
2. **Collect and merge code diffs:** Inspect and cherry-pick, patch, or merge any verified worker code modifications into the coordinator workspace before terminating workers.
3. **Verify and bundle:** From the coordinator workspace, run `node bin/agy-squad.mjs fingerprint`, `bundle-init`, `inspect`, `digest`, flat `audit-<id>`, `verdict --integrity`, `bundle`, and `verify`, confirming `report.sources.json` validates against the final collected files.
4. **Kill workers only after bundle verification:** Call `swarm{action: "kill"}` on specialists, leads, auditors, and `monitor` only after `verify` passes (or after saving partial evidence on an early coordinator abort).

## Shared Board `O(N^2)` Broadcast and Zero Mid-Flight Chatter

Antigravity attaches one persistent append-only board (`board: "local"`) per conversation and omits `channel` partitioning when the host `swarm` schema exposes only `status`, `models`, `add`, `model`, `kill`, and `title`. Above `~8` workers, mid-flight status updates (`"still checking X"`) or coordinator acknowledgments are replicated into every active member's context on subsequent wakeups (`O(N^2)` token growth):

- Instruct every worker explicitly in its brief/assignment to post **zero mid-flight status chatter** on the board and emit **only one final `<= 500` UTF-8 byte Pointer-Over-Wire line** (`@coordinator` in flat mode or compiled `@<leadWorkerName>` in layered mode: `READY <path> — <observation>`, `PARTIAL <path> — <observation and blocker>`, or `NO_REPORT — <reason>`).
- Scope coordinator and lead board checks with `read_board{since: <cohortBaseSeq>}` or exact `read_board{seqs: [...]}` (passed via `boardSince` / `boardSeqs` to `squad_planner`); avoid bare `read_board()` so prior waves never flood new contexts.
- Keep coordinator acknowledgments off the board unless waking a worker for clarification or a follow-up cycle.
- Start a **fresh Antigravity conversation** between major waves if the persistent board accumulates enough retired workers or messages to slow down the Swarm UI pane.

## Name Truncation, `474` B Path Budget, and Multi-Squad Bundling Loop

- **24-character worker name truncation (`mcp/planner.mjs`):** `MAX_SWARM_NAME_LENGTH = 24` lowercases `[a-z0-9-]+` slugs and truncates long worker names. Similar role titles (such as `frontend-security-reviewer` and `frontend-session-reviewer`) or long `squadId` values truncate to 24 chars and collide, causing `allocateWorkerName` to append `-2`, `-3`, ... suffixes. Keep `squadId` short, give roles distinct leading words, and pass existing roster names via `occupiedWorkerNames` across sequential `squad_planner` calls on the same board.
- **`474`-byte report path budget (`mcp/handoffs.mjs`):** `reportPath()` reserves `SWARM_MENTION_RESERVE_BYTES = 26` bytes (`@<24-char-name> `) inside the `500`-byte `messageLimit`, leaving `< 474` UTF-8 bytes for `READY <reportRoot>/squad-<encodeURIComponent(id)>/<slot>/report.md — `. Deep custom `reportRoot` paths paired with long `squadId` strings throw at compile time; keep both short.
- **Multi-squad audit and bundle loop:** Multi-squad manifests spawn **one flat `audit-<squadId>` per working squad**, writing to `scratch/agy-squad/squad-integrity_auditor-<squadId>/specialist-1/report.md`. Because `squad_planner` emits one entry per squad under `bundleRecordTemplates.<squadId>`, execute `fingerprint` -> `bundle-init --squad <squadId> [--handoff ... | --handoffs ...]` -> `inspect` -> `digest` -> `audit-<squadId>` -> `bundle` -> `verify` **independently per working squad** using separate `<bundle-record.json>` files rather than merging multiple squads into a single bundle record.

## Host Model Quota Exhaustion Recovery

When a large swarm pinned to one model hits host quota or capacity limits mid-run, **never `kill` the worker and `add` a fresh replacement** (which wipes its conversation context and destroys uncommitted `share`/`branch` changes):

1. Inspect available fallback models and quotas with `swarm{action: "models"}`.
2. Wait until the affected worker reaches `state: "waiting"`.
3. Reassign its model in place using `swarm{action: "model", name: "<worker-name>", model: "<fallback-model-id>"}` so the worker preserves its conversation history and isolated copy and resumes its unfinished work on the new model.
