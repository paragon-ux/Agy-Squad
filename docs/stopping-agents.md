# Stopping agents

Agy-Squad relies on Antigravity's native stop controls (`L3`, `L5`) and separates evidence preservation from worker termination (`L41`, `L42`).

## Stopping order for `/swarm` and subagents

Terminate workers **after** collecting and verifying their evidence so worktrees and uncommitted report slots are not destroyed prematurely:

| Step | Native `/swarm` workers | `invoke_subagent` cohorts |
| --- | --- | --- |
| **1. Preserve evidence** | Verify `lead/report.md`, specialist reports, and `integrity_auditor` reports are written under `scratch/agy-squad/` (or merged from `share`/`branch` workspaces). | Check `/agents` for pending approvals, partial output, or repeated activity before stopping silent children. |
| **2. Bundle and verify** | Run `node bin/agy-squad.mjs bundle <record.json>`, `verify <report.sources.json>`, and `prune <report.sources.json> <accepted-sha256> [--keep-reports]`. | Run `bundle`, `verify`, and `prune` (plus `diagnose.mjs --teardown` after updating `docs/reviews/<slug>.md` for self-diagnosis runs). |
| **3. Stop workers and monitors** | Post `[done] <summary>`, then call `swarm{action: "kill", name: "<worker>"}` for finished workers **and `monitor` (or any `monitor-*` peer from `swarm status`)** when ending a session (`kill` is permanent and deletes `share` or `branch` worktrees). | Use the CLI `/agents` panel or `manage_subagents(Action='kill', ConversationIds=[...])` with the native IDs recorded from launch receipts. |
| **4. Run the closure check** | Complete the 4-check runtime closure gate below (`swarm status`, `manage_subagents`, `manage_task`, child OS commands). | Confirm child sessions stopped, `manage_task` shows zero active tasks, and any started child commands exited. |

## Four-check runtime closure checklist

`node bin/agy-squad.mjs bundle` and `verify` check disk artifact SHA-256 digests (`L1`); they do not inspect live Antigravity runtime state. Until `Spike S5` in the [native enforcement ledger](plans/native-enforcement-ledger.md) verifies whether Desktop IDE `StopHook` and `PostToolUse` fire on `swarm`, `post_message`, and exit events, coordinators must run all four checks before ending a governed run:

1. **`swarm{action: "status"}`:** Every non-coordinator member (including `monitor` or any `monitor-*` instance when ending the session, overriding native `/swarm`'s wait-for-cron convention) reports `state: "killed"`, `killed: true`.
2. **`manage_subagents(Action='list')`:** Reports `0 active subagent(s): []`.
3. **`manage_task(Action='list')`:** Reports `No background tasks are currently running.` (catches lingering `swarm_monitor` daemon crons or timers).
4. **Child commands:** Any builds, servers, or watchers launched by agents have exited.

See [Roles, skill workflows, and runtime closure](roles-and-workflows.md#3-runtime-closure-checklist-and-hook-boundary) for the cross-skill role map and the `S5` hook graduation path.

> [!NOTE]
> `swarm{action: "kill"}` stops workers permanently and removes their `share` or `branch` worktrees, **but retired (`killed: true`) entries and old messages stay on that conversation's persistent `/swarm` board** (and host channels cannot be toggled via repo config when `swarm` omits `action: "channel"`). Start a new Antigravity conversation per major wave if you want a clean Swarm UI board ([Shared swarm board and channel limits](concepts.md#shared-swarm-board-and-channel-limits)).

## Evidence checkpoints and command cleanup

- **Record an evidence checkpoint before launch:** Reactive Wakeup delivers a message when a child posts one, and the operator inspects `/agents` or `swarm{action: "status"}` at the checkpoint (`10` minutes by default) to catch silent children, pending approvals, or loops.
- **Stop commands with agents:** Verify that stopping an agent also stops any background command or server it started. A disposable workspace and a bounded test command keep cleanup observable.
- **Preserve partial evidence on abort:** When stopping a stuck or failing worker early, record its partial report, note whether its commands stopped, and record agent cleanup and command cleanup separately in the [verification checklist](plans/wsl-cli-verification.md).
- **Keep self-diagnosis teardown separate:** For `/self-diagnosis` runs, see [Three-scope evidence retention and teardown contract](core-workflows.md#4-three-scope-evidence-retention-and-teardown-contract) before running `diagnose.mjs --teardown`.
