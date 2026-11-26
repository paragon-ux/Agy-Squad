---
name: day-one-review
description: >-
  [Task Spec: cold Day-1 user & ship-readiness review + remediation; no /swarm
  by default] Unguided first-time-user audit and launch remediation on the
  active repo under Standard v1.6.0 in scratch/day-one-review/.
---

# Agy-Squad Day-One Review Skill (Standard v1.6.0)

Audit any repo cold as a Day-1 developer launching it tomorrow, then remediate and re-verify.

Guides: [`pr-review-standard.md`](../pr-review/references/pr-review-standard.md) | [`day-one-protocol.md`](./references/day-one-protocol.md)

## Invariants

1. **No `/swarm` by Default:** Run direct `invoke_subagent` (or single-agent). Pair with [`swarm-governance`](../swarm-governance/SKILL.md) only when requested, using flat specialists + flat `audit-<id>` ([§5](./references/day-one-protocol.md#5-explicit-swarm-opt-in)).
2. **Cadence Intake & `scratch/` Anchor:** Ask strictly for cadence (`r1` only, `r1 -> remediate -> r2`, or full gate with `raw-final`) and, on multi-round/full runs, target verdict (`SHIP NOW` vs. `SHIP WITH MINOR POLISH`) with zero hypotheses. Anchor in `scratch/day-one-review/` (confirm `.gitignore` and tarball exclusions unless `docs/reviews/` is requested).
3. **Raw, Unguided `r1` & `raw-final`:** Keep reviews read-only; tell reviewers not to read other sessions' transcripts (a prompt-level instruction unless `agy-context transcript access set self-only` was run with Agy-Context-Saver 2.3.0 or newer). Skip `docs/reviews/*`, `docs/plans/*`, `git log`, and hints before outside-in inspection (packed install, `--ignore-scripts`, `skipLibCheck: false`, `4.11 SEC` incl. `timeout 5`-bounded ReDoS probes and CI `permissions:`/`concurrency:`). Emit the User-Journey Trace Matrix and 4-tier verdict: `SHIP NOW` | `SHIP WITH MINOR POLISH` | `FIX BEFORE RELEASE` | `HOLD BEFORE PUBLIC RELEASE`.
4. **Auto-Fix P0-P3; Ask Only on `Section 8`:** Checkpoint clean git state, serialize to 1 coding subagent when indexers, daemons, DB locks, or live symlinked plugin/hook files exist, and auto-fix in-repo P0-P3. If an ID stays `Open` in `r3`, replace the underlying design instead of patching again. Route upstream deps, contract trade-offs, policy-gated files, and subjective polish strictly to **Section 8** and ask only on those. On interruption, check `manage_subagents(Action='list')` (when exposed) and resume only interrupted subagents (read-only recovery audit first if dead).
5. **Cumulative `r2+`:** Keep previously `Closed` P1/P2 items as 1-line rows in Section 7 (referencing `r<N>`), reserve full 10-field cards for findings opened, re-opened, or closed in the current round, and keep residual/deferred/by-design statuses in **Section 8**.

## 4-Stage Workflow

1. **Stage 1 (Intake):** Confirm cadence/target verdict, verify `scratch/day-one-review/` exclusions, and pin repo/branch/`HEAD`/runtime ([§1](./references/day-one-protocol.md#1-stage-1-cadence-intake-and-audit-workspace)).
2. **Stage 2 (`r1`):** Run unanchored consumer install, 5 journeys, and `4.11 SEC`, writing `day-one-review-r1.md` ([§2](./references/day-one-protocol.md#2-stage-2-raw-unguided-initial-review-r1)).
3. **Stage 3 (Remediate):** Auto-fix P0-P3 (`1 ID = 1 Row`), ask only on `Section 8`, run local/packaging/security checks, and apply selective resume ([§3](./references/day-one-protocol.md#3-stage-3-remediation-and-selective-resume)).
4. **Stage 4 (`r2+` & `raw-final`):** Write cumulative `day-one-review-r2.md` until target verdict passes; under full gate, run unanchored `day-one-review-raw-final.md` and close workers ([§4](./references/day-one-protocol.md#4-stage-4-cumulative-follow-ups-and-raw-final)).
