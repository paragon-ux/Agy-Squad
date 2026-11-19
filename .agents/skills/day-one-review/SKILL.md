---
name: day-one-review
description: >-
  [Task Spec: raw, unguided Day-1 user & ship-readiness review + remediation
  workflow; no /swarm by default (flat category /swarm opt-in only)] Use when
  the user asks for a Day-1 review, cold first-time-user audit, or public
  launch-readiness review and remediation on the active repository. Defaults to
  direct subagents or single-agent execution under scratch/day-one-review/
  using PR Review Standard v1.5.0 (ARCH..DEP, SEC), with raw unguided initial
  passes, interruption-safe selective subagent resume, and cumulative follow-up
  reviews.
---

# Agy-Squad Day-One Review Skill (Standard v1.5.0)

Audit any repository from the outside in as a cold Day-1 developer installing and using it publicly tomorrow, then remediate confirmed findings and verify iteratively without digressing. The governing report contract is [PR Review Standard v1.5.0](../pr-review/references/pr-review-standard.md). Consult [references/day-one-protocol.md](./references/day-one-protocol.md), [Day-One review guide](https://paragon-ux.github.io/Agy-Squad/skills/day-one-review/), [Core workflows](https://paragon-ux.github.io/Agy-Squad/core-workflows/), and [Roles & skill workflows](https://paragon-ux.github.io/Agy-Squad/roles-and-workflows/).

---

## Invariants

1. **No `/swarm` by Default (Flat Category `/swarm` Opt-In Only):** Run via direct `invoke_subagent` (or single-agent audit for small repos) by default to avoid `/swarm` overhead and digression. ONLY when the user explicitly requests `/swarm`, pair with [`swarm-governance`](../swarm-governance/SKILL.md) using a **flat `/swarm`** split into **category-scoped read-only specialists** for the requested target repository plus **one flat Integrity Auditor (`audit-<id>`)** ([protocol §5](./references/day-one-protocol.md#5-explicit-swarm-opt-in-flat-category-specialists--flat-auditor)).
2. **Designated `scratch/` Audit Directory First:** Anchor all review files under `scratch/day-one-review/` (or a user-designated directory) before starting inspection. Verify the audit directory is excluded from commits and release tarballs unless the user explicitly asks to commit under `docs/reviews/`.
3. **Raw, Unguided Initial Pass (`r1`, Anti-Anchoring Rule):** The initial Day-1 review MUST be strictly **read-only, raw, and unguided**. Do **not** read prior review ledgers (`docs/reviews/*`), internal planning docs (`docs/plans/*`), PR self-claims, or maintainer hypotheses before forming independent findings from the outside in across all 11 Standard `v1.5.0` categories (`ARCH`–`DEP`, `SEC`), the Cold Day-1 User-Journey Trace Matrix, and a Ship Verdict (`SHIP NOW` | `SHIP WITH QUICK FIXES` | `HOLD BEFORE PUBLIC RELEASE`).
4. **Separate Remediation & Interruption-Safe Selective Resume:** Never edit code during a review pass. Checkpoint clean git state before coding subagents edit files and scope workers strictly to recorded atomic finding IDs (`1 ID = 1 Row`). If implementation is interrupted, inspect `manage_subagents(Action='list')` and **resume ONLY the interrupted subagent(s)**; never message still-running subagents and never spawn duplicate new subagents over existing work. If an interrupted worker exited permanently mid-edit, run a read-only recovery audit first (git diff + worker transcript including tool calls) before completing only the unremediated remainder.
5. **Cumulative Follow-Up Reviews (`r2`, `r3`, ...):** Every follow-up review explicitly builds on the initial review inside the same designated `scratch/` directory (`day-one-review-r2.md` citing `r1`), preserving every prior finding ID with updated canonical statuses, verifying fixes across primary and affected categories at the fixed revision, and tracking residuals in Section 8.

---

## Exact 4-Stage Workflow

### Stage 1: Anchor Audit Directory & Pin State
Establish `scratch/day-one-review/` (or the user's designated directory), verify `.gitignore`/packaging exclusions, and pin repository root, branch, `HEAD` SHA, dirty delta, and runtime environment.

### Stage 2: Raw, Unguided Day-One Review (`r1`)
Inspect the target repository cold from the outside in: (1) First 60 seconds (`README`, visuals/jargon, Quickstart, metadata), (2) Clean install/setup/upgrade/rollback, (3) Everyday usage in an unrelated user project, (4) Security & trust boundaries (`4.11 SEC`), and (5) Packaging/CI/release pipeline. Write `scratch/day-one-review/day-one-review-r1.md` following Standard `v1.5.0` Sections 1–8 (`ARCH`–`DEP`, `SEC`), the User-Journey Trace Matrix, and a Ship Verdict ([protocol §2](./references/day-one-protocol.md#2-stage-2-raw-unguided-initial-review-r1)).

### Stage 3: Remediate Findings (with Selective Resume)
Once remediation scope (e.g., P0–P2 vs. P0–P3) is confirmed, checkpoint clean git state, dispatch coding subagents mapped to atomic finding IDs, and verify locally (`test`, `preflight`, packaging, docs/lint). On any interruption, apply the strict selective-resume and recovery-audit rules ([protocol §3](./references/day-one-protocol.md#3-stage-3-remediation--interruption-safe-selective-resume)).

### Stage 4: Cumulative Follow-Up Reviews (`r2`, `r3`, ...) & Closure
Build `day-one-review-r2.md` (and subsequent rounds) directly on `r1` in the same audit directory until blocking findings close cleanly; run an optional unanchored `day-one-review-raw-final.md` before final release if requested ([protocol §4](./references/day-one-protocol.md#4-stage-4-cumulative-follow-up-reviews--optional-raw-final)). Close all finished subagents (and `/swarm` members if opted in) before concluding.
