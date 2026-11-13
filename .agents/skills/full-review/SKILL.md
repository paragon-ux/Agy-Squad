---
name: full-review
description: >-
  [Task Spec — non-diff triage, evidence bundles & Direction decisions; pair with
  swarm-governance on /swarm] Use when the user asks for a full review, triage,
  diagnosis, or direction recommendation on Agy-Squad using repository state or
  supplied evidence (transcripts, logs, CI output, review ledgers, diffs),
  including work that is not a pull request. Applies the Agy-Squad PR Review
  Standard v1.3.0 with cited, commit-pinned evidence and 1-ID-per-row findings.
---

# Agy-Squad Full Review Skill (Standard v1.3.0)

Review a repository target, change, or evidence bundle and answer the question the user asked. This skill is a **Task Spec** for non-diff reviews, evidence triage, and direction decisions (distinct from `pr-review` for branch/PR diffs and `self-diagnosis` for automated harness self-audits). When executed as a team or `/swarm`, compose it with the `swarm-governance` **Execution Modifier** and choose `squad_planner` (`node bin/agy-squad.mjs plan`) for `/swarm` or `dispatch_squad` (`node bin/agy-squad.mjs dispatch`) for `invoke_subagent`.

The governing report contract is [Agy-Squad PR Review Standard v1.3.0](../pr-review/references/pr-review-standard.md); see [Roles & skill workflows](../../../docs/roles-and-workflows.md#full-review) for the composition matrix, MCP/CLI surface map, and 4-check runtime closure gate. Passing tests, docs, prior approvals, and transcripts are inputs, not proof of architecture or claimed verification.

## Use this skill when

- The user asks for a review, audit, triage, or root cause of Agy-Squad, a commit range, subsystem, skill, or document beyond a single PR diff.
- The user supplies non-diff evidence (transcripts, logs, CI runs, ledgers, benchmarks) or asks a direction question (merge/rework, keep/close, option selection, sequencing).
- A PR review needs multi-artifact evidence or a Direction decision section.

For a standard PR/branch diff without non-diff direction framing, prefer `pr-review`. Keep diagnosis separate from unauthorized code edits.

## Non-negotiables

1. **Read the standard first.** Its ten categories, category records, finding schema, status enums, evidence rules, and report structure are mandatory; this skill adds non-PR intake and Direction decisions.
2. **Pin target and evidence.** Record revisions, SHA-256 hashes, dirty state, access status, and unexamined scope.
3. **Architecture before runtime.** Trace `design thesis / invariant -> architecture decision -> public contract -> implementation -> verification` before judging behavior; record contract mismatches as findings.
4. **All ten categories, all three triage buckets.** Every category (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`) records scope, coverage, P1, P2, P3, verification, and verdict (`Not applicable` or `None identified within reviewed scope` or `Not assessed` — never silent skips).
5. **`1 ID = 1 Row`.** One stable ID per independently remediable defect (no umbrella ranges or silent drops). One canonical status per row; `Informational` applies only to non-defects in Section 8.
6. **Cite exact locators and label evidence.** Cite commit-pinned line ranges, transcript steps/timestamps, exact commands + exit codes, or dated URLs. Separate observed execution from `Source-derived inference`.
7. **Do not inherit prior verdicts or waive findings from pass counts.** Revalidate prior items explicitly (accept, revise, or reject).
8. **Separate content acceptance from integrity audit.** Content reviewer/lead owns `PASS`/`FAIL`/`BLOCKED` (or `APPROVE`/`REQUEST_CHANGES`); an independent auditor (`audit-<id>` on `/swarm` or `integrity_auditor[:<target>]` via slot) owns `CLEAN`/`INTEGRITY VIOLATION` and cannot waive content defects. Lead re-reviews after `CLEAN`. See [review roles](references/review-roles.md).
9. **Enforce report readability.** Reserve inline backticks for code identifiers, file paths, flags, CLI commands, and verdict enums. Write plain numbers, counts, English statuses, labels, and quoted sentences as clean prose (no backtick-pill clutter).

## Workflow

### Step 0 — Frame the request and execution mode

1. State the decision/review question in one sentence, name the target type (`PR/branch`, `working tree`, `commit range`, `repository/subsystem`, `evidence bundle`, `direction question`, or `incident/regression`), and pin minimum evidence per [references/evidence-intake.md](references/evidence-intake.md).
2. Check ambiguity once upfront without asking for facts already visible in git/evidence:
   - If stacked on an unmerged PR base, confirm base branch and merge order.
   - If running with `/swarm` and topology (`Flat` vs `Layered`) or workspace isolation (`inherit` vs `share` vs `branch`) is unspecified, **ask the user** rather than imposing a default topology bias; on launch, verify pinned models via `swarm{action: "status"}` and end that turn with `open_board` (`[Open the Swarm UI](sidecar://swarm/swarm_board/)`) on its own line so the Swarm UI pill renders immediately.

### Step 1 — Pin the review

Populate Section 1 of [references/report-template.md](references/report-template.md): repository, target, base, date, reviewer, standard version, executed trees, **Session Provenance** table, **Evidence manifest**, artifact inventory, and explicit scope/exclusions. For a new `HEAD`, invalidate affected prior conclusions and state which prior findings carry forward.

### Step 2 — Ingest evidence in batches

Index large transcripts/logs once and read targeted windows (never poll step-by-step):
1. Record size, SHA-256 hash, format, and entry count.
2. Extract skeleton first (user turns, final messages, tool names/failures, step/time index).
3. Inspect targeted windows around decision points, reversals, constraints, verdicts, and quoted claims.
4. Separate user assertions, model claims, tool outputs, and external claims; log skipped or truncated ranges.

See [references/evidence-intake.md](references/evidence-intake.md) for batch extraction and hashing commands.

### Step 3 — Trace architecture before runtime

Trace `design thesis / invariant -> architecture decision -> public contract -> implementation -> verification` using normative records (`docs/plans/LEDGER.md`, `docs/plans/wsl-cli-verification.md`, commit `ee10ebc`). Distinguish historical design records from active contracts and note compatibility impacts of intentional changes.

### Step 4 — Review the ten categories & record findings

Map each artifact to one primary category and cross-reference secondary impacts without double-counting. Record concise 10-field blocks for `P0`/`P1`/`P2` and `1 ID = 1 Row` table entries for `P3` per [pr-review-standard.md](../pr-review/references/pr-review-standard.md). Use Section 8 (`Post-Remediation Residuals & Deferred Dispositions`) as the mandatory sink for residuals, deferred proposals, by-design closures, and informational items. A zero-finding ("No findings") result is valid; finding quotas are prohibited.

### Step 5 — Answer direction questions (when requested)

Add a **Direction decision** subsection to Section 7 containing:
1. One-sentence **Decision question**.
2. Cited **Constraints** (hard constraints vs preferences).
3. **Options** (including status quo and a minimal/do-less option) with preserved invariants, costs, dependencies, reversibility, blast radius, and pros/cons evidence.
4. **Recommendation** with load-bearing evidence, **Falsifiers**, ordered **Immediate next actions** (each with an acceptance test), and **What not to do**.

Keep coverage and disposition separate: do not recommend merging while material categories are unreviewed or P1/P2 blockers stay open.

### Step 6 — Write, recheck, and close

Save under `docs/reviews/<review-slug>.md` using [references/report-template.md](references/report-template.md) (omit Section 9 unless `/self-diagnosis` cohorts ran; write `None (0 open residuals, 0 deferred items)` if Section 8 is empty). Recheck fixes against primary and cross-referenced categories at the fixed revision—a fix commit alone is not closure. Before delivering, verify all checks in [references/report-template.md](references/report-template.md#quality-gates).

## Citation contract

- **Code:** commit-pinned `path#Lx-Ly` with `HEAD`/tree pinned in Section 1.
- **Transcript:** manifest SHA-256 hash, `step N @ ISO timestamp`, and verbatim quote.
- **Command:** working directory, exact command, exit code, and observed output excerpt.
- **External source:** title, URL, version/date, access date; label inference as `Source-derived inference`.
- **Prior review:** prior report + finding ID + explicit status (`accepted`, `revised`, or `rejected`).
