# Agy-Squad PR Review Standard

Version: 1.1.0
Status: Active repository workflow standard (enforced by `.agents/skills/pr-review/SKILL.md` and `.agents/skills/self-diagnosis/SKILL.md`)
Established: 2026-11-08

## Purpose and authority

A review must make its coverage, reasoning, findings, and evidence inspectable by category. Passing tests, a polished change document, and a previous approval are inputs; none establishes that the implementation satisfies its architecture.

Use this standard for a PR review. Implementation status updates are separate from that review.

Changes to this standard require a version bump, a rationale, and a PR that identifies which review requirements change. A reviewer cannot silently omit or weaken a category. This is a repository workflow contract, not a claim that GitHub branch protection or an automated merge gate has been installed.

## 1. Pin the review

Record:

- Repository, PR URL, review date, reviewer, standard version, base SHA, and head SHA.
- Exact commit or tree executed by each cited CI run. Distinguish a PR head from GitHub's generated merge commit.
- Changed-file inventory from the base/head comparison, plus unchanged dependencies examined.
- Evidence actually available: repository sources, normative design records (`docs/plans/LEDGER.md`, `docs/plans/wsl-cli-verification.md`, base commit `ee10ebc`), prior review, transcript, local reproduction, and CI logs. State when an attachment or environment was unavailable.
- Scope and exclusions. Fetching a file is not the same as reviewing it.

A new head invalidates claims about changed behavior until the delta and affected categories are re-reviewed. Retain the previous review and record which findings carry forward.

## 2. Review architecture before runtime

For every behavior change, trace:

design thesis / invariant -> current architecture decision -> public contract -> implementation -> verification.

Read the normative design records (`docs/plans/LEDGER.md`, `docs/plans/wsl-cli-verification.md`, and historical commit `ee10ebc`) when assessing preservation or modification of project invariants. Separate historical design records, normative current contracts, as-built descriptions, and external evidence. Existing implementation does not automatically override a higher-priority contract.

When modernization relies on a current ecosystem norm, cite a primary source, its version or date, the exact capability, the demonstrated gap, and why closing that gap benefits Agy-Squad. Unsupported generalizations such as "modern agents expect this" are not evidence.

For each intentional departure from a contract, require a recorded decision, compatibility implications, and acceptance criteria before recommending runtime changes. Do not resolve a mismatch by silently rewriting documentation to match code.

## 3. Required categories

Each category has its own coverage statement, independently triaged P1/P2/P3 finding lists, verification gaps, and verdict.

| ID | Category | Required review questions |
| --- | --- | --- |
| ARCH | Architecture and contracts | Are boundaries, guarantees, ownership, compatibility, and resource limits explicit? Does implementation satisfy the selected decisions? |
| DOC | Documentation and change records | Do active docs agree with normative contracts and actual behavior? Are historical records distinguished? Are completion and benchmark claims supported? |
| SKILL | Skills and agent instructions | Are referenced APIs, enums, fields, commands, and guarantees real and current? Do instructions guide correct implementation and review? |
| MCP | MCP schemas and public API | Do discovery schemas, runtime acceptance, errors, defaults, nullability, bounds, and documented responses agree? |
| RUN | Core runtime, parsing, and validation | Are inputs untrusted, failures deterministic, workspace/descriptor containment enforced, and stage compilation/reporting accurate? |
| SVC | Services, orchestration, and audit semantics | Are retries, lineage, request identity, recovery, and shared entry points consistent with the contracts? |
| DB | Database, migrations, replay, and concurrency | When SQL/database persistence exists, are reads/writes transactionally coherent and migrations verified? When only filesystem state exists (`scratch/agy-squad/`), is state persistence covered under `RUN`/`SVC` and `DB` marked `Not applicable`? |
| SCRIPT | Scripts, evaluation, and developer tooling | Do scripts fail on unexpected results? Are exceptions scenario-specific? Are measurement claims limited to what was measured? |
| TEST | Tests and CI | Do tests prove the guarantees, including adversarial cases? What ran, where, against which revision, and what remains unverified? |
| DEP | Dependencies, packaging, and configuration | Are installation paths, lockfiles, supported versions, configuration names, and startup assumptions coherent? |

Map every changed file to one primary category. Cross-reference affected categories without counting the same defect twice. Split a category into named subsections when necessary; additions cannot replace the required categories. A documentation file defining architecture can belong primarily to ARCH.

"No findings" is permitted. A finding quota is prohibited.

## 4. Required category record

For each category include:

1. **Scope:** changed files and relevant unchanged dependencies examined.
2. **Coverage:** complete, partial, or not reviewed; specify what remains.
3. **P1 — high priority:** independently triaged blocking findings, or an explicit empty/unassessed statement.
4. **P2 — medium priority:** independently triaged actionable findings, or an explicit empty/unassessed statement.
5. **P3 — low priority:** independently triaged advisory findings, or an explicit empty/unassessed statement.
6. **Verification:** tests inspected, tests executed, CI evidence inspected, and missing proof.
7. **Verdict:** changes required, no findings within reviewed scope, incomplete, or not applicable with a reason.

Every category must contain all three triage headings, even when a bucket is empty. For reviewed scope, write "None identified within reviewed scope"; for unreviewed scope, write "Not assessed." Do not equate an empty bucket with complete coverage. Order findings by severity within their owning category. Classify each finding from its impact and trigger; do not copy priority from a previous review automatically.

Verification gaps and unresolved questions remain separate from the P1/P2/P3 finding buckets unless evidence establishes a concrete defect. Record priority changes with a reason and preserve finding IDs. An exceptional P0 emergency is escalated explicitly in addition to the required three buckets.

A category with findings and partial coverage records both facts. "Not applicable" means the category has no relevant change or dependency, not that it was skipped.

## 5. Required finding record

Use one ID per independently remediable problem, e.g. MCP-001. Preserve IDs across revisions.

- **Title, priority, status.**
- **Contract provenance:** exact invariant, architecture decision (`docs/plans/LEDGER.md`), public contract, or evidenced external norm.
- **Source evidence:** immutable commit-pinned file links and relevant line ranges, plus the affected symbol.
- **Trigger:** concrete input, state, interleaving, or document instruction that exposes the issue.
- **Expected / actual:** explain the mismatch and distinguish observed execution from source-derived inference.
- **Impact:** concrete consequence and affected scope.
- **Required remediation:** precise behavior to restore, compatibility constraints, and affected contract surfaces.
- **Acceptance evidence:** regression case and assertions; use source reconciliation for low-impact prose changes where a test would add no value.
- **Root cause / related IDs:** connect cross-layer defects without duplicating the finding.
- **Closure:** fix commit, evidence at that revision, reviewer recheck, and residual limitations.

Priorities:

- P0: immediate critical failure requiring emergency handling.
- P1: high-impact correctness, data loss, security, or reliability failure.
- P2: actionable correctness or contract problem that should be fixed.
- P3: lower-impact issue or improvement; identify whether it is advisory.

A verification gap alone is not proof of a production defect. Label it as a gap. Do not inflate severity or finding counts to fill categories.

## 6. Evidence rules

- Separate source inspection, attempted reproduction, local execution, and inspected CI logs.
- Give reproduction steps even when execution is unavailable; label the expected failure as source-derived.
- Test names, comments, string-presence assertions, and a green summary do not prove the named guarantee. Inspect what is asserted.
- Never inherit a previous review's verdict. Revalidate its findings and explicitly accept, revise, or reject them.
- Identify assumptions, unresolved questions, and unverified external claims.
- Do not claim that a transcript, attachment, or design record was read unless its contents were accessible and examined.

Agy-Squad-specific verification:

- **Schema & Session Isolation:** exercise documented omitted/null/valid/invalid values through actual `tools/list` schemas (`mcp/index.js`) and the `dispatch_squad` runtime boundary (`mcp/dispatch.mjs`), including `AGY_SQUAD_RUN_DIR` vs. `AGY_SQUAD_SESSION` neighbor gating and the 10MB stdio frame limit.
- **Workspace & Descriptor Containment:** verify workspace-internal symlink resolution (`fs.realpathSync` + `O_NOFOLLOW`, `O_NONBLOCK`, and `/proc/self/fd/${fd}` regular-file verification) for manifests in `mcp/dispatch.mjs`, and strict symlink rejection (`O_NOFOLLOW`, `O_NONBLOCK`, symlink directory rejection, and `/proc/self/fd/${fd}` regular-file verification) for reports, bundles, and staged directories in `mcp/handoffs.mjs` and `mcp/run-state.mjs`.
- **Subagent Capability Guards:** verify `TypeName !== "research"` (default `"self"`) and `Workspace === "inherit"` across unmanaged and managed compiled briefs (`mcp/briefs.mjs`).
- **Pointer-Over-Wire Handoffs & Bundling:** verify single-line `<= 500` UTF-8 byte `READY`/`PARTIAL`/`NO_REPORT` receipt grammar, `stagePlan` slot collision guards (`mcp/run-state.mjs`), atomic `publish()` link/rename semantics, `readSynthesis` unambiguous `PASS` verdict enforcement, and `bundle`/`verify`/`prune` SHA-256 verification (`mcp/handoffs.mjs`).
- **External MCP & Managed Launcher:** distinguish an in-process adapter call from a real stdio subprocess and live WSL `agy chat` execution (`bin/agy-squad.mjs`, `bin/terminal.py`).

Run checks appropriate to the change. A documentation-only review-standard change does not require rerunning the product suite.

## 7. Verdict and closure

Keep coverage and merge disposition separate.

- Request changes when blocking correctness or contract findings remain.
- Mark the review incomplete when a material category is unreviewed; this can coexist with request changes.
- Recommend approval only after all material categories are covered, blocking findings are resolved and rechecked, and required verification has evidence.
- Never calculate approval from a pass percentage, number of findings, test count, or absence of findings in an unreviewed category.

Re-review each fix in its primary category and all affected categories. A fix commit is not closure by itself. Every closed finding needs the relevant evidence and reviewer recheck.

## 8. Required report structure

1. Review metadata and evidence limits.
2. File-to-category inventory and coverage matrix.
3. Architecture-to-implementation trace.
4. Ten category sections, each with separate P1, P2, and P3 finding lists, verification gaps, and its own verdict.
5. Cross-category root causes and rationale for remediation order.
6. Verification record and remaining gaps.
7. Overall disposition and finding closure table.

Keep local review reports under `docs/reviews/`. Cite the reviewed base and head, category coverage, findings, evidence and verdict in the PR. Identify the previous review when recording a follow-up.

## Change history

| Version | Date | Change |
| --- | --- | --- |
| 1.1.0 | 2026-11-08 | Adapt standard to Agy-Squad with 5 WSL runtime verification boundaries and self-diagnosis coupling. |
| 1.1.0 | 2026-10-20 | Require explicit P1/P2/P3 triage inside every category, including empty versus unassessed buckets; preserve separate verification gaps. |
| 1.0.0 | 2026-10-20 | Establish category-separated review, provenance, explicit coverage, evidence distinctions, and finding closure. |
