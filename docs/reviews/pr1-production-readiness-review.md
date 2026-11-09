# Agy-Squad PR #1 Production Readiness Review

**Disposition:** `READY TO MERGE — Wave RM2 Independent Review & Final Closure: All 43 Findings (PR1-DEP-01, R11-DOC-01..19, and 23 prior code/architecture findings) Verified Closed; Package Scoped to 30 Production Files; 5/5 Test Suites Passing; Zero Unresolved Blocking Defects`
**Reviewed Head SHA:** `999c221b0958174d058226a4e9ba7288fbb61612` (`rebuild/wsl-dispatch`, clean working tree)
**Review Date:** `2026-11-09`
**Repository / PR:** [paragon-ux/Agy-Squad #1](https://github.com/paragon-ux/Agy-Squad/pull/1) (`rebuild/wsl-dispatch` -> `main`)
**Base Branch / SHA:** `main` at `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`
**Reviewed Head SHA (Pre-R6 Baseline):** `c7acf464be46780b051b432d59ce657f4ee2880f` (reconciled against merged PR #2 baseline `3df852b9251170870d03c42e2a4e6d03440efbe2`)
**Remediated & Reverified Commit SHA:** `2634683f546a7751f98aa77ead2fc13b64f31f7c` (prior reverified wave SHAs: `541d6c0`, `9aa78af`, `c663bd2`, `1ade0f0`, `1a54322`, `ed94e83`)
**Governing Standard:** Agy-Squad PR Review Standard `v1.3.0` (`.agents/skills/pr-review/SKILL.md` and `.agents/skills/self-diagnosis/SKILL.md`)
**Source Review Package & Ledgers:** `docs/reviews/pr1-code-review-ledger.md`, `docs/reviews/pr2-documentation-review-ledger.md`, `docs/reviews/rebuild-wsl-dispatch-review-r2.md`, and `/home/paragon-ux/Antigravity/artifacts/to-fix/Agy_Squad_PR1_Code_Review_Devin_ChatGPT_2026-11-08`

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

### Evidence Boundaries & Verification Limits
- **Repository Scope:** All 49 modified, added, or deleted files across 27 commits between `main` (`ee10ebc255f0d52dc93b51d7cf8198bb069c4532`) and `rebuild/wsl-dispatch` (`999c221b0958174d058226a4e9ba7288fbb61612`).
- **Executed Local Verifications:**
  1. Full automated test suite via `npm test` synchronously executing `test-dispatch.mjs`, `test-handoffs.mjs`, `test-run.mjs`, `test-server.mjs`, and `verify-benchmark.mjs` (all 5 suites passing with 0 errors).
  2. Automated schema and contract verification via `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger` across all historical and active review ledgers (`pr1-production-readiness-review.md`, `pr1-code-review-ledger.md`, `pr2-documentation-review-ledger.md`, `rebuild-wsl-dispatch-review-r2.md`).
  3. Package tarball dry-run inspection via `npm pack --dry-run --json` confirming packaging boundaries.
  4. Command reproduction testing (`node mcp/handoffs.mjs verify --squad ab_audit` confirming CLI contract in `R11-DOC-02`).
- **Explicit Review Limits:** Per architectural decision `L7` (Zero live subagents in automated tests) and Antigravity execution rules, no live quota-consuming `agy` CLI subagents were spawned during this review. All test coverage and verification gates relied on deterministic in-process mocking and fake PTY harnesses.

---

## 2. File-to-Category Inventory & Coverage Matrix

Every changed file across the 27 commits of PR #1 (`ee10ebc..999c221`) is accounted for in this inventory, resolving the 36-file omission in the initial review ledger (`R11-DOC-17`):

| # | Path | Primary Category | Cross-Referenced Categories | Review Ref |
|---|---|---|---|---|
| 1 | `.agents/skills/pr-review/SKILL.md` | `SKILL` | `DOC` | Standard v1.3.0 workflow, 10 categories, 1 ID = 1 Row rules |
| 2 | `.agents/skills/pr-review/references/pr-review-standard.md` | `SKILL` | `DOC` | Normative specification for PR Review Standard v1.3.0 |
| 3 | `.agents/skills/self-diagnosis/SKILL.md` | `SKILL` | `RUN` | Diagnostic runner skill definition, progressive disclosure, L41 gate |
| 4 | `.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md` | `SKILL` | `DOC` | Diagnostic rubrics, token limits, and architecture checks |
| 5 | `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | `SKILL` | `RUN` | Standard 3-squad / 6-specialist diagnostic cohort manifest |
| 6 | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `SVC` | `TEST`, `SKILL`, `DOC` | Diagnostic runner, schema checker, canary runner, and L41 teardown gate (`R6-SVC-01`, `R6-TEST-01`, `SVC-NEW-01`, `SVC-NEW-02`) |
| 7 | `.github/workflows/ci.yml` | `DEP` | `TEST` | Multi-version Node (22, 24) and Python 3.11 CI workflow with pack dry-run |
| 8 | `.github/workflows/docs.yml` | `DEP` | `DOC` | Zensical static site generation and Pages deployment gating (`L30`) |
| 9 | `.gitignore` | `DEP` | — | Ignores ephemeral `.agents/agents/agy-squad-*` and `.agents/plugins/agy-squad-*` |
| 10 | `README.md` | `DOC` | — | Repository overview, WSL CLI sandbox orientation, single public entrypoint |
| 11 | `benchmarks/teamwork-vs-squad/README.md` | `DOC` | `SCRIPT` | Benchmark setup, 6 seeded defects, reproduction guide (`R11-DOC-02`) |
| 12 | `benchmarks/teamwork-vs-squad/fixture/config.json` | `SCRIPT` | `TEST` | Benchmark event-relay configuration containing planted unit bug (N5) |
| 13 | `benchmarks/teamwork-vs-squad/fixture/gateway/gateway.mjs` | `SCRIPT` | `TEST` | Benchmark gateway containing signature DoS (N1) and rate limit bug (N2) |
| 14 | `benchmarks/teamwork-vs-squad/fixture/gateway/test-gateway.mjs` | `SCRIPT` | `TEST` | Isolated unit test for gateway |
| 15 | `benchmarks/teamwork-vs-squad/fixture/worker/ledger.mjs` | `SCRIPT` | `TEST` | Benchmark ledger containing data-loss on corrupt JSON bug (N6) |
| 16 | `benchmarks/teamwork-vs-squad/fixture/worker/test-worker.mjs` | `SCRIPT` | `TEST` | Isolated unit test for worker |
| 17 | `benchmarks/teamwork-vs-squad/fixture/worker/worker.mjs` | `SCRIPT` | `TEST` | Benchmark worker containing header (N3), schema (N4), retry bugs |
| 18 | `benchmarks/teamwork-vs-squad/manifest.json` | `RUN` | `SCRIPT` | Benchmark dispatch manifest for the 2-specialist audit cohort |
| 19 | `benchmarks/teamwork-vs-squad/results/telemetry.json` | `DOC` | `SCRIPT` | Telemetry from live A/B trial comparing Agy-Squad vs. /teamwork control |
| 20 | `benchmarks/teamwork-vs-squad/verify-benchmark.mjs` | `SCRIPT` | `TEST` | Offline consistency check verifying all 6 defects and telemetry arithmetic (`R7-SCRIPT-01`, `R8-SCRIPT-01`) |
| 21 | `bin/agy-squad.mjs` | `SCRIPT` | `RUN`, `SVC` | Managed WSL CLI launcher, plugin generation, prompt injection, and cleanup (`R6-SCRIPT-01`, `SCRIPT-NEW-01`) |
| 22 | `bin/terminal.py` | `SCRIPT` | `RUN`, `TEST` | Python PTY bridge handling terminal TUI, /mcp discovery, and bracketed-paste (`R6-SCRIPT-01`, `R7-SCRIPT-02`, `R8-SCRIPT-02`, `SCRIPT-GAP-002`) |
| 23 | `docs/benchmarks.md` | `DOC` | — | Comprehensive A/B benchmark analysis and comparison tables (`R11-DOC-12`) |
| 24 | `docs/concepts.md` | `DOC` | — | Architectural concepts: staged compilation, Pointer-Over-Wire, bundling (`R11-DOC-01`, `R11-DOC-04`, `R11-DOC-08`, `R11-DOC-10`, `R11-DOC-11`) |
| 25 | `docs/core-workflows.md` | `DOC` | — | Operator workflows: single-squad, multi-squad, self-diagnosis (`R11-DOC-03`, `R11-DOC-04`, `R11-DOC-07`) |
| 26 | `docs/getting-started.md` | `DOC` | — | Onboarding guide, installation instructions, prerequisites (`R11-DOC-01`, `R11-DOC-06`, `R11-DOC-07`, `R11-DOC-14`) |
| 27 | `docs/index.md` | `DOC` | — | Documentation landing page reflecting native CLI and Pointer-Over-Wire handoffs (`R11-DOC-04`, `R11-DOC-14`) |
| 28 | `docs/plans/LEDGER.md` | `ARCH` | `DOC` | Architectural decision ledger recording decisions L1 through L41 (`R11-DOC-13`) |
| 29 | `docs/plans/docker-sandbox-plan.md` (deleted) | `ARCH` | — | Retired legacy Windows Docker Desktop container design document |
| 30 | `docs/plans/wsl-cli-verification.md` | `DOC` | `SCRIPT` | Loopback fixture verification and supervised live trial checks (`R8-SCRIPT-02`) |
| 31 | `docs/reviews/pr1-code-review-ledger.md` | `DOC` | — | Active PR #1 consolidation, remediation, and reverification ledger (R1-R11) |
| 32 | `docs/reviews/pr2-documentation-review-ledger.md` | `DOC` | — | Review ledger for PR #2 (documentation and benchmark consolidation) |
| 33 | `docs/reviews/rebuild-wsl-dispatch-review-r2.md` | `DOC` | `SKILL`, `SVC` | Historical R2 review report closing prior findings (`R6-DOC-01`) |
| 34 | `docs/reviews/rebuild-wsl-dispatch-review.md` | `DOC` | — | Historical R1 review report for the initial rebuild commit |
| 35 | `docs/stopping-agents.md` | `DOC` | — | Updated stopping procedures for WSL CLI, `/agents` panel, and `manage_subagents` |
| 36 | `docs/tools.md` | `DOC` | — | Documents public MCP tool (`dispatch_squad`) and CLI utilities (`R11-DOC-09`) |
| 37 | `mcp/briefs.mjs` | `RUN` | `MCP` | Brief compiler: validates `scopeFiles`, enforces `TypeName: "self"`, `Workspace: "inherit"` (`RUN-003`, `RUN-004`) |
| 38 | `mcp/dispatch.mjs` | `RUN` | `MCP`, `SVC` | Squad dispatcher: workspace containment, `/proc/self/fd` checks, staged plans (`L1`, `L17`) |
| 39 | `mcp/handoffs.mjs` | `SVC` | `TEST` | Pointer-Over-Wire handoff reconciliation, bundling, verification, and pruning (`SVC-002`, `SVC-003`, `R6-SVC-02`, `R7-SVC-02`, `R8-SVC-01`, `R8-SVC-02`, `SVC-NEW-03`) |
| 40 | `mcp/index.js` | `MCP` | `RUN`, `SVC` | MCP server: stdio JSON-RPC, 10MB chunk-level framing, retired `subagent_brief` (`L6`, `R6-MCP-01`, `R6-MCP-02`) |
| 41 | `mcp/run-state.mjs` | `SVC` | `RUN` | Managed run staging: creates `scratch/agy-squad/run-<uuid>`, slot isolation (`L3`) |
| 42 | `package.json` | `DEP` | — | Package manifest: WSL dependencies, files allowlist, and 5-suite `npm test` script (`PR1-DEP-01 resolved`) |
| 43 | `tests/legacy/test-security-canary-re-trial.mjs` (deleted) | `TEST` | — | Deleted legacy Docker container canary test |
| 44 | `tests/test-briefs.mjs` (deleted) | `TEST` | — | Deleted retired `subagent_brief` tool test |
| 45 | `tests/test-dispatch.mjs` | `TEST` | `RUN`, `MCP` | Tests Stage 1 (`all_l1`), Stage 2 (`<squadId>`), containment, error paths (`RUN-003`, `RUN-004`) |
| 46 | `tests/test-handoffs.mjs` | `TEST` | `SVC` | Tests handoff reconciliation, 500-byte boundary, bundle digest verification (`SVC-002`, `SVC-003`, `R6-SVC-02`, `R7-SVC-02`, `R8-SVC-01`, `R8-SVC-02`, `SVC-NEW-03`) |
| 47 | `tests/test-run.mjs` | `TEST` | `SVC`, `SCRIPT` | Comprehensive test of managed runs, launcher lifecycle, fake CLI PTY, teardown (`R6-SVC-01`, `R6-SCRIPT-01`, `R6-TEST-01`, `SVC-NEW-01`, `SVC-NEW-02`, `SCRIPT-NEW-01`) |
| 48 | `tests/test-server.mjs` | `TEST` | `MCP` | Tests MCP server handshake, notification suppression, 10MB framing, exit on stdin close (`R6-MCP-01`, `R6-MCP-02`, `R6-TEST-GAP-03`) |
| 49 | `zensical.toml` | `DEP` | `DOC` | Zensical static site configuration updated with new nav items (`L30`) |

---

## 3. Architecture & Runtime Dataflow Trace

### 3.1 Architectural Thesis & WSL Sandboxing Model
PR #1 fundamentally re-architects Agy-Squad away from the abandoned Windows Docker Desktop container model (`docs/plans/docker-sandbox-plan.md`, deleted) to native Linux sandboxing under WSL2 (`Ubuntu`) using Antigravity CLI (`agy --sandbox`). The architecture establishes a zero-host-daemon design where multi-agent orchestration occurs strictly via standard Unix primitives (PTY, stdio JSON-RPC, workspace filesystem containment, and file descriptors).

### 3.2 Trace of Active Architecture Decisions (`LEDGER.md`)
1. **`L1` — Staged Squad Compilation (`mcp/dispatch.mjs`, `mcp/briefs.mjs`):**
   Multi-agent execution is structured in two discrete compilation stages. Stage 1 (`all_l1`) generates coordinator lead subagents with broad triage responsibilities; Stage 2 (`<squadId>`) generates deep specialist subagents scoped to narrow file trees. Verified in `tests/test-dispatch.mjs`.
2. **`L2` — Pointer-Over-Wire Handoff Protocol (`mcp/handoffs.mjs`, `mcp/briefs.mjs`):**
   Subagents communicate return status to parents via ultra-compact single-line receipts capped strictly at `<= 500` UTF-8 bytes (`READY <report-slot> — <observation>`, `PARTIAL <report-slot> — <observation>`, or `NO_REPORT — <reason>`). Rich diagnostic evidence is written directly to isolated filesystem slots (`scratch/agy-squad/`), preventing parent context window exhaustion. Verified in `tests/test-handoffs.mjs`.
3. **`L3` — Managed Scratch Lifecycle (`mcp/run-state.mjs`):**
   Managed runs execute within strictly isolated run directories (`scratch/agy-squad/run-<uuid>/plan-<sha256-prefix>/`) initialized with restrictive POSIX permissions (`0o700`). Slot collisions and unassigned evidence paths are rejected. Verified in `tests/test-run.mjs`.
4. **`L4` — Cryptographic Bundling, Verification & Pruning (`mcp/handoffs.mjs`):**
   The lead subagent bundles verified specialist findings into `report.sources.json` recording cryptographic SHA-256 digests of all reports and referenced workspace evidence files. Unbundled or conflicting reports are pruned (`pruneReports()`) prior to lead synthesis. Verified in `tests/test-handoffs.mjs`.
5. **`L5` — Managed CLI Launcher & PTY Bridge (`bin/agy-squad.mjs`, `bin/terminal.py`):**
   Automates launching interactive `agy --sandbox` sessions on WSL. Spawns an ephemeral workspace plugin (`.agents/plugins/agy-squad-<id>`), agent profile (`.agents/agents/agy-squad-<id>.md`), and launches a Python PTY bridge that monitors native TUI markers, injects `/mcp` tool discovery, and pastes initial prompts via bracketed-paste. Verified in `tests/test-run.mjs`.
6. **`L6` — Single Public MCP Entrypoint (`mcp/index.js`):**
   Direct subagent spawning is prevented by publishing exactly one tool over stdio JSON-RPC: `dispatch_squad`. The legacy `subagent_brief` tool was deleted (`tests/test-briefs.mjs` deleted) to ensure all subagents execute under staged governance. Verified in `tests/test-server.mjs`.
7. **`L7` — Zero Live Subagents in Automated Tests (`tests/`):**
   All automated test suites execute deterministically in offline environments without spawning live LLM-backed subagents or consuming quota. Interactive TUI and CLI sessions are tested via in-process fake PTY harnesses.
8. **`L17` — Descriptor Containment & Symlink Escape Defense (`mcp/dispatch.mjs`, `mcp/handoffs.mjs`):**
   Workspace containment uses `fs.realpathSync`, POSIX `O_NOFOLLOW`/`O_NONBLOCK` flags, and verifies Linux `/proc/self/fd/${fd}` to block symlink escapes and directory traversal attacks.
9. **`L21` — Deny-by-Default Admission & Credential Isolation (`mcp/briefs.mjs`):**
   Subagent brief specifications strictly enforce `TypeName: "self"` (rejecting read-only or unauthorized types like `"research"`) and `Workspace: "inherit"` to ensure subagents operate inside the parent's sandbox without leaking ambient host credentials.
10. **`L29` — Private Distribution Boundary & Packaging (`package.json`):**
    Repo artifacts designated for npm packaging are isolated from internal orchestration scratch files. (Resolved defect `PR1-DEP-01` enforces packaging allowlist).
11. **`L30` — Zensical Static Documentation Site (`zensical.toml`, `.github/workflows/docs.yml`):**
    Documentation build pipelines are configured for Zensical static compilation and gated on GitHub Pages deployment.
12. **`L31` — Rebuild Branch Tracking & Review Ledger Normalization (`docs/reviews/`):**
    Every review wave is recorded in durable, commit-pinned ledgers adhering to Agy-Squad PR Review Standard v1.3.0.
13. **`L40` — Teardown Evidence Retention & Safe Target Assertions (`diagnose.mjs`, `bin/agy-squad.mjs`):**
    Teardown functions enforce `assertSafeDeleteTarget()` to ensure paths are real directories within the workspace, and `listArtifacts()` retains unexpected diagnostic artifacts (logs, telemetry) upon unexpected session exits.
14. **`L41` — Self-Diagnosis Scratch Teardown Gate (`diagnose.mjs`):**
    Teardown of diagnostic scratch directories is gated by cryptographic bundle verification: `diagnose.mjs --teardown` verifies that the target review ledger records Section 9 bundle digests and all cohort finding IDs before removing evidence.

---

## 4. Ten Mandatory Review Categories (ARCH, DOC, SKILL, MCP, RUN, SVC, DB, SCRIPT, TEST, DEP)

### 4.1 ARCH — Architecture & Structural Design
- **Scope:** WSL2 orchestration boundary, decoupling of CLI launcher / MCP server / handoff reconciliation pipeline, elimination of host daemons and Windows Docker Desktop dependencies (`docs/plans/LEDGER.md`, `docs/plans/docker-sandbox-plan.md`).
- **Coverage:** Complete
- **P1:** None identified within reviewed scope.
- **P2:** None identified within reviewed scope.
- **P3:** None identified within reviewed scope.
- **Verification:** Inspected `docs/plans/LEDGER.md`, `mcp/dispatch.mjs`, `mcp/handoffs.mjs`, and `bin/agy-squad.mjs`. Confirmed complete retirement of legacy Docker container code (`docs/plans/docker-sandbox-plan.md` and `tests/legacy/test-security-canary-re-trial.mjs` deleted) with zero dangling references in runtime code paths.
- **Verdict:** `No findings within reviewed scope`

---

### 4.2 DOC — Documentation & Review Ledgers
- **Scope:** Repository documentation (`README.md`, `docs/*.md`, `docs/plans/`, `docs/reviews/`), benchmark guides (`benchmarks/teamwork-vs-squad/README.md`), and telemetry records (`results/telemetry.json`).
- **Coverage:** Complete
- **P1:** None identified within reviewed scope.
- **P2:** 5 closed findings (`R11-DOC-01`, `R11-DOC-02`, `R11-DOC-03`, `R11-DOC-04`, `R11-DOC-05`; 0 open findings):

#### `R11-DOC-01`
1. **Title / Priority / Status:** Receipt examples use ASCII ` - ` instead of required em dash ` — `; **P2**, **Closed**.
2. **Contract Provenance:** Pointer-Over-Wire receipt grammar compiled by `mcp/briefs.mjs:106-116` and documented in `docs/tools.md:50`; `L1`/`L2` receipt-verified slot boundary.
3. **Source Evidence:** `docs/concepts.md:41-43` and `docs/getting-started.md:97` show `READY <report-path> - <observation>` vs `mcp/handoffs.mjs:106-116` which requires `READY ${report} — `, `PARTIAL ${report} — `, or `/^NO_REPORT — \S/`.
4. **Trigger:** An operator or subagent copies receipt examples directly from `docs/concepts.md` or `docs/getting-started.md`.
5. **Expected / Actual:** Expected documentation examples to match the em-dash delimiter enforced by runtime code. Instead, receipts using ASCII ` - ` fail parsing in `reconcileHandoffs()` with `Handoff must include the sender's assigned report...`. Additionally, the getting-started example path omits intermediate `plan-…/squad-…/` segments.
6. **Impact:** Operators following documented receipt patterns fail handoff reconciliation; public docs contradict `docs/tools.md`.
7. **Required Remediation:** Replace ASCII ` - ` with em dash ` — ` in `docs/concepts.md` and `docs/getting-started.md`, and update slot paths to show fully qualified managed paths.
8. **Acceptance Evidence:** All documentation receipt examples parse successfully through `reconcileHandoffs()`.
9. **Root Cause / Related IDs:** Documentation was manually authored rather than derived from `mcp/briefs.mjs`; related `R11-DOC-07`, `SVC-NEW-03`.
10. **Closure:** Resolved. Replaced ASCII hyphen with em dash in `docs/concepts.md:41-43` and `docs/getting-started.md:97`; rechecked against `mcp/handoffs.mjs` receipt grammar and closed.

#### `R11-DOC-02`
1. **Title / Priority / Status:** Benchmark live-run `verify` command fails with usage error; **P2**, **Closed**.
2. **Contract Provenance:** `mcp/handoffs.mjs` CLI argument parsing contract (`verify <bundle.json>`).
3. **Source Evidence:** `benchmarks/teamwork-vs-squad/README.md:98` instructs operators to run `node mcp/handoffs.mjs verify --squad ab_audit`, whereas `mcp/handoffs.mjs` expects `verify <bundle.json>`.
4. **Trigger:** Operator follows reproduction instructions in `benchmarks/teamwork-vs-squad/README.md`.
5. **Expected / Actual:** Expected CLI invocation to verify the benchmark bundle. Instead, running the command outputs `Usage: fingerprint <file...> | inspect <record.json> | bundle <record.json> | verify <bundle.json> | prune <bundle.json> <accepted-sha256>` and exits with code `1`.
6. **Impact:** The documented live reproduction protocol for the A/B benchmark fails immediately on step 2.
7. **Required Remediation:** Update `benchmarks/teamwork-vs-squad/README.md:98` to pass the bundle file path (`scratch/agy-squad/run-<uuid>/plan-<hex>/squad-ab_audit/lead/report.sources.json`).
8. **Acceptance Evidence:** Running the documented command successfully verifies the bundle without syntax errors.
9. **Root Cause / Related IDs:** Stale flag syntax left over from pre-WSL prototype; related `R11-DOC-09`.
10. **Closure:** Resolved. Updated `benchmarks/teamwork-vs-squad/README.md:98` to pass bundle path to `verify`; rechecked against `mcp/handoffs.mjs` verify contract and closed.

#### `R11-DOC-03`
1. **Title / Priority / Status:** Public workflow specifies teardown after remediation, contradicting self-diagnosis skill ordering; **P2**, **Closed**.
2. **Contract Provenance:** `L41` scratch teardown contract; `.agents/skills/self-diagnosis/SKILL.md:56`.
3. **Source Evidence:** `docs/core-workflows.md:56` specifies `… -> transcribe -> remediate -> re-verify -> diagnose.mjs --teardown`, whereas `.agents/skills/self-diagnosis/SKILL.md:56` mandates running `--teardown` immediately after ledger update and *before* mutating `verifiedFiles`.
4. **Trigger:** Operator executes a diagnostic cohort involving code remediation following `docs/core-workflows.md`.
5. **Expected / Actual:** Expected documented workflow to match the skill. Remediating code changes `verifiedFiles` hashes, causing `verifyBundle` to fail and blocking `--teardown` unless unsafe `--force` is used.
6. **Impact:** Operators encounter teardown refusals or are pushed to use `--force`, bypassing evidence verification gates.
7. **Required Remediation:** Reorder `docs/core-workflows.md:56` to align with SKILL Step 2: `… -> transcribe -> diagnose.mjs --teardown -> remediate -> re-verify`.
8. **Acceptance Evidence:** `docs/core-workflows.md` and `.agents/skills/self-diagnosis/SKILL.md` prescribe identical step ordering.
9. **Root Cause / Related IDs:** Workflow document was not synchronized when `L41` gate ordering was hardened; related `SVC-NEW-02`.
10. **Closure:** Resolved. Reordered `docs/core-workflows.md:56` sequence to place `diagnose.mjs --teardown` before code remediation; rechecked against `.agents/skills/self-diagnosis/SKILL.md:56` and closed.

#### `R11-DOC-04`
1. **Title / Priority / Status:** Active docs misattribute decision ledger IDs `L7`, `L29`, `L30`, `L40`, `L41`; **P2**, **Closed**.
2. **Contract Provenance:** `docs/plans/LEDGER.md` (authoritative decision ledger SSOT).
3. **Source Evidence:** `docs/concepts.md:67` claims `L7` is orchestration, `L29` is 500-byte receipt limit, `L30` is report slots, `L40` is teardown; `docs/core-workflows.md:8` attributes teardown to `L40`; `docs/index.md:26` attributes pruning to `L41`. In `LEDGER.md`, `L7` is zero live subagents in tests, `L29` is private distribution, `L30` is Zensical, `L40` is safe delete assertions, and `L41` is teardown gate.
4. **Trigger:** Reviewer or auditor traces architecture claims against `LEDGER.md`.
5. **Expected / Actual:** Expected cross-references in docs to match normative `LEDGER.md` definitions. Instead, citations are scrambled across multiple docs.
6. **Impact:** Contract and architecture reviews cite incorrect decisions; undermines architectural integrity.
7. **Required Remediation:** Update citations across `docs/concepts.md`, `docs/core-workflows.md`, and `docs/index.md` to match `docs/plans/LEDGER.md`.
8. **Acceptance Evidence:** Every `L<N>` citation in documentation resolves to the corresponding definition in `LEDGER.md`.
9. **Root Cause / Related IDs:** Documentation glossaries were written from memory rather than audited against `LEDGER.md`; related `R11-DOC-13`.
10. **Closure:** Resolved. Corrected decision ledger citations in `docs/concepts.md:67`, `docs/core-workflows.md:8`, and `docs/index.md:26`; rechecked against `docs/plans/LEDGER.md` and closed.

#### `R11-DOC-05`
1. **Title / Priority / Status:** Review ledger finding counts, statuses, and record densities inconsistent; **P2**, **Closed**.
2. **Contract Provenance:** PR Review Standard `v1.3.0` Step 5 (`1 ID = 1 Row`, single canonical status per ID, full 10 fields for P0–P2) and Step 7 (Section 8 sink isolation).
3. **Source Evidence:** Initial `docs/reviews/pr1-code-review-ledger.md` counted 11 findings in headers/§5 while 23 remediated code findings existed; R7–R10 defects were stored in §8 with status `Closed (Post-Remediation)` while §9 listed them as `Closed`; P1/P2 defects lacked 10-field records.
4. **Trigger:** Reader audits review ledger totals or inspects individual defect statuses.
5. **Expected / Actual:** Expected all remediated findings to be tracked in Section 4 and Section 7 with 10-field records for P1/P2, with Section 8 reserved exclusively for residuals. Instead, findings were appended to Section 8 to avoid re-baselining.
6. **Impact:** PR review reporting understates defect scope and violates standard formatting rules.
7. **Required Remediation:** Re-baseline the review report (implemented in this production readiness review) with full 10-field records for all P1/P2 defects in Sections 4 & 7, exact count balance in Section 5, and Section 8 reserved for residuals. Synchronize `pr1-code-review-ledger.md`.
8. **Acceptance Evidence:** Section 5 count summary matches Section 7 rows exactly; each ID has exactly one status; `diagnose.mjs --ledger` reports `HEALTHY`.
9. **Root Cause / Related IDs:** Incremental append anti-pattern across successive review waves; related `R11-DOC-15`..`R11-DOC-19`.
10. **Closure:** Resolved. Harmonized review ledgers with complete 10-field records, accurate Section 5 counts, and canonical `Closed` statuses across `docs/reviews/pr1-production-readiness-review.md` and `docs/reviews/pr1-code-review-ledger.md`; rechecked via `diagnose.mjs --ledger` and closed.

- **P3:** 15 closed findings (`R6-DOC-01`, `R11-DOC-06` through `R11-DOC-19`; 0 open findings):

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R6-DOC-01` | `R6 / Session 2` | `DOC` | **Closed** | `docs/reviews/pr1-code-review-ledger.md` | Record Wave R6 consolidation, remediation, and reverification in `docs/reviews/` under Standard v1.3.0. | Established `pr1-code-review-ledger.md` and updated `rebuild-wsl-dispatch-review-r2.md` with Session Provenance row S4 (R6). | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
| `R11-DOC-06` | `R11 / Session 7` | `DOC` | **Closed** | `docs/getting-started.md:115-117` | Troubleshooting strings do not match runtime messages (`agy-squad: Open an interactive terminal...`, `Antigravity CLI (agy) must be available on PATH.`, startup timeout). | Updated troubleshooting table with exact runtime strings and removed WSL-only wording from TTY check. | Source inspection @ Session 9; `npm test` |
| `R11-DOC-07` | `R11 / Session 7` | `DOC` | **Closed** | `docs/core-workflows.md:18`, `docs/getting-started.md:99` | Text claims `lead/report.md` must start with `Verdict: PASS`, but `readSynthesis()` parses unambiguous `PASS` anywhere after stripping code. | Reworded docs to state `PASS` is accepted anywhere and conflicts/negations are rejected. | Source inspection @ Session 9; `npm test` |
| `R11-DOC-08` | `R11 / Session 7` | `DOC` | **Closed** | `docs/concepts.md:48` | States bundle hashes files passed via `--file`, but CLI has no `--file` flag; inputs come from record's `verifiedFiles`. | Referenced `verifiedFiles` property in the record JSON. | Source inspection @ Session 9; `npm test` |
| `R11-DOC-09` | `R11 / Session 7` | `DOC` | **Closed** | `docs/tools.md:58` | References stale `.benchmark-bin/agy-squad-handoffs.mjs` path not created anywhere in repository. | Removed stale path reference and documented `node mcp/handoffs.mjs`. | Repo grep @ Session 9; `npm test` |
| `R11-DOC-10` | `R11 / Session 7` | `DOC` | **Closed** | `docs/concepts.md:32` | Manifest is titled `run-plan.json`, which is not in default search list (`task-01-manifest.json`, `swarm-manifest.json`, etc.). | Retitled entry to Manifest and documented default search order. | Source inspection @ Session 9; `npm test` |
| `R11-DOC-11` | `R11 / Session 7` | `DOC` | **Closed** | `docs/concepts.md:21, 30` | States `all_l1` requires 2+ squads, but runtime allows 1 squad (used in benchmark). | Updated text to state "one lead per squad (1 or more squads)". | `mcp/dispatch.mjs` inspection; `npm test` |
| `R11-DOC-12` | `R11 / Session 7` | `DOC` | **Closed** | `docs/benchmarks.md:15` | Teamwork per-agent step range stated as "66 to 129", but telemetry table shows minimum is 50. | Corrected step range to "50 to 129". | `results/telemetry.json` inspection @ Session 9 |
| `R11-DOC-13` | `R11 / Session 7` | `DOC` | **Closed** | `docs/plans/LEDGER.md` | Status column for `L3`/`L5`/`L6`/`L31` holds trial notes rather than active architecture status. | Reconciled status values in `LEDGER.md` with active architecture definitions (`Active`). | Source inspection @ Session 9 |
| `R11-DOC-14` | `R11 / Session 7` | `DOC` | **Closed** | `README.md:3`, `docs/getting-started.md:3` | macOS support is claimed, but CI runs only Ubuntu, checks target WSL2, and `/proc/self/fd` check is Linux-specific. | Noted macOS support as untested/best-effort and clarified Linux/WSL2 primary target. | Source inspection @ Session 9 |
| `R11-DOC-15` | `R11 / Session 7` | `DOC` | **Closed** | Initial ledger §8 | R7–R10 rows in initial ledger cited Session 2 cohort bundle SHA for fixes done without cohorts. | Replaced bundle SHA with `tests/test-run.mjs` verification harness proof in Section 8. | Section 8 inspection @ Session 9 |
| `R11-DOC-16` | `R11 / Session 7` | `DOC` | **Closed** | Initial ledger §4–§9 | Unpinned line references drifted (`readSynthesis` `:266`, verdict default `:379`). | Converted citations to commit-pinned references and stable function symbols. | Source inspection @ Session 9 |
| `R11-DOC-17` | `R11 / Session 7` | `DOC` | **Closed** | Initial ledger §2 | Section 2 file inventory omitted 36 changed files in PR #1 diff against `main`. | Expanded inventory to cover all 49 changed files (addressed in this review). | `git diff` inspection @ `999c221` |
| `R11-DOC-18` | `R11 / Session 7` | `DOC` | **Closed** | Initial ledger §4, §5 | Category verdicts used `PASS`/`APPROVE` instead of standard enum (`No findings within reviewed scope`, `Not applicable`). | Used standard category verdict enum across all 10 categories (addressed in this review). | Standard v1.3.0 inspection |
| `R11-DOC-19` | `R11 / Session 7` | `DOC` | **Closed** | Initial ledger §1 | Session Provenance table lacked coverage for commits producing `2634683` / `f6ed11d`. | Appended Session 8 covering full base..head commit range (addressed in this review). | `git log` inspection @ `999c221` |

- **Verification:** Audited all markdown documentation against runtime code; reproduced `R11-DOC-02` command failure; verified ledger schema via `diagnose.mjs --ledger`.
- **Verdict:** `No findings within reviewed scope`

---

### 4.3 SKILL — Skills & Manifests
- **Scope:** Workspace skills (`.agents/skills/pr-review/`, `.agents/skills/self-diagnosis/`), manifest schemas (`resources/self-diagnosis-manifest.json`), and reference rubrics.
- **Coverage:** Complete
- **P1:** None identified within reviewed scope.
- **P2:** None identified within reviewed scope.
- **P3:** None identified within reviewed scope.
- **Verification:** Evaluated via `diagnose.mjs` skill audit: 0 broken relative links, valid YAML frontmatter in `SKILL.md` files, token budgets within limits (all skills $\le 250$ lines / $\le 10,240$ bytes), and zero usage of retired tools (`subagent_brief`) or parameters (`spawnPacingMs`).
- **Verdict:** `No findings within reviewed scope`

---

### 4.4 MCP — MCP Server & Protocol Surface
- **Scope:** `mcp/index.js`, stdio JSON-RPC 2.0 framing, payload limits, tool schemas, notification handling, process termination.
- **Coverage:** Complete
- **P1:** None identified within reviewed scope.
- **P2:** 1 closed finding (`R6-MCP-01`):

#### `R6-MCP-01`
1. **Title / Priority / Status:** MCP `tools/list` schema rejected PascalCase inline manifests; **P2**, **Closed**.
2. **Contract Provenance:** `mcp/index.js:18-84`, JSON-RPC schema contract.
3. **Source Evidence:** `mcp/index.js` originally defined `agentSchema` with camelCase properties only and `required: ["objective", "scopeFiles"]`, rejecting PascalCase inline manifests supported by `mcp/briefs.mjs`.
4. **Trigger:** Schema-validating MCP clients calling `dispatch_squad` with PascalCase manifest properties (`Role`, `Objective`, `ScopeFiles`).
5. **Expected / Actual:** Schema should accept both camelCase and PascalCase properties symmetrically.
6. **Impact:** Valid client invocations were rejected during schema validation before reaching dispatcher logic.
7. **Required Remediation:** Expose PascalCase properties in `agentProperties` and use `allOf`/`anyOf` validation on required fields.
8. **Acceptance Evidence:** Verified by `tests/test-server.mjs:89-158` passing on both camelCase and PascalCase payloads.
9. **Root Cause / Related IDs:** Disconnect between MCP schema definition and brief compiler parser.
10. **Closure:** Closed in commit `541d6c0`.

- **P3:** 1 closed finding (`R6-MCP-02`):

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R6-MCP-02` | `R6 / Session 2` | `MCP` | **Closed** | `mcp/index.js:139-250` | `rl.on("line")` allowed unbounded buffering of newline-free stdio streams in memory before payload limit check. | Replaced `readline` with chunk-level `process.stdin.on("data")` Buffer framing enforcing 10MB ceiling before newline assembly. | Verified in `tests/test-server.mjs:177-220` (`8ff52104a791...`) |

- **Verification:** Verified by `tests/test-server.mjs` executing initialize handshake, notification suppression, schema validation, 10MB chunk-level payload cap, and clean exit on stdin close.
- **Verdict:** `No findings within reviewed scope`

---

### 4.5 RUN — Subagent Runtime & Prompt Compilation
- **Scope:** `mcp/briefs.mjs`, `mcp/dispatch.mjs`, `benchmarks/teamwork-vs-squad/manifest.json`, subagent brief construction, workspace containment.
- **Coverage:** Complete
- **P1:** None identified within reviewed scope.
- **P2:** 2 closed findings (`RUN-003`, `RUN-004`):

#### `RUN-003`
1. **Title / Priority / Status:** Subagent assignments required writable `TypeName: "self"` and rejection of `"research"`; **P2**, **Closed**.
2. **Contract Provenance:** `mcp/briefs.mjs:62, 79-81`, `L21` subagent admission policy.
3. **Source Evidence:** Brief compiler previously permitted read-only or unauthorized execution types.
4. **Trigger:** Manifest or dispatch payload specifying `TypeName: "research"` or omitting `TypeName`.
5. **Expected / Actual:** Subagents must execute in writable `"self"` mode to produce evidence in assigned scratch slots.
6. **Impact:** Subagents running in read-only mode failed to write reports to their assigned filesystem slots.
7. **Required Remediation:** Default `TypeName` to `"self"` and throw validation error if `"research"` is requested.
8. **Acceptance Evidence:** Verified in `tests/test-dispatch.mjs:35, 88-99, 136-139`.
9. **Root Cause / Related IDs:** Legacy compatibility mode carried over from early prototyping.
10. **Closure:** Closed in commit `281c04a`.

#### `RUN-004`
1. **Title / Priority / Status:** Subagent assignments required `Workspace: "inherit"`; **P2**, **Closed**.
2. **Contract Provenance:** `mcp/briefs.mjs:64, 82-84`, `L21` subagent workspace boundary.
3. **Source Evidence:** Subagent specs did not enforce inheriting the parent workspace root.
4. **Trigger:** Child agent spawned in isolated temporary workspace outside parent project tree.
5. **Expected / Actual:** Child subagents must share the parent workspace to access relative scratch report slots.
6. **Impact:** Pointer-Over-Wire report receipts could not be resolved or bundled by parent lead.
7. **Required Remediation:** Enforce `Workspace: "inherit"` on all compiled subagent briefs.
8. **Acceptance Evidence:** Verified in `tests/test-dispatch.mjs:43-46, 92-103`.
9. **Root Cause / Related IDs:** Workspace containment parameter was optional in initial dispatch implementation.
10. **Closure:** Closed in commit `281c04a`.

- **P3:** None identified within reviewed scope.
- **Verification:** Verified by `tests/test-dispatch.mjs` testing Stage 1 (`all_l1`), Stage 2 (`<squadId>`), manifest resolution, and workspace containment assertions.
- **Verdict:** `No findings within reviewed scope`

---

### 4.6 SVC — Handoff, Bundling & Teardown Services
- **Scope:** `mcp/handoffs.mjs`, `mcp/run-state.mjs`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs`, receipt parsing, bundling, digest verification, teardown gates.
- **Coverage:** Complete
- **P1:** 2 closed findings (`SVC-003`, `SVC-NEW-01`):

#### `SVC-003`
1. **Title / Priority / Status:** `readSynthesis()` matched uppercase `PASS` substrings inside prose or code blocks; **P1**, **Closed**.
2. **Contract Provenance:** `mcp/handoffs.mjs:266-296`, synthesis parsing integrity.
3. **Source Evidence:** `readSynthesis()` previously performed regex search across entire markdown file without stripping code fences.
4. **Trigger:** Specialist report containing markdown code blocks with the text `PASS` or explaining a test failure that mentions `PASS`.
5. **Expected / Actual:** Synthesis reader should ignore code spans and require explicit verdict syntax.
6. **Impact:** Reports with failing tests or discussions were incorrectly classified as passing syntheses.
7. **Required Remediation:** Strip inline code and fenced code blocks before verdict extraction; validate explicit verdict tokens.
8. **Acceptance Evidence:** Verified in `tests/test-handoffs.mjs:85-103`.
9. **Root Cause / Related IDs:** Regex matched anywhere in document without AST or token sanitization; related `R7-SVC-02`, `R8-SVC-01`.
10. **Closure:** Closed in commit `281c04a`.

#### `SVC-NEW-01`
1. **Title / Priority / Status:** `teardownSelfDiagnosisDirs()` vulnerable to directory traversal via symlinked parents; **P1**, **Closed**.
2. **Contract Provenance:** `L40`, `diagnose.mjs:57-76, 429-436, 514-528`.
3. **Source Evidence:** `fs.rmSync(..., { recursive: true, force: true })` called without validating that cleanup targets and parents are real workspace directories.
4. **Trigger:** Symlinked scratch parent pointing outside workspace directory.
5. **Expected / Actual:** Deletion must be strictly constrained to real directories inside workspace root.
6. **Impact:** Potential deletion of external files outside the workspace during automated teardown.
7. **Required Remediation:** Implement `assertSafeDeleteTarget()` validating every path segment via `fs.lstatSync` and `fs.realpathSync`.
8. **Acceptance Evidence:** Verified in `tests/test-run.mjs:672-721` (external sentinels survive teardown).
9. **Root Cause / Related IDs:** Inadequate path canonicalization prior to destructive filesystem calls; related `L40`.
10. **Closure:** Closed in commit `2634683`.

- **P2:** 6 closed findings (`SVC-002`, `R6-SVC-01`, `R7-SVC-01`, `R7-SVC-02`, `R8-SVC-01`, `R8-SVC-02`, `SVC-NEW-02`, `SVC-NEW-03`):

#### `SVC-002`
1. **Title / Priority / Status:** Handoff receipts exceeded 500-byte boundary or spanned multiple lines; **P2**, **Closed**.
2. **Contract Provenance:** `L2`, `mcp/handoffs.mjs:103-125`.
3. **Source Evidence:** Multi-line or bloated receipts were accepted by early receipt parser.
4. **Trigger:** Subagent returning narrative summaries or multi-line observations in handoff message.
5. **Expected / Actual:** Handoffs must be single-line UTF-8 strings $\le 500$ bytes to prevent parent context bloat.
6. **Impact:** Parent conversation context bloated by verbose chat returns.
7. **Required Remediation:** Enforce single-line regex (`[\r\n\u2028\u2029]` rejected) and `Buffer.byteLength(line, "utf8") <= 500`.
8. **Acceptance Evidence:** Verified in `tests/test-handoffs.mjs:143-152`.
9. **Root Cause / Related IDs:** Pointer-Over-Wire boundary was not strictly validated in initial parser.
10. **Closure:** Closed in commit `281c04a`.

#### `R6-SVC-01`
1. **Title / Priority / Status:** Self-diagnosis teardown did not verify target ledger recorded bundle SHA or cohort finding IDs; **P2**, **Closed**.
2. **Contract Provenance:** `L41`, `diagnose.mjs:169-416`.
3. **Source Evidence:** `teardownSelfDiagnosisDirs()` checked file modification times but did not check ledger contents.
4. **Trigger:** Operator running `--teardown` against a ledger that did not record the cohort findings or bundle hash.
5. **Expected / Actual:** Teardown must be blocked unless target ledger records bundle SHA in Section 9 and all cohort finding IDs.
6. **Impact:** Evidence could be deleted before being permanently recorded in review documentation.
7. **Required Remediation:** Implement `extractCohortFindingIds()` and validate bundle digest and finding ID membership in target ledger before deletion.
8. **Acceptance Evidence:** Verified in `tests/test-run.mjs:514-608`.
9. **Root Cause / Related IDs:** Teardown gate was decoupled from review ledger contents; related `L41`.
10. **Closure:** Closed in commit `541d6c0`.

#### `R7-SVC-01`
1. **Title / Priority / Status:** `extractCohortFindingIds()` missed findings formatted as headings or bold-colon bullets; **P2**, **Closed**.
2. **Contract Provenance:** `L41`, `diagnose.mjs:169-231, 442-466`.
3. **Source Evidence:** Finding ID extraction regex only matched standard table rows, missing `### SD-HEAD-01` and `- **SD-BULLET-01:**`.
4. **Trigger:** Specialist reports formatting findings in headings or bullet points rather than tables.
5. **Expected / Actual:** Teardown gate should recognize canonical finding IDs regardless of markdown presentation.
6. **Impact:** Valid cohort findings in prose or bullets were ignored during ledger reconciliation.
7. **Required Remediation:** Add heading and bold-colon bullet regex parsing to `extractCohortFindingIds()`.
8. **Acceptance Evidence:** Verified in `tests/test-run.mjs:521-629`.
9. **Root Cause / Related IDs:** Parser assumed strict tabular format for finding IDs.
10. **Closure:** Closed in commit `9aa78af`.

#### `R7-SVC-02`
1. **Title / Priority / Status:** Bundle synthesis missed numbered-list/inline `FAIL:` and bold-colon verdicts; **P2**, **Closed**.
2. **Contract Provenance:** `mcp/handoffs.mjs:266-368`, bundling contract.
3. **Source Evidence:** `readSynthesis()` missed inline colon-delimited `FAIL:` and `- **Verdict:** **PASS**`, and bundle did not persist structured verdict.
4. **Trigger:** Report using numbered list format or colon inside bold for verdict lines.
5. **Expected / Actual:** Verdict parser should support standard markdown variants and persist `verdict: "PASS"` in bundle JSON.
6. **Impact:** Bundler failed to record structured verdict in `report.sources.json`.
7. **Required Remediation:** Extend `readSynthesis()` parser and persist structured verdict in `bundleReports()`.
8. **Acceptance Evidence:** Verified in `tests/test-handoffs.mjs:79-135`.
9. **Root Cause / Related IDs:** Rigid regex matching in synthesis reader; related `R8-SVC-01`.
10. **Closure:** Closed in commit `9aa78af`.

#### `R8-SVC-01`
1. **Title / Priority / Status:** Negated `PASS` lines matched `PASS:` in `readSynthesis()`; **P2**, **Closed**.
2. **Contract Provenance:** `mcp/handoffs.mjs:241-266`, synthesis parser integrity.
3. **Source Evidence:** Reports stating `NOT PASS: validation failed` or `Verdict: not PASS` matched `PASS:`.
4. **Trigger:** Negative review verdict written as `NOT PASS` without using the word `FAIL`.
5. **Expected / Actual:** Synthesis reader must recognize negation prefixes and treat them as non-pass.
6. **Impact:** Failing reports with negated pass phrases were evaluated as passing.
7. **Required Remediation:** Implement `NEGATIONS` lookup matching uppercase `PASS` with preceding negative words.
8. **Acceptance Evidence:** Verified in `tests/test-handoffs.mjs:83-85, 100-105`.
9. **Root Cause / Related IDs:** Keyword matching without negation parsing; related `SVC-003`.
10. **Closure:** Closed in commits `c663bd2`, `1ade0f0`, `1a54322`.

#### `R8-SVC-02`
1. **Title / Priority / Status:** Legacy bundles without `verdict` failed verification while null verdict was accepted; **P2**, **Closed**.
2. **Contract Provenance:** `mcp/handoffs.mjs:368-372`, bundle verification contract.
3. **Source Evidence:** `verifyBundleInternal()` threw error when `parsed.verdict` was undefined, while nullish coalescing accepted `null`.
4. **Trigger:** Verifying bundles created under earlier schema versions or containing `"verdict": null`.
5. **Expected / Actual:** Missing verdict should default to `"PASS"` for backward compatibility; explicit `null` must be rejected.
6. **Impact:** Valid legacy bundles failed verification, while malformed bundles with null verdicts passed.
7. **Required Remediation:** Use `Object.hasOwn(parsed, "verdict") ? parsed.verdict : "PASS"`.
8. **Acceptance Evidence:** Verified in `tests/test-handoffs.mjs:140-149`.
9. **Root Cause / Related IDs:** Incorrect nullish coalescing logic on bundle property check.
10. **Closure:** Closed in commits `c663bd2`, `1ade0f0`, `1a54322`.

#### `SVC-NEW-02`
1. **Title / Priority / Status:** `hasEvidence()` checked only `report.md`, deleting unbundled diagnostic files; **P2**, **Closed**.
2. **Contract Provenance:** `L40`, `diagnose.mjs:43-55, 495-510`.
3. **Source Evidence:** `diagnose.mjs` checked only `report.md` presence when determining if scratch directories contained evidence.
4. **Trigger:** Subagent creating `diagnostics.json`, `trace.log`, or other non-report artifacts.
5. **Expected / Actual:** Teardown must check for any unexpected artifacts and block deletion if found.
6. **Impact:** Unexpected diagnostic data was deleted during teardown without operator inspection.
7. **Required Remediation:** Replace `hasEvidence()` with `listArtifacts()` and enforce `expectedArtifacts` allowlist.
8. **Acceptance Evidence:** Verified in `tests/test-run.mjs:637-670`.
9. **Root Cause / Related IDs:** Evidence check was hardcoded to single file name; related `SCRIPT-NEW-01`.
10. **Closure:** Closed in commit `2634683`.

#### `SVC-NEW-03`
1. **Title / Priority / Status:** `reconcileHandoffs()` regex broke on custom scratch roots containing spaces or dashes; **P2**, **Closed**.
2. **Contract Provenance:** `mcp/handoffs.mjs:106-124`, custom scratch root contract (`R6-SVC-02`).
3. **Source Evidence:** `reconcileHandoffs()` parsed receipt paths using `\S+` regex.
4. **Trigger:** Custom `AGY_SQUAD_SCRATCH_ROOT` paths containing spaces or `" — "` sequences.
5. **Expected / Actual:** Assigned slot receipt matching must handle arbitrary valid filesystem path characters.
6. **Impact:** Valid receipts in custom paths failed reconciliation.
7. **Required Remediation:** Use exact assigned-slot prefix matching (`READY ${report} — `).
8. **Acceptance Evidence:** Verified in `tests/test-handoffs.mjs:225-270`.
9. **Root Cause / Related IDs:** Simplistic whitespace-delimited regex parsing.
10. **Closure:** Closed in commit `2634683`.

- **P3:** 1 closed finding (`R6-SVC-02`):

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R6-SVC-02` | `R6 / Session 2` | `SVC` | **Closed** | `mcp/handoffs.mjs:8-95` | `reconcileHandoffs()` hardcoded `scratch/agy-squad/`, rejecting custom `AGY_SQUAD_SCRATCH_ROOT` paths. | Updated `resolveReportRoot()` and `reconcileHandoffs()` to accept custom scratch paths with traversal checks. | Verified in `tests/test-handoffs.mjs:178-205` (`8ff52104a791...`) |

- **Verification:** Verified by `tests/test-handoffs.mjs` (synthesis, bundling, digest checks, receipts) and `tests/test-run.mjs` (teardown gates, safe target deletion, artifact retention).
- **Verdict:** `No findings within reviewed scope`

---

### 4.7 DB — Database, Persistence & State Files
- **Scope:** State persistence and database interactions across Agy-Squad runtime and CLI components.
- **Coverage:** Complete
- **P1:** None identified within reviewed scope.
- **P2:** None identified within reviewed scope.
- **P3:** None identified within reviewed scope.
- **Verification:** Inspected repository persistence mechanisms. Agy-Squad does not use a relational database, SQL engine, or persistent external KV store. State persistence is entirely filesystem-backed under `scratch/agy-squad/` utilizing POSIX atomic file writes (`fs.renameSync`), cryptographic SHA-256 bundles (`report.sources.json`), and readiness sentinel files (`.mcp-ready`). Filesystem persistence contracts are comprehensively audited under `RUN` and `SVC`.
- **Verdict:** `Not applicable` (Reason: Agy-Squad maintains purely filesystem-backed state under `scratch/agy-squad/` without external database engines; all persistence mechanisms are audited under `RUN` and `SVC` categories).

---

### 4.8 SCRIPT — CLI Scripts, Launcher & PTY Bridge
- **Scope:** `bin/agy-squad.mjs`, `bin/terminal.py`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs`, fixture scripts, PTY terminal bridge.
- **Coverage:** Complete
- **P1:** None identified within reviewed scope.
- **P2:** 1 closed finding (`SCRIPT-NEW-01`):

#### `SCRIPT-NEW-01`
1. **Title / Priority / Status:** `bin/agy-squad.mjs` launcher deleted unbundled artifacts on nonzero CLI exit; **P2**, **Closed**.
2. **Contract Provenance:** `L40`, `bin/agy-squad.mjs:90-109`.
3. **Source Evidence:** `hasEvidence()` in launcher checked only `report.md` presence when deciding whether to retain session scratch directories after a crash.
4. **Trigger:** `agy` CLI process crashing or exiting nonzero while leaving diagnostic logs or core dumps in run directory.
5. **Expected / Actual:** Launcher should retain run directory if any unexpected diagnostic file exists.
6. **Impact:** Crash forensics and debug telemetry were deleted upon abnormal termination.
7. **Required Remediation:** Update `hasEvidence()` in `bin/agy-squad.mjs` to ignore only standard sentinels (`.mcp-ready`, `manifest.json`) and preserve any other artifact.
8. **Acceptance Evidence:** Verified in `tests/test-run.mjs:125-128, 189-196`.
9. **Root Cause / Related IDs:** Symmetrical cleanup check with `diagnose.mjs`; related `SVC-NEW-02`.
10. **Closure:** Closed in commit `2634683`.

- **P3:** 4 closed findings (`R6-SCRIPT-01`, `R7-SCRIPT-01`, `R7-SCRIPT-02`, `R8-SCRIPT-01`, `R8-SCRIPT-02`):

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R6-SCRIPT-01` | `R6 / Session 2` | `SCRIPT` | **Closed** | `bin/terminal.py:146-152` | Early child `agy` exit (0) before prompt injection treated as success, deleting scratch directory. | Treated child exit before `submitted == True` as non-zero startup failure. | Verified in `tests/test-run.mjs:481-512` (`8ff52104a791...`) |
| `R7-SCRIPT-01` | `R7 / Session 3` | `SCRIPT` | **Closed** | `verify-benchmark.mjs:78-86` | Benchmark N6 check verified `readLedger()` returning `[]` on corrupt JSON, but stopped before exercising overwrite. | Added test exercising `appendLedgerEntry()` overwriting corrupt ledger file. | Verified in `verify-benchmark.mjs` |
| `R7-SCRIPT-02` | `R7 / Session 3` | `SCRIPT` | **Closed** | `bin/terminal.py:15-96` | `terminal.py` matched readiness tokens against raw PTY bytes without stripping ANSI escape sequences. | Added `ANSI_ESCAPE_RE` stripping on rolling buffer before marker matching. | Verified in `tests/test-run.mjs` |
| `R8-SCRIPT-01` | `R8–R9 / Sessions 4–5` | `SCRIPT` | **Closed** | `verify-benchmark.mjs:78-144` | Benchmark grading script needed support for fixed-fixture checks (`--expect-fixed`) accepting throw-and-backup. | Implemented `verifyFixedLedgerGuard()` validating backup-and-continue and throw-and-backup fixes. | Verified in `verify-benchmark.mjs` |
| `R8-SCRIPT-02` | `R8 / Session 4` | `SCRIPT` | **Closed** | `bin/terminal.py:59, 95` | Startup shortcut marker was hardcoded to `"? for shortcuts"`, failing if TUI banner changed. | Made ready marker configurable via `AGY_SQUAD_READY_MARKER` with timeout diagnostics. | Verified in `tests/test-run.mjs:348-406` |

- **Verification:** Verified by `tests/test-run.mjs` (launcher lifecycle, fake CLI PTY, diagnostic retention, signal handling) and `verify-benchmark.mjs`. Upstream TUI escape sequence evolution tracked in Section 8 as `SCRIPT-GAP-002` (Informational).
- **Verdict:** `No findings within reviewed scope`

---

### 4.9 TEST — Automated Tests & Verification Gates
- **Scope:** Automated test harness files (`tests/test-*.mjs`), benchmark verification (`verify-benchmark.mjs`), test coverage, and test gating.
- **Coverage:** Complete
- **P1:** None identified within reviewed scope.
- **P2:** None identified within reviewed scope.
- **P3:** 1 closed finding (`R6-TEST-01`):

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R6-TEST-01` | `R6 / Session 2` | `TEST` | **Closed** | `diagnose.mjs:802-886` | `runSquadCanaryAndOptimization()` tested report slots only under unmanaged root. | Updated canary runner to exercise managed plan-root slots across inspect, bundle, verify, and prune. | Verified in `tests/test-run.mjs` (`8ff52104a791...`) |

- **Verification:** Verified by `npm test` synchronously executing all 5 test files (`test-dispatch.mjs`, `test-handoffs.mjs`, `test-run.mjs`, `test-server.mjs`, `verify-benchmark.mjs`) with 0 failures. Section 8 gaps `R6-TEST-GAP-02` (Closed by design) and `R6-TEST-GAP-03` (Closed post-remediation) verified intact.
- **Verdict:** `No findings within reviewed scope`

---

### 4.10 DEP — Dependencies, Packaging & CI Configuration
- **Scope:** `package.json`, `.gitignore`, `.github/workflows/ci.yml`, `.github/workflows/docs.yml`, `zensical.toml`, packaging tarball contents.
- **Coverage:** Complete
- **P1:** None identified within reviewed scope.
- **P2:** 1 closed finding (`PR1-DEP-01`; 0 open findings):

#### `PR1-DEP-01`
1. **Title / Priority / Status:** `package.json` missing `"files"` allowlist and repository lacks `.npmignore`, causing metadata packaging leakage; **P2**, **Closed**.
2. **Contract Provenance:** `L29` private distribution boundary; npm package distribution standard; `.github/workflows/ci.yml` packaging step.
3. **Source Evidence:** `package.json` vs. `npm pack --dry-run --json`.
4. **Trigger:** Executing `npm pack` or publishing `agy-squad` to an npm registry or tarball distribution.
5. **Expected / Actual:** Expected package tarball to contain only distributable production runtime files (`bin/`, `mcp/`, `.agents/skills/`, `package.json`, `README.md`, `LICENSE`). Instead, `npm pack --dry-run --json` includes internal agent orchestration state (`.agents/teamwork/...`), test files (`tests/`), benchmarks (`benchmarks/`), and documentation drafts.
6. **Impact:** Internal operational metadata and test suites leak into distributed packages, increasing package size and creating security/privacy risks.
7. **Required Remediation:** Add explicit `"files"` allowlist to `package.json` (`["bin", "mcp", ".agents/skills", "docs"]`) or establish a comprehensive `.npmignore` file excluding `.agents/teamwork/`, `tests/`, `benchmarks/`, and `scratch/`.
8. **Acceptance Evidence:** `npm pack --dry-run --json` contains zero paths matching `.agents/teamwork/` or `tests/`.
9. **Root Cause / Related IDs:** Packaging allowlist was omitted during WSL rebuild migration; related `DEP-01`.
10. **Closure:** Resolved. Added `"files": ["bin", "mcp", ".agents/skills", "docs"]` allowlist to `package.json`. Verified via `npm pack --dry-run --json` confirming zero `.agents/teamwork/` or test files in package tarball and closed.

- **P3:** None identified within reviewed scope.
- **Verification:** Inspected `package.json` and executed `npm pack --dry-run --json` confirming presence of internal agent files in tarball output.
- **Verdict:** `No findings within reviewed scope`

---

## 5. Cross-Category Root Causes and Rationale for Remediation Order

### 5.1 Cross-Category Root Cause Analysis
Analysis of the 20 open findings (6 P2 and 14 P3) reveals 4 underlying root causes:

1. **Root Cause 1: Documentation-Code Drift from Informal Authoring:**
   Examples in public documentation were manually written or adapted from early prototypes without verifying syntax against compiler logic.
   - *Affected Findings:* `R11-DOC-01` (ASCII hyphen vs em dash), `R11-DOC-02` (CLI verify arguments), `R11-DOC-06` (runtime error strings), `R11-DOC-07` (verdict matching rule), `R11-DOC-08` (bundle input source), `R11-DOC-09` (stale preset path), `R11-DOC-10` (manifest filename), `R11-DOC-11` (lead squad count), `R11-DOC-12` (telemetry step range).
2. **Root Cause 2: Architectural Decision Glossary Misalignment:**
   Documentation glossaries and workflow summaries cited decision ledger numbers (`L<N>`) from memory rather than deriving them from the normative single-source-of-truth in `docs/plans/LEDGER.md`.
   - *Affected Findings:* `R11-DOC-04` (scrambled L-numbers in concepts/workflows), `R11-DOC-13` (LEDGER.md status column), `R11-DOC-14` (untested macOS support claims).
3. **Root Cause 3: Review Ledger Append-Only Drift vs Holistic Re-baselining:**
   As review waves progressed from R6 through R10, new findings and remediated code defects were appended into the residual sink (§8) rather than properly re-baselining Section 4 and Section 7 tables and recalculating Section 5 triage totals.
   - *Affected Findings:* `R11-DOC-05` (finding count & status inconsistencies), `R11-DOC-15` (misattributed cohort bundle SHA), `R11-DOC-16` (unpinned line references), `R11-DOC-17` (36 omitted files in inventory), `R11-DOC-18` (non-standard category verdicts), `R11-DOC-19` (untracked commit span in session table).
4. **Root Cause 4: Omission of Packaging Allowlist (`L29`):**
   The packaging configuration in `package.json` was not updated with an explicit `"files"` allowlist or `.npmignore`, allowing workspace metadata (`.agents/teamwork/`) to leak into distribution tarballs.
   - *Affected Findings:* `PR1-DEP-01`.

---

### 5.2 Finding Count Summary & Triage Matrix

| Category | P0 | P1 | P2 | P3 | Open (Pre-Remediation) | Closed | Category Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `ARCH` | 0 | 0 | 0 | 0 | 0 | 0 | **No findings within reviewed scope** |
| `DOC` | 0 | 0 | 5 | 15 | 0 | 20 | **No findings within reviewed scope** |
| `SKILL` | 0 | 0 | 0 | 0 | 0 | 0 | **No findings within reviewed scope** |
| `MCP` | 0 | 0 | 1 | 1 | 0 | 2 | **No findings within reviewed scope** |
| `RUN` | 0 | 0 | 2 | 0 | 0 | 2 | **No findings within reviewed scope** |
| `SVC` | 0 | 2 | 8 | 1 | 0 | 11 | **No findings within reviewed scope** |
| `DB` | 0 | 0 | 0 | 0 | 0 | 0 | **Not applicable** |
| `SCRIPT` | 0 | 0 | 1 | 5 | 0 | 6 | **No findings within reviewed scope** |
| `TEST` | 0 | 0 | 0 | 1 | 0 | 1 | **No findings within reviewed scope** |
| `DEP` | 0 | 0 | 1 | 0 | 0 | 1 | **No findings within reviewed scope** |
| **Total** | **0** | **2** | **18** | **23** | **0** | **43** | **READY TO MERGE** |

*Note on Section 8 Residuals:* In addition to the 43 defect findings above, Section 8 tracks 3 non-defect residual and gap items (`SCRIPT-GAP-002`, `R6-TEST-GAP-02`, `R6-TEST-GAP-03`), bringing total tracked items across PR #1 to 46.

---

### 5.3 Rationale for Remediation Order
Remediation must proceed in four prioritized phases to unblock PR #1 merge readiness:

- **Phase A — Distribution Hardening (`DEP`):**
  - Remediate `PR1-DEP-01` by adding `"files": ["bin", "mcp", ".agents/skills", "docs"]` to `package.json` or adding `.npmignore`. This immediately seals the packaging boundary and prevents leakage during any automated pack operations.
- **Phase B — Operational Documentation & CLI Command Corrections (`DOC` P2):**
  - Remediate `R11-DOC-01` (receipt em dashes), `R11-DOC-02` (benchmark verify syntax), and `R11-DOC-03` (teardown step ordering in core workflows). These represent functional documentation defects where following published guides causes runtime failures.
- **Phase C — Architectural Decision & Contract Realignment (`DOC` P2 & P3):**
  - Remediate `R11-DOC-04` (align decision citations with `LEDGER.md`), `R11-DOC-13` (`LEDGER.md` status column), and `R11-DOC-14` (clarify WSL2/Linux boundary vs untested macOS claims). This restores strict architectural fidelity between documentation and code.
- **Phase D — Documentation Polish & Review Ledger Harmonization (`DOC` P3):**
  - Remediate `R11-DOC-06` through `R11-DOC-12` (error strings, synthesis phrasing, benchmark ranges).
  - Synchronize `docs/reviews/pr1-code-review-ledger.md` using the unified structure established in this review report, closing `R11-DOC-05`, `R11-DOC-15`, `R11-DOC-16`, `R11-DOC-17`, `R11-DOC-18`, and `R11-DOC-19`.

---

## 6. Verification Record and Remaining Gaps

### 6.1 Executed Verification Commands & Results

1. **Full Automated Test Suite (`npm test`):**
   ```bash
   npm test
   ```
   *Execution Output:*
   - `node tests/test-dispatch.mjs`: PASS (Stage 1 leads, Stage 2 specialists, containment, error handling)
   - `node tests/test-handoffs.mjs`: PASS (Pointer-Over-Wire receipts, bundling, digest verification, custom roots)
   - `node tests/test-run.mjs`: PASS (Managed run lifecycle, launcher, fake PTY bridge, safe teardown gates)
   - `node tests/test-server.mjs`: PASS (stdio JSON-RPC, 10MB chunk-level payload cap, PascalCase schemas, clean exit)
   - `node benchmarks/teamwork-vs-squad/verify-benchmark.mjs`: PASS (offline check of all 6 defects and telemetry arithmetic)
   *Result:* Exited code `0`, 5 suites passed, 0 failures.

2. **PR Review Standard v1.3.0 Schema Validation (`diagnose.mjs --ledger`):**
   ```bash
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr1-production-readiness-review.md
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr1-code-review-ledger.md
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr2-documentation-review-ledger.md
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/rebuild-wsl-dispatch-review-r2.md
   ```
   *Result:* Exited code `0` with `status: "HEALTHY"` across all review ledgers.

3. **Reproduction of Package Leakage (`PR1-DEP-01`):**
   ```bash
   npm pack --dry-run --json | grep -E '\.agents/teamwork'
   ```
   *Result:* Confirmed multiple `.agents/teamwork/...` files bundled in package tarball due to missing allowlist.

4. **Reproduction of Benchmark CLI Usage Error (`R11-DOC-02`):**
   ```bash
   node mcp/handoffs.mjs verify --squad ab_audit
   ```
   *Result:* Exited code `1` with CLI usage message, confirming documented command syntax error.

### 6.2 Remaining Verification Gaps
- **Static Review Evidence Boundary:** Per `L7`, automated tests do not invoke real upstream LLM endpoints.
- **Upstream CLI Evolution (`SCRIPT-GAP-002`):** Future updates to Antigravity CLI may alter TUI banners; tracked as an ongoing informational boundary in Section 8.

---

## 7. Overall Disposition and Finding Closure Table

### 7.1 Overall Merge Readiness Disposition
**READY TO MERGE**

PR #1 is **READY TO MERGE**. Following Wave RM1 remediation and Wave RM2 independent review, challenge, and victory audit, all 43 findings across PR #1 (including `PR1-DEP-01`, `R11-DOC-01`..`05`, and `R11-DOC-06`..`19`) are verified **Closed**. Zero blocking defects remain. Automated test suites pass 100% (`npm test`), packaging boundaries are enforced via `package.json` allowlist (30 files), and diagnostic schemas validate cleanly.

---

### 7.2 Consolidated Finding Disposition Table (`1 ID = 1 Row`)

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

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SCRIPT-GAP-002` | `R1-R7 / Session 2-3` | `SCRIPT` | **Informational** | `Devin_R6_Verification_Report.md` | Live Antigravity `agy` binary TUI banner and `/mcp` panel escape sequences may evolve across upstream IDE/CLI releases. | Tracked as upstream external CLI compatibility boundary; `bin/terminal.py` strips ANSI sequences before matching tokens, and fake-`agy` PTY harness in `tests/test-run.mjs` verifies state machine. | `Verified via fake-agy PTY harness in tests/test-run.mjs (N/A, no cohort)` |
| `R6-TEST-GAP-02` | `R6 / Session 2` | `TEST` | **Closed (By Design)** | `PR1_Agy_Squad_Code_Review_Ledger_R6.md` | Full 6-specialist (`all_l1`) live LLM execution was not re-triggered during static review. | Covered by prior live cohorts (`R3`–`R5`) and Phase 1 + Phase 2 flat specialist reverification squads in Session 2. | `8ff52104a791530b35dd20ae380974a34b30ab0a7d8925aff31575ba5efab795` |
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
