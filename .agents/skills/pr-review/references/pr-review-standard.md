# Agy-Squad PR Review Standard

Version: 1.5.0 | Status: Active workflow standard | Established: 2026-11-08

Reviews must make coverage, reasoning, findings, and evidence inspectable by category. Passing tests, polished docs, and prior approvals never prove architectural conformance. Standard changes require a version bump and rationale; reviewers cannot silently omit or weaken a category.

## 1. Pin the review

Record at the top of the report:

- Repository, PR URL/target, review date, reviewer, standard (`1.5.0`), base/head SHAs, and uncommitted dirty delta.
- Append-only **Session Provenance** table: `Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked`.
- Exact commit/tree run by each CI job (distinguish PR head from merge commit), changed-file inventory, unchanged dependencies examined, available evidence (sources, docs/ADRs, prior review, transcript, local runs, cross-platform CI), and explicit exclusions.

A new head invalidates claims about changed behavior until re-reviewed; retain prior findings with carry-forward status.

## 2. Review architecture before runtime

Trace `design thesis / invariant -> current architecture decision -> public contract -> implementation -> verification` against normative docs/ADRs (if present).

- Separate normative contracts, historical records, as-built descriptions, and external evidence.
- Cite primary sources (version/date, capability, demonstrated gap, benefit) when invoking ecosystem norms.
- Intentional departures require a recorded decision, compatibility impact, and acceptance criteria. Never silently rewrite docs to match defective code.

## 3. Required categories

| ID | Category | Core Review Questions |
| --- | --- | --- |
| ARCH | Architecture & contracts | Are boundaries, guarantees, ownership, compatibility, and limits explicit and satisfied? |
| DOC | Docs & change records | Do active docs match contracts and runtime? Are historical records separated and claims supported? |
| SKILL | Skills & agent instructions | Are referenced APIs, enums, fields, commands, and guarantees real and current? |
| MCP | MCP schemas & public API | Do discovery schemas, runtime acceptance, errors, defaults, bounds, and responses agree? |
| RUN | Runtime, parsing & validation | Are inputs untrusted, failures deterministic, containment enforced, and compilation accurate? |
| SVC | Services & audit semantics | Are retries, lineage, identity, recovery, and entry points consistent with contracts? |
| DB | Database & concurrency | Are SQL/DB transactions and migrations coherent? Mark Not applicable for filesystem-only state (`RUN`/`SVC`). |
| SCRIPT | Scripts & tooling | Do scripts fail on unexpected results? Are exceptions narrow and metrics exact? |
| TEST | Tests & CI | Do tests prove guarantees including adversarial cases? What ran, where, on which SHA, and what is missing? |
| DEP | Dependencies & packaging | Are install paths, lockfiles, versions, configs, and startup assumptions coherent? |
| SEC | Security & trust boundaries | Are inputs guarded against injection (shell/SQL/template/prompt), path traversal, symlink/TOCTOU, and ReDoS? Are authn/authz, least-privilege CI `permissions:`/`concurrency:`, isolation, secret hygiene, checksums/timeouts, and fail-closed defaults enforced? |

Map each changed file to **one primary category** and cross-reference affected layers without double-counting (logic bugs own `RUN`/`SCRIPT`/`SVC`; exploitable flaws or broken trust boundaries own `SEC`). "No findings" is valid; finding quotas are banned.

## 4. Required category record

Include all 7 fields in every category:

1. **Scope:** changed files and unchanged dependencies examined.
2. **Coverage:** Complete, Partial, or Not reviewed (state gaps).
3. **P1 (high priority):** blocking findings, or `None identified within reviewed scope` / `Not assessed`.
4. **P2 (medium priority):** actionable findings, or `None identified within reviewed scope` / `Not assessed`.
5. **P3 (low priority):** advisory findings, or `None identified within reviewed scope` / `Not assessed`.
6. **Verification:** tests inspected/executed, CI evidence, missing proof.
7. **Category Verdict:** Changes required, No findings within reviewed scope, Incomplete, or Not applicable (with reason).

Keep all 3 triage buckets even when empty; escalate P0 emergencies explicitly. Separate verification gaps from defects, and classify priority from current impact/trigger while preserving IDs.

## 5. Required finding record

- **`1 ID = 1 Row / Record`:** Assign one stable ID per independently remediable defect (e.g., `MCP-001`) and preserve IDs across revisions. Umbrella IDs, range IDs (`TEST-2..4`), combined rows (`A & B`), and silent omissions are prohibited because pruned loose reports leave this report as the sole record. Merge only exact duplicates (noting aliases in parentheses).
- **Readability & backticks:** Keep prose and tables clean. Use inline backticks only for code identifiers, paths (`path#L10-L20`), flags, commands, and verdicts quoted inside prose; never wrap plain numbers, English statuses, or multi-sentence quotes. Standalone machine-parsed `Content Verdict:`, `Integrity Verdict:`, `Target Squad:`, and `Evidence Digest:` declaration lines must NEVER wrap the declaration (or verdict token) in backticks (use plain text or balanced `**...**` emphasis only).
- **Six canonical statuses:** Open (Pre-Remediation), Closed, Residual (Open), Closed (Post-Remediation), Deferred / Won't Fix, Closed (By Design) (+ Informational in Section 8). Route the last 4 + Informational **exclusively to Section 8** (never Sections 4-7, Section 9, or buried inside a Closed row).

**Tiered density:**

- **P0 / P1 / P2** require 1-line entries for all 10 fields under ``#### `<ID>`: <Title> | <Priority> | <Status>``:
  1. Title, priority, status
  2. Contract provenance (invariant, doc/ADR, contract, or norm)
  3. Source evidence (commit-pinned links, lines, symbol)
  4. Trigger (input, state, interleaving, or instruction)
  5. Expected / actual (observed vs source-derived)
  6. Impact (consequence and scope)
  7. Required remediation (behavior, compatibility, affected surfaces)
  8. Acceptance evidence (regression assertions, or source reconciliation for low-impact prose)
  9. Root cause / related IDs (cross-layer links)
  10. Closure (fix commit, fixed-revision evidence, recheck, residual limits)
- **P3** uses a 1-row-per-ID table: `ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA`.

**Priorities:** `P0` emergency critical failure; `P1` high-impact correctness, data loss, security, or reliability failure; `P2` actionable correctness/contract issue; `P3` advisory/improvement.

## 6. Evidence rules

- Separate source inspection, reproduction, local runs, and CI logs; label unexecuted expectations as source-derived with repro steps.
- Inspect test assertions (names and green summaries never prove a guarantee). Never inherit prior verdicts; explicitly accept, revise, or reject carried findings.
- State assumptions, gaps, and unavailable artifacts; never claim to have read unexamined files.
- *When reviewing `Agy-Squad` itself:* also check JSON-RPC/`AGY_MAX_STDIO_PAYLOAD_BYTES` framing, `O_NOFOLLOW`/realpath/fd containment, `TypeName`/`workspace: "inherit"` guards, `<= 500` B handoff/verdict/`Evidence Digest`/bundle checks, and real stdio/CLI subprocess parity.

## 7. Verdict and closure

Keep coverage and disposition separate: **Request changes** on open blockers; **Incomplete** on any unreviewed material category (coexists with Request changes); **Approve** only after full material coverage, fixed-revision recheck across primary and affected categories, and evidence. Never approve from pass percentages or counts.

## 8. Required report structure

1. Review metadata, Session Provenance table, and evidence limits.
2. File-to-category inventory and coverage matrix.
3. Architecture-to-implementation trace.
4. Eleven category sections (`ARCH`..`DEP`, `SEC`) with P1/P2/P3 triage, verification, and verdict.
5. Atomic P0-P3 findings (in Section 4 or consolidated in Section 5).
6. Cross-category root causes, verification record, and gaps.
7. Overall disposition, Direction decision (if requested), and finding closure table.
8. **Post-Remediation Residuals & Deferred Dispositions** (mandatory): 1-ID-per-row table (`ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA`), or `None (0 open residuals, 0 deferred items)`.
9. **`/self-diagnosis` Cohort & Bundle Ledger** (only when `/self-diagnosis` cohorts ran): Cohort Provenance table (`Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown`) + 1-ID-per-row Wave Finding Ledger.

Save to `docs/reviews/<review-slug>.md` when the repo adopts `docs/reviews/` or the user asks; otherwise deliver in chat or an Antigravity artifact.

## Change history

| Ver | Date | Summary |
| --- | --- | --- |
| 1.5.0 | 2026-11-19 | Added mandatory 11th category `4.11 SEC` (ReDoS, CI permissions, trust boundaries); `v1.4.0` ledgers remain valid. |
| 1.4.0 | 2026-11-14 | Added Sections 1-8 cross-section ID checks, `Evidence Digest`, `integrityAudits[]`, `auditPolicy`, and audit slots. |
| 1.3.0 | 2026-11-08 | Enforced `1 ID = 1 Row`, 6-status enum, P3 table density, Session Provenance, Section 8, and Section 9. |
| 1.2.0 | 2026-11-08 | Added Agy-Squad runtime boundaries and review ledger coupling. |
| 1.1.0 | 2026-10-20 | Required explicit P1/P2/P3 triage buckets inside every category. |
| 1.0.0 | 2026-10-20 | Established category-separated review, provenance, evidence rules, and closure. |
