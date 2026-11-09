# Agy-Squad PR #1 Consolidation, Remediation & Reverification Ledger

**Disposition:** `APPROVE — All 11 Consolidated PR1 Findings Remediated & Reverified (0 Open Findings, 0 Open Residuals)`
**Review Date:** `2026-11-09`
**Repository / PR:** [paragon-ux/Agy-Squad #1](https://github.com/paragon-ux/Agy-Squad/pull/1) (`rebuild/wsl-dispatch` -> `main`)
**Base Branch / SHA:** `main` at `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`
**Reviewed Head SHA (Pre-R6 Baseline):** `c7acf464be46780b051b432d59ce657f4ee2880f` (reconciled against merged PR #2 baseline `3df852b9251170870d03c42e2a4e6d03440efbe2`)
**Remediated & Reverified Commit SHA:** `541d6c01d0a4e2f157020b7428b77d8fa68b8f6d`
**Governing Standard:** Agy-Squad PR Review Standard `v1.3.0` (`.agents/skills/pr-review/SKILL.md` and `.agents/skills/self-diagnosis/SKILL.md`)
**Source Review Package:** `/home/paragon-ux/Antigravity/artifacts/to-fix/Agy_Squad_PR1_Code_Review_Devin_ChatGPT_2026-11-08` (`PR1_Agy_Squad_Code_Review_Ledger_R6.md`, `Devin_R6_Verification_Report.md`, `GitHub_PR1_Review_Comment.md`, `MANIFEST.json`)

---

## 1. Review Metadata, Session Provenance & Evidence Boundaries

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| Session 1 (PR1 Baseline Consolidation) | `944c64a0-e4c9-4272-a701-e3a32108a31b` | Root operator session | 2026-11-09 | `ee10ebc..c7acf46` (pre-Phase 2 baseline) | PR1 consolidation ledger initialized from `Agy_Squad_PR1_Code_Review_Devin_ChatGPT_2026-11-08` |
| Session 2 (Phase 2 Reconciliation, Remediation & Reverification) | `944c64a0-e4c9-4272-a701-e3a32108a31b` | Root operator session | 2026-11-09 | `ee10ebc..3df852b` + Phase 2 PR1 remediation | Post-PR2 baseline reconciliation + Argon remediation + Flat specialist squad (`dddc7a5b-...`, `1ec09d7f-...`) + `/self-diagnosis` reverification (`8ff52104a791...`) |
| Session 3 (Wave R7 Direct `/pr-review` & Remnant Hardening) | `944c64a0-e4c9-4272-a701-e3a32108a31b` | Root operator session | 2026-11-09 | `ee10ebc..9aa78af` + R7 direct `/pr-review` fixes (`R7-SVC-01`, `R7-SVC-02`, `R7-SCRIPT-01`, `R7-SCRIPT-02`) | Direct non-delegated `/pr-review` (Standard `v1.3.0`) + `/self-diagnosis` ledger validation |
| Session 4 (Wave R8 Devin `B1`/`B2`/`F1`/`F2` Closure) | `944c64a0-e4c9-4272-a701-e3a32108a31b` | Root operator session | 2026-11-09 | `ee10ebc..c663bd2` + R8 fixes (`R8-SVC-01`, `R8-SVC-02`, `R8-SCRIPT-01`, `R8-SCRIPT-02`) | Direct remediation + `npm test` + `/self-diagnosis` verification |
| Session 5 (Wave R9 Devin `B1`/`B2`/`B3` Precision Refinement) | `944c64a0-e4c9-4272-a701-e3a32108a31b` | Root operator session | 2026-11-09 | `ee10ebc..1ade0f0` + R9 refinements on `R8-SVC-01`, `R8-SVC-02`, `R8-SCRIPT-01` | Direct remediation + `npm test` + `/self-diagnosis` verification |
| Session 6 (Wave R10 Sol Merge-Readiness Handoff Closure) | `944c64a0-e4c9-4272-a701-e3a32108a31b` | Root operator session | 2026-11-09 | `ee10ebc..ed94e83` + R10 fixes (`SVC-NEW-01`, `SVC-NEW-02`, `SCRIPT-NEW-01`, `SVC-NEW-03`) | Direct remediation + `npm test` + `/self-diagnosis` verification |

- **Scope & Precedence:** Phase 2 began only after Phase 1 (PR #2) was remediated, reverified by a flat specialist squad, validated via `/self-diagnosis`, and merged into `rebuild/wsl-dispatch` (`3df852b9251170870d03c42e2a4e6d03440efbe2`).
- **Phase 2 Step 1 — Reconciliation Against Completed PR #2 Baseline (`3df852b9251170870d03c42e2a4e6d03440efbe2`):**
  1. PR #2 updated documentation (`README.md`, `docs/index.md`, `docs/benchmarks.md`, `docs/getting-started.md`, `docs/core-workflows.md`, `docs/concepts.md`, `docs/plans/wsl-cli-verification.md`, `zensical.toml`), benchmark verification (`benchmarks/teamwork-vs-squad/`), and skill contracts (`.agents/skills/self-diagnosis/SKILL.md`, `.agents/skills/pr-review/SKILL.md`), and added `docs/reviews/pr2-documentation-review-ledger.md`.
  2. None of the 7 open PR #1 runtime/code findings (`R6-SVC-01`, `R6-MCP-01`, `R6-MCP-02`, `R6-SCRIPT-01`, `R6-SVC-02`, `R6-TEST-01`, `R6-DOC-01`) were superseded by PR #2; the addition of `docs/reviews/pr2-documentation-review-ledger.md` reinforced `R6-SVC-01`'s cross-ledger replay requirement across multiple files in `docs/reviews/`.
  3. All 4 carried-forward closed PR #1 findings (`SVC-003`, `SVC-002`, `RUN-003`, `RUN-004`) remained intact in the post-PR #2 baseline.
- **Deduplication Note:** The 7 open R6 findings (`R6-SVC-01`, `R6-MCP-01`, `R6-MCP-02`, `R6-SCRIPT-01`, `R6-SVC-02`, `R6-TEST-01`, `R6-DOC-01`), 4 carried-forward closed Devin findings (`SVC-003`, `SVC-002`, `RUN-003`, `RUN-004`), and 3 verification gaps (`SCRIPT-GAP-002`, `R6-TEST-GAP-02`, `R6-TEST-GAP-03`) across `PR1_Agy_Squad_Code_Review_Ledger_R6.md`, `Devin_R6_Verification_Report.md`, and `GitHub_PR1_Review_Comment.md` are preserved 1-to-1 with original IDs.

---

## 2. File-to-Category Inventory & Coverage Matrix

| Path | Primary Category | Cross-Referenced Categories | Review Package Reference |
| --- | --- | --- | --- |
| `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `SVC` | `TEST`, `SKILL`, `DOC` | `R6-SVC-01`, `R6-TEST-01`, `R6-DOC-01` |
| `mcp/index.js` | `MCP` | `RUN`, `SVC` | `R6-MCP-01`, `R6-MCP-02`, `RUN-003`, `RUN-004` |
| `mcp/handoffs.mjs` | `SVC` | `TEST` | `R6-SVC-02`, `SVC-003`, `SVC-002` |
| `mcp/briefs.mjs` | `RUN` | `MCP` | `R6-MCP-01`, `RUN-003`, `RUN-004` |
| `mcp/dispatch.mjs` | `RUN` | `MCP`, `SVC` | `R6-MCP-01` |
| `mcp/run-state.mjs` | `SVC` | `RUN` | `R6-TEST-01` |
| `bin/terminal.py` | `SCRIPT` | `RUN`, `TEST` | `R6-SCRIPT-01`, `SCRIPT-GAP-002` |
| `bin/agy-squad.mjs` | `SCRIPT` | `RUN`, `SVC` | `R6-SCRIPT-01` |
| `docs/reviews/rebuild-wsl-dispatch-review-r2.md` | `DOC` | `SKILL`, `SVC` | `R6-DOC-01`, `R6-SVC-01` |
| `tests/test-dispatch.mjs` | `TEST` | `RUN`, `MCP` | `RUN-003`, `RUN-004` |
| `tests/test-handoffs.mjs` | `TEST` | `SVC` | `R6-SVC-02`, `SVC-003`, `SVC-002` |
| `tests/test-run.mjs` | `TEST` | `SVC`, `SCRIPT` | `R6-SVC-01`, `R6-SCRIPT-01`, `R6-TEST-01` |
| `tests/test-server.mjs` | `TEST` | `MCP` | `R6-MCP-01`, `R6-MCP-02`, `R6-TEST-GAP-03` |

---

## 3. Architecture & Runtime Dataflow Trace

1. **Managed & Unmanaged Dispatch (`mcp/index.js` -> `mcp/dispatch.mjs` -> `mcp/briefs.mjs`):**
   - `mcp/index.js` processes newline-delimited JSON-RPC over stdio with incremental chunk-level `Buffer` framing (`MAX_STDIO_PAYLOAD_BYTES`, `R6-MCP-02`) and exposes `dispatch_squad` with symmetric camelCase and PascalCase inline manifest schema properties (`R6-MCP-01`).
2. **Pointer-Over-Wire Handoffs & Custom Scratch Roots (`mcp/handoffs.mjs`):**
   - `reportPath`, `resolveReportRoot`, `reconcileHandoffs`, `inspectHandoffs`, `bundleReports`, `verifyBundle`, and `pruneReports` honor both default `scratch/agy-squad` (including managed `run-<uuid>/plan-<hex>`) and custom `AGY_SQUAD_SCRATCH_ROOT` / `record.reportRoot` paths (`R6-SVC-02`).
3. **Self-Diagnosis Teardown Gate (`.agents/skills/self-diagnosis/scripts/diagnose.mjs`):**
   - `teardownSelfDiagnosisDirs()` validates the target ledger schema, verifies the cryptographic bundle (`verifyBundle`), checks `mtimeMs`, confirms that `verified.sha256` is recorded in Section 9's `Cohort Provenance` table, and confirms that every canonical finding ID in `lead/report.md` and `bundle.reports[].markdown` is recorded in the target ledger (`R6-SVC-01`).
4. **Native CLI PTY Bridge (`bin/agy-squad.mjs` -> `bin/terminal.py`):**
   - `bin/terminal.py` waits for both the TUI readiness markers (`seen_agent` and `seen_shortcuts`) and `.mcp-ready` before injecting the bracketed-paste prompt (`submitted = True`), and fails non-zero if `agy` exits before `submitted` becomes `True` (`R6-SCRIPT-01`).

---

## 4. Ten Mandatory Review Categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`)

### 4.1 `ARCH` — Architecture & Structural Design
- **Verdict:** **PASS** (0 findings).

### 4.2 `DOC` — Documentation & Review Ledgers
- **Verdict:** **PASS** (1 finding remediated and reverified: `R6-DOC-01`).

#### `R6-DOC-01`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-DOC-01`), `GitHub_PR1_Review_Comment.md` (`R6-DOC-01`)
- **Location:** `docs/reviews/pr1-code-review-ledger.md:1-265`, `docs/reviews/rebuild-wsl-dispatch-review-r2.md:15-26`
- **Defect Summary:** Record Wave R6 consolidation, remediation, and reverification in `docs/reviews/` under PR Review Standard `v1.3.0`.
- **Remediation & Reverification Evidence:** Established `docs/reviews/pr1-code-review-ledger.md` and updated `docs/reviews/rebuild-wsl-dispatch-review-r2.md` with Session Provenance row `S4 (R6)` and cross-references to both consolidation ledgers; validated via `diagnose.mjs --ledger`.

### 4.3 `SKILL` — Skills & Manifests
- **Verdict:** **PASS** (0 findings; cross-referenced via `R6-SVC-01` and `R6-TEST-01`).

### 4.4 `MCP` — MCP Server & Protocol Surface
- **Verdict:** **PASS** (2 findings remediated and reverified: `R6-MCP-01`, `R6-MCP-02`).

#### `R6-MCP-01`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-MCP-01`), `Devin_R6_Verification_Report.md` (Claim 6), `GitHub_PR1_Review_Comment.md` (`R6-MCP-01`)
- **Location:** `mcp/index.js:18-84`, `tests/test-server.mjs:89-158`
- **Defect Summary:** Managed `tools/list` `agentSchema` only listed camelCase properties and required `["objective", "scopeFiles"]`, rejecting PascalCase-only inline manifests on schema-validating clients despite runtime support in `mcp/briefs.mjs` and `mcp/dispatch.mjs`.
- **Remediation & Reverification Evidence:** Added PascalCase properties (`Role`, `Objective`, `ScopeFiles`, `Instructions`, `ExpectedDeliverable`, `TypeName`, `Model`, `Workspace`) to `agentProperties` (`mcp/index.js:18-38`) and replaced `required: ["objective", "scopeFiles"]` on `agentSchema` (`mcp/index.js:39-49`) with `allOf: [{ anyOf: [{ required: ["objective"] }, { required: ["Objective"] }] }, { anyOf: [{ required: ["scopeFiles"] }, { required: ["ScopeFiles"] }] }]` and `additionalProperties: false`. Verified by `tests/test-server.mjs:89-158` and Specialist 1/2 reverification.

#### `R6-MCP-02`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-MCP-02`), `Devin_R6_Verification_Report.md` (Claim 4), `GitHub_PR1_Review_Comment.md` (`R6-MCP-02`)
- **Location:** `mcp/index.js:139-250`, `tests/test-server.mjs:177-220`
- **Defect Summary:** `mcp/index.js` checked `MAX_STDIO_PAYLOAD_BYTES` inside `rl.on("line")`, allowing `readline` to buffer an unbounded newline-free stream in memory before the `line` event fired.
- **Remediation & Reverification Evidence:** Replaced `readline.createInterface` in `mcp/index.js:139-250` with incremental chunk-level `process.stdin.on("data")` `Buffer` framing that checks `bufferedBytes + rest.length > MAX_STDIO_PAYLOAD_BYTES` as chunks arrive, immediately discards buffered chunks, enters `droppingOversized = true` drain mode until `\n`, and emits `-32600` (`Payload exceeds 10MB safety ceiling`) before newline assembly while preserving FIFO async response ordering and split multi-byte UTF-8 decoding. Verified by `tests/test-server.mjs:177-220`.

### 4.5 `RUN` — Subagent Runtime & Prompt Compilation
- **Verdict:** **PASS** (2 carried-forward closed findings verified intact: `RUN-003`, `RUN-004`).

#### `RUN-003`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`RUN-003`), `Devin_R6_Verification_Report.md` (Claim 1)
- **Location:** `mcp/briefs.mjs:62, 79-81`, `mcp/index.js:31-32`
- **Defect Summary:** Subagent assignments required writable `TypeName: "self"` and rejection of read-only `typeName: "research"`.
- **Remediation & Reverification Evidence:** Verified intact in `mcp/briefs.mjs:62, 79-81`, `mcp/index.js:31-32`, and `tests/test-dispatch.mjs:35, 88-99, 136-139`.

#### `RUN-004`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`RUN-004`), `Devin_R6_Verification_Report.md` (Claim 2)
- **Location:** `mcp/briefs.mjs:64, 82-84`, `mcp/index.js:35-36`
- **Defect Summary:** Subagent assignments required `Workspace: "inherit"` so Pointer-Over-Wire report slots share the parent workspace.
- **Remediation & Reverification Evidence:** Verified intact in `mcp/briefs.mjs:64, 82-84`, `mcp/index.js:35-36`, and `tests/test-dispatch.mjs:43-46, 92-103`.

### 4.6 `SVC` — Handoff, Bundling & Teardown Services
- **Verdict:** **PASS** (2 open findings remediated and reverified: `R6-SVC-01`, `R6-SVC-02`; 2 carried-forward closed findings verified intact: `SVC-003`, `SVC-002`).

#### `R6-SVC-01`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-SVC-01`), `Devin_R6_Verification_Report.md` (Claim 7), `GitHub_PR1_Review_Comment.md` (`R6-SVC-01`)
- **Location:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs:169-416`, `tests/test-run.mjs:514-608`
- **Defect Summary:** `teardownSelfDiagnosisDirs()` in `diagnose.mjs` checked ledger schema and `mtimeMs` relative to `report.sources.json`, but did not verify that the target ledger recorded the cohort's bundle SHA-256 or all finding IDs from `lead/report.md` and `bundle.reports[].markdown`.
- **Remediation & Reverification Evidence:** Added `extractCohortFindingIds(markdown)` (`diagnose.mjs:169-187`), populated `recordedFindingIds` and Section 9 `recordedBundleShas` in `validateTargetReviewLedger()` (`diagnose.mjs:189-340`), and enforced in `teardownSelfDiagnosisDirs()` (`diagnose.mjs:390-416`) that `verified.sha256` matches a digest in Section 9 of the target ledger and every canonical finding ID in `lead/report.md` and `bundle.reports[].markdown` is present in `recordedFindingIds`. Verified by `tests/test-run.mjs:514-608` (all 3 cases: unrelated SHA rejected, missing finding ID `SD-TEST-01` rejected, matching SHA + finding ID accepted).

#### `R6-SVC-02`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-SVC-02`), `GitHub_PR1_Review_Comment.md` (`R6-SVC-02`)
- **Location:** `mcp/handoffs.mjs:8-95, 198-200, 264-275`, `tests/test-handoffs.mjs:178-205`
- **Defect Summary:** `reconcileHandoffs()` and `resolveReportRoot()` in `mcp/handoffs.mjs` hard-coded `scratch/agy-squad/`, rejecting custom `AGY_SQUAD_SCRATCH_ROOT` or `record.reportRoot` paths.
- **Remediation & Reverification Evidence:** Added `isValidRelativePrefix()`, `defaultScratchBase()`, and `defaultReportRoot()` in `mcp/handoffs.mjs:8-28`, updated `resolveReportRoot()` and `reconcileHandoffs()` (`mcp/handoffs.mjs:43-95`) to accept workspace-relative `AGY_SQUAD_SCRATCH_ROOT` and `record.reportRoot` paths while rejecting path traversal or outside-workspace slots, and verified end-to-end across `inspect`, `bundle`, `verify`, and `prune` in `tests/test-handoffs.mjs:178-205`.

#### `SVC-003`
- **Priority:** `P1` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`SVC-003`), `Devin_R6_Verification_Report.md` (Claim 3)
- **Location:** `mcp/handoffs.mjs:241-262`
- **Defect Summary:** `readSynthesis()` previously matched uppercase `PASS` substrings inside prose or fenced code blocks.
- **Remediation & Reverification Evidence:** Verified intact in `mcp/handoffs.mjs:241-262` and `tests/test-handoffs.mjs:85-103`.

#### `SVC-002`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`SVC-002`), `Devin_R6_Verification_Report.md` (Claim 5)
- **Location:** `mcp/handoffs.mjs:103-115`
- **Defect Summary:** `reconcileHandoffs()` required strict single-line `<= 500` UTF-8 byte validation (`[\r\n\u2028\u2029]`).
- **Remediation & Reverification Evidence:** Verified intact in `mcp/handoffs.mjs:103-115` and `tests/test-handoffs.mjs:143-152`.

### 4.7 `DB` — Database, Persistence & State Files
- **Verdict:** **PASS** (0 findings; atomic `publish()` verified intact).

### 4.8 `SCRIPT` — CLI Scripts, Launcher & PTY Bridge
- **Verdict:** **PASS** (1 finding remediated and reverified: `R6-SCRIPT-01`).

#### `R6-SCRIPT-01`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-SCRIPT-01`), `Devin_R6_Verification_Report.md` (Claim 8), `GitHub_PR1_Review_Comment.md` (`R6-SCRIPT-01`)
- **Location:** `bin/terminal.py:146-152`, `tests/test-run.mjs:481-512`
- **Defect Summary:** If child `agy` exited `0` before printing the TUI banner or before `.mcp-ready` allowed prompt injection (`submitted == False` and `startup_failed == False`), `bin/terminal.py` returned `0` and `bin/agy-squad.mjs` deleted the run directory as if the run succeeded.
- **Remediation & Reverification Evidence:** Added `if not submitted and not terminating:` guard after `os.waitstatus_to_exitcode(status)` in `bin/terminal.py:146-152` that calls `sys.exit("Agy-Squad: native CLI exited before prompt submission.")` when `exit_code == 0`. Verified by `tests/test-run.mjs:481-512` across both `before-banner` and `after-banner-before-ready` early `exit(0)` scenarios.

### 4.9 `TEST` — Automated Tests & Verification Gates
- **Verdict:** **PASS** (1 finding remediated and reverified: `R6-TEST-01`; Section 8 gap `R6-TEST-GAP-03` closed).

#### `R6-TEST-01`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-TEST-01`), `GitHub_PR1_Review_Comment.md` (`R6-TEST-01`)
- **Location:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs:802-886`
- **Defect Summary:** `runSquadCanaryAndOptimization()` in `diagnose.mjs` compiled managed leads and specialists under `run.relative`, but only exercised `reportPath(id, 1)` under the unmanaged default root.
- **Remediation & Reverification Evidence:** Updated `runSquadCanaryAndOptimization()` (`diagnose.mjs:802-886`) to also write and verify managed report slots under `const managedReportRoot = path.posix.dirname(managedLeads.structuredContent.manifestPath)` across `inspectHandoffs`, `bundleReports`, `verifyBundle`, and `pruneReports`.

### 4.10 `DEP` — Dependencies, Packaging & CI Configuration
- **Verdict:** **PASS** (0 findings).

---

## 5. Finding Count Summary & Triage Matrix

| Category | P0 | P1 | P2 | P3 | Open (Pre-Remediation) | Closed | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `ARCH` | 0 | 0 | 0 | 0 | 0 | 0 | **PASS** |
| `DOC` | 0 | 0 | 0 | 1 | 0 | 1 | **PASS** |
| `SKILL` | 0 | 0 | 0 | 0 | 0 | 0 | **PASS** |
| `MCP` | 0 | 0 | 1 | 1 | 0 | 2 | **PASS** |
| `RUN` | 0 | 0 | 2 | 0 | 0 | 2 | **PASS** |
| `SVC` | 0 | 1 | 2 | 1 | 0 | 4 | **PASS** |
| `DB` | 0 | 0 | 0 | 0 | 0 | 0 | **PASS** |
| `SCRIPT` | 0 | 0 | 0 | 1 | 0 | 1 | **PASS** |
| `TEST` | 0 | 0 | 0 | 1 | 0 | 1 | **PASS** |
| `DEP` | 0 | 0 | 0 | 0 | 0 | 0 | **PASS** |
| **Total** | **0** | **1** | **5** | **5** | **0** | **11** | **APPROVE** |

---

## 6. Verification Commands & Reproduction Plan

1. **Full Automated Test & Benchmark Suite (`npm test`):**
   ```bash
   npm test
   ```
   - Exercises `tests/test-dispatch.mjs`, `tests/test-handoffs.mjs`, `tests/test-run.mjs`, `tests/test-server.mjs`, and `benchmarks/teamwork-vs-squad/verify-benchmark.mjs` (`0` failures).
2. **Self-Diagnosis & Ledger Schema Validation:**
   ```bash
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr1-code-review-ledger.md
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr2-documentation-review-ledger.md
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/rebuild-wsl-dispatch-review-r2.md
   ```
   - All 3 ledgers report `status: "HEALTHY"` with `0` blocking findings.

---

## 7. Consolidated Finding Disposition Table (`1 ID = 1 Row`)

| ID | Category | Priority | Original Review Ref | Location | Summary | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `R6-SVC-01` | `SVC` | `P2` | `R6-SVC-01` / Claim 7 | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:169-416` | Enforce Section 9 bundle SHA-256 and 1:1 cohort finding-ID membership in `teardownSelfDiagnosisDirs()`. | **Closed** |
| `R6-MCP-01` | `MCP` | `P2` | `R6-MCP-01` / Claim 6 | `mcp/index.js:18-84` | Expose PascalCase inline manifest aliases (`Role`, `Objective`, `ScopeFiles`, etc.) and `allOf`/`anyOf` requirements in `agentSchema`. | **Closed** |
| `R6-MCP-02` | `MCP` | `P3` | `R6-MCP-02` / Claim 4 | `mcp/index.js:139-250` | Enforce 10 MiB stdio payload ceiling incrementally on `process.stdin` `data` chunks before newline assembly. | **Closed** |
| `R6-SCRIPT-01` | `SCRIPT` | `P3` | `R6-SCRIPT-01` / Claim 8 | `bin/terminal.py:146-152` | Treat child `agy` exit before `submitted == True` (when `not startup_failed and not terminating`) as non-zero startup failure. | **Closed** |
| `R6-SVC-02` | `SVC` | `P3` | `R6-SVC-02` | `mcp/handoffs.mjs:8-95` | Honor custom `AGY_SQUAD_SCRATCH_ROOT` and `record.reportRoot` in `resolveReportRoot()` and `reconcileHandoffs()`. | **Closed** |
| `R6-TEST-01` | `TEST` | `P3` | `R6-TEST-01` | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:802-886` | Route `runSquadCanaryAndOptimization()` in `diagnose.mjs` through both unmanaged and managed plan-root report slots. | **Closed** |
| `R6-DOC-01` | `DOC` | `P3` | `R6-DOC-01` | `docs/reviews/pr1-code-review-ledger.md:1-265` | Record Wave R6 consolidation, remediation, and reverification in `docs/reviews/`. | **Closed** |
| `SVC-003` | `SVC` | `P1` | `SVC-003` / Claim 3 | `mcp/handoffs.mjs:241-262` | Carried-forward: `readSynthesis()` strips fenced/inline code and requires explicit verdict syntax. | **Closed** |
| `SVC-002` | `SVC` | `P2` | `SVC-002` / Claim 5 | `mcp/handoffs.mjs:103-115` | Carried-forward: `reconcileHandoffs()` enforces single-line `<= 500` UTF-8 byte receipts. | **Closed** |
| `RUN-003` | `RUN` | `P2` | `RUN-003` / Claim 1 | `mcp/briefs.mjs:62, 79-81` | Carried-forward: `buildSubagentSpec()` defaults `TypeName` to `"self"` and rejects `"research"`. | **Closed** |
| `RUN-004` | `RUN` | `P2` | `RUN-004` / Claim 2 | `mcp/briefs.mjs:64, 82-84` | Carried-forward: `buildSubagentSpec()` enforces `Workspace: "inherit"`. | **Closed** |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SCRIPT-GAP-002` | `R1-R7 / Session 2-3` | `SCRIPT` | **Informational** | `Devin_R6_Verification_Report.md` | Live Antigravity `agy` binary TUI banner and `/mcp` panel escape sequence may evolve across upstream IDE/CLI releases. | Tracked as upstream external CLI compatibility boundary; `bin/terminal.py:15-96` strips ANSI CSI/OSC sequences before matching `agent` and `? for shortcuts`, and fake-`agy` PTY harness in `tests/test-run.mjs` covers the state machine. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R6-TEST-GAP-02` | `R6 / Session 2` | `TEST` | **Closed (By Design)** | `PR1_Agy_Squad_Code_Review_Ledger_R6.md` | Full 6-specialist (`all_l1`) live LLM execution was not re-triggered during static R6 code review. | Covered by prior live cohorts (`R3`–`R5`) and the Phase 1 + Phase 2 flat specialist reverification squads in Session 2. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R6-TEST-GAP-03` | `R6 / Session 2` | `TEST` | **Closed (Post-Remediation)** | `PR1_Agy_Squad_Code_Review_Ledger_R6.md` | Execute WSL test suite and add multi-chunk newline-free stdio payload cap test for `R6-MCP-02`. | Added incremental chunk-level oversized stdio payload test and split UTF-8 test in `tests/test-server.mjs:177-220` and executed `npm test` in WSL. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R7-SVC-01` | `R7 / Session 3` | `SVC` | **Closed (Post-Remediation)** | Direct `/pr-review` (`diagnose.mjs:169-231, 442-466`) | `extractCohortFindingIds()` missed findings formatted as plain/numbered headings (`### SD-HEAD-01 — ...`), bold-colon bullets (`- **SD-BULLET-01:** ...`), or unpruned loose `specialist-*/report.md` files during `--teardown`. | Extended `extractCohortFindingIds(md, { includeProseHeadingsAndBullets: true })` to parse plain/numbered/styled headings and bullets (including colon-inside-bold), scanned loose `specialist-*/report.md` files in `teardownSelfDiagnosisDirs()`, tightened Section 9 SHA extraction with `(?<![0-9a-f-])`, and added table/heading/bullet omission tests in `tests/test-run.mjs:521-629`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R7-SVC-02` | `R7 / Session 3` | `SVC` | **Closed (Post-Remediation)** | Direct `/pr-review` (`mcp/handoffs.mjs:241-368`) | `readSynthesis()` missed numbered-list/inline colon-delimited `FAIL:` tokens and `- **Verdict:** **PASS/FAIL**` (colon inside bold), and `bundleReports()`/`verifyBundleInternal()` did not persist or reconcile structured `verdict: "PASS"` in `report.sources.json`. | Updated `readSynthesis()` to return `{ bytes, verdict: "PASS" }` and match numbered-list, inline `FAIL:`/`BLOCKED:`, and bold-colon `- **Verdict:** **PASS/FAIL**` forms; persisted and reconciled `verdict: "PASS"` in `bundleReports()` and `verifyBundleInternal()`, covered in `tests/test-handoffs.mjs:79-135`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R7-SCRIPT-01` | `R7 / Session 3` | `SCRIPT` | **Closed (Post-Remediation)** | Direct `/pr-review` (`verify-benchmark.mjs:78-86`) | `verify-benchmark.mjs` N6 check verified `readLedger()` returning `[]` on corrupt JSON, but stopped before exercising `appendLedgerEntry()` overwriting existing ledger entries. | Seeded `r-prior` via `appendLedgerEntry()`, corrupted `ledger.json`, verified `readLedger()` returns `[]`, and verified `appendLedgerEntry(..., "r-new")` overwrites `ledger.json` with only `[r-new]` (`count: 1`). | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R7-SCRIPT-02` | `R7 / Session 3` | `SCRIPT` | **Closed (Post-Remediation)** | Direct `/pr-review` (`bin/terminal.py:15-96`) | `bin/terminal.py` matched `agent` and `b"? for shortcuts"` against raw PTY bytes without stripping ANSI CSI/OSC escape sequences. | Added `ANSI_ESCAPE_RE` stripping on the rolling `header` buffer before checking `seen_agent` and `seen_shortcuts`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R8-SVC-01` | `R8–R9 / Sessions 4–5 (B1)` | `SVC` | **Closed (Post-Remediation)** | Devin R8/R9 (`mcp/handoffs.mjs:241-268`) | Negated `PASS` lines (`NOT PASS: validation failed`, `Verdict: not PASS`, `no PASS`) matched `PASS:` in `readSynthesis()` without adding `FAIL`, while `/i` on `PASS` rejected ordinary lowercase prose (`"does not pass"`). | Added `NEGATIONS` lookup in `readSynthesis()` (`mcp/handoffs.mjs:241-266`) matching uppercase `PASS` only while normalizing negation words case-insensitively; tested in `tests/test-handoffs.mjs:83-85, 100-105`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R8-SVC-02` | `R8–R9 / Sessions 4–5 (B2)` | `SVC` | **Closed (Post-Remediation)** | Devin R8/R9 (`mcp/handoffs.mjs:368-372`) | Legacy bundles created before the `verdict` field existed in `report.sources.json` failed `verifyBundleInternal()` when `parsed.verdict` was `undefined`, while `?? "PASS"` also accepted `"verdict": null`. | Used `Object.hasOwn(parsed, "verdict") ? parsed.verdict : "PASS"` in `verifyBundleInternal()` (`mcp/handoffs.mjs:369`) so only an omitted `verdict` defaults to `"PASS"` while `"verdict": null` is rejected; tested in `tests/test-handoffs.mjs:140-149`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R8-SCRIPT-01` | `R8–R9 / Sessions 4–5 (F1/B3)` | `SCRIPT` | **Closed (Post-Remediation)** | Devin R8/R9 (`verify-benchmark.mjs:78-144`) | Document that the N6 overwrite check in `verify-benchmark.mjs` confirms the planted defect in the unfixed fixture, and add a fixed-fixture grading check (`--expect-fixed` / `AGY_BENCHMARK_EXPECT_FIXED=1`) that accepts both throw-and-backup and backup-and-continue fixes and verifies the appended entry when returning normally. | Added `// N6 planted defect: corrupt ledger is overwritten, prior entry lost` at line 78 and implemented `verifyFixedLedgerGuard` (`--expect-fixed` / `AGY_BENCHMARK_EXPECT_FIXED=1`) checking `fs.readFileSync(targetPath + ".corrupt", "utf8") === "{corrupt-json"` when backed up, verifying `{ duplicate: false, count: 1 }` and the persisted `[r-new]` entry when `!threw`, or rejecting `res?.count === 1` without backup, verified against both reference fix patterns in `verify-benchmark.mjs:83-143`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R8-SCRIPT-02` | `R8 / Session 4 (F2)` | `SCRIPT` | **Closed (Post-Remediation)** | Devin R8 (`bin/terminal.py:59, 95, 149-154`) | Make startup shortcut marker configurable (`AGY_SQUAD_READY_MARKER`), include `seen_agent`/`seen_shortcuts`/`mcp_ready` in startup timeout errors, and document in `docs/plans/wsl-cli-verification.md`. | Added `AGY_SQUAD_READY_MARKER` (default `"? for shortcuts"`) and `startup timeout: seen_agent=<bool> seen_shortcuts=<bool> mcp_ready=<bool>` in `bin/terminal.py`, tested in `tests/test-run.mjs:348-406`, and documented in `docs/plans/wsl-cli-verification.md:17`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `SVC-NEW-01` | `R10 / Session 6 (P1)` | `SVC` | **Closed (Post-Remediation)** | Sol Merge-Readiness Handoff (`diagnose.mjs:57-76, 429-436, 514-528`) | `teardownSelfDiagnosisDirs()` called `fs.rmSync(..., { recursive: true, force: true })` without verifying that cleanup path parents are real directories inside the workspace, allowing symlinked `scratch` parents to delete external targets. | Added `assertSafeDeleteTarget(relative)` (`diagnose.mjs:57-76`) validating every path segment via `fs.lstatSync` and `fs.realpathSync`, enforced before bundle reads (`line 435`), immediately before `fs.rmSync` (`line 516`), and before `--teardown all` canary enumeration/deletion (`lines 521-525`); verified external sentinels survive forced, non-forced, and all-canary teardown in `tests/test-run.mjs:672-721`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `SVC-NEW-02` | `R10 / Session 6 (P2)` | `SVC` | **Closed (Post-Remediation)** | Sol Merge-Readiness Handoff (`diagnose.mjs:43-55, 495-510`) | `hasEvidence()` in `diagnose.mjs` checked only nonempty `report.md` files, allowing unbundled `diagnostics.json`, `trace.log`, or other files to be deleted during teardown. | Replaced `hasEvidence()` with `listArtifacts(directory)` (`diagnose.mjs:43-55`), added `expectedArtifacts` allowlist check after bundle verification (`lines 495-505`), and blocked no-bundle teardown when `listArtifacts(absDir).length > 0` (`line 507`); verified in `tests/test-run.mjs:637-670`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `SCRIPT-NEW-01` | `R10 / Session 6 (P2)` | `SCRIPT` | **Closed (Post-Remediation)** | Sol Merge-Readiness Handoff (`bin/agy-squad.mjs:90-109`) | `hasEvidence()` in `bin/agy-squad.mjs` checked only nonempty `report.md` files, discarding `diagnostics.json` or non-report artifacts when a CLI session exited nonzero. | Updated `hasEvidence(directory, relative = "")` (`bin/agy-squad.mjs:90-109`) to ignore only `.mcp-ready`, `plan-<hex>/manifest.json`, and empty `report.md` slots while preserving any other file or symlink as evidence; verified with status-8 fake CLI diagnostic retention in `tests/test-run.mjs:125-128, 189-196`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `SVC-NEW-03` | `R10 / Session 6 (P2)` | `SVC` | **Closed (Post-Remediation)** | Sol Merge-Readiness Handoff (`mcp/handoffs.mjs:106-124`) | `reconcileHandoffs()` parsed `READY` and `PARTIAL` receipts using `\S+` for the report path, rejecting valid custom scratch roots containing spaces or `" — "`. | Replaced `\S+` regex parsing in `reconcileHandoffs()` (`mcp/handoffs.mjs:106-124`) with exact assigned-slot prefix matching (`READY ${report} — ` and `PARTIAL ${report} — `); verified with spaces and `" — "` in `reportRoot` in `tests/test-handoffs.mjs:225-270`. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |

---

## 9. `/self-diagnosis` Cohort & Bundle Ledger

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| `Phase 2 — PR1 Reverification` | `944c64a0-e4c9-4272-a701-e3a32108a31b` | `runtime_and_contract_diagnosis` (Flat Specialist Squad) | `dddc7a5b-b794-4994-9c80-0972967c6ae1`, `1ec09d7f-5763-4bc3-be15-c677d16d614e` | `N/A (Consolidated from PR1_Agy_Squad_Code_Review_Ledger_R6)` | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` | `TORN_DOWN (verified via diagnose.mjs --teardown)` |

| ID | Category | Priority | Status | Specialist / Cohort Verification |
| --- | --- | --- | --- | --- |
| `R6-SVC-01` | `SVC` | `P2` | **Closed** | Verified by Specialist 1 (`dddc7a5b-...`) and Specialist 2 (`1ec09d7f-...`) in `.agents/skills/self-diagnosis/scripts/diagnose.mjs:169-416` and `tests/test-run.mjs:514-608`. |
| `R6-MCP-01` | `MCP` | `P2` | **Closed** | Verified by Specialist 1 (`dddc7a5b-...`) and Specialist 2 (`1ec09d7f-...`) in `mcp/index.js:18-84` and `tests/test-server.mjs:89-158`. |
| `R6-MCP-02` | `MCP` | `P3` | **Closed** | Verified by Specialist 1 (`dddc7a5b-...`) and Specialist 2 (`1ec09d7f-...`) in `mcp/index.js:139-250` and `tests/test-server.mjs:177-220`. |
| `R6-SCRIPT-01` | `SCRIPT` | `P3` | **Closed** | Verified by Specialist 2 (`1ec09d7f-...`) in `bin/terminal.py:146-152` and `tests/test-run.mjs:481-512`. |
| `R6-SVC-02` | `SVC` | `P3` | **Closed** | Verified by Specialist 1 (`dddc7a5b-...`) and Specialist 2 (`1ec09d7f-...`) in `mcp/handoffs.mjs:8-95` and `tests/test-handoffs.mjs:178-205`. |
| `R6-TEST-01` | `TEST` | `P3` | **Closed** | Verified by Specialist 1 (`dddc7a5b-...`) and Specialist 2 (`1ec09d7f-...`) in `.agents/skills/self-diagnosis/scripts/diagnose.mjs:802-886`. |
| `R6-DOC-01` | `DOC` | `P3` | **Closed** | Verified by Specialist 1 (`dddc7a5b-...`) and Specialist 2 (`1ec09d7f-...`) in `docs/reviews/pr1-code-review-ledger.md` and `docs/reviews/rebuild-wsl-dispatch-review-r2.md:15-26`. |
| `SVC-003` | `SVC` | `P1` | **Closed** | Verified intact by Specialist 1 (`dddc7a5b-...`) in `mcp/handoffs.mjs:241-262`. |
| `SVC-002` | `SVC` | `P2` | **Closed** | Verified intact by Specialist 1 (`dddc7a5b-...`) in `mcp/handoffs.mjs:103-115`. |
| `RUN-003` | `RUN` | `P2` | **Closed** | Verified intact by Specialist 2 (`1ec09d7f-...`) in `mcp/briefs.mjs:62, 79-81` and `tests/test-dispatch.mjs:35, 88-99`. |
| `RUN-004` | `RUN` | `P2` | **Closed** | Verified intact by Specialist 2 (`1ec09d7f-...`) in `mcp/briefs.mjs:64, 82-84` and `tests/test-dispatch.mjs:43-46, 92-103`. |
| `SVC-NEW-01` | `SVC` | `P1` | **Closed** | Verified in `.agents/skills/self-diagnosis/scripts/diagnose.mjs:57-76, 435, 514-528` and `tests/test-run.mjs:672-721` (external sentinels survive forced, non-forced, and all-canary teardown). |
| `SVC-NEW-02` | `SVC` | `P2` | **Closed** | Verified in `.agents/skills/self-diagnosis/scripts/diagnose.mjs:43-55, 495-510` and `tests/test-run.mjs:637-670` (unbundled JSON/logs block deletion with or without an accepted bundle). |
| `SCRIPT-NEW-01` | `SCRIPT` | `P2` | **Closed** | Verified in `bin/agy-squad.mjs:90-109` and `tests/test-run.mjs:125-128, 189-196` (fake CLI status-8 JSON-only diagnostic retained). |
| `SVC-NEW-03` | `SVC` | `P2` | **Closed** | Verified in `mcp/handoffs.mjs:106-124` and `tests/test-handoffs.mjs:225-270` (`READY` and `PARTIAL` receipts work with spaces and `" — "` separator characters). |
