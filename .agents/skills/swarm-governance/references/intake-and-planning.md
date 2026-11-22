# Swarm Governance: Defaults, Planning & Lifecycle

Reference for [`SKILL.md`](../SKILL.md).

## Step 0: Sensible Defaults and Overrides

Proceed with defaults unless genuinely ambiguous or asked for options:

| Setting | Default | Override / When to Ask |
| --- | --- | --- |
| **Topology** | `flat` (specialists -> coordinator) | `layered` only if domain leads or multi-squad isolation is requested. |
| **Workspace** | `inherit` (shared) | `share` for overlapping edits; `branch` for isolated git history. Ask if overlap is unclear. |
| **Retention** | Prune verified loose reports (`--prune`) | `--keep-reports` to keep `specialist-<N>/report.md` across waves. |
| **Model** | Coordinator model (omitted) | `--model <id> --known-model <id>` (from `swarm{action: "models"}`) only on request. |

## Planner and Dispatch Commands

Run via MCP (`squad_planner` / `dispatch_squad`; pass `workspace: "<repo-root>"` on global installs) or `agy-squad` CLI:

```bash
# Plan all manifest squads (omit --squad; never pass all_l1):
agy-squad plan --manifest swarm-manifest.json --topology flat --workspace-isolation inherit

# Inline read-only task + follow-up scoping:
agy-squad plan --mode swarm --read-only --scope src/app.js --role "Security Reviewer" \
  --role-scope "Security Reviewer=src/app.js" --occupied-worker prev-1 --board-since 60 \
  --report-root scratch/agy-squad-wave2 "Audit auth flow."

# invoke_subagent fallback only:
agy-squad dispatch --squad all_l1 --manifest task-01-manifest.json
```

- Inline `task` builds a flat `task_squad` (`--role`, `--scope`, `--read-only`, `--role-scope`); use `manifest` for custom per-worker objectives/models, leads, or multiple squads (never mix).
- Caps ([tools](https://paragon-ux.github.io/Agy-Squad/tools/#manifest-structure-rules)): `24`-char `workerName`, `<= 255` B `squad-<id>` dir, `<= 458` B prefix budget, `10 MiB` MCP stdio.

## Models, Subagents & ACS Opt-In

- **`/swarm`:** Validate explicit models via `swarm{action: "models"}` (`knownModels`) and confirm with `swarm{action: "status"}`.
- **`invoke_subagent`:** Accepts only `inherit`, `flash_lite`, `flash`, `pro`; other IDs fall back to `inherit`.
- **ACS opt-in:** Share roster names, slots, and `conversationId`s with `audit-<id>` (never copy `.system_generated/` into `scratch/`). `Agy-Squad` emits zero `[agy-transcript-access: ...]` tags by default; with optional `Agy-Context-Saver`, opt in via line-1 `[agy-transcript-access: allow|deny]` on worker prompts or `agy-context transcript access`.

## Turn Lifecycle and `[done]` Control

1. Emit verbatim `open_board` on launch turn or when asked while active only (never fabricate `sidecar://...` or repeat on wakeups).
2. Park quiet turns via `swarm_wait` (`since` = highest seen `seq`); never add `schedule` timers on `/swarm`.
3. Post single-line `[done] <summary>` (no `@`) before pausing `waiting` workers so `monitor` cron stops. Wake via `post_message` (`occupiedWorkerNames` if adding workers; fresh chat between major waves).
4. On close: collect worktrees + verify bundles, post `[done]`, `swarm{action: "kill"}` workers + `monitor`, pass [Section 5](../SKILL.md#5-runtime-closure-checklist-pre-handoff-gate).
