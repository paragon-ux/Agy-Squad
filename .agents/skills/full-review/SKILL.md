---
name: full-review
description: >-
  Use when the user asks for a full review, triage, diagnosis, or direction
  recommendation on Agy-Squad using repository state or supplied evidence
  (transcripts, logs, CI output, review ledgers, diffs), including work that is
  not a pull request. Applies the Agy-Squad PR Review Standard v1.3.0 as the
  report format and requires cited, commit-pinned evidence and 1-ID-per-row
  findings.
---

# Agy-Squad Full Review Skill (Standard v1.3.0)

Review a repository target, a change, or an evidence bundle, and answer the question the user actually asked. The governing format is the [Agy-Squad PR Review Standard v1.3.0](../pr-review/references/pr-review-standard.md). Read that standard completely before starting; this skill adds the non-PR intake, evidence-handling, and direction-decision procedure that the standard leaves to the PR workflow.

Passing tests, polished docs, prior approvals, and confident transcripts are inputs, not proof of the architecture or of the claimed verification.

## Use this skill when

- The user asks for a review, audit, diagnosis, triage, or root cause of Agy-Squad, a branch, commit, working tree, subsystem, skill, or document.
- The user supplies non-diff evidence (transcripts, logs, CI, ledgers, benchmarks) or asks a direction question (merge/rework, keep/close, which option, what first).
- A PR review needs evidence beyond the diff, or the standard applies to non-PR work.

For a pure PR review whose evidence is the diff and CI, the narrower `pr-review` skill is also valid. Do not use this skill for a routine status update, a narrow code question that needs no coverage/verdict, or to mix diagnosis with unauthorized edits; diagnosis and remediation stay separate.

## Non-negotiables

1. **Read the standard first.** Its ten categories, category records, finding records, evidence rules, verdict rules, and report structure are mandatory. This skill only adapts the target-pinning fields and adds a decision section.
2. **Pin the target and the evidence.** Record revisions, hashes, dirty state, access status, and what was not examined. Fetching a file is not reviewing it.
3. **Architecture before runtime.** Trace design thesis or invariant -> architecture decision -> public contract -> implementation -> verification. Existing code does not override a higher-priority contract.
4. **All ten categories, all three triage buckets.** Every category has scope, coverage, P1, P2, P3, verification, and verdict. Empty is not the same as unassessed.
5. **`1 ID = 1 Row`.** One stable ID per independently remediable problem. No umbrella IDs, ranges, merged multi-defect rows, or silent omissions. Use the six standard statuses; `Informational` is only for non-defects in Section 8.
6. **Cite evidence at the exact locator.** Source line, commit-pinned link, transcript step and timestamp, command and exit code, or external URL with access date. Label observed execution separately from source-derived inference. Never claim to have read evidence you did not examine; record unavailable evidence as a gap.
7. **Do not inherit a prior verdict or rewrite the docs to match the code.** Revalidate prior findings and explicitly accept, revise, or reject them. Record a contract mismatch as a finding.
8. **Do not calculate approval from a pass percentage, test count, or the absence of findings in an unreviewed category.**
9. **Separate content review from integrity audit.** The responsible reviewer owns content acceptance; an independent auditor owns `CLEAN`/`INTEGRITY VIOLATION` and cannot approve content. The lead re-reviews after `CLEAN`. Enforce warnings with a hard rejection/penalty path, not prose. See [review roles](references/review-roles.md).

## Workflow

### Step 0 — Frame the request

Write one sentence that states the question or decision. Record the target type and whether the user wants a review, a decision, or both.

Target types: PR/branch, working tree, commit range, repository/subsystem, evidence bundle, direction question, incident/regression. Pin a baseline and minimum evidence for each; see [references/evidence-intake.md](references/evidence-intake.md).

If the request is ambiguous, ask once, with concrete choices and a recommended default. Do not ask for facts the repository or evidence already answers. For a PR, confirm the base branch and whether the PR is stacked on an unmerged base.

### Step 1 — Pin the review

Record the standard Section 1 metadata, adapted for the target:

- Repository, target, comparison base, review date, reviewer, standard version, and every revision/tree executed.
- **Session Provenance** table: `Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked`.
- **Evidence manifest**: `EID | Artifact | Locator | SHA-256 / size | Class | Access | Examined`. Classes: repository source, normative design record, user-provided evidence, local execution, CI log, external source, prior review.
- Changed-file inventory plus unchanged dependencies examined. For non-code targets, the equivalent artifact inventory.
- Scope and exclusions. State which categories, files, and evidence items are out of scope and why.

For a new head, the previous review is invalid for changed behavior until the delta and affected categories are re-reviewed. Record which findings carry forward.

### Step 2 — Ingest evidence in batches

Large evidence is indexed once and then read at targeted locators. Never poll a transcript one or two steps at a time, and never read a whole transcript merely to say it was read.

1. Establish the artifact's size, hash, format, and entry count.
2. Extract the skeleton first: all user turns, all final assistant messages, all tool names and failures, and a step/time index.
3. Identify the decision points, reversals, explicit constraints, verdicts, and quoted claims.
4. Read targeted windows around those points. Record the exact step, timestamp, and quotation.
5. Separate user assertions, model claims, tool results, and external-source claims. A model saying it read something is not evidence that it did.
6. Record what was skipped, truncated, or inaccessible.

Use [references/evidence-intake.md](references/evidence-intake.md) for the transcript and log protocol, batch extraction recipes, hashing commands, and citation formats.

### Step 3 — Trace architecture before runtime

For each behavior or claim that matters, write the chain:

`design thesis / invariant -> architecture decision -> public contract -> implementation -> verification`

Use the repository's normative records (`docs/plans/LEDGER.md`, `docs/plans/wsl-cli-verification.md`, and historical commit `ee10ebc`) when assessing preservation or modification of invariants. Distinguish historical records, normative current contracts, as-built descriptions, and external evidence. For every intentional departure, require the recorded decision, compatibility implications, and acceptance criteria.

### Step 4 — Review the ten categories

Map every changed file or artifact to one primary category, and cross-reference affected categories without counting the same defect twice. Use the standard's category table (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`) unchanged.

For each category, record all seven items: scope, coverage, P1, P2, P3, verification, and verdict. For a category with no relevant change, write `Not applicable` with the reason; do not skip it. For reviewed scope with no defect in a bucket, write `None identified within reviewed scope`; for unreviewed scope, write `Not assessed`.

A finding quota is prohibited. "No findings" is permitted.

### Step 5 — Record findings

Follow the standard's finding record exactly:

- `P0`/`P1`/`P2`: all ten fields (title/priority/status, contract provenance, source evidence, trigger, expected/actual, impact, required remediation, acceptance evidence, root cause/related IDs, closure), concise.
- `P3`: one row per ID in the standard's compact table.
- One canonical status per item: `Open (Pre-Remediation)`, `Closed`, `Residual (Open)`, `Closed (Post-Remediation)`, `Deferred / Won't Fix`, or `Closed (By Design)`; `Informational` only for non-defects in Section 8.
- Section 8 is the mandatory sink for residuals, deferred items, by-design items, and informational observations. Do not bury them in a `Closed` row's prose.

### Step 6 — Answer direction questions

When the user asks what to do, add a **Direction decision** subsection to Section 7. It must contain:

1. **Decision question** in one sentence.
2. **Constraints** taken from the user and the governing contracts, each with a citation. Separate hard constraints from preferences.
3. **Options**, including the status quo and at least one "do less" option. For each: what it preserves, what it costs, what it depends on, reversibility, blast radius, and the evidence for and against.
4. **Recommendation** with the load-bearing evidence made explicit.
5. **Falsifiers**: what evidence would change the recommendation.
6. **Immediate next actions** in order, each with an acceptance test.
7. **What not to do**, with the evidence that rules it out.

Keep coverage and disposition separate. A recommendation to merge is invalid while a material category is unreviewed or a P1/P2 finding remains open. For a stacked PR, state the base dependency and the merge order; do not recommend merging a stacked PR as if it were independent.

### Step 7 — Write the report

Save the report under `docs/reviews/<review-slug>.md` unless the user asks for another location. Use the standard's eight mandatory sections, with Section 7 extended by the Direction decision subsection when applicable, and Section 9 only when `/self-diagnosis` cohorts were dispatched: (1) metadata, Session Provenance, evidence limits; (2) file/artifact-to-category inventory and coverage; (3) architecture-to-implementation trace; (4) ten category sections with P1/P2/P3, verification gaps, and verdicts; (5) cross-category root causes and remediation order; (6) verification record and remaining gaps; (7) overall disposition, Direction decision (if requested), finding closure; (8) Post-Remediation Residuals & Deferred Dispositions; (9) cohort/bundle ledger when applicable. Write `None (0 open residuals, 0 deferred items)` when Section 8 is empty.

Use [references/report-template.md](references/report-template.md) as the fill-in skeleton.

### Step 8 — Recheck and close

Re-review each fix in its primary category and every affected category. A fix commit is not closure. Every closed finding needs evidence at the fixed revision and a reviewer recheck. Keep residual limitations visible.

Do not recommend approval until all material categories are covered, blocking findings are resolved and rechecked, and required verification has evidence. If the evidence is insufficient, mark the review `Incomplete` and say what is missing; do not manufacture a verdict.

## Citation contract

- Code: commit-pinned link to the exact line range; for local-only reports, `path#Lx-Ly` with the SHA pinned in Section 1.
- Transcript: artifact hash in the evidence manifest, plus `step N @ ISO timestamp` and a short verbatim quotation.
- Command: working directory, exact command, exit code, and the relevant output excerpt. Do not cite a command you did not run.
- External source: title, URL, version or date, and access date. Mark inference as `Source-derived inference`, not `Observed`.
- Prior review: cite the prior report and finding ID; state accepted, revised, or rejected.

Full formats and hashing commands are in [references/evidence-intake.md](references/evidence-intake.md).

## Quality gates

Before delivering, run the checklist in [references/report-template.md](references/report-template.md#quality-gates). It covers pinning, coverage, finding records, citations, gaps, residuals, and disposition.
