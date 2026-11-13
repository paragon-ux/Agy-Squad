---
name: pr-review
description: >-
  Use this skill when the user asks to perform, update, or verify a pull request
  or branch review in Agy-Squad. Enforces the Agy-Squad PR Review Standard
  (v1.3.0) with commit-pinned and session-pinned metadata, architecture-before-runtime
  tracing, ten mandatory categories (ARCH, DOC, SKILL, MCP, RUN, SVC, DB,
  SCRIPT, TEST, DEP), 1-ID-per-row finding records, post-remediation residual
  tracking, and structured reports under docs/reviews/.
---

# Agy-Squad PR Review Skill (Standard v1.3.0)

Conduct pull request and branch reviews in `Agy-Squad` using the workflow below. Consult [references/pr-review-standard.md](./references/pr-review-standard.md) on demand for standard governance, versioning, or change-history rules, and see [Core workflows](../../../docs/core-workflows.md) for how this repository workflow standard (enforced by `diagnose.mjs` and `npm test`, not a GitHub branch-protection setting) integrates with `/self-diagnosis`. Passing tests, polished docs, and prior approvals are inputs, not proof that implementation satisfies architecture. Implementation status updates are separate from the review.

---

## Workflow

### Step 0: Pre-Flight Intake Interview (Review Scope & Teardown Gate)
Before launching a review or invoking review cohorts, establish review bounds via structured intake (via `ask_question` or multiple-choice prompt):
1. **Review Topology & Depth:**
   - `(Recommended) Layered Review Squad (Leads + Specialists)`: Deep multi-category review with independent category specialists and synthesis lead.
   - `Flat Review Specialist Dispatch`: Targeted inspection across specific changed files.
   - `Single-Agent Interactive Audit`: Direct architectural trace performed by primary agent.
2. **Teardown & Provenance Policy:**
   - `(Recommended) Retain Full Evidence & Provenance (--keep-reports)`: Preserve all specialist evidence reports and session provenance in `docs/reviews/` and `scratch/`.
   - `Automatic Atomic Teardown (--teardown)`: Prune loose reports from `scratch/` upon verification and ledger update.
3. **Adversarial Verification:**
   - `(Recommended) Mandatory Adversarial Review Gate`: Require independent adversarial verification before recommending `Approve`.

---

### Step 1: Pin the Review & Session Provenance
1. Record repository, PR URL (or branch status), date, reviewer, standard version (`1.3.0`), base/head SHAs (plus dirty delta and exact CI commit SHAs), and an append-only **Session Provenance** table (`Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked`).
2. List all changed files (`base..head`) plus unchanged dependencies examined.
3. State available evidence (`docs/plans/LEDGER.md`, `docs/plans/wsl-cli-verification.md`, `ee10ebc`, prior reviews, transcripts, local runs, CI logs) and unavailable inputs.
4. State scope and exclusions; on a new head, re-review the delta and affected categories while retaining carried-forward findings.

### Step 2: Trace Architecture Before Runtime
For every behavior change, trace:
`design thesis / invariant -> current architecture decision -> public contract -> implementation -> verification`

- Distinguish `docs/plans/LEDGER.md` IDs:
  - **Active WSL architecture (`L1–L7, L21, L29–L31, L40–L43`)**
  - **Retired/superseded decisions:** Retired Phase 1 PTY launcher (`L17`), WSL trial checks passed (`L18–L20, L22–L24, L28, L37, L39`), rebuild branch (`L16`), and superseded Windows/Docker decisions (`L8–L12, L35, L36, L38` in `docs/plans/LEDGER.md`)
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
Every category section **must** contain all 7 items (`"None identified within reviewed scope"` or `"Not assessed"` when a triage bucket is empty):
1. **Scope:** Changed files and unchanged dependencies examined.
2. **Coverage:** `Complete`, `Partial`, or `Not reviewed` (state what remains).
3. **P1 — high priority:** Blocking correctness, data-loss, security, or reliability findings.
4. **P2 — medium priority:** Actionable correctness or contract findings.
5. **P3 — low priority:** Advisory or lower-impact improvements (escalate any `P0` explicitly).
6. **Verification:** Tests inspected/executed, CI evidence, and missing proof (separate from P1–P3).
7. **Verdict:** `Changes required`, `No findings within reviewed scope`, `Incomplete`, or `Not applicable` (with reason).

### Step 5: Format Each Finding Record (`1 ID = 1 Row`, Zero Compression & Tiered Density)
Enforce `1 ID = 1 Row / Record` per independently remediable problem: every distinct `P0`–`P3` defect, optimization, or advisory from a review or squad bundle (`lead/report.md`) **must** map `1-to-1` to its own ledger entry—never compressed into umbrella/range IDs (`HARDEN-P3-1`, `OPT-P3-1`, `TEST-2..4`) or silently omitted (since `prune`/`--teardown` delete `scratch/` reports, making solved vs. hidden items otherwise indistinguishable; merge only duplicate reports of the exact same defect). Every item must carry one of six statuses: `Open (Pre-Remediation)`, `Closed`, `Residual (Open)`, `Closed (Post-Remediation)`, `Deferred / Won't Fix`, or `Closed (By Design)` (`Informational` allowed for non-defects in Section 8).
- **`P0` / `P1` / `P2` defects** require all 10 concise 1-line fields (no repeated prose across sections): **Title, priority, status**; **Contract provenance** (`LEDGER.md` ID, public contract, or external norm); **Source evidence** (commit-pinned file links, lines, symbol); **Trigger**; **Expected / actual** (observed vs. source-derived); **Impact**; **Required remediation**; **Acceptance evidence**; **Root cause / related IDs**; and **Closure** (fix commit, recheck, residual limits).
- **`P3` advisories / optimizations** use a compact 1-row-per-ID table: `ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA`.

### Step 6: Apply Evidence Rules & Agy-Squad Verification Boundaries
- Separate **source inspection**, **attempted reproduction**, **local execution**, and **inspected CI logs**; inspect actual test assertions.
- Exercise Agy-Squad's five runtime boundaries where relevant:
  1. **Schema & Stdio Framing:** `request.jsonrpc === "2.0"`, `tools/list` (`mcp/index.js`) vs. `dispatch_squad` (`mcp/dispatch.mjs`) and `squad_planner` (`mcp/planner.mjs`), positive integer `AGY_MAX_STDIO_PAYLOAD_BYTES`, and 10MB stdio framing.
  2. **Workspace & Descriptor Containment:** internal manifest symlink resolution (`fs.realpathSync` + `O_NOFOLLOW`/`O_NONBLOCK` + `/proc/self/fd/${fd}`) in `mcp/dispatch.mjs`; strict symlink rejection (`O_NOFOLLOW`/`O_NONBLOCK`, parent `realpathSync`, `/proc/self/fd/${fd}`) for reports and bundles in `mcp/handoffs.mjs`.
  3. **Subagent Capability, Model Provenance & Input Guards:** built-in read-only/sandboxed `TypeName` rejection (`research`, `browser`, `image-generator`; default `"self"`), `Workspace === "inherit"` for subagents, `modelProvenance` caveats vs. `/swarm` pinning, `scopeFiles` path safety + writable overlap diagnostics, and camelCase/PascalCase conflict rejection (`mcp/briefs.mjs`, `mcp/planner.mjs`).
  4. **Pointer-Over-Wire Handoffs & Bundling:** `<= 500` UTF-8 byte single-line `READY`/`PARTIAL`/`NO_REPORT` grammar, custom `reportRoot` alignment in `inspectReports`/`bundleReports`, atomic `publish()`, strict verdict parsing (`mcp/verdicts.mjs`), `integrityAudit` binding, and `bundle`/`verify`/`prune` SHA-256 checks (`mcp/handoffs.mjs`).
  5. **External MCP & Governance CLI:** real stdio subprocesses and `node bin/agy-squad.mjs` (`plan|fingerprint|inspect|bundle|verify|prune|verdict`) vs. in-process calls.

### Step 7: Verdict, Closure & Report Structure under `docs/reviews/`
- **Verdict rules:** Request changes when blocking (`P1`/`P2`) findings remain; mark `Incomplete` when a material category is unreviewed; recommend `Approve` only when all material categories are covered, blocking findings are resolved and rechecked, and required verification has evidence.
- Save the report to `docs/reviews/<review-slug>.md` with the 8 mandatory sections (plus Section 9 when `/self-diagnosis` cohorts are run):
  1. **Review metadata, Session Provenance, and evidence limits**
  2. **File-to-category inventory and coverage matrix**
  3. **Architecture-to-implementation trace**
  4. **Ten category sections** (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`)
  5. **Cross-category root causes and rationale for remediation order**
  6. **Verification record and remaining gaps**
  7. **Overall disposition and finding closure table**
  8. **Post-Remediation Residuals & Deferred Dispositions** (mandatory sink for all `Residual (Open)` -> `Closed (Post-Remediation)`, `Deferred / Won't Fix`, and `Closed (By Design)` / `Informational` items as atomic 1-ID rows—never hidden or buried inside `Closed` prose; or `None (0 open residuals, 0 deferred items)`)
  9. **`/self-diagnosis` Cohort & Bundle Ledger** *(required when `/self-diagnosis` cohorts run: one Cohort Provenance table + one atomic 1-ID-per-row Wave Finding Ledger)*
