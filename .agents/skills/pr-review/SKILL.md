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

Conduct pull request and branch reviews in `Agy-Squad` using the workflow below. This skill is self-contained for standard reviews; consult [references/pr-review-standard.md](./references/pr-review-standard.md) only on demand for standard governance, versioning, or change-history rules.

Passing tests, a polished change document, and a previous approval are inputs; none establishes that the implementation satisfies its architecture. Implementation status updates are separate from the review.

---

## Workflow

### Step 1: Pin the Review
1. Record the repository, PR URL (or branch/working-tree status), review date, reviewer, standard version (`1.1.0`), base SHA, and head SHA (plus any dirty working-tree delta and the exact commit executed by each cited CI run).
2. Build the complete changed-file inventory from the base/head comparison plus unchanged dependencies examined.
3. State the evidence actually available (`docs/plans/LEDGER.md`, `docs/plans/wsl-cli-verification.md`, base commit `ee10ebc`, prior reviews, transcripts, local reproductions, CI logs) and any unavailable attachments/environments.
4. State scope and exclusions. On a new head, re-review the delta and affected categories while retaining prior review findings that carry forward.

### Step 2: Trace Architecture Before Runtime
For every behavior change, trace:
`design thesis / invariant -> current architecture decision -> public contract -> implementation -> verification`

- Distinguish `docs/plans/LEDGER.md` IDs:
  - **Active WSL architecture (`L1–L7, L17, L21, L29–L31, L40, L41`)**
  - **Superseded Docker/Windows architecture (`L8–L12, L16, L22–L24, L28, L35–L39`)** and **Windows-verified items awaiting live WSL trial re-verification (`L18–L20` in `docs/plans/wsl-cli-verification.md`)**
  - **External/shared ledger allocations (`L13–L15, L25–L27, L32–L34` in `Agy-Context-Saver`)**
- Existing implementation does not override a higher-priority contract. Never resolve a contract mismatch by silently rewriting documentation to match code.

### Step 3: Map Files & Evaluate All 10 Required Categories
Map every changed file to **one primary category** and cross-reference affected categories without double-counting defects (`"No findings"` is permitted; finding quotas are prohibited):

| ID | Category | Required Review Questions |
| --- | --- | --- |
| `ARCH` | Architecture and contracts | Are boundaries, guarantees, ownership, compatibility, and resource limits explicit? Does implementation satisfy the selected decisions? |
| `DOC` | Documentation and change records | Do active docs agree with normative contracts and actual behavior? Are historical records distinguished? Are completion and benchmark claims supported? |
| `SKILL` | Skills and agent instructions | Are referenced APIs, enums, fields, commands, and guarantees real and current? Do instructions guide correct implementation and review? |
| `MCP` | MCP schemas and public API | Do discovery schemas, runtime acceptance, errors, defaults, nullability, bounds, and documented responses agree? |
| `RUN` | Core runtime, parsing, and validation | Are inputs untrusted, failures deterministic, workspace/descriptor containment enforced, and stage compilation/reporting accurate? |
| `SVC` | Services, orchestration, and audit semantics | Are retries, lineage, request identity, recovery, and shared entry points consistent with the contracts? |
| `DB` | Database, migrations, replay, and concurrency | When SQL/database persistence exists, are reads/writes coherent and migrations verified? When only filesystem state exists (`scratch/agy-squad/`), is state persistence covered under `RUN`/`SVC` and `DB` marked `Not applicable`? |
| `SCRIPT` | Scripts, evaluation, and developer tooling | Do scripts fail on unexpected results? Are exceptions scenario-specific? Are measurement claims limited to what was measured? |
| `TEST` | Tests and CI | Do tests prove the guarantees, including adversarial cases? What ran, where, against which revision, and what remains unverified? |
| `DEP` | Dependencies, packaging, and configuration | Are installation paths, lockfiles, supported versions, configuration names, and startup assumptions coherent? |

### Step 4: Populate Each Required Category Record
Every category section **must** contain these 7 items and all three triage headings:
1. **Scope:** Changed files and relevant unchanged dependencies examined.
2. **Coverage:** `Complete`, `Partial`, or `Not reviewed`; specify what remains.
3. **P1 — high priority:** Blocking correctness, data-loss, security, or reliability findings, or `"None identified within reviewed scope"` / `"Not assessed"`.
4. **P2 — medium priority:** Actionable correctness or contract findings, or `"None identified within reviewed scope"` / `"Not assessed"`.
5. **P3 — low priority:** Lower-impact or advisory improvements (state whether advisory), or `"None identified within reviewed scope"` / `"Not assessed"`. (Escalate any `P0` emergency explicitly.)
6. **Verification:** Tests inspected, tests executed, CI evidence inspected, and missing proof (keep verification gaps separate from P1/P2/P3 buckets).
7. **Verdict:** `Changes required`, `No findings within reviewed scope`, `Incomplete`, or `Not applicable` (with a concrete reason).

### Step 5: Format Each Finding Record
Use one stable ID per independently remediable problem (e.g., `MCP-001`, `RUN-001`, `SVC-001`) with all 10 fields:
- **Title, priority, status** (`P0`–`P3`, `Open` / `Closed`)
- **Contract provenance** (exact active `LEDGER.md` ID, public contract, or evidenced external norm)
- **Source evidence** (commit-pinned file links, line ranges, and symbol)
- **Trigger** (concrete input, state, interleaving, or instruction)
- **Expected / actual** (distinguish observed execution from source-derived inference)
- **Impact** (concrete consequence and affected scope)
- **Required remediation** (precise behavior to restore and affected contracts)
- **Acceptance evidence** (regression case/assertions or source reconciliation for prose)
- **Root cause / related IDs** (cross-layer links without duplicating the finding)
- **Closure** (fix commit, evidence at that revision, reviewer recheck, and residual limitations)

### Step 6: Apply Evidence Rules & Agy-Squad Verification Boundaries
- Separate **source inspection**, **attempted reproduction**, **local execution**, and **inspected CI logs**. Inspect what tests actually assert.
- Exercise Agy-Squad's five runtime boundaries where relevant:
  1. **Schema & Session Isolation:** `tools/list` (`mcp/index.js`) vs. `dispatch_squad` (`mcp/dispatch.mjs`), `AGY_SQUAD_RUN_DIR` vs. `AGY_SQUAD_SESSION` neighbor gating, and the 10MB stdio frame limit.
  2. **Workspace & Descriptor Containment:** workspace-internal symlink resolution (`fs.realpathSync` + `O_NOFOLLOW`, `O_NONBLOCK`, and `/proc/self/fd/${fd}` regular-file verification) for manifests in `mcp/dispatch.mjs`, and strict symlink rejection (`O_NOFOLLOW`, `O_NONBLOCK`, symlink directory rejection, and `/proc/self/fd/${fd}` verification) for reports, bundles, and staged directories in `mcp/handoffs.mjs` and `mcp/run-state.mjs`.
  3. **Subagent Capability Guards:** `TypeName !== "research"` (default `"self"`) and `Workspace === "inherit"` across unmanaged and managed briefs (`mcp/briefs.mjs`).
  4. **Pointer-Over-Wire Handoffs & Bundling:** `<= 500` UTF-8 byte single-line `READY`/`PARTIAL`/`NO_REPORT` grammar, `stagePlan` slot collision guards (`mcp/run-state.mjs`), atomic `publish()`, `readSynthesis` unambiguous `PASS` enforcement, and `bundle`/`verify`/`prune` SHA-256 checks (`mcp/handoffs.mjs`).
  5. **External MCP & Managed Launcher:** real stdio subprocesses and live WSL `agy chat` execution (`bin/agy-squad.mjs`, `bin/terminal.py`) vs. in-process calls.

### Step 7: Verdict, Closure & Report Structure under `docs/reviews/`
- **Verdict rules:** Request changes when blocking (`P1`/`P2`) findings remain; mark `Incomplete` when a material category is unreviewed; recommend `Approve` only when all material categories are covered, blocking findings are resolved and rechecked, and required verification has evidence.
- Save the report to `docs/reviews/<review-slug>.md` with the 7 mandatory sections:
  1. **Review metadata and evidence limits**
  2. **File-to-category inventory and coverage matrix**
  3. **Architecture-to-implementation trace**
  4. **Ten category sections** (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`)
  5. **Cross-category root causes and rationale for remediation order**
  6. **Verification record and remaining gaps**
  7. **Overall disposition and finding closure table**
