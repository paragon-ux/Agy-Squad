# `day-one-review`: Cold First-Time-User Launch Audit & Remediation

Use `day-one-review` when auditing a repository from the perspective of a cold Day-1 developer installing and using it publicly tomorrow, then remediating confirmed findings and running cumulative follow-up reviews without digression.

- **Source specification:** [`.agents/skills/day-one-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/day-one-review/SKILL.md)
- **Protocol reference:** [`day-one-protocol.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/day-one-review/references/day-one-protocol.md)
- **Governing standard:** [PR Review Standard v1.5.0](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md)
- **Canonical role map & closure gate:** [Roles, skill workflows, and runtime closure](../roles-and-workflows.md)

## Execution defaults vs. explicit `/swarm` opt-in

- **Default (no `/swarm`):** Runs via direct `invoke_subagent` or single-agent execution to stay focused and avoid `/swarm` board overhead.
- **Explicit `/swarm` opt-in:** Only when the user explicitly asks for `/swarm`, pair with [`swarm-governance`](swarm-governance.md) using a **flat `/swarm`** compiled via `squad_planner` (`agy-squad plan --topology flat --read-only`), split into category-scoped read-only specialists tailored to the target repository plus **one flat Integrity Auditor (`audit-<id>`)** (structurally matching flat `self-diagnosis`, generalized for any target repository).

## Exact 4-stage workflow

1. **Stage 1: Anchor the `scratch/` audit workspace:** Start under `scratch/day-one-review/` (or a user-designated path), confirm `.gitignore` and release-tarball exclusion so audit artifacts never ship accidentally (use `docs/reviews/` only if explicitly requested), and pin branch, `HEAD` SHA, dirty delta, and runtime environment.
2. **Stage 2: Raw, unguided initial review (`r1`):** Enforces a strict **Anti-Anchoring Rule**. On `r1`, do **not** read prior review ledgers (`docs/reviews/*`), internal planning docs (`docs/plans/*`), PR self-claims, or maintainer hypotheses before walking the target repository from the outside in:
   - First 60 seconds (`README`, diagrams/jargon, Quickstart, package/site metadata)
   - Clean install, setup, upgrade, and rollback (fresh host, off-`PATH`, cross-OS)
   - Everyday usage inside an unrelated user project (zero checkout assumptions, error clarity, friction)
   - Security and trust boundaries (`4.11 SEC`: execution surface, downloads/checksums, permissions, secret hygiene, uninstall cleanliness)
   - Packaging, CI, and release pipeline (tarball allowlist, exact artifact publish, multi-OS CI)
   Write `scratch/day-one-review/day-one-review-r1.md` conforming to Standard `v1.5.0` Sections 1–8 (`ARCH`–`DEP`, `SEC`), the **Cold Day-1 User-Journey Trace Matrix**, and an explicit **Ship Verdict** (`SHIP NOW` | `SHIP WITH QUICK FIXES` | `HOLD BEFORE PUBLIC RELEASE`).
3. **Stage 3: Scoped remediation & interruption-safe selective resume:** Keep code edits separate from review passes. Confirm scope (e.g., P0–P2 vs. P0–P3), checkpoint clean git state, and dispatch coding subagents mapped strictly to recorded atomic finding IDs (`1 ID = 1 Row`).
   - **Interruption rule:** If remediation is interrupted (rate limit, timeout, disconnect, pause), inspect `manage_subagents(Action='list')` and **resume ONLY the interrupted subagent(s)**. Never send unsolicited messages to healthy running workers and never spawn duplicate replacement subagents over existing work. Only if a subagent permanently died mid-edit, run a read-only recovery audit first (git diff + worker transcript including tool calls) before finishing only the unremediated remainder.
4. **Stage 4: Cumulative follow-up reviews (`r2`, `r3`, ...) & optional raw final:** Follow-up reviews build directly on `r1` inside the same audit directory (`day-one-review-r2.md` linking `Prior review: day-one-review-r1.md`), carrying forward every prior finding ID with updated canonical statuses, re-verifying fixes across primary and affected categories, and tracking Section 8 residuals. Run an optional unanchored `day-one-review-raw-final.md` with a fresh cold reviewer before final release if requested.
