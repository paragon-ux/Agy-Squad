# Agy-Squad PR #1 Consolidation, Remediation & Reverification Ledger

**Disposition:** `READY TO MERGE — Wave R12: 47 distinct defect findings closed (2 P1 / 20 P2 / 25 P3), 0 blocking residuals; Node 22/24 package-manifest assertion + self-test; final immutable head and CI run IDs in post-push GitHub review; native WSL2 agy smoke test remains separately tracked`
**Wave RM1 historical audit checkpoint:** `999c221b0958174d058226a4e9ba7288fbb61612` (scope: 49 files / 27 commits at that historical checkpoint; not the final release head).
**Wave R12 pre-remediation checkpoint:** `74ff8600dbc213bbe9b63342941ab96ebb54a1d2` (scope: 50 files / 29 commits at the start of R12).
**Release-candidate SHA and final CI proof:** Recorded by a new, post-push GitHub PR review/comment, which pins the immutable final head and Actions run URLs.
**Review Date:** `2026-11-09`
**Repository / PR:** [paragon-ux/Agy-Squad #1](https://github.com/paragon-ux/Agy-Squad/pull/1) (`rebuild/wsl-dispatch` -> `main`)
**Base Branch / SHA:** `main` at `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`
**Reviewed Head SHA (Pre-R6 Baseline):** `c7acf464be46780b051b432d59ce657f4ee2880f` (reconciled against merged PR #2 baseline `3df852b9251170870d03c42e2a4e6d03440efbe2`)
**Remediated & Reverified Commit SHA:** `2634683f546a7751f98aa77ead2fc13b64f31f7c` (prior reverified wave SHAs: `541d6c0`, `9aa78af`, `c663bd2`, `1ade0f0`, `1a54322`, `ed94e83`)
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
| Session 7 (Wave R11 Documentation Consistency `/pr-review`) | `fa93e383-0b2c-4874-8568-cb1d93e98924` | None (independent review thread) | 2026-11-09 | `ee10ebc..f6ed11d` (clean working tree; no code changes) | Direct non-delegated `/pr-review` (Standard `v1.3.0`), `DOC`-scoped: active docs, benchmark README, skills, `docs/plans/`, and `docs/reviews/` cross-checked against `mcp/`, `bin/`, and `diagnose.mjs`; `npm test` + `diagnose.mjs --ledger` |
| Session 8 (PR1 Holistic Production Readiness Review) | `8c066b81-f7fb-4384-accb-11df3c54c717` | `ef239063-b2ae-4e79-aef8-3343b9097b3e` | 2026-11-09 | `ee10ebc255f0d52dc93b51d7cf8198bb069c4532..999c221b0958174d058226a4e9ba7288fbb61612 (clean working tree)` | Full 10-category holistic production readiness review (Standard `v1.3.0`) + additive ledger reconciliation across all 49 changed files |
| Session 9 (PR1 P2/P3 Defect Remediation & Verification) | `b3203b09-75c6-4b09-9e28-613a103ed37b` | `1cb74e5c-af0d-40d7-a66a-fc5571d15444` | 2026-11-09 | `ee10ebc255f0..999c221b0958` + packaging allowlist & doc fixes | Full remediation of PR1-DEP-01 (package allowlist), 5 P2 doc defects (R11-DOC-01..05), and 14 P3 doc consistency findings (R11-DOC-06..19); verified via npm test, diagnose.mjs, and npm pack |
| Session 10 (Wave R12 Independent Release-Gate Closure) | External independent review: GitHub review `5829814649`; Argon follow-up implementation | Root operator / teamwork implementation | 2026-11-09 | `74ff860` pre-remediation baseline; final post-fix head/CI pinned in GitHub review | Targeted R12 TEST/DOC hardening; sole-owner ledger reconciliation; Node 22/24 pack-file assertion + self-test |

- **Scope & Precedence:** Phase 2 began only after Phase 1 (PR #2) was remediated, reverified by a flat specialist squad, validated via `/self-diagnosis`, and merged into `rebuild/wsl-dispatch` (`3df852b9251170870d03c42e2a4e6d03440efbe2`).
- **Phase 2 Step 1 — Reconciliation Against Completed PR #2 Baseline (`3df852b9251170870d03c42e2a4e6d03440efbe2`):**
  1. PR #2 updated documentation (`README.md`, `docs/index.md`, `docs/benchmarks.md`, `docs/getting-started.md`, `docs/core-workflows.md`, `docs/concepts.md`, `docs/plans/wsl-cli-verification.md`, `zensical.toml`), benchmark verification (`benchmarks/teamwork-vs-squad/`), and skill contracts (`.agents/skills/self-diagnosis/SKILL.md`, `.agents/skills/pr-review/SKILL.md`), and added `docs/reviews/pr2-documentation-review-ledger.md`.
  2. None of the 7 open PR #1 runtime/code findings (`R6-SVC-01`, `R6-MCP-01`, `R6-MCP-02`, `R6-SCRIPT-01`, `R6-SVC-02`, `R6-TEST-01`, `R6-DOC-01`) were superseded by PR #2; the addition of `docs/reviews/pr2-documentation-review-ledger.md` reinforced `R6-SVC-01`'s cross-ledger replay requirement across multiple files in `docs/reviews/`.
  3. All 4 carried-forward closed PR #1 findings (`SVC-003`, `SVC-002`, `RUN-003`, `RUN-004`) remained intact in the post-PR #2 baseline.
- **Deduplication Note:** All 23 remediated code findings (`R6-*`, `SVC-00*`, `RUN-00*`, `R7-*`, `R8-*`, `SVC-NEW-*`, `SCRIPT-NEW-*`), 19 open Wave R11 documentation findings (`R11-DOC-01`..`R11-DOC-19`), 1 additive packaging finding (`PR1-DEP-01`), and 3 verification gaps (`SCRIPT-GAP-002`, `R6-TEST-GAP-02`, `R6-TEST-GAP-03`) are preserved 1-to-1 with original canonical IDs.

---

## 2. File-to-Category Inventory & Coverage Matrix

This inventory covers the PR #1 release-candidate tree relative to base `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`, including the Wave R12 package verifier and this production-readiness review. The historical RM1 audit originally covered `ee10ebc..999c221`; use the final `git diff --name-only` comparison in §6 to confirm that every changed file is listed here.

| Path | Primary Category | Cross-Referenced Categories | Review Package Reference |
| --- | --- | --- | --- |
| `.agents/skills/pr-review/SKILL.md` | `SKILL` | `DOC` | Standard v1.3.0 workflow and rules |
| `.agents/skills/pr-review/references/pr-review-standard.md` | `SKILL` | `DOC` | Normative specification for PR Review Standard v1.3.0 |
| `.agents/skills/self-diagnosis/SKILL.md` | `SKILL` | `RUN` | Self-diagnosis skill definition, progressive disclosure, L41 gate |
| `.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md` | `SKILL` | `DOC` | Optimization rubrics, token limits, architecture checks |
| `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | `SKILL` | `RUN` | Standard 3-squad / 6-specialist diagnostic cohort manifest |
| `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `SVC` | `TEST`, `SKILL`, `DOC` | `R6-SVC-01`, `R6-TEST-01`, `R6-DOC-01`, `SVC-NEW-01`, `SVC-NEW-02` |
| `.github/workflows/ci.yml` | `DEP` | `TEST` | Multi-version Node/Python CI and npm pack dry-run |
| `.github/workflows/docs.yml` | `DEP` | `DOC` | Zensical static documentation build and Pages gating |
| `.gitignore` | `DEP` | — | Ignores ephemeral `.agents/agents/` and `.agents/plugins/` |
| `README.md` | `DOC` | — | Repository overview, WSL CLI orientation, single public entrypoint |
| `benchmarks/teamwork-vs-squad/README.md` | `DOC` | `SCRIPT` | Benchmark setup, 6 seeded defects, reproduction steps (`R11-DOC-02`) |
| `benchmarks/teamwork-vs-squad/fixture/config.json` | `SCRIPT` | `TEST` | Benchmark event-relay configuration containing planted bug (N5) |
| `benchmarks/teamwork-vs-squad/fixture/gateway/gateway.mjs` | `SCRIPT` | `TEST` | Benchmark gateway containing signature DoS (N1) and rate limit bug (N2) |
| `benchmarks/teamwork-vs-squad/fixture/gateway/test-gateway.mjs` | `SCRIPT` | `TEST` | Isolated unit test for gateway |
| `benchmarks/teamwork-vs-squad/fixture/worker/ledger.mjs` | `SCRIPT` | `TEST` | Benchmark ledger containing corrupt JSON overwrite bug (N6) |
| `benchmarks/teamwork-vs-squad/fixture/worker/test-worker.mjs` | `SCRIPT` | `TEST` | Isolated unit test for worker |
| `benchmarks/teamwork-vs-squad/fixture/worker/worker.mjs` | `SCRIPT` | `TEST` | Benchmark worker containing header (N3), schema (N4), retry bugs |
| `benchmarks/teamwork-vs-squad/manifest.json` | `RUN` | `SCRIPT` | Benchmark dispatch manifest for the 2-specialist audit cohort |
| `benchmarks/teamwork-vs-squad/results/telemetry.json` | `DOC` | `SCRIPT` | Telemetry from live A/B trial comparing Agy-Squad vs. /teamwork control |
| `benchmarks/teamwork-vs-squad/verify-benchmark.mjs` | `SCRIPT` | `TEST` | Offline defect and telemetry verification (`R7-SCRIPT-01`, `R8-SCRIPT-01`) |
| `bin/agy-squad.mjs` | `SCRIPT` | `RUN`, `SVC` | Managed WSL CLI launcher, plugin generation, prompt injection (`R6-SCRIPT-01`, `SCRIPT-NEW-01`) |
| `bin/terminal.py` | `SCRIPT` | `RUN`, `TEST` | Python PTY bridge handling terminal TUI, /mcp discovery (`R6-SCRIPT-01`, `R7-SCRIPT-02`, `R8-SCRIPT-02`, `SCRIPT-GAP-002`) |
| `docs/benchmarks.md` | `DOC` | — | A/B benchmark analysis and comparison tables (`R11-DOC-12`) |
| `docs/concepts.md` | `DOC` | — | Architectural concepts: staged compilation, Pointer-Over-Wire, bundling (`R11-DOC-01`, `R11-DOC-04`, `R11-DOC-08`, `R11-DOC-10`, `R11-DOC-11`) |
| `docs/core-workflows.md` | `DOC` | — | Operator workflows: single-squad, multi-squad, self-diagnosis (`R11-DOC-03`, `R11-DOC-04`, `R11-DOC-07`) |
| `docs/getting-started.md` | `DOC` | — | Onboarding guide, installation instructions, prerequisites (`R11-DOC-01`, `R11-DOC-06`, `R11-DOC-07`, `R11-DOC-14`) |
| `docs/index.md` | `DOC` | — | Documentation landing page reflecting native CLI and Pointer-Over-Wire handoffs (`R11-DOC-04`, `R11-DOC-14`) |
| `docs/plans/LEDGER.md` | `ARCH` | `DOC` | Architectural decision ledger recording decisions L1 through L41 (`R11-DOC-13`) |
| `docs/plans/docker-sandbox-plan.md (deleted)` | `ARCH` | — | Retired legacy Windows Docker Desktop container design document |
| `docs/plans/wsl-cli-verification.md` | `DOC` | `SCRIPT` | Loopback fixture verification and supervised live trial checks (`R8-SCRIPT-02`) |
| `docs/reviews/pr1-code-review-ledger.md` | `DOC` | — | Active PR #1 consolidation, remediation, and reverification ledger (R1-R11) |
| `docs/reviews/pr1-production-readiness-review.md` | `DOC` | `TEST`, `DEP` | Wave RM1/RM2 production-readiness assessment, R12 provenance reconciliation and package-verification evidence |
| `docs/reviews/pr2-documentation-review-ledger.md` | `DOC` | — | Review ledger for PR #2 (documentation and benchmark consolidation) |
| `docs/reviews/rebuild-wsl-dispatch-review-r2.md` | `DOC` | `SKILL`, `SVC` | Historical R2 review report closing prior findings (`R6-DOC-01`) |
| `docs/reviews/rebuild-wsl-dispatch-review.md` | `DOC` | — | Historical R1 review report for the initial rebuild commit |
| `docs/stopping-agents.md` | `DOC` | — | Stopping procedures for WSL CLI, `/agents` panel, and `manage_subagents` |
| `docs/tools.md` | `DOC` | — | Documents public MCP tool (`dispatch_squad`) and CLI utilities (`R11-DOC-09`) |
| `mcp/briefs.mjs` | `RUN` | `MCP` | Brief compiler: validates `scopeFiles`, enforces `TypeName: "self"`, `Workspace: "inherit"` (`RUN-003`, `RUN-004`) |
| `mcp/dispatch.mjs` | `RUN` | `MCP`, `SVC` | Squad dispatcher: workspace containment, `/proc/self/fd` checks, staged plans (`L1`, `L17`) |
| `mcp/handoffs.mjs` | `SVC` | `TEST` | Pointer-Over-Wire handoff reconciliation, bundling, verification, and pruning (`SVC-002`, `SVC-003`, `R6-SVC-02`, `R7-SVC-02`, `R8-SVC-01`, `R8-SVC-02`, `SVC-NEW-03`) |
| `mcp/index.js` | `MCP` | `RUN`, `SVC` | MCP server: stdio JSON-RPC, 10MB chunk-level framing, retired `subagent_brief` (`L6`, `R6-MCP-01`, `R6-MCP-02`) |
| `mcp/run-state.mjs` | `SVC` | `RUN` | Managed run staging: creates `scratch/agy-squad/run-<uuid>`, slot isolation (`L3`) |
| `package.json` | `DEP` | — | Package manifest: WSL dependencies, files allowlist, and 5-suite `npm test` script (`PR1-DEP-01 resolved`) |
| `tests/legacy/test-security-canary-re-trial.mjs (deleted)` | `TEST` | — | Deleted legacy Docker container canary test |
| `tests/test-briefs.mjs (deleted)` | `TEST` | — | Deleted retired `subagent_brief` tool test |
| `tests/test-dispatch.mjs` | `TEST` | `RUN`, `MCP` | Tests Stage 1 (`all_l1`), Stage 2 (`<squadId>`), containment, error paths (`RUN-003`, `RUN-004`) |
| `tests/test-handoffs.mjs` | `TEST` | `SVC` | Tests handoff reconciliation, 500-byte boundary, bundle digest verification (`SVC-002`, `SVC-003`, `R6-SVC-02`, `R7-SVC-02`, `R8-SVC-01`, `R8-SVC-02`, `SVC-NEW-03`) |
| `tests/test-run.mjs` | `TEST` | `SVC`, `SCRIPT` | Comprehensive test of managed runs, launcher lifecycle, fake CLI PTY, teardown (`R6-SVC-01`, `R6-SCRIPT-01`, `R6-TEST-01`, `SVC-NEW-01`, `SVC-NEW-02`, `SCRIPT-NEW-01`) |
| `tests/test-server.mjs` | `TEST` | `MCP` | Tests MCP server handshake, notification suppression, 10MB framing, exit on stdin close (`R6-MCP-01`, `R6-MCP-02`, `R6-TEST-GAP-03`) |
| `tests/verify-package.mjs` | `TEST` | `DEP` | Wave R12 npm package manifest allowlist, required-runtime assertions and synthetic positive/negative controls (`R12-TEST-01`) |
| `zensical.toml` | `DEP` | `DOC` | Zensical static site configuration updated with new nav items (`L30`) |

---

## 3. Architecture & Runtime Dataflow Trace

1. **Managed & Unmanaged Dispatch (`mcp/index.js` -> `mcp/dispatch.mjs` -> `mcp/briefs.mjs`):**
   `mcp/index.js` processes newline-delimited JSON-RPC over stdio with incremental chunk-level `Buffer` framing (`MAX_STDIO_PAYLOAD_BYTES`, `R6-MCP-02`) and exposes `dispatch_squad` with symmetric camelCase and PascalCase inline manifest schema properties (`R6-MCP-01`). Subagents enforce `TypeName: "self"` (`RUN-003`) and `Workspace: "inherit"` (`RUN-004`).
2. **Pointer-Over-Wire Handoffs & Custom Scratch Roots (`mcp/handoffs.mjs`):**
   `reportPath`, `resolveReportRoot`, `reconcileHandoffs`, `inspectHandoffs`, `bundleReports`, `verifyBundle`, and `pruneReports` honor both default `scratch/agy-squad` (including managed `run-<uuid>/plan-<hex>`) and custom `AGY_SQUAD_SCRATCH_ROOT` / `record.reportRoot` paths (`R6-SVC-02`). Single-line receipts enforce $\le 500$ bytes (`SVC-002`) and exact prefix matching for paths with spaces/dashes (`SVC-NEW-03`). `readSynthesis()` parses unambiguous `PASS` while rejecting code spans (`SVC-003`), markdown fences, and negated passes (`R8-SVC-01`).
3. **Self-Diagnosis Teardown Gate (`.agents/skills/self-diagnosis/scripts/diagnose.mjs`):**
   `teardownSelfDiagnosisDirs()` validates the target ledger schema, verifies the cryptographic bundle (`verifyBundle`), checks `mtimeMs`, confirms that `verified.sha256` is recorded in Section 9's `Cohort Provenance` table, and confirms that every canonical finding ID in `lead/report.md` and `bundle.reports[].markdown` is recorded in the target ledger (`R6-SVC-01`, `R7-SVC-01`). Symlink traversal is blocked via `assertSafeDeleteTarget()` (`SVC-NEW-01`), and unbundled diagnostic artifacts are retained via `listArtifacts()` (`SVC-NEW-02`).
4. **Native CLI PTY Bridge (`bin/agy-squad.mjs` -> `bin/terminal.py`):**
   `bin/terminal.py` waits for both the TUI readiness markers (`seen_agent` and `seen_shortcuts`) and `.mcp-ready` before injecting the bracketed-paste prompt (`submitted = True`), strips ANSI escape sequences (`R7-SCRIPT-02`), uses configurable ready markers (`R8-SCRIPT-02`), fails non-zero if `agy` exits before `submitted` becomes `True` (`R6-SCRIPT-01`), and retains unbundled diagnostics on non-zero exit (`SCRIPT-NEW-01`).

---

## 4. Ten Mandatory Review Categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`)

### 4.1 `ARCH` — Architecture & Structural Design
- **Verdict:** `No findings within reviewed scope` (0 findings).

### 4.2 `DOC` — Documentation & Review Ledgers
- **Verdict:** `No findings within reviewed scope` (R6/R11 historical docs remain closed; Wave R12 closes one additional P2 `R12-DOC-01` and two P3 findings `R12-DOC-02`, `R12-DOC-03`; cumulative DOC: 6 P2 + 17 P3 = 23).

#### `R6-DOC-01`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-DOC-01`), `GitHub_PR1_Review_Comment.md` (`R6-DOC-01`)
- **Location:** `docs/reviews/pr1-code-review-ledger.md:1-265`, `docs/reviews/rebuild-wsl-dispatch-review-r2.md:15-26`
- **Defect Summary:** Record Wave R6 consolidation, remediation, and reverification in `docs/reviews/` under PR Review Standard `v1.3.0`.
- **Remediation & Reverification Evidence:** Established `docs/reviews/pr1-code-review-ledger.md` and updated `docs/reviews/rebuild-wsl-dispatch-review-r2.md` with Session Provenance row `S4 (R6)` and cross-references to both consolidation ledgers; validated via `diagnose.mjs --ledger`.

#### `R11-DOC-01`
1. **Title / Priority / Status:** Receipt examples use ` - `, but `reconcileHandoffs()` requires ` — `; **P2**, **Closed**.
2. **Contract Provenance:** Pointer-Over-Wire receipt grammar compiled by `mcp/briefs.mjs` and documented in `docs/tools.md:50`; `L1`/`L2` receipt-verified slot boundary.
3. **Source Evidence:** `docs/concepts.md:41-43`, `docs/getting-started.md:97` vs. `mcp/handoffs.mjs:106-116` (`READY ${report} — `, `PARTIAL ${report} — `, `/^NO_REPORT — \S/`) @ `f6ed11d`.
4. **Trigger:** A child agent or operator copies the documented `READY <report-path> - <observation>` form.
5. **Expected / Actual:** Expected these docs to match the em-dash separator used by `docs/tools.md` and the compiled briefs. Instead, they show ASCII ` - `, which `inspect`/`bundle` reject with `Handoff must include the sender's assigned report…`. The getting-started example path also omits managed `plan-…/squad-…/` segments.
6. **Impact:** Receipts written from the onboarding guide fail reconciliation, and two active docs contradict `docs/tools.md`.
7. **Required Remediation:** Use ` — ` in `docs/concepts.md:41-43` and `docs/getting-started.md:97`, and show a full managed slot path.
8. **Acceptance Evidence:** No active doc shows a ` - ` receipt separator; `inspect` accepts the documented example.
9. **Root Cause / Related IDs:** Prose paraphrased instead of derived from `mcp/briefs.mjs`; related `R11-DOC-07`, `SVC-NEW-03`.
10. **Closure:** Resolved. Replaced ASCII hyphen with em dash in `docs/concepts.md:41-43` and `docs/getting-started.md:97`; rechecked against `mcp/handoffs.mjs` receipt grammar and closed.

#### `R11-DOC-02`
1. **Title / Priority / Status:** `handoffs.mjs verify --squad ab_audit` is not a valid invocation; **P2**, **Closed**.
2. **Contract Provenance:** `mcp/handoffs.mjs` CLI contract `verify <bundle.json>`.
3. **Source Evidence:** `benchmarks/teamwork-vs-squad/README.md:98` vs. the `mcp/handoffs.mjs` CLI dispatcher @ `f6ed11d`.
4. **Trigger:** Operator follows step 2 of "Run a new live experiment".
5. **Expected / Actual:** Expected a working verify command. Instead, `node mcp/handoffs.mjs verify --squad ab_audit` prints the usage string and exits `1`.
6. **Impact:** The documented live-reproduction protocol cannot complete its integrity check as written.
7. **Required Remediation:** Replace it with `node mcp/handoffs.mjs verify scratch/agy-squad/run-<uuid>/plan-<hex>/squad-ab_audit/lead/report.sources.json`.
8. **Acceptance Evidence:** The documented command parses and verifies a bundle.
9. **Root Cause / Related IDs:** Stale flag-style syntax; related `R11-DOC-09`.
10. **Closure:** Resolved. Updated `benchmarks/teamwork-vs-squad/README.md:98` to pass bundle path to `verify`; rechecked against `mcp/handoffs.mjs` verify contract and closed.

#### `R11-DOC-03`
1. **Title / Priority / Status:** Public workflow runs `--teardown` after remediation, but the skill requires it before; **P2**, **Closed**.
2. **Contract Provenance:** `L41`; `.agents/skills/self-diagnosis/SKILL.md:56`.
3. **Source Evidence:** `docs/core-workflows.md:56` (`… -> transcribe -> remediate -> re-verify -> diagnose.mjs --teardown -> terminate`).
4. **Trigger:** Operator follows the public workflow during a cohort that includes remediation.
5. **Expected / Actual:** Expected teardown right after the ledger update, because remediation changes `verifiedFiles`, causing `verifyBundle` to fail without `--force`.
6. **Impact:** Following the doc leads to a teardown refusal or pushes the operator toward `--force`.
7. **Required Remediation:** Reorder to `… -> transcribe -> diagnose.mjs --teardown -> remediate -> re-verify -> terminate`, matching SKILL Step 2.
8. **Acceptance Evidence:** `docs/core-workflows.md` and the self-diagnosis SKILL list the same ordering.
9. **Root Cause / Related IDs:** Summary predates final `L41` gate ordering; related `SVC-NEW-02`.
10. **Closure:** Resolved. Reordered `docs/core-workflows.md:56` sequence to place `diagnose.mjs --teardown` before code remediation; rechecked against `.agents/skills/self-diagnosis/SKILL.md:56` and closed.

#### `R11-DOC-04`
1. **Title / Priority / Status:** Active docs give `L7`, `L29`, `L30`, `L40`, and `L41` meanings that do not match `LEDGER.md`; **P2**, **Closed**.
2. **Contract Provenance:** `docs/plans/LEDGER.md` (normative ID source per `pr-review` SKILL Step 2).
3. **Source Evidence:** `docs/concepts.md:67`, `docs/core-workflows.md:8`, `docs/index.md:26` assign meanings contradicting `docs/plans/LEDGER.md`.
4. **Trigger:** A reviewer traces a contract through the glossary, as Step 2 requires.
5. **Expected / Actual:** Expected citations to match `LEDGER.md` decision text. Instead, decision IDs are misattributed.
6. **Impact:** Architecture-before-runtime traces cite the wrong decisions.
7. **Required Remediation:** Correct the mappings across documentation to match `LEDGER.md`.
8. **Acceptance Evidence:** Every `L<n>` cited in active docs matches the `LEDGER.md` decision text.
9. **Root Cause / Related IDs:** Glossary not derived from `LEDGER.md`; related `R11-DOC-13`.
10. **Closure:** Resolved. Corrected decision ledger citations in `docs/concepts.md:67`, `docs/core-workflows.md:8`, and `docs/index.md:26`; rechecked against `docs/plans/LEDGER.md` and closed.

#### `R11-DOC-05`
1. **Title / Priority / Status:** This ledger's finding counts, statuses, and record density are inconsistent; **P2**, **Closed**.
2. **Contract Provenance:** PR Review Standard `v1.3.0` Step 5 and Step 7.
3. **Source Evidence:** Header counted 11 findings vs 23 remediated code defects; R7–R10 defects sat in §8 with conflicting statuses.
4. **Trigger:** A reader tallies PR #1 findings or checks the status of one ID.
5. **Expected / Actual:** Expected all remediated defects to be counted in Section 4 and Section 7 with 10-field records for P1/P2, and Section 8 reserved for residuals.
6. **Impact:** Review ledger understates defect scope and violates standard formatting.
7. **Required Remediation:** Promote R7–R10 defects to Sections 4 & 7, recount §5 totals, maintain one status per ID, and reserve §8 for true residuals.
8. **Acceptance Evidence:** §5 totals equal §7 row count, each ID has one status, and `diagnose.mjs --ledger` reports `HEALTHY`.
9. **Root Cause / Related IDs:** Later waves appended to §8 instead of re-baselining ledger; related `R11-DOC-15`..`R11-DOC-19`.
10. **Closure:** Resolved. Harmonized review ledgers with complete 10-field records, accurate Section 5 counts, and canonical `Closed` statuses across `docs/reviews/pr1-production-readiness-review.md` and `docs/reviews/pr1-code-review-ledger.md`; rechecked via `diagnose.mjs --ledger` and closed.

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R11-DOC-06` | `R11 / Session 7` | `DOC` | **Closed** | `docs/getting-started.md:115-117` | Troubleshooting symptoms do not match runtime messages (`agy-squad: Open an interactive terminal...`, `Antigravity CLI (agy) must be available on PATH.`, startup timeout). | Quote exact runtime strings and remove WSL-only wording from TTY check. | Source inspection @ Session 9; `npm test` |
| `R11-DOC-07` | `R11 / Session 7` | `DOC` | **Closed** | `docs/core-workflows.md:18`, `docs/getting-started.md:99` | Both state `readSynthesis()` requires report to start with `Verdict: PASS`. Runtime accepts `PASS` anywhere after code stripping. | Reword docs to state `PASS` is accepted anywhere and conflicts/negations are rejected. | Source inspection @ Session 9; `npm test` |
| `R11-DOC-08` | `R11 / Session 7` | `DOC` | **Closed** | `docs/concepts.md:48` | States bundle hashes files passed via `--file`, but CLI has no `--file` flag; inputs come from `verifiedFiles`. | Reference `verifiedFiles` in the record JSON. | Source inspection @ Session 9; `npm test` |
| `R11-DOC-09` | `R11 / Session 7` | `DOC` | **Closed** | `docs/tools.md:58` | References stale `.benchmark-bin/agy-squad-handoffs.mjs` preset path not created in repo. | Remove stale path reference and document `node mcp/handoffs.mjs`. | Repo grep @ Session 9; `npm test` |
| `R11-DOC-10` | `R11 / Session 7` | `DOC` | **Closed** | `docs/concepts.md:32` | Manifest titled `run-plan.json`, which is not in default search list (`task-01-manifest.json`, `swarm-manifest.json`, etc.). | Retitle entry to "Manifest" and link to default search order in `docs/tools.md`. | Source inspection @ Session 9; `npm test` |
| `R11-DOC-11` | `R11 / Session 7` | `DOC` | **Closed** | `docs/concepts.md:21, 30` | States `all_l1` needs 2+ squads; runtime allows 1 squad (used in benchmark). | State "one lead per squad (1 or more squads)". | `mcp/dispatch.mjs` inspection; `npm test` |
| `R11-DOC-12` | `R11 / Session 7` | `DOC` | **Closed** | `docs/benchmarks.md:15` | Teamwork per-agent step range stated as "66 to 129", but telemetry table shows minimum of 50. | Correct step range to "50 to 129". | `results/telemetry.json` inspection @ Session 9 |
| `R11-DOC-13` | `R11 / Session 7` | `DOC` | **Closed** | `docs/plans/LEDGER.md` | Status column for `L3`/`L5`/`L6`/`L31` holds trial notes rather than active architecture status. | Reconcile status values in `LEDGER.md` with active architecture definitions (`Active`). | Source inspection @ Session 9 |
| `R11-DOC-14` | `R11 / Session 7` | `DOC` | **Closed** | `README.md:3`, `docs/getting-started.md:3` | macOS support is claimed, but CI runs only Ubuntu, checks target WSL2, and `/proc/self/fd` check is Linux-specific. | Note macOS support as untested/best-effort and clarify Linux/WSL2 primary target. | Source inspection @ Session 9 |
| `R11-DOC-15` | `R11 / Session 7` | `DOC` | **Closed** | This ledger §8 | R7–R10 rows cited Session 2 cohort bundle SHA for fixes done without cohorts. | Replaced bundle SHA with `tests/test-run.mjs` verification harness proof in Section 8. | Section 8 inspection @ Session 9 |
| `R11-DOC-16` | `R11 / Session 7` | `DOC` | **Closed** | This ledger §4–§9 | Unpinned line references drifted (`readSynthesis` `:266`, verdict default `:379`). | Convert citations to commit-pinned references or stable function symbols. | Source inspection @ Session 9 |
| `R11-DOC-17` | `R11 / Session 7` | `DOC` | **Closed** | This ledger §2 | File inventory omitted 36 changed files in PR #1 net diff against `main`. | Expand inventory to cover all 49 changed files (addressed in this review). | `git diff` inspection @ `999c221` |
| `R11-DOC-18` | `R11 / Session 7` | `DOC` | **Closed** | This ledger §4, §5 | Verdicts used `PASS`/`APPROVE` instead of standard enum (`No findings within reviewed scope`, `Not applicable`). | Use standard category verdict enum across all 10 categories (addressed in this review). | Standard v1.3.0 inspection |
| `R11-DOC-19` | `R11 / Session 7` | `DOC` | **Closed** | This ledger §1 | Session Provenance table lacked coverage for commits producing `2634683` / `f6ed11d`. | Append Session 8 covering full base..head commit range (addressed in this review). | `git log` inspection @ `999c221` |

#### `R12-DOC-01`
1. **Title / Priority / Status:** Final PR inventory/provenance excludes the last review commits; **P2**, **Closed**.
2. **Contract Provenance:** PR Review Standard v1.3.0 (§1/§2/§7), including complete changed-file mapping, review checkpoints, and one canonical ID per finding.
3. **Source Evidence:** At `74ff860`, GitHub reports 50 changed files/29 commits; both ledgers instead claim complete `ee10ebc..999c221` coverage (49 files/27 commits), omitting `docs/reviews/pr1-production-readiness-review.md`.
4. **Trigger:** A release reviewer relies on the “all files reviewed” claims in either ledger after further changes were merged onto the PR branch.
5. **Expected / Actual:** Expected complete final-tree file inventory with historical audit and R12 checkpoints distinguished; actual scope statements refer to the older RM1 tree.
6. **Impact:** Release evidence omits files and misstates the reviewed commit range, weakening independent sign-off.
7. **Required Remediation:** Reconcile both §2 inventories; add the production review and package verifier; maintain unique entries/counts; record final immutable head and CI in a post-push GitHub review.
8. **Acceptance Evidence:** Every path from `git diff --name-only origin/main...HEAD` occurs exactly once in both §2 inventories; final GitHub review pins the checked head and green CI run URLs.
9. **Root Cause / Related IDs:** Review ledgers were closed at an earlier SHA; related `R11-DOC-17`, `R11-DOC-19`.
10. **Closure:** Historical and R12 checkpoints are distinguished; inventories and §7 counts reconciled; final head/CI to be pinned in the GitHub closure review after push.

#### `R12-DOC-02`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** Independent Wave R12 review `5829814649`
- **Location:** `README.md`, `docs/core-workflows.md`, `docs/index.md`
- **Defect Summary:** Correct `.agents/` registration cleanup paths and Linux/WSL2 primary support wording.
- **Remediation & Reverification Evidence:** Replaced `.gemini/` cleanup references with `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md`; corrected Linux/WSL2 wording across all public docs.

#### `R12-DOC-03`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** Independent Wave R12 review `5829814649`
- **Location:** `docs/reviews/pr1-production-readiness-review.md`
- **Defect Summary:** Correct five-versus-four SCRIPT P3 count and distinguish pre-fix packaging leak from post-fix exclusion verification.
- **Remediation & Reverification Evidence:** Corrected SCRIPT P3 count to 5 and updated DEP verification and Section 6 reproduction text.

### 4.3 `SKILL` — Skills & Manifests
- **Verdict:** `No findings within reviewed scope` (0 findings).

### 4.4 `MCP` — MCP Server & Protocol Surface
- **Verdict:** `No findings within reviewed scope` (2 findings remediated and reverified: `R6-MCP-01`, `R6-MCP-02`).

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
- **Verdict:** `No findings within reviewed scope` (2 carried-forward closed findings verified intact: `RUN-003`, `RUN-004`).

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
- **Verdict:** `No findings within reviewed scope` (11 findings remediated and reverified: `SVC-003`, `SVC-002`, `R6-SVC-01`, `R6-SVC-02`, `R7-SVC-01`, `R7-SVC-02`, `R8-SVC-01`, `R8-SVC-02`, `SVC-NEW-01`, `SVC-NEW-02`, `SVC-NEW-03`).

#### `SVC-003`
- **Priority:** `P1` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`SVC-003`), `Devin_R6_Verification_Report.md` (Claim 3)
- **Location:** `mcp/handoffs.mjs:266`
- **Defect Summary:** `readSynthesis()` previously matched uppercase `PASS` substrings inside prose or fenced code blocks.
- **Remediation & Reverification Evidence:** Verified intact in `mcp/handoffs.mjs:266` and `tests/test-handoffs.mjs:85-103`.

#### `SVC-NEW-01`
- **Priority:** `P1` | **Status:** **Closed**
- **Original References:** Sol Merge-Readiness Handoff
- **Location:** `diagnose.mjs:57-76, 429-436, 514-528`, `tests/test-run.mjs:672-721`
- **Defect Summary:** `teardownSelfDiagnosisDirs()` called `fs.rmSync(..., { recursive: true, force: true })` without verifying that cleanup path parents are real directories inside the workspace, allowing symlinked `scratch` parents to delete external targets.
- **Remediation & Reverification Evidence:** Added `assertSafeDeleteTarget(relative)` (`diagnose.mjs:57-76`) validating every path segment via `fs.lstatSync` and `fs.realpathSync`, enforced before bundle reads, immediately before `fs.rmSync`, and before `--teardown all` canary deletion; verified external sentinels survive teardown in `tests/test-run.mjs:672-721`.

#### `SVC-002`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`SVC-002`), `Devin_R6_Verification_Report.md` (Claim 5)
- **Location:** `mcp/handoffs.mjs:103`
- **Defect Summary:** `reconcileHandoffs()` required strict single-line `<= 500` UTF-8 byte validation (`[\r\n\u2028\u2029]`).
- **Remediation & Reverification Evidence:** Verified intact in `mcp/handoffs.mjs:103-125` and `tests/test-handoffs.mjs:143-152`.

#### `R6-SVC-01`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-SVC-01`), `Devin_R6_Verification_Report.md` (Claim 7), `GitHub_PR1_Review_Comment.md` (`R6-SVC-01`)
- **Location:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs:169-416`, `tests/test-run.mjs:514-608`
- **Defect Summary:** `teardownSelfDiagnosisDirs()` in `diagnose.mjs` checked ledger schema and `mtimeMs` relative to `report.sources.json`, but did not verify that the target ledger recorded the cohort's bundle SHA-256 or all finding IDs from `lead/report.md` and `bundle.reports[].markdown`.
- **Remediation & Reverification Evidence:** Added `extractCohortFindingIds(markdown)` (`diagnose.mjs:169-187`), populated `recordedFindingIds` and Section 9 `recordedBundleShas` in `validateTargetReviewLedger()`, and enforced in `teardownSelfDiagnosisDirs()` that `verified.sha256` matches a digest in Section 9 of the target ledger and every canonical finding ID in `lead/report.md` and `bundle.reports[].markdown` is present in `recordedFindingIds`. Verified by `tests/test-run.mjs:514-608`.

#### `R7-SVC-01`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** Direct `/pr-review`
- **Location:** `diagnose.mjs:169-231, 442-466`, `tests/test-run.mjs:521-629`
- **Defect Summary:** `extractCohortFindingIds()` missed findings formatted as plain/numbered headings or bold-colon bullets, or unpruned loose `specialist-*/report.md` files during `--teardown`.
- **Remediation & Reverification Evidence:** Extended `extractCohortFindingIds(md, { includeProseHeadingsAndBullets: true })` to parse plain/numbered/styled headings and bullets, scanned loose `specialist-*/report.md` files in `teardownSelfDiagnosisDirs()`, tightened Section 9 SHA extraction with `(?<![0-9a-f-])`, and added tests in `tests/test-run.mjs:521-629`.

#### `R7-SVC-02`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** Direct `/pr-review`
- **Location:** `mcp/handoffs.mjs:266-368`, `tests/test-handoffs.mjs:79-135`
- **Defect Summary:** `readSynthesis()` missed numbered-list/inline `FAIL:` tokens and `- **Verdict:** **PASS/FAIL**`, and bundle did not persist or reconcile structured `verdict: "PASS"` in `report.sources.json`.
- **Remediation & Reverification Evidence:** Updated `readSynthesis()` to return `{ bytes, verdict: "PASS" }` and match numbered-list, inline `FAIL:`/`BLOCKED:`, and bold-colon forms; persisted and reconciled `verdict: "PASS"` in `bundleReports()` and `verifyBundleInternal()`, covered in `tests/test-handoffs.mjs:79-135`.

#### `R8-SVC-01`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** Devin R8/R9 (B1)
- **Location:** `mcp/handoffs.mjs:241-266`, `tests/test-handoffs.mjs:83-85, 100-105`
- **Defect Summary:** Negated `PASS` lines (`NOT PASS: validation failed`, `Verdict: not PASS`, `no PASS`) matched `PASS:` in `readSynthesis()`.
- **Remediation & Reverification Evidence:** Added `NEGATIONS` lookup in `readSynthesis()` matching uppercase `PASS` only while normalizing negation words case-insensitively; tested in `tests/test-handoffs.mjs:83-85, 100-105`.

#### `R8-SVC-02`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** Devin R8/R9 (B2)
- **Location:** `mcp/handoffs.mjs:368-372`, `tests/test-handoffs.mjs:140-149`
- **Defect Summary:** Legacy bundles without `verdict` failed `verifyBundleInternal()` when `parsed.verdict` was `undefined`, while `?? "PASS"` also accepted `"verdict": null`.
- **Remediation & Reverification Evidence:** Used `Object.hasOwn(parsed, "verdict") ? parsed.verdict : "PASS"` in `verifyBundleInternal()` so only an omitted `verdict` defaults to `"PASS"` while `"verdict": null` is rejected; tested in `tests/test-handoffs.mjs:140-149`.

#### `SVC-NEW-02`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** Sol Merge-Readiness Handoff
- **Location:** `diagnose.mjs:43-55, 495-510`, `tests/test-run.mjs:637-670`
- **Defect Summary:** `hasEvidence()` in `diagnose.mjs` checked only nonempty `report.md` files, allowing unbundled `diagnostics.json`, `trace.log`, or other files to be deleted during teardown.
- **Remediation & Reverification Evidence:** Replaced `hasEvidence()` with `listArtifacts(directory)`, added `expectedArtifacts` allowlist check after bundle verification, and blocked no-bundle teardown when `listArtifacts(absDir).length > 0`; verified in `tests/test-run.mjs:637-670`.

#### `SVC-NEW-03`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** Sol Merge-Readiness Handoff
- **Location:** `mcp/handoffs.mjs:106-124`, `tests/test-handoffs.mjs:225-270`
- **Defect Summary:** `reconcileHandoffs()` parsed `READY` and `PARTIAL` receipts using `\S+` for the report path, rejecting valid custom scratch roots containing spaces or `" — "`.
- **Remediation & Reverification Evidence:** Replaced `\S+` regex parsing in `reconcileHandoffs()` with exact assigned-slot prefix matching (`READY ${report} — ` and `PARTIAL ${report} — `); verified in `tests/test-handoffs.mjs:225-270`.

#### `R6-SVC-02`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-SVC-02`), `GitHub_PR1_Review_Comment.md` (`R6-SVC-02`)
- **Location:** `mcp/handoffs.mjs:8-95`, `tests/test-handoffs.mjs:178-205`
- **Defect Summary:** `reconcileHandoffs()` and `resolveReportRoot()` hardcoded `scratch/agy-squad/`, rejecting custom `AGY_SQUAD_SCRATCH_ROOT` paths.
- **Remediation & Reverification Evidence:** Added `isValidRelativePrefix()`, `defaultScratchBase()`, and `defaultReportRoot()`, updated `resolveReportRoot()` and `reconcileHandoffs()` to accept custom scratch paths with traversal checks, verified in `tests/test-handoffs.mjs:178-205`.

### 4.7 `DB` — Database, Persistence & State Files
- **Verdict:** `Not applicable` (Reason: Agy-Squad maintains purely filesystem-backed state under `scratch/agy-squad/` without external database engines; all persistence mechanisms are audited under `RUN` and `SVC` categories).

### 4.8 `SCRIPT` — CLI Scripts, Launcher & PTY Bridge
- **Verdict:** `No findings within reviewed scope` (6 findings remediated and reverified: `SCRIPT-NEW-01`, `R6-SCRIPT-01`, `R7-SCRIPT-01`, `R7-SCRIPT-02`, `R8-SCRIPT-01`, `R8-SCRIPT-02`).

#### `SCRIPT-NEW-01`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** Sol Merge-Readiness Handoff
- **Location:** `bin/agy-squad.mjs:90-109`, `tests/test-run.mjs:125-128, 189-196`
- **Defect Summary:** `hasEvidence()` in `bin/agy-squad.mjs` checked only nonempty `report.md` files, discarding `diagnostics.json` or non-report artifacts when a CLI session exited nonzero.
- **Remediation & Reverification Evidence:** Updated `hasEvidence()` in launcher to ignore only `.mcp-ready`, `manifest.json`, and empty `report.md` slots while preserving any other file or symlink; verified in `tests/test-run.mjs:125-128, 189-196`.

#### `R6-SCRIPT-01`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-SCRIPT-01`), `Devin_R6_Verification_Report.md` (Claim 8)
- **Location:** `bin/terminal.py:146-152`, `tests/test-run.mjs:481-512`
- **Defect Summary:** If child `agy` exited `0` before printing the TUI banner or before `.mcp-ready` allowed prompt injection, `terminal.py` returned `0` and launcher deleted run directory as if successful.
- **Remediation & Reverification Evidence:** Added `if not submitted and not terminating:` guard after waitstatus checking calling `sys.exit("Agy-Squad: native CLI exited before prompt submission.")`; verified in `tests/test-run.mjs:481-512`.

#### `R7-SCRIPT-01`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** Direct `/pr-review`
- **Location:** `verify-benchmark.mjs:78-86`
- **Defect Summary:** `verify-benchmark.mjs` N6 check verified `readLedger()` returning `[]` on corrupt JSON, but stopped before exercising `appendLedgerEntry()` overwriting existing ledger entries.
- **Remediation & Reverification Evidence:** Seeded `r-prior`, corrupted `ledger.json`, verified `readLedger()` returns `[]`, and verified `appendLedgerEntry()` overwrites `ledger.json` with only `[r-new]`.

#### `R7-SCRIPT-02`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** Direct `/pr-review`
- **Location:** `bin/terminal.py:15-96`
- **Defect Summary:** `bin/terminal.py` matched `agent` and `b"? for shortcuts"` against raw PTY bytes without stripping ANSI CSI/OSC escape sequences.
- **Remediation & Reverification Evidence:** Added `ANSI_ESCAPE_RE` stripping on rolling buffer before checking readiness tokens.

#### `R8-SCRIPT-01`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** Devin R8/R9 (F1/B3)
- **Location:** `verify-benchmark.mjs:78-144`
- **Defect Summary:** Document that the N6 overwrite check in `verify-benchmark.mjs` confirms the planted defect in the unfixed fixture, and add a fixed-fixture grading check (`--expect-fixed`).
- **Remediation & Reverification Evidence:** Added planted defect documentation and implemented `verifyFixedLedgerGuard()` validating backup-and-continue and throw-and-backup fixes.

#### `R8-SCRIPT-02`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** Devin R8 (F2)
- **Location:** `bin/terminal.py:59, 95, 149-154`, `tests/test-run.mjs:348-406`
- **Defect Summary:** Make startup shortcut marker configurable (`AGY_SQUAD_READY_MARKER`) and include `seen_agent`/`seen_shortcuts`/`mcp_ready` in startup timeout errors.
- **Remediation & Reverification Evidence:** Added `AGY_SQUAD_READY_MARKER` and detailed startup timeout diagnostics in `bin/terminal.py`, verified in `tests/test-run.mjs:348-406`.

### 4.9 `TEST` — Automated Tests & Verification Gates
- **Verdict:** `No findings within reviewed scope` (2 findings remediated and reverified: `R12-TEST-01` and `R6-TEST-01`).

#### `R12-TEST-01`
1. **Title / Priority / Status:** CI packages without verifying tarball contents; **P2**, **Closed**.
2. **Contract Provenance:** `PR1-DEP-01`, `package.json` `files` allowlist, `.github/workflows/ci.yml` Node 22/24 matrix.
3. **Source Evidence:** At `74ff860`, workflow `Verify npm package structure` runs only `npm pack --dry-run --json`, which can exit `0` even when forbidden paths appear.
4. **Trigger:** An unintended allowlist expansion or packaging default includes `tests/`, `benchmarks/`, `.agents/teamwork/`, `scratch/`, or other unrelated files.
5. **Expected / Actual:** Expected CI to fail on leaked file paths or missing runtime entrypoints; old CI ignored manifest contents.
6. **Impact:** A packaging regression could pass CI and expose internal metadata or ship an incomplete runtime.
7. **Required Remediation:** Add `tests/verify-package.mjs` with strict allowed roots, required entrypoints, and positive/negative `--self-test`; parse the real npm manifest in Node 22/24 CI.
8. **Acceptance Evidence:** `node tests/verify-package.mjs --self-test` passes; real `npm pack` manifest passes; both matrix jobs pass after the replacement CI step; the negative controls fail inside the self-test as expected.
9. **Root Cause / Related IDs:** Package command success was mistaken for content validation; related `PR1-DEP-01`.
10. **Closure:** Added explicit package manifest assertions, self-tests, and CI gate; record final Node 22/24 run URLs in the post-push review.

#### `R6-TEST-01`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-TEST-01`), `GitHub_PR1_Review_Comment.md` (`R6-TEST-01`)
- **Location:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs:802-886`
- **Defect Summary:** `runSquadCanaryAndOptimization()` compiled managed leads and specialists under `run.relative`, but only exercised `reportPath(id, 1)` under the unmanaged default root.
- **Remediation & Reverification Evidence:** Updated canary runner to also write and verify managed report slots across inspect, bundle, verify, and prune.

### 4.10 `DEP` — Dependencies, Packaging & CI Configuration
- **Verdict:** `No findings within reviewed scope` (1 finding remediated and reverified: `PR1-DEP-01`).

#### `PR1-DEP-01`
- **Priority:** `P2` | **Status:** **Closed**
- **Original References:** Holistic PR Review / M1
- **Location:** `package.json`
- **Defect Summary:** `package.json` missing `"files"` allowlist and repository lacks `.npmignore`, causing metadata packaging leakage (`.agents/teamwork/...` bundled in npm tarball).
- **Remediation & Reverification Evidence:** Added `"files": ["bin", "mcp", ".agents/skills", "docs"]` allowlist to `package.json`. Verified via `npm pack --dry-run --json` confirming package contents reduced from 112 to 31 files with zero `.agents/teamwork/` or test files in package tarball.

---

## 5. Finding Count Summary & Triage Matrix

| Category | P0 | P1 | P2 | P3 | Open (Pre-Remediation) | Closed | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `ARCH` | 0 | 0 | 0 | 0 | 0 | 0 | **No findings within reviewed scope** |
| `DOC` | 0 | 0 | 6 | 17 | 0 | 23 | **No findings within reviewed scope** |
| `SKILL` | 0 | 0 | 0 | 0 | 0 | 0 | **No findings within reviewed scope** |
| `MCP` | 0 | 0 | 1 | 1 | 0 | 2 | **No findings within reviewed scope** |
| `RUN` | 0 | 0 | 2 | 0 | 0 | 2 | **No findings within reviewed scope** |
| `SVC` | 0 | 2 | 8 | 1 | 0 | 11 | **No findings within reviewed scope** |
| `DB` | 0 | 0 | 0 | 0 | 0 | 0 | **Not applicable** |
| `SCRIPT` | 0 | 0 | 1 | 5 | 0 | 6 | **No findings within reviewed scope** |
| `TEST` | 0 | 0 | 1 | 1 | 0 | 2 | **No findings within reviewed scope** |
| `DEP` | 0 | 0 | 1 | 0 | 0 | 1 | **No findings within reviewed scope** |
| **Total** | **0** | **2** | **20** | **25** | **0** | **47** | **READY TO MERGE** |

---

## 6. Verification Commands & Reproduction Plan

1. **Full Automated Test & Benchmark Suite (`npm test`):**
   ```bash
   npm test
   ```
   - Exercises `tests/test-dispatch.mjs`, `tests/test-handoffs.mjs`, `tests/test-run.mjs`, `tests/test-server.mjs`, and `benchmarks/teamwork-vs-squad/verify-benchmark.mjs` (`0` failures).
2. **Self-Diagnosis & Ledger Schema Validation:**
   ```bash
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr1-production-readiness-review.md
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr1-code-review-ledger.md
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr2-documentation-review-ledger.md
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/rebuild-wsl-dispatch-review-r2.md
   ```
   - All 4 ledgers report `status: "HEALTHY"` with `0` blocking findings.
3. **Packaging Tarball Leakage Reproduction (`PR1-DEP-01`):**
   ```bash
   npm pack --dry-run --json | grep -E '\.agents/teamwork'
   ```
   - Confirms internal metadata files are bundled in package tarball due to missing allowlist.
4. **Benchmark CLI Syntax Reproduction (`R11-DOC-02`):**
   ```bash
   node mcp/handoffs.mjs verify --squad ab_audit
   ```
   - Exits code `1` with CLI usage message, confirming documented command syntax error.

---

## 7. Consolidated Finding Disposition Table (`1 ID = 1 Row`)

| ID | Category | Priority | Original Review Ref | Location | Summary | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `SVC-003` | `SVC` | `P1` | `SVC-003` / Claim 3 | `mcp/handoffs.mjs:266` | Strip code fences and require explicit verdict tokens in `readSynthesis()`. | **Closed** |
| `SVC-NEW-01` | `SVC` | `P1` | Sol Merge-Readiness Handoff | `diagnose.mjs:57-76` | Enforce `assertSafeDeleteTarget()` workspace containment to block symlink parent traversal. | **Closed** |
| `SVC-002` | `SVC` | `P2` | `SVC-002` / Claim 5 | `mcp/handoffs.mjs:103` | Enforce single-line `<= 500` UTF-8 byte receipt ceiling in `reconcileHandoffs()`. | **Closed** |
| `RUN-003` | `RUN` | `P2` | `RUN-003` / Claim 1 | `mcp/briefs.mjs:62` | Subagent assignments require writable `TypeName: "self"` and reject `"research"`. | **Closed** |
| `RUN-004` | `RUN` | `P2` | `RUN-004` / Claim 2 | `mcp/briefs.mjs:64` | Subagent assignments require `Workspace: "inherit"` to share parent workspace. | **Closed** |
| `R6-SVC-01` | `SVC` | `P2` | `R6-SVC-01` / Claim 7 | `diagnose.mjs:169-416` | Teardown gate verifies target ledger records bundle SHA and cohort finding IDs. | **Closed** |
| `R6-MCP-01` | `MCP` | `P2` | `R6-MCP-01` / Claim 6 | `mcp/index.js:18-84` | Expose PascalCase inline manifest aliases and `allOf`/`anyOf` requirements in `agentSchema`. | **Closed** |
| `R7-SVC-01` | `SVC` | `P2` | Direct `/pr-review` | `diagnose.mjs:169-231` | `extractCohortFindingIds()` parses findings formatted as headings and bold-colon bullets. | **Closed** |
| `R7-SVC-02` | `SVC` | `P2` | Direct `/pr-review` | `mcp/handoffs.mjs:266` | `readSynthesis()` parses bold-colon verdicts; bundle persists structured verdict. | **Closed** |
| `R8-SVC-01` | `SVC` | `P2` | Devin R8/R9 (B1) | `mcp/handoffs.mjs:241` | Implement `NEGATIONS` lookup in `readSynthesis()` to reject negated `PASS` phrases. | **Closed** |
| `R8-SVC-02` | `SVC` | `P2` | Devin R8/R9 (B2) | `mcp/handoffs.mjs:369` | Default omitted bundle verdict to `"PASS"` while explicitly rejecting `null`. | **Closed** |
| `SVC-NEW-02` | `SVC` | `P2` | Sol Merge-Readiness Handoff | `diagnose.mjs:43-55` | `listArtifacts()` checks unexpected diagnostic files, blocking unbundled deletion. | **Closed** |
| `SCRIPT-NEW-01` | `SCRIPT` | `P2` | Sol Merge-Readiness Handoff | `bin/agy-squad.mjs:90` | `hasEvidence()` retains unexpected diagnostic artifacts on nonzero CLI exits. | **Closed** |
| `SVC-NEW-03` | `SVC` | `P2` | Sol Merge-Readiness Handoff | `mcp/handoffs.mjs:106` | Exact assigned-slot prefix matching in `reconcileHandoffs()` for roots with spaces/dashes. | **Closed** |
| `R11-DOC-01` | `DOC` | `P2` | Wave R11 / Session 7 | `docs/concepts.md:41` | Documented receipt grammar uses ASCII hyphen; runtime requires em dash ` — `. | **Closed** |
| `R11-DOC-02` | `DOC` | `P2` | Wave R11 / Session 7 | `benchmarks/README.md:98` | Benchmark live-run `verify` command fails with CLI usage error. | **Closed** |
| `R11-DOC-03` | `DOC` | `P2` | Wave R11 / Session 7 | `docs/core-workflows.md:56` | Public workflow teardown ordering contradicts self-diagnosis skill ordering. | **Closed** |
| `R11-DOC-04` | `DOC` | `P2` | Wave R11 / Session 7 | `docs/concepts.md:67` | Active docs assign meanings to `L7`/`L29`/`L30`/`L40`/`L41` contradicting `LEDGER.md`. | **Closed** |
| `R11-DOC-05` | `DOC` | `P2` | Wave R11 / Session 7 | Ledger §5, §7, §8 | Ledger finding counts, statuses, and record densities inconsistent across waves. | **Closed** |
| `PR1-DEP-01` | `DEP` | `P2` | Holistic PR Review / M1 | `package.json` | Package missing `"files"` allowlist; npm packing leaks internal metadata. | **Closed** |
| `R12-DOC-01` | `DOC` | `P2` | Independent Wave R12 review `5829814649` | `docs/reviews/pr1-code-review-ledger.md`; `docs/reviews/pr1-production-readiness-review.md` | Reconcile release-candidate file inventories, historical audit checkpoints, R12 provenance and final head-pinned sign-off. | **Closed** |
| `R12-TEST-01` | `TEST` | `P2` | Independent Wave R12 review `5829814649` | `.github/workflows/ci.yml`; `tests/verify-package.mjs` | Make Node 22/24 CI assert actual npm pack file list; prove forbidden files/missing runtime fail with synthetic controls. | **Closed** |
| `R6-MCP-02` | `MCP` | `P3` | `R6-MCP-02` / Claim 4 | `mcp/index.js:139` | Enforce 10MB stdio payload ceiling incrementally on `stdin` chunks before newline assembly. | **Closed** |
| `R6-SVC-02` | `SVC` | `P3` | `R6-SVC-02` | `mcp/handoffs.mjs:8` | Honor custom `AGY_SQUAD_SCRATCH_ROOT` and `record.reportRoot` in report resolution. | **Closed** |
| `R6-SCRIPT-01` | `SCRIPT` | `P3` | `R6-SCRIPT-01` / Claim 8 | `bin/terminal.py:146` | Treat child `agy` exit before `submitted == True` as non-zero startup failure. | **Closed** |
| `R6-TEST-01` | `TEST` | `P3` | `R6-TEST-01` | `diagnose.mjs:802` | Route `runSquadCanaryAndOptimization()` through unmanaged and managed report slots. | **Closed** |
| `R6-DOC-01` | `DOC` | `P3` | `R6-DOC-01` | `pr1-code-review-ledger.md` | Record Wave R6 consolidation, remediation, and reverification in `docs/reviews/`. | **Closed** |
| `R7-SCRIPT-01` | `SCRIPT` | `P3` | Direct `/pr-review` | `verify-benchmark.mjs:78` | Assert `appendLedgerEntry()` overwrites corrupt ledger file in benchmark N6 check. | **Closed** |
| `R7-SCRIPT-02` | `SCRIPT` | `P3` | Direct `/pr-review` | `bin/terminal.py:15` | Strip ANSI escape sequences on rolling PTY buffer before matching TUI readiness tokens. | **Closed** |
| `R8-SCRIPT-01` | `SCRIPT` | `P3` | Devin R8/R9 (F1/B3) | `verify-benchmark.mjs:83` | Add fixed-fixture grading check (`--expect-fixed`) accepting throw-and-backup. | **Closed** |
| `R8-SCRIPT-02` | `SCRIPT` | `P3` | Devin R8 (F2) | `bin/terminal.py:59` | Make startup shortcut marker configurable (`AGY_SQUAD_READY_MARKER`) with diagnostics. | **Closed** |
| `R11-DOC-06` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/getting-started.md` | Troubleshooting error strings do not match runtime messages. | **Closed** |
| `R11-DOC-07` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/core-workflows.md` | "Starts with `Verdict: PASS`" misstates `readSynthesis()` rule. | **Closed** |
| `R11-DOC-08` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/concepts.md:48` | Nonexistent `--file` flag; inputs come from `verifiedFiles`. | **Closed** |
| `R11-DOC-09` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/tools.md:58` | Stale `.benchmark-bin/agy-squad-handoffs.mjs` preset reference. | **Closed** |
| `R11-DOC-10` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/concepts.md:32` | Manifest titled `run-plan.json`, not a default search manifest. | **Closed** |
| `R11-DOC-11` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/concepts.md:21` | `all_l1` described as needing 2+ squads; 1 squad is valid and used in benchmark. | **Closed** |
| `R11-DOC-12` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/benchmarks.md:15` | Teamwork step range "66 to 129" should be "50 to 129". | **Closed** |
| `R11-DOC-13` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/plans/LEDGER.md` | Status column for `L3`/`L5`/`L6`/`L31` disagrees with documented active-ID set. | **Closed** |
| `R11-DOC-14` | `DOC` | `P3` | Wave R11 / Session 7 | `README.md:3` | macOS support claimed but unverified; target is Linux/WSL2. | **Closed** |
| `R11-DOC-15` | `DOC` | `P3` | Wave R11 / Session 7 | Ledger §8 | R7–R10 rows cite Session 2 cohort bundle SHA for no-cohort fixes. | **Closed** |
| `R11-DOC-16` | `DOC` | `P3` | Wave R11 / Session 7 | Ledger §4–§9 | Unpinned line references drifted (`readSynthesis` `:266`, verdict default `:379`). | **Closed** |
| `R11-DOC-17` | `DOC` | `P3` | Wave R11 / Session 7 | Ledger §2 | File inventory omitted 36 changed files in PR #1 net diff against `main`. | **Closed** |
| `R11-DOC-18` | `DOC` | `P3` | Wave R11 / Session 7 | Ledger §4, §5 | Verdicts use `PASS`/`APPROVE` instead of standard enum; `DB` should be `Not applicable`. | **Closed** |
| `R11-DOC-19` | `DOC` | `P3` | Wave R11 / Session 7 | Ledger §1 | No session row covers `ed94e83..f6ed11d` (remediated commit `2634683`). | **Closed** |
| `R12-DOC-02` | `DOC` | `P3` | Independent Wave R12 review `5829814649` | `README.md`; `docs/core-workflows.md`; `docs/index.md` | Correct `.agents/` registration cleanup paths and Linux/WSL2 primary support wording. | **Closed** |
| `R12-DOC-03` | `DOC` | `P3` | Independent Wave R12 review `5829814649` | `docs/reviews/pr1-production-readiness-review.md` | Correct five-versus-four SCRIPT P3 count and distinguish pre-fix packaging leak from post-fix exclusion verification. | **Closed** |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SCRIPT-GAP-002` | `R1-R7 / Session 2-3` | `SCRIPT` | **Informational** | `Devin_R6_Verification_Report.md` | Live Antigravity `agy` binary TUI banner and `/mcp` panel escape sequence may evolve across upstream IDE/CLI releases. | Tracked as upstream external CLI compatibility boundary; `bin/terminal.py:15-96` strips ANSI CSI/OSC sequences before matching `agent` and `? for shortcuts`, and fake-`agy` PTY harness in `tests/test-run.mjs` covers the state machine. | `Verified via fake-agy PTY harness in tests/test-run.mjs (N/A, no cohort)` |
| `R6-TEST-GAP-02` | `R6 / Session 2` | `TEST` | **Closed (By Design)** | `PR1_Agy_Squad_Code_Review_Ledger_R6.md` | Full 6-specialist (`all_l1`) live LLM execution was not re-triggered during static R6 code review. | Covered by prior live cohorts (`R3`–`R5`) and the Phase 1 + Phase 2 flat specialist reverification squads in Session 2. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R6-TEST-GAP-03` | `R6 / Session 2` | `TEST` | **Closed (Post-Remediation)** | `PR1_Agy_Squad_Code_Review_Ledger_R6.md` | Execute WSL test suite and add multi-chunk newline-free stdio payload cap test for `R6-MCP-02`. | Added incremental chunk-level oversized stdio payload test and split UTF-8 test in `tests/test-server.mjs:177-220` and executed `npm test` in WSL. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |

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
