---
name: pr-review
description: >-
  Use this skill when the user asks to perform, update, or verify a pull request
  or branch review in Agy-Squad. Enforces the Agy-Squad PR Review Standard
  (v1.1.0) with commit-pinned metadata, architecture-before-runtime tracing,
  ten mandatory categories (ARCH, DOC, SKILL, MCP, RUN, SVC, DB, SCRIPT, TEST,
  DEP), explicit P1/P2/P3 triage per category, separate verification gaps, and
  structured reports under docs/reviews/.
---

# Agy-Squad PR Review Skill (Standard v1.1.0)

Conduct pull request and branch reviews in `Agy-Squad` strictly according to the canonical [Agy-Squad PR Review Standard v1.1.0](./references/pr-review-standard.md).

A review must make its coverage, reasoning, findings, and evidence inspectable by category. Passing tests, a polished change document, and a previous approval are inputs; none establishes that the implementation satisfies its architecture. Implementation status updates are separate from the review.

---

## Workflow

### Step 1: Pin the Review
1. Record the repository, PR URL (or branch/working-tree status if no PR exists yet), review date, reviewer, standard version (`1.1.0`), base SHA, and head SHA (noting any dirty working-tree delta).
2. Record the exact commit or tree executed by each cited CI run, distinguishing a PR head from GitHub's generated merge commit.
3. Build the complete changed-file inventory from the base/head comparison plus unchanged dependencies examined.
4. Explicitly state the evidence actually available: repository sources, original design records (`docs/plans/LEDGER.md`, historical commits), prior reviews, transcripts, local reproductions, and CI logs. State when an attachment or environment was unavailable.
5. State scope and exclusions. Fetching a file is not the same as reviewing it. If a new head arrives, re-review the delta and affected categories while retaining the previous review and recording which findings carry forward.

### Step 2: Trace Architecture Before Runtime
For every behavior change, trace:

`design thesis / invariant -> current architecture decision -> public contract -> implementation -> verification`

- Read the normative decision ledger (`docs/plans/LEDGER.md`) and historical design records (such as base commit `ee10ebc`) when assessing preservation or modification of invariants.
- Separate historical design records, normative current contracts, as-built descriptions, and external evidence. Existing implementation does not automatically override a higher-priority contract.
- When modernization relies on a current ecosystem norm, cite a primary source, its version or date, the exact capability, the demonstrated gap, and why closing that gap benefits the project.
- For each intentional departure from a contract, require a recorded decision, compatibility implications, and acceptance criteria before recommending runtime changes. Never resolve a mismatch by silently rewriting documentation to match code.

### Step 3: Map Files & Evaluate All 10 Required Categories
Map every changed file to **one primary category**. Cross-reference affected categories without counting the same defect twice. Never omit or weaken any of the ten required categories:

| ID | Category | Required Review Questions |
| --- | --- | --- |
| `ARCH` | Architecture and contracts | Are boundaries, guarantees, ownership, compatibility, and resource limits explicit? Does implementation satisfy the selected decisions? |
| `DOC` | Documentation and change records | Do active docs agree with normative contracts and actual behavior? Are historical records distinguished? Are completion and benchmark claims supported? |
| `SKILL` | Skills and agent instructions | Are referenced APIs, enums, fields, commands, and guarantees real and current? Do instructions guide correct implementation and review? |
| `MCP` | MCP schemas and public API | Do discovery schemas, runtime acceptance, errors, defaults, nullability, bounds, and documented responses agree? |
| `RUN` | Core runtime, parsing, and validation | Are inputs untrusted, failures deterministic, matching exact, application sequential and atomic, and stage reporting accurate? |
| `SVC` | Services, orchestration, and audit semantics | Are retries, lineage, request identity, recovery, and shared entry points consistent with the contracts? |
| `DB` | Database, migrations, replay, and concurrency | Are reads and writes transactionally coherent? Is history preserved? Are populated upgrades, downgrade refusal, and replay profiles verified? |
| `SCRIPT` | Scripts, evaluation, and developer tooling | Do scripts fail on unexpected results? Are exceptions scenario-specific? Are measurement claims limited to what was measured? |
| `TEST` | Tests and CI | Do tests prove the guarantees, including adversarial cases? What ran, where, against which revision and database, and what remains unverified? |
| `DEP` | Dependencies, packaging, and configuration | Are installation paths, lockfiles, supported versions, configuration names, and startup assumptions coherent? |

*"No findings" is permitted. A finding quota is prohibited.*

### Step 4: Populate Each Required Category Record
Every one of the 10 category sections **must** contain these 7 items and all three triage headings:

1. **Scope:** Changed files (primary and cross-referenced) and relevant unchanged dependencies examined.
2. **Coverage:** `Complete`, `Partial`, or `Not reviewed`; specify what remains.
3. **P1 — high priority:** Independently triaged blocking findings, or an explicit `"None identified within reviewed scope"` (for reviewed scope) / `"Not assessed"` (for unreviewed scope).
4. **P2 — medium priority:** Independently triaged actionable findings, or an explicit `"None identified within reviewed scope"` / `"Not assessed"`.
5. **P3 — low priority:** Independently triaged advisory findings, or an explicit `"None identified within reviewed scope"` / `"Not assessed"`.
6. **Verification:** Tests inspected, tests executed, CI evidence inspected, and missing proof (verification gaps and unresolved questions remain separate from P1/P2/P3 finding buckets unless evidence establishes a concrete defect).
7. **Verdict:** `Changes required`, `No findings within reviewed scope`, `Incomplete`, or `Not applicable` with a concrete reason (`Not applicable` means no relevant change or dependency, not that it was skipped).

### Step 5: Format Each Finding Record
Use one stable ID per independently remediable problem (e.g., `MCP-001`, `RUN-001`, `SVC-001`) and include all 10 required fields:

- **Title, priority, status:** Priority (`P0`, `P1`, `P2`, `P3`; state whether `P3` is advisory) and status (`Open`, `Closed`, etc.).
- **Contract provenance:** Exact invariant, architecture decision (`L1`–`L40`), public contract, or evidenced external norm.
- **Source evidence:** Immutable commit-pinned (or tree-pinned) file links, line ranges, and the affected symbol.
- **Trigger:** Concrete input, state, interleaving, or document instruction that exposes the issue.
- **Expected / actual:** Explain the mismatch and distinguish observed execution from source-derived inference.
- **Impact:** Concrete consequence and affected scope.
- **Required remediation:** Precise behavior to restore, compatibility constraints, and affected contract surfaces.
- **Acceptance evidence:** Regression case and assertions (or source reconciliation for low-impact prose changes where a test would add no value).
- **Root cause / related IDs:** Connect cross-layer defects without duplicating the finding.
- **Closure:** Fix commit, evidence at that revision, reviewer recheck, and residual limitations.

### Step 6: Apply Evidence Rules & Targeted Verification
- Separate **source inspection**, **attempted reproduction**, **local execution**, and **inspected CI logs**.
- Inspect what tests actually assert; test names, comments, string-presence assertions, and a green summary do not prove a guarantee.
- Exercise omitted/null/valid/invalid values through actual `tools/list` schemas and runtime boundaries (`dispatch_squad`), multi-fault validation inputs, receipt/ledger/bundle state effects (`mcp/handoffs.mjs`, `mcp/run-state.mjs`), idempotency/retry guards, and real stdio subprocess behavior vs. in-process calls.

### Step 7: Write the Review Report under `docs/reviews/`
Save the complete review report to `docs/reviews/<review-slug>.md` with the 7 mandatory sections:

1. **Review metadata and evidence limits**
2. **File-to-category inventory and coverage matrix**
3. **Architecture-to-implementation trace**
4. **Ten category sections** (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`), each with separate `P1`, `P2`, and `P3` finding lists, verification gaps, and its own verdict
5. **Cross-category root causes and rationale for remediation order**
6. **Verification record and remaining gaps**
7. **Overall disposition and finding closure table**
