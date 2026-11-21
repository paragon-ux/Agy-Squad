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
2. **Stage 1 Cadence Intake & `scratch/` Anchor First:** Before launching `r1`, ask the user strictly for review cadence (`r1` only, multi-round `r1 -> remediate -> r2`, or full public-launch gate adding an unanchored live `raw-final`) without asking for or injecting bug hypotheses. Anchor all review files under `scratch/day-one-review/` (or a user-designated directory) and verify exclusion from commits and release tarballs unless `docs/reviews/` is explicitly requested.
3. **Raw, Unguided Initial Pass (`r1`, Hook-Enforced Anti-Anchoring):** The initial Day-1 review MUST be strictly **read-only, raw, and unguided**, with `[agy-transcript-access: deny]` on line 1 of `r1` and `raw-final` subagent prompts whenever `Agy-Context-Saver` is installed. Do **not** read prior review ledgers (`docs/reviews/*`), internal planning docs (`docs/plans/*`), PR self-claims, or maintainer hypotheses before walking the target repo live from the outside in (including packing and installing into a disposable consumer project) across all 11 Standard `v1.5.0` categories (`ARCH`..`DEP`, `SEC`), the Cold Day-1 User-Journey Trace Matrix, and the 4-tier Ship Verdict (`SHIP NOW` | `SHIP WITH MINOR POLISH` | `FIX BEFORE RELEASE` | `HOLD BEFORE PUBLIC RELEASE`).
4. **Fix P0-P3 Automatically; Ask Only on Section 8 Residuals (with Selective Resume):** Never edit code during a review pass. Checkpoint clean git state, default to a single coding subagent whenever the target repo uses native indexers, local daemons, or DB locks (reserving parallel workers for lightweight independent modules), and remediate all concrete in-repo **P0-P3** findings automatically without asking whether to skip P3s. Route upstream dependencies, intentional behavior/contract trade-offs, policy-gated files (such as benchmark definitions), and subjective suggestions strictly to **Section 8** and ask the user only on those residuals. On any interruption, inspect `manage_subagents(Action='list')` and **resume ONLY the interrupted subagent(s)**; never message healthy running workers and never spawn duplicate replacements (run a read-only recovery audit of git diff + worker transcript first only if a worker died permanently).
5. **Cumulative Follow-Up Reviews (`r2`, `r3`, ...):** Every follow-up review explicitly builds on the initial review inside the same designated `scratch/` directory (`day-one-review-r2.md` citing `r1`), preserving every prior finding ID with updated canonical statuses, verifying fixes across primary and affected categories at the fixed revision, and tracking residuals in Section 8.

---

## Exact 4-Stage Workflow

### Stage 1: Cadence Intake, Audit Directory & State Pin
Confirm review cadence (`r1` only, `r1 -> remediate -> r2`, or full gate with `raw-final`) strictly without bug hypotheses. Establish `scratch/day-one-review/` (or the user's designated directory), verify `.gitignore`/packaging exclusions, and pin repository root, branch, `HEAD` SHA, dirty delta, and runtime environment ([protocol §1](./references/day-one-protocol.md#1-stage-1-cadence-intake--designated-audit-workspace)).

### Stage 2: Raw, Unguided Day-One Review (`r1`)
With `[agy-transcript-access: deny]` on line 1 of subagent prompts when `Agy-Context-Saver` is installed, pack the release artifact, install it into a disposable consumer project (normal + `--ignore-scripts` when applicable), compile public types strictly (`skipLibCheck: false` for TypeScript SDKs), and exercise CLI/SDK/MCP live from the outside in across all 5 Day-1 journeys and `4.11 SEC` (including linear-time regex / ReDoS and least-privilege CI workflow `permissions:` / `concurrency:` checks). Write `scratch/day-one-review/day-one-review-r1.md` following Standard `v1.5.0` Sections 1-8 (`ARCH`..`DEP`, `SEC`), the User-Journey Trace Matrix, and the 4-tier Ship Verdict ([protocol §2](./references/day-one-protocol.md#2-stage-2-raw-unguided-initial-review-r1)).

### Stage 3: Remediate P0-P3 Automatically & Decide Section 8 Residuals
Checkpoint clean git state and remediate all concrete in-repo **P0-P3** findings automatically mapped to atomic finding IDs (`1 ID = 1 Row`), defaulting to a single coding subagent when native indexers, local daemons, or DB locks are present; ask the user only on **Section 8** residual/trade-off/policy-gated items. Verify locally (`test`, `preflight`, packaging, docs/lint, ReDoS and CI workflow `permissions:`/`concurrency:` checks). On any interruption, apply the strict selective-resume and recovery-audit rules ([protocol §3](./references/day-one-protocol.md#3-stage-3-remediation-p0-p3-auto-fix-section-8-residuals--selective-resume)).

### Stage 4: Cumulative Follow-Up Reviews (`r2`, `r3`, ...), Live `raw-final` & Closure
Build `day-one-review-r2.md` (and subsequent rounds) directly on `r1` in the same audit directory until the target ship verdict passes; under the full public-launch gate (or when requested), run one fresh unanchored live consumer trial (`day-one-review-raw-final.md`, adding `[agy-transcript-access: deny]` on line 1 when `Agy-Context-Saver` is installed) before merging or tagging ([protocol §4](./references/day-one-protocol.md#4-stage-4-cumulative-follow-up-reviews--unanchored-raw-final)). Close all finished subagents (and `/swarm` members if opted in) before concluding.
