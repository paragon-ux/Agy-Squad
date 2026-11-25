---
name: platform-fit
description: >-
  [Agy-Squad maintainers only: run inside an Agy-Squad source checkout; flat
  invoke_subagent only, no /swarm] Unguided multi-round root-cause audit and
  optimization of Agy-Squad against native Google Antigravity (/swarm,
  /teamwork, /boost, subagents, run_workflow) under Platform-Fit Standard v1.0.0
  in scratch/platform-fit/.
---

# Agy-Squad Platform-Fit Skill (Standard v1.0.0)

**[Agy-Squad maintainers only: run inside an Agy-Squad source checkout.]** Optimize `Agy-Squad` cold against native Antigravity (`/swarm`, `/teamwork`, `/boost`, `invoke_subagent`, `run_workflow`) from intended solutions to code/trace root causes and deterministic fixes before [`self-diagnosis`](../self-diagnosis/SKILL.md) or [`day-one-review`](../day-one-review/SKILL.md).

Guide: [`platform-fit-protocol.md`](./references/platform-fit-protocol.md)

## Invariants

1. **Always 3 Flat `invoke_subagent` Specialists (No `/swarm`):** On `r1`, `r2+`, and `raw-final`, run 3 disjoint read-only specialists in parallel (`TypeName: "self"`, `Model: "inherit"`, `Workspace: "inherit"`). Tell S1/S2 not to read other sessions' transcripts; S3 may read only the `telemetry.md` cohort UUIDs. With `Agy-Context-Saver` 2.3.0 or newer, the coordinator may run `agy-context transcript access set self-only` before dispatching anti-anchoring auditors (the policy applies to sessions that coordinator launches, and each child then reads only its own transcript). Without it, anti-anchoring is a prompt-level instruction only and is not enforced.
2. **Cadence Intake & Neutral Pre-Flight:** Ask only for cadence (`r1`, `r1 -> remediate -> r2+`, or full gate with `raw-final`) and target tier (`BEATS NATIVE` vs. `STRONG CORE: MINOR FRICTION`), zero hypotheses. Anchor in `scratch/platform-fit/`; pin factual `native-baseline.md` + raw `telemetry.md` (zero commentary).
3. **Solution-First Root-Cause Rubric (`r1` & `raw-final`):** Read-only; skip `docs/reviews/*`, `docs/plans/*`, `git log`, and prior `platform-fit-r*.md` before CLI/MCP dogfooding and S3 trace forensics. Prove: **Intended Solution -> Root Problem -> Optimization -> Cut Only as Last Resort** (falsifying native edge cases first). Grade 6 categories (`NATIVE`, `OVERHEAD`, `CONTEXT`, `WORKFLOW`, `SIGNAL`, `SAFETY`), emit the 5-Journey Matrix, and score: `BEATS NATIVE` | `STRONG CORE: MINOR FRICTION` | `SIMPLIFY BEFORE BENCHMARKING` | `REALIGN AGAINST NATIVE`.
4. **Auto-Fix `P0`-`P3`; Ask Only on `Section 8`:** Checkpoint git state, serialize to 1 coding subagent (live-symlinked skills), auto-fix non-breaking `P0`-`P3`, and redesign any ID still `Open` in `r3`. Pause only on **Section 8** (architecture/default/contract changes, benchmarks, or last-resort cuts/`SIGNAL`/`SAFETY` tradeoffs). Use Selective Resume on interruption.
5. **Cumulative `r2+` & Closure:** Keep prior `Closed` IDs as 1-line rows in Section 7, full cards for deltas, architecture/tradeoffs in Section 8, unchanged `git status -s` on read-only passes (clean commit after Stage 3), and empty `manage_subagents` (when exposed) / `manage_task` closure.

## 4-Stage Workflow

1. **Stage 1 (Intake):** Confirm cadence/target tier, resolve `<checkoutRoot>`, pin git state, write `native-baseline.md` + optional raw `telemetry.md` ([§1](./references/platform-fit-protocol.md#1-stage-1-cadence-intake-and-neutral-pre-flight)).
2. **Stage 2 (`r1`):** Run 3 cold specialists for CLI/MCP dogfooding, S3 step-trace forensics, and 5 journeys -> `platform-fit-r1.md` ([§2](./references/platform-fit-protocol.md#2-stage-2-raw-unguided-initial-audit-r1), [§3](./references/platform-fit-protocol.md#3-platform-fit-standard-v100)).
3. **Stage 3 (Remediate):** Auto-fix `P0`-`P3` (`1 ID = 1 Row`), ask only on `Section 8`, verify locally, apply Selective Resume ([§4](./references/platform-fit-protocol.md#4-stage-3-remediation-and-selective-resume)).
4. **Stage 4 (`r2+` & `raw-final`):** Run 3 specialists for cumulative `platform-fit-r2.md` (`r3`...) until target tier passes; under full gate, run 3 cold specialists for `platform-fit-raw-final.md` and close out ([§5](./references/platform-fit-protocol.md#5-stage-4-cumulative-r2-and-unanchored-raw-final)).
