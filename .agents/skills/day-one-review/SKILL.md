---
name: day-one-review
description: >-
  [Task Spec: raw, unguided Day-1 user & ship-readiness review + remediation;
  no /swarm by default] Cold first-time-user audit and public-launch
  remediation on the active repository under PR Review Standard v1.5.0
  (ARCH..DEP, SEC), defaulting to direct subagents or single-agent execution
  under scratch/day-one-review/.
---

# Agy-Squad Day-One Review Skill (Standard v1.5.0)

Audit any repo cold as a Day-1 developer launching it publicly tomorrow, then remediate and verify iteratively.

Guides: [`pr-review-standard.md`](../pr-review/references/pr-review-standard.md) | [`day-one-protocol.md`](./references/day-one-protocol.md) | [Day-One guide](https://paragon-ux.github.io/Agy-Squad/skills/day-one-review/) | [Roles & workflows](https://paragon-ux.github.io/Agy-Squad/roles-and-workflows/)

## Invariants

1. **No `/swarm` by Default:** Run direct `invoke_subagent` (or single-agent). Pair with [`swarm-governance`](../swarm-governance/SKILL.md) ONLY when requested, using flat category specialists + flat `audit-<id>` ([§5](./references/day-one-protocol.md#5-explicit-swarm-opt-in)).
2. **Cadence Intake & `scratch/` Anchor:** Before `r1`, ask strictly for cadence (`r1` only, `r1 -> remediate -> r2`, or full launch gate adding `raw-final`) with zero bug hypotheses. Anchor under `scratch/day-one-review/` (confirm `.gitignore` and tarball exclusions unless `docs/reviews/` is explicitly requested).
3. **Raw, Unguided `r1` & `raw-final`:**
   - Keep reviews read-only; prepend `[agy-transcript-access: deny]` on line 1 of `r1`/`raw-final` prompts when `Agy-Context-Saver` is installed.
   - Read no `docs/reviews/*`, `docs/plans/*`, `git log`, or hints before live outside-in inspection (packed consumer install, `--ignore-scripts`, `skipLibCheck: false`, `4.11 SEC` incl. ReDoS and CI `permissions:`/`concurrency:`).
   - Emit the User-Journey Trace Matrix and 4-tier verdict: `SHIP NOW` | `SHIP WITH MINOR POLISH` | `FIX BEFORE RELEASE` | `HOLD BEFORE PUBLIC RELEASE`.
4. **Auto-Fix P0-P3; Ask Only on `Section 8`:**
   - Checkpoint clean git state, default to 1 coding subagent when indexers/daemons/DB locks exist, and fix all in-repo P0-P3 defects automatically.
   - Route upstream deps, contract trade-offs, policy-gated files, and subjective polish strictly to **Section 8** and ask only on those.
   - On interruption, check `manage_subagents(Action='list')` and resume ONLY interrupted subagents (read-only diff + transcript recovery audit first only if dead).
5. **Cumulative `r2+`:** Build follow-ups on `r1` in the same dir, preserving every prior ID in Sections 4-7 (`Open (Pre-Remediation)` / `Closed`) while keeping residual/deferred/by-design statuses exclusively in **Section 8**.

## 4-Stage Workflow

1. **Stage 1:** Confirm cadence (zero hypotheses), verify `scratch/day-one-review/` exclusions, pin repo/branch/`HEAD`/runtime ([§1](./references/day-one-protocol.md#1-stage-1-cadence-intake-and-audit-workspace)).
2. **Stage 2 (`r1`):** Run unanchored consumer install (`skipLibCheck: false`), 5 journeys, `4.11 SEC` (ReDoS, CI `permissions:`), writing `day-one-review-r1.md` ([§2](./references/day-one-protocol.md#2-stage-2-raw-unguided-initial-review-r1)).
3. **Stage 3 (Remediate):** Auto-fix P0-P3 (`1 ID = 1 Row`), ask only on `Section 8` residuals, run local/packaging/security checks, apply selective resume ([§3](./references/day-one-protocol.md#3-stage-3-remediation-and-selective-resume)).
4. **Stage 4 (`r2+` & `raw-final`):** Write cumulative `day-one-review-r2.md` until verdict passes; under full gate, run unanchored `day-one-review-raw-final.md` and close workers ([§4](./references/day-one-protocol.md#4-stage-4-cumulative-follow-ups-and-raw-final)).
