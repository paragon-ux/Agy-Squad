# Ecosystem & Companion Interoperability

Companion note for [`SKILL.md`](../SKILL.md).

- **`/teamwork` exclusion:** Never stack `/teamwork` with `Agy-Squad` (`/swarm` + `swarm-governance`, `squad_planner`, `audit-<id>`).
- **`swarm_pane`, `monitor` & `channel`:** Write `planSquadCohort`'s `swarmPane` object to `.system_generated/swarm/plan.json` for zero-token Swarm UI Overview (do not spawn an LLM `narrator`). Address `monitor` only when present (`[done]` without `@` stops `monitor` cron); pass `channel` only if declared in the host schema.
- **Native routing (`/boost`, `run_workflow`, `invoke_subagent`) & modifiers (`/plan`, `/grill-me`, `/goal`):** Route single-target coding/debugging directly to `/boost`, 1-3 throwaway lookups to `research` subagents, and homogeneous fail-fast JSON fan-outs to `run_workflow` (keeping `Agy-Squad` when `PARTIAL` fault isolation, child `transcript.jsonl` auditing, or interactive Section 8 gates are needed). Keep role separation, `1 ID = 1 Row`, immediate user `kill`, and [Section 5 closure](../SKILL.md#5-runtime-closure-checklist-pre-handoff-gate).
- **Optional `Agy-Context-Saver`:** Defer hook rules to its config; `Agy-Squad` does not enforce transcript isolation (the coordinator may run `agy-context transcript access set self-only` with Agy-Context-Saver 2.3.0 or newer) and uses [dual-path trace inspection](./bundling-and-wire-format.md#dual-path-trace-inspection).
- **Receipts:** Spaced `-` and `--` work alongside `—` (no prose em-dash carve-out needed).
