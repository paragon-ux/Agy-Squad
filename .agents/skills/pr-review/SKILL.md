---
name: pr-review
description: >-
  [Task Spec: PR/branch diff & CI review; pair with swarm-governance on /swarm]
  Use this skill when the user asks to perform, update, or verify a pull request
  or branch review in Agy-Squad. Enforces the Agy-Squad PR Review Standard
  (v1.4.0) with commit-pinned and session-pinned metadata, architecture-before-runtime
  tracing, ten mandatory categories (ARCH, DOC, SKILL, MCP, RUN, SVC, DB,
  SCRIPT, TEST, DEP), 1-ID-per-row finding records, post-remediation residual
  tracking, and structured reports under docs/reviews/.
---

# Agy-Squad PR Review Skill (Standard v1.4.0)

Conduct pull request and branch diff/CI reviews in `Agy-Squad`. For broad non-diff evidence bundles, repo-wide triage, or Direction decisions, use [`full-review`](../full-review/SKILL.md). To run multi-agent reviews on `/swarm`, pair this **Task Spec** with [`swarm-governance`](../swarm-governance/SKILL.md) (which owns `squad_planner` / `node bin/agy-squad.mjs plan`, `open_board`, `swarm_wait`, pointer receipts, and closure; `dispatch_squad` / `agy-squad dispatch` is `invoke_subagent` fallback only). Consult [references/pr-review-standard.md](./references/pr-review-standard.md), [Core workflows](../../../docs/core-workflows.md), and [Roles & skill workflows](../../../docs/roles-and-workflows.md#pr-review).

---

## Invariants

1. **Architecture Before Runtime:** Verify `design thesis -> decision -> contract -> implementation -> verification` against the target repository's architecture docs or ADRs (if present), separating active normative contracts, retired/superseded designs, and external records. Never rewrite contracts to match defective code.
2. **Ten Mandatory Categories & Zero Finding Quotas:** Map every changed artifact to one primary category (`ARCH`..`DEP`) and cross-reference affected categories without double-counting ("No findings" is valid; mark `DB` Not applicable for filesystem-only persistence).
3. **Evidence Separation & Runtime Boundaries:** Separate source inspection, local runs, and CI logs; verify [pr-review-standard.md Section 6](./references/pr-review-standard.md#6-evidence-rules) boundaries (JSON-RPC/stdio framing, workspace/fd containment + cross-platform parity, built-in `TypeName`/provenance/overlap guards, `<= 500` B `READY`/`PARTIAL`/`NO_REPORT` grammar, `auditPolicy` + `Evidence Digest: <64-hex>` + `Target Squad`, and stdio MCP vs `node bin/agy-squad.mjs` CLI execution).
4. **Strict Content vs. Integrity Gate:** Keep `Content Verdict: PASS | FAIL | BLOCKED` separate from flat Integrity Auditor `Target Squad: <id>` + `Evidence Digest: <64-hex>` + `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` (`audit-<id>` on `/swarm` or `integrity_auditor[:<id>]` on `invoke_subagent`; `adversarial_*` retired). Finalize Approve only after CLEAN and post-fix re-verification.
5. **1 ID = 1 Row & Plain-Text Readability:** Assign one stable ID per distinct defect using the 6 canonical statuses (Open (Pre-Remediation), Closed, Residual (Open), Closed (Post-Remediation), Deferred / Won't Fix, Closed (By Design)). Reserve the five Section 8 statuses (Residual (Open), Closed (Post-Remediation), Deferred / Won't Fix, Closed (By Design), Informational) exclusively for Section 8 (never Sections 4–7 or Section 9 Wave Ledgers). Reserve inline backticks strictly for code identifiers, paths, flags, commands, and literal machine-parsed verdict declarations.

---

## Workflow

### Step 0: Pre-Flight Intake
Use [`swarm-governance` Step 0](../swarm-governance/SKILL.md#step-0-pre-flight-intake-ask-when-unspecified) (`Flat` vs `Layered` with zero default bias, `workspaceIsolation`, `Scope 2`/`Scope 3` retention, model) or `Single-Agent Audit` when topology, isolation, model, or retention is unspecified, and confirm the flat Integrity Auditor gate (`audit-<id>` / `integrity_auditor[:<id>]`).

### Step 1: Pin Review & Session Provenance
Record repository, PR/branch/tree state, date, reviewer, standard `1.4.0`, base/head SHAs, dirty delta, CI SHAs, **Session Provenance**, inventory/exclusions, and primary evidence (target repository architecture docs/ADRs if present, `.github/workflows/ci.yml`, and cross-platform verification records).

### Step 2: Trace Architecture Before Runtime
Document `design thesis -> decision -> contract -> implementation -> verification` against the target repository's architecture docs or ADRs (if present) before running or trusting runtime checks.

### Steps 3–4: Category Review, Verification & Findings
Evaluate all primary/affected categories (`ARCH`–`DEP`), coordinate `/swarm` waves via [`swarm-governance`](../swarm-governance/SKILL.md), and record atomic IDs using [pr-review-standard.md Sections 4–5](./references/pr-review-standard.md) (``#### `<ID>`: <Title> | <Priority> | <Status>`` 10-field records for P0–P2; 1-row-per-ID tables for P3).

### Step 5: Verdict, Re-Verification & Closure (`docs/reviews/`)
Request changes if P1/P2 blockers remain; mark Incomplete if a material category is unreviewed; recommend Approve only after coverage, CLEAN audit, re-verification at the fixed revision, and evidence. Write `docs/reviews/<review-slug>.md` with Sections 1–8 (`None (0 open residuals, 0 deferred items)` if Section 8 is empty) plus Section 9 when `/self-diagnosis` cohorts run.
