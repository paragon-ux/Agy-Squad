# Agy-Squad PR #1 Consolidation, Remediation & Reverification Ledger

**Disposition:** `CHANGES REQUIRED — Wave R11 Documentation Review: 5 Open P2 + 14 Open P3 DOC Findings (R11-DOC-01..R11-DOC-19 listed individually in Sections 4.2 and 7); All 11 Prior Consolidated Code Findings Remain Closed`
**Wave R11 Reviewed Head SHA:** `f6ed11d16dcfcbf926468aad5b59b713db79248f` (`rebuild/wsl-dispatch`, clean working tree; documentation-scoped review)
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
- **Verdict:** **Changes required** (Wave R11 / Session 7: `5` open `P2` and `14` open `P3` documentation findings `R11-DOC-01`–`R11-DOC-19`, each recorded individually below; `R6-DOC-01` remains closed).

#### `R6-DOC-01`
- **Priority:** `P3` | **Status:** **Closed**
- **Original References:** `PR1_Agy_Squad_Code_Review_Ledger_R6.md` (`R6-DOC-01`), `GitHub_PR1_Review_Comment.md` (`R6-DOC-01`)
- **Location:** `docs/reviews/pr1-code-review-ledger.md:1-265`, `docs/reviews/rebuild-wsl-dispatch-review-r2.md:15-26`
- **Defect Summary:** Record Wave R6 consolidation, remediation, and reverification in `docs/reviews/` under PR Review Standard `v1.3.0`.
- **Remediation & Reverification Evidence:** Established `docs/reviews/pr1-code-review-ledger.md` and updated `docs/reviews/rebuild-wsl-dispatch-review-r2.md` with Session Provenance row `S4 (R6)` and cross-references to both consolidation ledgers; validated via `diagnose.mjs --ledger`.

#### Wave R11 Documentation Consistency Findings (Session 7, head `f6ed11d`)

Evidence boundary: source inspection of active docs against runtime at `f6ed11d`, plus local execution of `npm test` (pass), `diagnose.mjs --ledger` on all three `docs/reviews/` ledgers (`HEALTHY`; schema-only check, does not validate content consistency), and a reproduction of `R11-DOC-02`. No live `agy` sessions or subagents were launched.

#### `R11-DOC-01` — Documented receipt grammar uses ASCII hyphen; runtime requires em dash
1. **Title / Priority / Status:** Receipt examples use ` - `, but `reconcileHandoffs()` requires ` — `; **P2**, **Open (Pre-Remediation)**.
2. **Contract Provenance:** Pointer-Over-Wire receipt grammar compiled by `mcp/briefs.mjs` and documented in `docs/tools.md:50`; `L1`/`L2` receipt-verified slot boundary.
3. **Source Evidence:** `docs/concepts.md:41-43`, `docs/getting-started.md:97` vs. `mcp/handoffs.mjs:106-116` (`READY ${report} — `, `PARTIAL ${report} — `, `/^NO_REPORT — \S/`) @ `f6ed11d`.
4. **Trigger:** A child agent or operator copies the documented `READY <report-path> - <observation>` form.
5. **Expected / Actual:** Expected these docs to match the em-dash separator used by `docs/tools.md` and the compiled briefs. Instead, they show ASCII ` - `, which `inspect`/`bundle` reject with `Handoff must include the sender's assigned report…` (source-derived). The getting-started example path `scratch/agy-squad/run-.../specialist-1/report.md` also omits the managed `plan-…/squad-…/` segments.
6. **Impact:** Receipts written from the onboarding guide fail reconciliation, and two active docs contradict `docs/tools.md`.
7. **Required Remediation:** Use ` — ` in `docs/concepts.md:41-43` and `docs/getting-started.md:97`, and show a full managed slot (`scratch/agy-squad/run-…/plan-…/squad-…/specialist-1/report.md`).
8. **Acceptance Evidence:** No active doc shows a ` - ` receipt separator; `inspect` accepts the documented example.
9. **Root Cause / Related IDs:** Prose paraphrased instead of derived from `mcp/briefs.mjs`; related `R11-DOC-07`, `SVC-NEW-03`.
10. **Closure:** Open.

#### `R11-DOC-02` — Benchmark live-run `verify` command fails with a usage error
1. **Title / Priority / Status:** `handoffs.mjs verify --squad ab_audit` is not a valid invocation; **P2**, **Open (Pre-Remediation)**.
2. **Contract Provenance:** `mcp/handoffs.mjs` CLI contract `verify <bundle.json>` (`docs/tools.md`, "Optional report cleanup").
3. **Source Evidence:** `benchmarks/teamwork-vs-squad/README.md:98` vs. the `mcp/handoffs.mjs` CLI dispatcher (`action === "verify" && args.length === 1`) @ `f6ed11d`.
4. **Trigger:** Operator follows step 2 of "Run a new live experiment".
5. **Expected / Actual:** Expected a working verify command. Instead, `node mcp/handoffs.mjs verify --squad ab_audit` prints the usage string and exits `1` (reproduced locally at `f6ed11d`).
6. **Impact:** The documented live-reproduction protocol cannot complete its integrity check as written.
7. **Required Remediation:** Replace it with `node mcp/handoffs.mjs verify scratch/agy-squad/run-<uuid>/plan-<hex>/squad-ab_audit/lead/report.sources.json` (or the bundle path the lead reports).
8. **Acceptance Evidence:** The documented command parses and verifies a bundle.
9. **Root Cause / Related IDs:** Stale flag-style syntax, and `npm test` does not check documented commands; related `R11-DOC-09`.
10. **Closure:** Open.

#### `R11-DOC-03` — `core-workflows.md` teardown ordering contradicts the self-diagnosis skill
1. **Title / Priority / Status:** Public workflow runs `--teardown` after remediation, but the skill requires it before; **P2**, **Open (Pre-Remediation)**.
2. **Contract Provenance:** `L41`; `.agents/skills/self-diagnosis/SKILL.md:56` ("Immediately after updating the target `docs/reviews/` ledger … and before mutating `verifiedFiles` during code remediation").
3. **Source Evidence:** `docs/core-workflows.md:56` (`… -> transcribe … -> remediate -> re-verify with the same specialists -> run diagnose.mjs --teardown -> terminate subagents`).
4. **Trigger:** Operator follows the public workflow during a cohort that includes remediation.
5. **Expected / Actual:** Expected teardown right after the ledger update, because remediation changes `verifiedFiles`, so `verifyBundle` then fails and teardown is refused without `--force` (`diagnose.mjs:439`, source-derived). Instead, the doc defers teardown until after remediation and re-verification.
6. **Impact:** Following the doc leads to a teardown refusal or pushes the operator toward `--force`, which skips the evidence gates.
7. **Required Remediation:** Reorder to `… -> transcribe -> diagnose.mjs --teardown -> remediate -> same-squad re-verify (send_message) -> terminate`, matching SKILL Step 2.
8. **Acceptance Evidence:** `docs/core-workflows.md` and the self-diagnosis SKILL list the same ordering.
9. **Root Cause / Related IDs:** Summary predates final `L41` gate ordering; related `SVC-NEW-02`.
10. **Closure:** Open.

#### `R11-DOC-04` — Decision-ledger IDs misattributed in glossary and workflow docs
1. **Title / Priority / Status:** Active docs give `L7`, `L29`, `L30`, `L40`, and `L41` meanings that do not match `LEDGER.md`; **P2**, **Open (Pre-Remediation)**.
2. **Contract Provenance:** `docs/plans/LEDGER.md` (normative ID source per `pr-review` SKILL Step 2).
3. **Source Evidence:** `docs/concepts.md:67` (`L7` = orchestration model, `L29` = 500-byte receipt ceiling, `L30` = report slots/SHA-256 bundles, `L40` = ledger-gated teardown); `docs/core-workflows.md:8` (teardown = `L40`); `docs/index.md:26` (handoff prune = `L41`); `docs/reviews/pr2-documentation-review-ledger.md` §3 (`L29–L31` = digest bundling) and `F04` (`L40`).
4. **Trigger:** A reviewer traces a contract through the glossary, as Step 2 requires.
5. **Expected / Actual:** `LEDGER.md` defines `L7` = zero real subagents in automated tests, `L29` = private distribution, `L30` = Zensical docs site, `L21`/`L40` = deny-by-default admission and credential isolation, and `L41` = self-diagnosis scratch teardown. The docs assign different meanings, and the receipt ceiling and bundle contract appear only indirectly in `L1`/`L2`.
6. **Impact:** Architecture-before-runtime traces cite the wrong decisions.
7. **Required Remediation:** Correct the mappings to match `LEDGER.md`, or add explicit `LEDGER.md` entries for the receipt ceiling and bundle contract and cite those.
8. **Acceptance Evidence:** Every `L<n>` cited in active docs matches the `LEDGER.md` decision text.
9. **Root Cause / Related IDs:** Glossary not derived from `LEDGER.md`; related `R11-DOC-13`.
10. **Closure:** Open.

#### `R11-DOC-05` — This ledger's finding counts, statuses, and record density are inconsistent
1. **Title / Priority / Status:** Header, §5, and §7 count 11 findings, but 23 remediated defects exist, and four IDs carry two different statuses; **P2**, **Open (Pre-Remediation)**.
2. **Contract Provenance:** PR Review Standard `v1.3.0` Step 5 (P0–P2 need 10-field records; one status per ID) and Step 7 (§8 holds residuals surfaced during re-verification).
3. **Source Evidence:** `docs/reviews/pr1-code-review-ledger.md`: header Disposition (pre-R11 "All 11"), §5 totals (`P1=1`), §7 (11 rows), §8 rows `R7-*`, `R8-*`, `SVC-NEW-01..03`, `SCRIPT-NEW-01`, and the §9 Wave Finding Ledger.
4. **Trigger:** A reader tallies PR #1 findings or checks the status of one ID.
5. **Expected / Actual:** Expected every remediated defect to be counted, to have one status, and, for P1/P2 (`SVC-NEW-01` P1; `SVC-NEW-02`, `SVC-NEW-03`, `SCRIPT-NEW-01` P2), to have a 10-field record. Instead, the 12 R7–R10 defects exist only as compact §8 rows, and `SVC-NEW-01..03`/`SCRIPT-NEW-01` are `Closed (Post-Remediation)` in §8 but `Closed` in §9.
6. **Impact:** The merge disposition understates scope (2 P1 defects, not 1), and the R10 findings, which came from an independent review rather than re-verification, sit in the residual sink.
7. **Required Remediation:** Promote R7–R10 defects to §4/§7 (10-field records for P1/P2), recount §5 and the header, keep one status per ID, and reserve §8 for true residuals.
8. **Acceptance Evidence:** §5 totals equal the §7 row count, each ID has one status, and `diagnose.mjs --ledger` remains `HEALTHY`.
9. **Root Cause / Related IDs:** Later waves were appended to §8 instead of re-baselining the ledger; related `R11-DOC-15`, `R11-DOC-16`, `R11-DOC-17`, `R11-DOC-19`.
10. **Closure:** Open.

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R11-DOC-06` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | `docs/getting-started.md:115-117` | Troubleshooting symptoms do not match any runtime message. Actual messages: `agy-squad: Open an interactive terminal to start a squad run.` (`bin/agy-squad.mjs:124`, a generic TTY check, not WSL-specific), `Antigravity CLI (agy) must be available on PATH.` / `Python 3 (python3) must be available on PATH.` (`bin/agy-squad.mjs:120, 73`), and `Agy-Squad: the dispatcher was not discovered within 15 seconds (startup timeout: …)` (`bin/terminal.py:152`). | Quote the exact runtime strings and drop the WSL-only wording from the TTY row. | Source inspection @ `f6ed11d`; no cohort |
| `R11-DOC-07` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | `docs/core-workflows.md:18`, `docs/getting-started.md:99` | Both say `handoffs.mjs` requires `lead/report.md` to *start with* `Verdict: PASS`. In fact, `readSynthesis()` (`mcp/handoffs.mjs:266`) requires one unambiguous `PASS` anywhere after stripping code spans and rejects conflicting `FAIL`/`BLOCKED`/negated `PASS`. `docs/tools.md` describes this correctly. | Reword both docs to match `docs/tools.md`. | Source inspection @ `f6ed11d`; no cohort |
| `R11-DOC-08` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | `docs/concepts.md:48` | The evidence bundle is said to hash "every workspace file passed via `--file`", but `handoffs.mjs` has no `--file` flag. Hashed inputs come from the record's `verifiedFiles` (`bundle <record.json>`). | Reference `verifiedFiles` in the record JSON. | Source inspection @ `f6ed11d`; no cohort |
| `R11-DOC-09` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | `docs/tools.md:58` | Says "benchmark presets stage a copy of `mcp/handoffs.mjs` at `.benchmark-bin/agy-squad-handoffs.mjs`", but no code in the repo creates that path (repo-wide grep @ `f6ed11d`). Every other doc runs `node mcp/handoffs.mjs`. | Replace with `node mcp/handoffs.mjs` from the checkout, or remove the stale preset sentence. | Repo grep @ `f6ed11d`; no cohort |
| `R11-DOC-10` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | `docs/concepts.md:32` | The manifest is titled `run-plan.json`, but that file is never a default. `mcp/dispatch.mjs:7-12` and `docs/tools.md` list `task-01-manifest.json`, `swarm-manifest.json`, `.scratch/swarm-manifest.json`, and `suite-manifest.json`. | Retitle the entry "Manifest" and link to the default search order in `docs/tools.md`. | Source inspection @ `f6ed11d`; no cohort |
| `R11-DOC-11` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | `docs/concepts.md:21, 30` | Says the `all_l1` lead stage needs a "multi-squad" manifest with "`2` or more squads". `mcp/dispatch.mjs` has no minimum, and the benchmark manifest's `all_l1` compiles 1 lead (asserted in `verify-benchmark.mjs`; the recorded arm used 1 lead). | State "one lead per squad (1 or more squads)". | Source inspection + `npm test` @ `f6ed11d`; no cohort |
| `R11-DOC-12` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | `docs/benchmarks.md:15` | Teamwork per-agent step range is given as "`66` to `129`", but the per-agent table and `results/telemetry.json` show a minimum of `50` (`miner_contract_1`). The total of `645` is correct. | Change to "`50` to `129`". | `telemetry.json` inspection @ `f6ed11d`; no cohort |
| `R11-DOC-13` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | `docs/plans/LEDGER.md` (L3/L5, L6, L31 rows) vs. `pr-review` SKILL Step 2, `docs/concepts.md:67`, `docs/core-workflows.md:63` | Docs list `L3`, `L5`, `L6`, and `L31` as "Active architecture", but the `LEDGER.md` Status column holds trial results for them ("WSL command and supervised stop checks passed", "Trial specialist denied…") and marks `L31` as "Rebuild branch". | Align the `LEDGER.md` Status values with the active-ID list (or adjust the list). | Source inspection @ `f6ed11d`; no cohort |
| `R11-DOC-14` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | `README.md:3`, `docs/getting-started.md:3`, `docs/index.md:3`, `zensical.toml` vs. `docs/plans/LEDGER.md` (L8–L12), `package.json` `description`, `.github/workflows/ci.yml` | Docs claim Linux, macOS, and WSL2 support, but `LEDGER.md` selects the WSL CLI, `package.json` says "on WSL", CI runs only on `ubuntu-latest`, all recorded checks are WSL2, and the `/proc/self/fd` descriptor re-check (`mcp/dispatch.mjs:34`) runs only on Linux. macOS is unverified. | Mark macOS as untested/best-effort (or add macOS CI plus a recorded check) and reconcile the `package.json` description. | Source inspection @ `f6ed11d`; no cohort |
| `R11-DOC-15` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | This ledger §8 (`R7-SVC-01` … `SVC-NEW-03` rows) | The Verification column cites the Session 2 cohort bundle `8ff52104…` for fixes made in Sessions 3–6, which §1 records as "Direct remediation + `npm test`" with no cohort. | Cite `npm test` at the fix commit, or mark `N/A (no cohort)`. | Source inspection @ `f6ed11d`; no cohort |
| `R11-DOC-16` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | This ledger §4.2, §4.6, §7, §8, §9 | Unpinned line references have drifted: `readSynthesis()` is cited at `mcp/handoffs.mjs:241-262` / `241-266` / `241-368` but now starts at `:266`; the verdict default is cited at `:369` but is now at `:379`; `R6-DOC-01` cites this ledger at `:1-265`. Step 5 requires commit-pinned links. | Convert references to links pinned to the fix SHA. | `grep -n` @ `f6ed11d`; no cohort |
| `R11-DOC-17` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | This ledger §2 | The file inventory omits files changed in `3df852b..f6ed11d`: `benchmarks/teamwork-vs-squad/verify-benchmark.mjs` (`R7-SCRIPT-01`, `R8-SCRIPT-01`), `docs/plans/wsl-cli-verification.md` (`R8-SCRIPT-02`), and `docs/reviews/pr1-code-review-ledger.md`. | Add the missing inventory rows. | `git diff --stat 3df852b..f6ed11d`; no cohort |
| `R11-DOC-18` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | This ledger §4, §5 | Category verdicts use `PASS`/`APPROVE` instead of the standard's enum (`Changes required`, `No findings within reviewed scope`, `Incomplete`, `Not applicable`). `DB` should be `Not applicable` because state is filesystem-only (SKILL Step 3); `diagnose.mjs` itself reports `DB` as `Not applicable`. | Use the standard verdict enum. | `diagnose.mjs --markdown` @ `f6ed11d`; no cohort |
| `R11-DOC-19` | `R11 / Session 7` | `DOC` | **Open (Pre-Remediation)** | This ledger §1 header vs. Session Provenance table | The header records remediated commit `2634683`, but Session 6 covers only `ee10ebc..ed94e83`, and no session row records the work that produced `2634683` or `f6ed11d`. The Session 7 row added in Wave R11 covers only this documentation review. | Extend Session 6 (or add a row) to cover `ed94e83..f6ed11d`. | `git log` @ `f6ed11d`; no cohort |

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
| `DOC` | 0 | 0 | 5 | 15 | 19 | 1 | **Changes required** |
| `SKILL` | 0 | 0 | 0 | 0 | 0 | 0 | **PASS** |
| `MCP` | 0 | 0 | 1 | 1 | 0 | 2 | **PASS** |
| `RUN` | 0 | 0 | 2 | 0 | 0 | 2 | **PASS** |
| `SVC` | 0 | 1 | 2 | 1 | 0 | 4 | **PASS** |
| `DB` | 0 | 0 | 0 | 0 | 0 | 0 | **PASS** |
| `SCRIPT` | 0 | 0 | 0 | 1 | 0 | 1 | **PASS** |
| `TEST` | 0 | 0 | 0 | 1 | 0 | 1 | **PASS** |
| `DEP` | 0 | 0 | 0 | 0 | 0 | 0 | **PASS** |
| **Total** | **0** | **1** | **10** | **19** | **19** | **11** | **CHANGES REQUIRED** |

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
3. **Wave R11 (Session 7) Documentation Review @ `f6ed11d`:** `npm test` passed locally (all suites plus the offline benchmark check). `diagnose.mjs --ledger` reported `HEALTHY` for all 3 ledgers, but that check validates schema only, not content consistency (see `R11-DOC-05`). `node mcp/handoffs.mjs verify --squad ab_audit` exits `1` with a usage error (`R11-DOC-02`). All other R11 findings come from source inspection; no live `agy` sessions or subagents were launched.

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
| `R11-DOC-01` | `DOC` | `P2` | Wave R11 / Session 7 | `docs/concepts.md:41-43`, `docs/getting-started.md:97` | Receipt examples use ASCII ` - `; `reconcileHandoffs()` requires ` — `. | **Open (Pre-Remediation)** |
| `R11-DOC-02` | `DOC` | `P2` | Wave R11 / Session 7 | `benchmarks/teamwork-vs-squad/README.md:98` | `handoffs.mjs verify --squad ab_audit` exits `1` with a usage error; the CLI takes `verify <bundle.json>`. | **Open (Pre-Remediation)** |
| `R11-DOC-03` | `DOC` | `P2` | Wave R11 / Session 7 | `docs/core-workflows.md:56` | Workflow runs `--teardown` after remediation; the self-diagnosis SKILL (`:56`) requires it before. | **Open (Pre-Remediation)** |
| `R11-DOC-04` | `DOC` | `P2` | Wave R11 / Session 7 | `docs/concepts.md:67`, `docs/core-workflows.md:8`, `docs/index.md:26` | `L7`/`L29`/`L30`/`L40`/`L41` meanings contradict `docs/plans/LEDGER.md`. | **Open (Pre-Remediation)** |
| `R11-DOC-05` | `DOC` | `P2` | Wave R11 / Session 7 | This ledger header, §5, §7, §8, §9 | 11 findings counted vs. 23 remediated; R7–R10 P1/P2 lack 10-field records; four IDs carry two statuses. | **Open (Pre-Remediation)** |
| `R11-DOC-06` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/getting-started.md:115-117` | Troubleshooting error strings do not match runtime messages. | **Open (Pre-Remediation)** |
| `R11-DOC-07` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/core-workflows.md:18`, `docs/getting-started.md:99` | "Starts with `Verdict: PASS`" misstates the `readSynthesis()` rule. | **Open (Pre-Remediation)** |
| `R11-DOC-08` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/concepts.md:48` | Nonexistent `--file` flag; inputs come from `verifiedFiles`. | **Open (Pre-Remediation)** |
| `R11-DOC-09` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/tools.md:58` | Stale `.benchmark-bin/agy-squad-handoffs.mjs` preset reference. | **Open (Pre-Remediation)** |
| `R11-DOC-10` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/concepts.md:32` | Manifest titled `run-plan.json`, which is not a default manifest name. | **Open (Pre-Remediation)** |
| `R11-DOC-11` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/concepts.md:21, 30` | `all_l1` described as needing 2+ squads; 1 squad is valid and is used by the benchmark. | **Open (Pre-Remediation)** |
| `R11-DOC-12` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/benchmarks.md:15` | Teamwork step range "`66` to `129`" should be "`50` to `129`". | **Open (Pre-Remediation)** |
| `R11-DOC-13` | `DOC` | `P3` | Wave R11 / Session 7 | `docs/plans/LEDGER.md` | Status column for `L3`/`L5`/`L6`/`L31` disagrees with the documented active-ID set. | **Open (Pre-Remediation)** |
| `R11-DOC-14` | `DOC` | `P3` | Wave R11 / Session 7 | `README.md:3`, `docs/getting-started.md:3`, `docs/index.md:3` | macOS support is claimed but unverified (WSL decision, Ubuntu-only CI, Linux-only descriptor check). | **Open (Pre-Remediation)** |
| `R11-DOC-15` | `DOC` | `P3` | Wave R11 / Session 7 | This ledger §8 | R7–R10 rows cite the Session 2 cohort bundle SHA for no-cohort fixes. | **Open (Pre-Remediation)** |
| `R11-DOC-16` | `DOC` | `P3` | Wave R11 / Session 7 | This ledger §4–§9 | Unpinned line references have drifted (`readSynthesis` `:266`, verdict default `:379`). | **Open (Pre-Remediation)** |
| `R11-DOC-17` | `DOC` | `P3` | Wave R11 / Session 7 | This ledger §2 | Inventory omits `verify-benchmark.mjs`, `wsl-cli-verification.md`, and this ledger. | **Open (Pre-Remediation)** |
| `R11-DOC-18` | `DOC` | `P3` | Wave R11 / Session 7 | This ledger §4, §5 | Verdicts use `PASS`/`APPROVE` instead of the standard enum; `DB` should be `Not applicable`. | **Open (Pre-Remediation)** |
| `R11-DOC-19` | `DOC` | `P3` | Wave R11 / Session 7 | This ledger §1 | No session row covers `ed94e83..f6ed11d` (remediated commit `2634683`). | **Open (Pre-Remediation)** |

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
