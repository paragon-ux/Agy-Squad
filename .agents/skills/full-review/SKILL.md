---
name: full-review
description: >-
  [Task Spec: non-diff triage, evidence bundles & Direction decisions; pair with
  swarm-governance on /swarm] Use when the user asks for a full review, triage,
  diagnosis, or direction recommendation on the active repository using
  repository state or supplied evidence (transcripts, logs, CI output, review
  ledgers, diffs), including work that is not a pull request. Applies the
  Agy-Squad PR Review Standard v1.5.0 with cited, commit-pinned evidence and
  1-ID-per-row findings.
---

# Agy-Squad Full Review Skill (Standard v1.5.0)

Review a repository target, change, or evidence bundle and answer the question the user asked. This skill is a **Task Spec** for non-diff reviews, evidence triage, and direction decisions (distinct from `pr-review` for branch/PR diffs, `day-one-review` for raw cold first-time-user launch reviews, and `self-diagnosis` for maintainer harness self-audits). When executed as a team or `/swarm`, compose it with the `swarm-governance` **Execution Modifier** and choose `squad_planner` (`agy-squad plan`) for `/swarm` or `dispatch_squad` (`agy-squad dispatch`) for `invoke_subagent`.

The governing report contract is [Agy-Squad PR Review Standard v1.5.0](../pr-review/references/pr-review-standard.md); see [Roles & skill workflows](https://paragon-ux.github.io/Agy-Squad/roles-and-workflows/#full-review) for the composition matrix, MCP/CLI surface map, and 4-check runtime closure gate. Passing tests, docs, prior approvals, and transcripts are inputs, not proof of architecture or claimed verification.

## Use this skill when

- The user asks for a review, audit, triage, or root cause of the active repository, a commit range, subsystem, skill, or document beyond a single PR diff.
- The user supplies non-diff evidence (transcripts, logs, CI runs, ledgers, benchmarks) or asks a direction question (merge/rework, keep/close, option selection, sequencing).
- A PR review needs multi-artifact evidence or a Direction decision section.

For a standard PR/branch diff without non-diff direction framing, prefer `pr-review`. Keep diagnosis separate from unauthorized code edits.

## Invariants (Non-negotiables)

1. **Read the standard first.** Enforce [pr-review-standard.md](../pr-review/references/pr-review-standard.md) Sections 1–9 (categories, schema, evidence rules, `1 ID = 1 Row`, exclusive Section 8 statuses); this skill adds non-PR evidence intake and Direction decisions.
2. **Pin & trace before runtime.** Record revisions, SHA-256s, dirty state, access status, and exclusions; trace `invariant -> architecture decision -> public contract -> implementation -> verification` before judging behavior.
3. **Eleven categories, zero quotas & strict role separation.** Populate all eleven categories (`ARCH`–`DEP`, `SEC`) with scope, coverage, P1/P2/P3 buckets, verification, and verdict (Not applicable for `DB` on filesystem-only state). Content lead owns `Content Verdict: PASS | FAIL | BLOCKED`; flat Integrity Auditor (`audit-<id>` / `integrity_auditor[:<target>]`) owns `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` ([review roles](references/review-roles.md)); lead re-reviews after CLEAN.
4. **Cite exact locators & enforce readability.** Separate observed execution from `Source-derived inference` (commit-pinned `path#Lx-Ly`, transcript `SHA-256 + step N @ ISO`, command + cwd + exit code, URL + date, prior review ID + `accepted/revised/rejected`). Reserve backticks for identifiers, paths, flags, commands, and literal machine-parsed verdict lines only (never plain numbers or standalone status/disposition labels).

## Workflow

### Step 0: Frame Request & `/swarm` Intake
1. State the review/direction question in one sentence, name the target type, and pin minimum evidence per [references/evidence-intake.md](references/evidence-intake.md).
2. Confirm ambiguity once upfront without asking facts visible in git/evidence; on `/swarm`, delegate neutral Step 0 intake, `open_board`, `swarm_wait`, board scoping (`read_board{since|seqs}`), multi-cycle continuation, and shutdown to [`swarm-governance`](../swarm-governance/SKILL.md#step-0-pre-flight-intake-ask-when-unspecified) and [swarm intake & UI lifecycle](../swarm-governance/references/intake-and-planning.md#step-0-intake-question-templates).

### Steps 1–4: Pin, Batch-Ingest, Trace & Triage
1. Populate [report-template.md](references/report-template.md) Sections 1–3 (Target, Session Provenance, Evidence manifest, coverage, architecture trace against the target repository's architecture docs or ADRs if present and `.github/workflows/ci.yml`).
2. Index large transcripts/logs once via batch reads ([evidence-intake.md](references/evidence-intake.md)), never step-by-step polling; separate claims, tool outputs, and gaps.
3. Triage `ARCH`–`DEP` and `SEC` in Sections 4–6 and route all residual/deferred/by-design/informational items exclusively to Section 8.

### Step 5: Direction Decision (when requested)
Add Section 7.2 (**Decision question**, **Constraints**, **Options** table including status quo & minimal option, **Recommendation** with load-bearing evidence, **Falsifiers**, ordered **Immediate next actions**, **What not to do**). Never recommend merging while material categories are unreviewed or P1/P2 blockers stay open.

### Step 6: Write, Recheck, and Close
Format via [report-template.md](references/report-template.md) (omit Section 9 unless `/self-diagnosis` cohorts ran; `None (0 open residuals, 0 deferred items)` when Section 8 is empty), saving under `docs/reviews/<review-slug>.md` when the repository already has `docs/reviews/` or the user explicitly requests an in-repo ledger (otherwise deliver the report in chat or the Antigravity artifact directory without creating an untracked `docs/reviews/` folder). Recheck fixes across affected categories at the fixed revision, and pass [quality gates](references/report-template.md#quality-gates).
