# Large-Swarm Scaling, Worktrees & Recovery

Reference for `8+` workers, concurrent editors, or multi-squad waves under [`SKILL.md`](../SKILL.md).

## User-Directed Kill vs. Normal Shutdown

- **User stop (highest priority):** Call `swarm{action: "kill"}` (including `monitor`) immediately; never delay for collection, merging, auditing, or bundling (uncollected `share`/`branch` edits are discarded).
- **Normal completion:** Run the pre-kill checklist below before calling `kill`.

## Pre-Kill Checklist for `share` and `branch` Worktrees

`kill` permanently deletes `share`/`branch` copies. On normal completion:

1. **Collect slots:** `agy-squad collect --plan <plan.json> --handoffs <handoffs.json>` (auto-extracts `wt=<worktree-dir>` from `share`/`branch` worker receipts, or pass explicit `--from <worktree-dir>...`).
2. **Merge edits:** Inspect and apply verified worker diffs into the coordinator workspace.
3. **Audit & bundle:** Run `bundle-init --all-squads --digest`, run Wave-3 `audit-<id>` (`agy-squad audit-check`), and run `finalize <record.json...> [--prune]`.
4. **Kill & close:** Post `[done] <summary>` (no `@`), `kill` workers + `monitor`, and pass [Section 5](../SKILL.md#5-runtime-closure-checklist-pre-handoff-gate).

## Scaling Limits & Quota Recovery

- **Zero chatter (`O(N^2)`):** One final `<= 500` B receipt (`-`, `--`, or `—`); scope `read_board{since|seqs}`; no board acks; fresh chat between major waves.
- **Name & prefix caps:** Keep `squadId`, role prefixes, and `--report-root` short (`24`-char slug cap; pass `occupiedWorkerNames` on follow-ups; `<= 451` B prefix budget). Bundle each squad independently.
- **Quota recovery:** Never `kill` + `add` (wipes context/worktree). Run `swarm{action: "models"}`, wait for `state: "waiting"`, and switch in place via `swarm{action: "model", name: "<worker>", model: "<fallback-id>"}`.
