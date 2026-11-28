# Swarm Governance: Defaults, Planning & Lifecycle

Reference for [`SKILL.md`](../SKILL.md).

## Step 0: Sensible Defaults and Overrides

Launch immediately with the recommended defaults below on read-only cohorts and overlap-free scopes (matching native `/swarm` startup speed and supporting non-interactive `agy -p` runs). Trigger a single `ask_question` call **only** when `squad_planner` / `agy-squad plan` reports writable `siblingOverlaps` under `workspaceIsolation: "inherit"`, destructive state ambiguity exists, or the user explicitly asks to customize run settings.

| Setting | Recommended Default (applied automatically when safe) | Alternatives / Override |
| --- | --- | --- |
| **Topology** | `flat` for inline tasks; wave-gated `layered` for manifests with leads | `--topology flat` (strips manifest leads) or `--topology layered` (Wave-2 domain leads). |
| **Model** | Coordinator model (omit `--model`) | `--model <id> --known-model <id>` (validated via `swarm{action: "models"}`). |
| **Workspace isolation** | `inherit` (shared workspace) | `share` for concurrent edits; `branch` for isolated git history (`wt=<dir>` receipt locator). |
| **Report retention** | `--prune` (prune verified loose reports after `.sources.json` archive) | `--keep-reports` to keep `specialist-<N>/report.md` across waves. |

- **Fast coordinator setup (1 turn to Wave 1):** Read only the active `SKILL.md` entry file(s), run `agy-squad plan --out scratch/plan.json` (or `squad_planner` with `outPath`), write `swarmPane` to `.system_generated/swarm/plan.json`, and launch Wave 1 immediately when overlap-free; defer reference docs and never pre-read historical `docs/reviews/` ledgers before launching.
- **Lightweight research mode:** For non-code or exploratory research swarms where forensic trace auditing is unnecessary, plan with `--no-integrity` (`includeIntegrityAuditor: false`) to omit `audit-*` workers (omitting `--digest` on `bundle-init` and closing with `finalize --allow-unaudited [--prune]`), while retaining bounded report slots, Pointer-Over-Wire receipts, and final cross-squad synthesis.

## Planner and Dispatch Commands

Run via MCP (`squad_planner` with `outPath` / `dispatch_squad`; pass `workspace: "<repo-root>"` on global installs) or `agy-squad` CLI (`--workspace <repo-root>` works across all subcommands):

```bash
# Plan all manifest squads to disk with compact stdout receipt (omit --squad; never pass all_l1):
agy-squad plan --manifest swarm-manifest.json --out scratch/plan.json --replace

# Inline read-only task + follow-up scoping:
agy-squad plan --mode swarm --read-only --scope src/app.js --role "Security Reviewer" \
  --role-scope "Security Reviewer=src/app.js" --occupied-worker prev-1 \
  --report-root scratch/agy-squad-wave2 --out scratch/plan-wave2.json "Audit auth flow."

# invoke_subagent fallback only:
agy-squad dispatch --squad all_l1 --manifest task-01-manifest.json
```

- Inline `task` builds a flat `task_squad` (`--role`, `--scope`, `--read-only`, `--role-scope`); use `manifest` for custom per-worker objectives/models, leads, or multiple squads (never mix).
- Caps ([tools](https://paragon-ux.github.io/Agy-Squad/tools/#manifest-structure-rules)): `24`-char `workerName`, `<= 255` B `squad-<id>` dir, `<= 451` B prefix budget (reserves `33` B for `@<24-char> [done] ` + `16` B min observation), `10 MiB` MCP stdio.

## Models, Subagents & ACS Opt-In

- **`/swarm`:** Validate explicit models via `swarm{action: "models"}` (`knownModels`) and confirm with `swarm{action: "status"}`.
- **`invoke_subagent`:** Accepts only `inherit`, `flash_lite`, `flash`, `pro`; other IDs fall back to `inherit`.
- **ACS opt-in:** Share roster names, slots, and `conversationId`s with `audit-<id>` (never copy `.system_generated/` into `scratch/`). `Agy-Squad` emits zero `[agy-transcript-access: ...]` tags by default; with optional `Agy-Context-Saver`, opt in via line-1 `[agy-transcript-access: allow|deny]` on worker prompts or `agy-context transcript access`.

## Turn Lifecycle and `[done]` Control

1. Emit verbatim `open_board` (`[Open the Swarm UI](sidecar://swarm/swarm_board/?auto_open=false)`) on its own line on **launch turns, resume turns**, and whenever asked while active (never fabricate other `sidecar://...` URLs or repeat on routine wakeups).
2. Park quiet turns via `swarm_wait` (`since` = highest seen `seq`); never add `schedule` timers on `/swarm`.
3. Post single-line `[done] <summary>` (no `@`) before pausing `waiting` workers so `monitor` cron stops.
4. **Top-down resume:** Resume paused swarms strictly top-down (**coordinator -> leads -> workers** layered; **coordinator -> workers** flat) via `post_message` with a plain prompt (`resume your assigned work from where you left off`; never tell unfinished workers to jump straight to posting reports), and re-emit verbatim `open_board` on its own line (`occupiedWorkerNames` if adding workers; fresh chat between major waves).
5. On close: collect worktrees + verify bundles, post `[done]`, `swarm{action: "kill"}` workers + `monitor`, pass [Section 5](../SKILL.md#5-runtime-closure-checklist-pre-handoff-gate).

## Deliverable-First Closing

- Governance (`verdict`, `bundle`, `audit-*`, `finalize`, Section 5 closure) verifies the work; it is never a substitute for the user's deliverable.
- **Non-circular Stage 3 ordering:** Run `agy-squad finalize <record.json...> [--strict-citations]` **without `--prune`** first so verified bundle SHA-256 hashes are already on hand while loose specialist reports remain readable on disk. Then write the complete user-facing deliverable (or single-pass durable ledger) once: in **layered mode**, read verified `lead/report.md` outputs and open raw `specialist-N/report.md` only when `citations.uncarriedUrls` is non-empty, a lead verdict is non-`PASS`, or specific raw evidence is needed; in **flat mode**, synthesize directly from `specialist-N/report.md`. Finally, if report retention is `--prune`, run `agy-squad prune --records <record.json>=<accepted-sha256>... --clean-records` (or `prune <bundle.sources.json> <sha256>`). Single-step `finalize --prune` remains valid when no post-bundle SHA-256 needs to be embedded before pruning.
- Lead the final reply with the deliverable (or direct link to the synthesized artifact) and collapse verdicts, bundle SHA-256 digests, pruned counts, and Section 5 closure into a compact verification footer. Never reply with governance telemetry alone, and skip redundant closeout test reruns on read-only runs when `git status` is clean on the already-tested `HEAD`.
