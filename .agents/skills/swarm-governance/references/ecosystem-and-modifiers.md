# Ecosystem & Companion Interoperability

Companion note for [`SKILL.md`](../SKILL.md).

- **`/teamwork` exclusion:** Never stack `/teamwork` with `Agy-Squad` (`/swarm` + `swarm-governance`, `squad_planner`, `audit-<id>`).
- **`monitor`, `narrator` & `channel`:** Address `monitor`/`narrator` only when present (`[done]` without `@` stops `monitor` cron; omit `@` on worker names in narrator notes). Pass `channel` only if declared in the host schema.
- **`run_workflow` & modifiers (`/plan`, `/grill-me`, `/goal`, `/boost`):** Keep role separation, `1 ID = 1 Row`, immediate user `kill`, and [Section 5 closure](../SKILL.md#5-runtime-closure-checklist-pre-handoff-gate).
- **Optional `Agy-Context-Saver`:** Defer hook rules to its config; `Agy-Squad` emits zero `[agy-transcript-access: ...]` tags by default (opt in via line-1 tag or `agy-context transcript access`) and uses [dual-path trace inspection](./bundling-and-wire-format.md#dual-path-trace-inspection).
- **Receipts:** Spaced `-` and `--` work alongside `—` (no prose em-dash carve-out needed).
