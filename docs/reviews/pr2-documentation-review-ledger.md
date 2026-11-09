# Agy-Squad PR #2 Consolidation, Remediation & Reverification Ledger

**Disposition:** `APPROVE — All 15 Consolidated PR2 Findings Remediated & Reverified (0 Open Findings, 0 Open Residuals)`
**Review Date:** `2026-11-09`
**Repository / PR:** [paragon-ux/Agy-Squad #2](https://github.com/paragon-ux/Agy-Squad/pull/2) (`rebuild/teamwork-benchmark` -> `rebuild/wsl-dispatch`)
**Base Branch / SHA:** `rebuild/wsl-dispatch` at `c7acf464be46780b051b432d59ce657f4ee2880f`
**Reviewed Head SHA (Pre-Remediation Baseline):** `e27abc3ee75af9aebf66277f75ec889d77de0ba2`
**Remediated & Reverified Commit SHA:** `5efd693`
**Governing Standard:** Agy-Squad PR Review Standard `v1.3.0` (`.agents/skills/pr-review/SKILL.md` and `.agents/skills/self-diagnosis/SKILL.md`)
**Source Review Package:** `/home/paragon-ux/Antigravity/artifacts/to-fix/Agy_Squad_PR2_Documentation_Review` (`01_FULL_REVIEW.md`, `02_PR_READY_REVIEW_COMMENT.md`, `03_PROPOSED_README_QUICKSTART.md`, `04_BENCHMARK_METHODOLOGY_PATCH.md`, `05_INSTALL_UX_TEST_PLAN.md`, `06_COMPARISON_SCORECARD.md`, `07_PRIORITIZED_FINDINGS.csv`, `08_PROPOSED_CORE_WORKFLOWS.md`, `09_SOURCES_CITATIONS_AND_RESEARCH_GUIDE.md`, `README_PACKAGE.md`)

---

## 1. Review Metadata, Session Provenance & Evidence Boundaries

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| Session 1 (PR2 Baseline) | `944c64a0-e4c9-4272-a701-e3a32108a31b` | Root operator session | 2026-11-09 | `c7acf46..e27abc3` (clean working tree) | PR2 consolidation ledger initialized from `Agy_Squad_PR2_Documentation_Review` (`F01`–`F15`) |
| Session 2 (Phase 1 Remediation & Reverification) | `944c64a0-e4c9-4272-a701-e3a32108a31b` | Root operator session | 2026-11-09 | `c7acf46..e27abc3` + Phase 1 PR2 remediation | Argon remediation + Flat specialist squad (`fe0001dc-...`, `eac77238-...`) + `/self-diagnosis` reverification (`a18d14825b1f...`) |

- **Scope & Precedence:** Phase 1 covers PR #2 (`rebuild/teamwork-benchmark`) exclusively and was completed, reverified by a flat specialist squad, and validated via `/self-diagnosis` before Phase 2 (PR #1) remediation began.
- **Evidence Examined:** All 10 files in `Agy_Squad_PR2_Documentation_Review`, plus `README.md`, `docs/index.md`, `docs/benchmarks.md`, `docs/getting-started.md`, `docs/core-workflows.md`, `docs/concepts.md`, `docs/tools.md`, `docs/stopping-agents.md`, `docs/plans/wsl-cli-verification.md`, `zensical.toml`, `benchmarks/teamwork-vs-squad/README.md`, `benchmarks/teamwork-vs-squad/manifest.json`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs`, `benchmarks/teamwork-vs-squad/results/telemetry.json`, `.agents/skills/self-diagnosis/SKILL.md`, and `.agents/skills/pr-review/SKILL.md`.
- **Deduplication Note:** All findings across `07_PRIORITIZED_FINDINGS.csv` (`F01`–`F15`), `01_FULL_REVIEW.md`, `02_PR_READY_REVIEW_COMMENT.md`, and proposed draft files `03`–`09` map 1-to-1 to the 15 canonical IDs `F01`–`F15` with original references preserved.

---

## 2. File-to-Category Inventory & Coverage Matrix

| Path | Primary Category | Cross-Referenced Categories | Review Package Reference |
| --- | --- | --- | --- |
| `README.md` | `DOC` | `SKILL`, `ARCH` | `F01`, `F03`, `F04`, `F05`, `F06`, `F09`, `F10`, `F11`, `F12`, `F14`, `F15` |
| `docs/index.md` | `DOC` | `SKILL` | `F01`, `F03`, `F06`, `F11`, `F12`, `F14`, `F15` |
| `docs/benchmarks.md` | `DOC` | `SCRIPT`, `SVC` | `F01`, `F02`, `F03`, `F04`, `F07`, `F08`, `F12`, `F13` |
| `docs/getting-started.md` | `DOC` | `DEP`, `RUN` | `F05`, `F09`, `F10` |
| `docs/core-workflows.md` | `DOC` | `SKILL`, `SVC` | `F04`, `F14`, `F15` |
| `docs/concepts.md` | `DOC` | `ARCH`, `RUN` | `F11` |
| `docs/plans/wsl-cli-verification.md` | `DOC` | `TEST` | `F01`, `F07`, `F09`, `F12` |
| `zensical.toml` | `DEP` | `DOC` | `F06`, `F11`, `F14`, `F15` |
| `benchmarks/teamwork-vs-squad/README.md` | `DOC` | `SCRIPT`, `TEST` | `F01`, `F02`, `F03`, `F04`, `F07`, `F08`, `F12`, `F13` |
| `benchmarks/teamwork-vs-squad/verify-benchmark.mjs` | `SCRIPT` | `TEST`, `DOC` | `F02`, `F08` |
| `benchmarks/teamwork-vs-squad/results/telemetry.json` | `DOC` | `SCRIPT` | `F07`, `F08`, `F13` |
| `.agents/skills/self-diagnosis/SKILL.md` | `SKILL` | `SVC`, `DOC` | `F04`, `F14` |
| `.agents/skills/pr-review/SKILL.md` | `SKILL` | `DOC` | `F15` |

---

## 3. Architecture-Before-Runtime Trace

- **Design Thesis & Active Invariants (`L1–L7, L17, L21, L29–L31, L40, L41`):**
  - `L1–L7`: Task-proportional staged delegation in Antigravity Desktop (IDE) and Antigravity CLI (`agy`) across POSIX systems (Linux, macOS, and WSL2), `<= 500` byte receipt ceiling, file-backed specialist reports, parent-side verification.
  - `L29–L31`: Cryptographic input/report digest bundling (`handoffs.mjs verify`) proves artifact integrity, whereas semantic correctness requires parent/lead inspection of cited files and tests.
  - `L40–L41`: Durable 1-ID-per-row ledger export to `docs/reviews/` before `diagnose.mjs --teardown` removes `scratch/agy-squad/squad-*` directories, followed by child termination (`manage_subagents`).
- **Remediation Summary:** All 15 PR #2 findings (`F01`–`F15`) were remediated across the 13 paths above, adhering to `/antislop-copywriting` (`0` em/en dashes, `0` AI buzzwords) and documenting both Antigravity Desktop (IDE) and CLI across POSIX systems (Linux, macOS, and WSL2) without overstating benchmark limitations.

---

## 4. Category Review Records (All 10 Mandatory Categories)

### `ARCH` — Architecture and Contracts
1. **Scope:** Positioning of Agy-Squad's Desktop IDE and CLI orchestration on POSIX / WSL2, handoff integrity (`L29–L31`), and teardown boundaries (`L40–L41`) relative to native Antigravity subagents, `/teamwork`, and general SDKs.
2. **Coverage:** Complete across PR #2 documentation and benchmark artifacts.
3. **P0 / P1 / P2 / P3 Findings:** Cross-referenced under `DOC` and `SKILL` (`F03`, `F04`, `F10`, `F14`, `F15`).
4. **Verification & Verdict:** `No findings within reviewed scope` (all cross-referenced `DOC`/`SKILL` items closed).

### `DOC` — Documentation and Change Records
1. **Scope:** `README.md`, `docs/index.md`, `docs/benchmarks.md`, `docs/getting-started.md`, `docs/core-workflows.md`, `docs/concepts.md`, `docs/plans/wsl-cli-verification.md`, `benchmarks/teamwork-vs-squad/README.md`, and `benchmarks/teamwork-vs-squad/results/telemetry.json`.
2. **Coverage:** Complete across all PR #2 documentation files.
3. **P0 / P1 / P2 Findings (10-Field Blocks):**

#### `F01` — Overgeneralized single-run speed claims
1. **Title / Priority / Status:** Overgeneralized single-run speed claims; **P0**, **Closed**.
2. **Contract Provenance:** PR Review Standard v1.3.0 `DOC` / `SCRIPT`; `07_PRIORITIZED_FINDINGS.csv:F01`, `01_FULL_REVIEW.md:F01`, `02_PR_READY_REVIEW_COMMENT.md:#1`.
3. **Source:** `README.md:102-108`, `docs/index.md:29-33`, `docs/benchmarks.md:3-7`, `benchmarks/teamwork-vs-squad/README.md:3,16-18`, `docs/plans/wsl-cli-verification.md:49-51`, `benchmarks/teamwork-vs-squad/results/telemetry.json:4`.
4. **Trigger:** Benchmark headlines summarized results without naming the recorded November 8, 2026 sequential six-defect audit scope.
5. **Expected / Actual:** Every benchmark headline and summary now explicitly states the recorded November 8, 2026 sequential audit context (`Agy-Context-Saver 1.8.1`, `rtk 0.51.0` vs. `/teamwork [skip-interview]` on the two-domain 6-defect fixture) factually and without overstating limitations.
6. **Impact:** Clear, accurate context on every benchmark summary.
7. **Required Remediation:** Attach recorded audit context to all benchmark summaries across `README.md`, `docs/index.md`, `docs/benchmarks.md`, `benchmarks/teamwork-vs-squad/README.md`, `docs/plans/wsl-cli-verification.md`, and `telemetry.json`.
8. **Acceptance Evidence:** Reverified by Specialist 1 (`fe0001dc-737e-4865-b7d3-f623431780a5`, `434cdf02bb7b...`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F08`, `F12`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F03` — SHA integrity conflated with semantic reviewer agents
1. **Title / Priority / Status:** SHA integrity conflated with semantic reviewer agents; **P0**, **Closed**.
2. **Contract Provenance:** `L29–L31`; `07_PRIORITIZED_FINDINGS.csv:F03`, `01_FULL_REVIEW.md:F03`, `02_PR_READY_REVIEW_COMMENT.md:#2`, `04_BENCHMARK_METHODOLOGY_PATCH.md`.
3. **Source:** `docs/benchmarks.md:20-21,27`, `README.md:106`, `docs/index.md:31`, `benchmarks/teamwork-vs-squad/README.md:11-12,70`, `benchmarks/teamwork-vs-squad/results/telemetry.json:25`.
4. **Trigger:** Previous table placed `20 ms` SHA-256 verification on the same line as Teamwork's `2` LLM reviewer agents.
5. **Expected / Actual:** `docs/benchmarks.md` now separates `Artifact integrity verification` (`20 ms` `handoffs.mjs verify` SHA-256 digests) from `Semantic correctness verification` (parent/lead direct code and test inspection vs. Teamwork's `reviewer_1` and `auditor_1`).
6. **Impact:** Clearly distinguishes cryptographic digest verification from semantic code review.
7. **Required Remediation:** Separate artifact integrity and semantic correctness rows and explanations across all benchmark docs.
8. **Acceptance Evidence:** Reverified by Specialist 1 (`fe0001dc-737e-4865-b7d3-f623431780a5`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F02`, `F08`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F04` — Teardown policy obscured by Git-untracked file metric
1. **Title / Priority / Status:** Teardown policy obscured by Git-untracked file metric; **P1**, **Closed**.
2. **Contract Provenance:** `L40`, `L41`; `07_PRIORITIZED_FINDINGS.csv:F04`, `01_FULL_REVIEW.md:F04`, `02_PR_READY_REVIEW_COMMENT.md:#3`, `08_PROPOSED_CORE_WORKFLOWS.md:§4`.
3. **Source:** `docs/benchmarks.md:22,29,75-83`, `docs/core-workflows.md:69-86`, `README.md:11,106`, `benchmarks/teamwork-vs-squad/README.md:11,70`, `.agents/skills/self-diagnosis/SKILL.md:14`.
4. **Trigger:** Cleanup comparison previously emphasized `0 vs 41` Git-untracked files over the 3-scope teardown policy.
5. **Expected / Actual:** All docs now lead with the 3-scope evidence-retention and teardown contract (managed CLI session cleanup, `handoffs.mjs` `inspect -> bundle -> verify -> prune`, and `self-diagnosis` durable `docs/reviews/` ledger gate + `diagnose.mjs --teardown` + `manage_subagents` child termination), keeping `0 vs 41` Git-untracked files as secondary telemetry (`scratch/` gitignored).
6. **Impact:** Foregrounds the architectural teardown contract.
7. **Required Remediation:** Document the 3-scope teardown table in `docs/core-workflows.md` and `docs/benchmarks.md` and frame `0 vs 41` as secondary telemetry.
8. **Acceptance Evidence:** Reverified by Specialists 1 and 2 (`fe0001dc-...`, `eac77238-...`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F14`, `F15`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F05` — Missing clone to first-result journey
1. **Title / Priority / Status:** Missing clone to first-result journey; **P1**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F05`, `01_FULL_REVIEW.md:F05`, `03_PROPOSED_README_QUICKSTART.md`, `05_INSTALL_UX_TEST_PLAN.md`.
3. **Source:** `README.md:24-86`, `docs/getting-started.md:1-100`.
4. **Trigger:** New users lacked a standalone clone-to-first-result onboarding guide.
5. **Expected / Actual:** `docs/getting-started.md` and `README.md` provide a complete standalone flow (`git clone` -> preflight -> Antigravity Desktop IDE registration + 3 CLI execution modes: offline `npm test`, payload preview without `--launch`, and live `--launch` -> expected `READY` output -> cleanup) across POSIX systems (Linux, macOS, and WSL2).
6. **Impact:** Complete standalone onboarding for Desktop IDE and CLI users.
7. **Required Remediation:** Add `docs/getting-started.md` and update `README.md` quickstart.
8. **Acceptance Evidence:** Reverified by Specialist 2 (`eac77238-3637-400d-a201-5d8ebadf44c2`, `1f8a976713ed...`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F06`, `F09`, `F10`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F06` — Benchmark dominates first impression/navigation
1. **Title / Priority / Status:** Benchmark dominates first impression/navigation; **P1**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F06`, `01_FULL_REVIEW.md:F06`, `08_PROPOSED_CORE_WORKFLOWS.md`.
3. **Source:** `README.md:1-93,102-108`, `docs/index.md:1-33`, `zensical.toml:11-21`.
4. **Trigger:** Full benchmark tables appeared on landing pages and `zensical.toml` lacked `Getting Started`, `Core Workflows`, and `Concepts`.
5. **Expected / Actual:** `README.md` and `docs/index.md` lead with product identity, onboarding, and core workflows before concise recorded case-study summaries linking to `docs/benchmarks.md`; `zensical.toml` places `Overview`, `Getting Started`, `Core Workflows`, and `Concepts` at the top of `nav`.
6. **Impact:** Clean information architecture and one-click access to onboarding and core workflows.
7. **Required Remediation:** Relocate full metric tables to `docs/benchmarks.md` and update `zensical.toml`.
8. **Acceptance Evidence:** Reverified by Specialist 2 (`eac77238-3637-400d-a201-5d8ebadf44c2`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F05`, `F12`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F07` — Experiment prompts and environment not reproducible
1. **Title / Priority / Status:** Experiment prompts and environment not reproducible; **P1**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F07`, `01_FULL_REVIEW.md:F07`, `04_BENCHMARK_METHODOLOGY_PATCH.md`, `09_SOURCES_CITATIONS_AND_RESEARCH_GUIDE.md:A06`.
3. **Source:** `benchmarks/teamwork-vs-squad/README.md:47-72,88-100`, `docs/benchmarks.md:39-51,97-99`, `benchmarks/teamwork-vs-squad/results/telemetry.json:5-28,37-93`, `docs/plans/wsl-cli-verification.md:51-53`.
4. **Trigger:** Benchmark docs previously showed only the Agy `--launch` command without verbatim prompts, arm configuration details, timing boundaries, or rubric criteria.
5. **Expected / Actual:** Verbatim task prompt, arm configuration (`manifest.json` domain-specialist briefs vs. `/teamwork [skip-interview]`), sequential non-shared-context run order, timing boundaries (`activeWallClockSeconds`, `timeToFirstDelegationSeconds`), 6-defect rubric (`N1`–`N6`), and step-by-step live experiment instructions are published in `benchmarks/teamwork-vs-squad/README.md` and `results/telemetry.json`.
6. **Impact:** Auditable experimental protocol and rubric.
7. **Required Remediation:** Document prompts, configuration, timing boundaries, rubric, and live run steps.
8. **Acceptance Evidence:** Reverified by Specialist 1 (`fe0001dc-737e-4865-b7d3-f623431780a5`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F02`, `F08`, `F13`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F08` — Operational proxy metrics imply savings/quality
1. **Title / Priority / Status:** Operational proxy metrics imply savings/quality; **P1**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F08`, `01_FULL_REVIEW.md:F08`, `04_BENCHMARK_METHODOLOGY_PATCH.md`.
3. **Source:** `docs/benchmarks.md:31-38,43-50`, `benchmarks/teamwork-vs-squad/README.md:47-58`, `benchmarks/teamwork-vs-squad/results/telemetry.json:21-27,37-94`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs:96-114`.
4. **Trigger:** Operational telemetry counts lacked explicit unit definitions and 6-category adjudication details.
5. **Expected / Actual:** `docs/benchmarks.md` and `results/telemetry.json` define transcript steps/turns/tool calls, decimal `1,000 B` transcript KB, and UTF-8 parent wakeup bytes (distinguishing them from billed API token cost) and map each of `N1`–`N6` to `SYN-01..06` and `SEC-01`/`REL-01`/`CON-01`/`CON-02`/`BUG-01`/`REL-02` while explaining `18` vs. `25` total items.
6. **Impact:** Precise metric definitions and verified rubric mappings.
7. **Required Remediation:** Add unit definitions and 6-category adjudication rubric to `docs/benchmarks.md`, `telemetry.json`, and `verify-benchmark.mjs`.
8. **Acceptance Evidence:** Reverified by Specialist 1 (`fe0001dc-737e-4865-b7d3-f623431780a5`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F01`, `F07`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F09` — External sibling repo instructions in initial README
1. **Title / Priority / Status:** External sibling repo instructions in initial README; **P1**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F09`, `01_FULL_REVIEW.md:F09`, `03_PROPOSED_README_QUICKSTART.md`.
3. **Source:** `README.md:47-84`, `docs/getting-started.md:36-90`.
4. **Trigger:** `README.md` referenced `$HOME/Antigravity/workspace/antigravity-swarm-orchestration-suite`.
5. **Expected / Actual:** Zero external sibling-repo paths remain in `README.md` or `docs/getting-started.md`; all quickstart and smoke examples use self-contained in-repo paths (`benchmarks/teamwork-vs-squad/fixture` and `benchmarks/teamwork-vs-squad/manifest.json`).
6. **Impact:** Standalone checkout works out of the box.
7. **Required Remediation:** Remove external sibling-repo setup from `README.md`.
8. **Acceptance Evidence:** Reverified by Specialist 2 (`eac77238-3637-400d-a201-5d8ebadf44c2`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F05`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F10` — Support and companion compatibility unclear
1. **Title / Priority / Status:** Support and companion compatibility unclear; **P1**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F10`, `01_FULL_REVIEW.md:F10`, `05_INSTALL_UX_TEST_PLAN.md`, `06_COMPARISON_SCORECARD.md`.
3. **Source:** `docs/getting-started.md:5-16,102-120`, `README.md:26-31,94-100`.
4. **Trigger:** Host, surface, and companion version matrix and troubleshooting table were missing.
5. **Expected / Actual:** `docs/getting-started.md` and `README.md` include the 7-row compatibility matrix (POSIX Linux, macOS, and WSL2; `Node.js >= 22`; `Python >= 3.9`; Antigravity Desktop IDE or authenticated `agy` CLI; `Agy-Context-Saver >= 1.8.1`; pinned `RTK 0.51.0`; native permissions), the comparator scorecard (noting `/teamwork` and `/teamwork-preview`), and the 6-row troubleshooting matrix.
6. **Impact:** Clear surface/host compatibility and failure recovery.
7. **Required Remediation:** Add compatibility matrix, comparator table, and troubleshooting table to `docs/getting-started.md` and `README.md`.
8. **Acceptance Evidence:** Reverified by Specialist 2 (`eac77238-3637-400d-a201-5d8ebadf44c2`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F05`, `F14`, `F15`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F11` — Jargon blocks first-use comprehension
1. **Title / Priority / Status:** Jargon blocks first-use comprehension; **P2**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F11`, `01_FULL_REVIEW.md:F11`.
3. **Source:** `docs/concepts.md:1-68`, `zensical.toml:15`, `README.md:1-12`, `docs/index.md:1-19`.
4. **Trigger:** Internal terms and `L*` decision codes appeared without plain-language definitions.
5. **Expected / Actual:** `docs/concepts.md` defines the execution lifecycle, orchestration terms (`Parent session`, `Squad lead`, `Specialist`, `Stage`, `Manifest`, `Report slot`, `Pointer-Over-Wire receipt`, `Evidence bundle`), and governance terms (`Reactive Wakeup`, `RTK`, `Self-diagnosis`, `PR Review Standard v1.3.0`, and `L1-L41`).
6. **Impact:** Accessible terminology for new users.
7. **Required Remediation:** Add `docs/concepts.md`, link in `zensical.toml`, and define terms at first mention.
8. **Acceptance Evidence:** Reverified by Specialist 2 (`eac77238-3637-400d-a201-5d8ebadf44c2`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F05`, `F06`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F12` — Duplicated tables invite drift
1. **Title / Priority / Status:** Duplicated tables invite drift; **P2**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F12`, `01_FULL_REVIEW.md:F12`.
3. **Source:** `docs/benchmarks.md:9-22`, `README.md:102-108`, `docs/index.md:29-33`, `benchmarks/teamwork-vs-squad/README.md:5,16-20`, `docs/plans/wsl-cli-verification.md:49-53`.
4. **Trigger:** Full multi-row metric table was duplicated across 5 files.
5. **Expected / Actual:** `docs/benchmarks.md` holds the single canonical full comparison table, while `README.md`, `docs/index.md`, `benchmarks/teamwork-vs-squad/README.md`, and `docs/plans/wsl-cli-verification.md` use concise summaries linking to `docs/benchmarks.md`.
6. **Impact:** Eliminates table duplication drift.
7. **Required Remediation:** Keep the full comparison table canonical in `docs/benchmarks.md`.
8. **Acceptance Evidence:** Reverified by Specialist 1 (`fe0001dc-737e-4865-b7d3-f623431780a5`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F01`, `F06`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F13` — Public conversation IDs lack publication policy
1. **Title / Priority / Status:** Public conversation IDs lack publication policy; **P2**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F13`, `01_FULL_REVIEW.md:F13`.
3. **Source:** `benchmarks/teamwork-vs-squad/results/telemetry.json:29-32`, `benchmarks/teamwork-vs-squad/README.md:71`, `docs/benchmarks.md:97-99`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs:99`.
4. **Trigger:** Session UUIDs in `telemetry.json` lacked a documented provenance and redaction policy.
5. **Expected / Actual:** `telemetry.json` (`provenancePolicy`), `benchmarks/teamwork-vs-squad/README.md`, and `docs/benchmarks.md` document that `conversationId` UUIDs are local Antigravity conversation identifiers kept for `check_context_health` verification while host paths, usernames, credentials, and raw transcripts are excluded.
6. **Impact:** Clear telemetry provenance and privacy policy.
7. **Required Remediation:** Add `provenancePolicy` to `telemetry.json` (checked by `verify-benchmark.mjs`) and document in benchmark docs.
8. **Acceptance Evidence:** Reverified by Specialist 1 (`fe0001dc-737e-4865-b7d3-f623431780a5`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F07`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

4. **P3 Findings:** None.
5. **Verification & Verdict:** `No findings within reviewed scope` (all `DOC` findings `F01`, `F03`–`F13` closed and reverified).

### `SKILL` — Skills and Agent Instructions
1. **Scope:** `.agents/skills/self-diagnosis/SKILL.md`, `.agents/skills/pr-review/SKILL.md`, `docs/core-workflows.md`, `README.md`, and `docs/index.md`.
2. **Coverage:** Complete across skill files and user-facing workflow documentation.
3. **P0 / P1 / P2 Findings (10-Field Blocks):**

#### `F14` — Core self-diagnosis omitted from onboarding and positioning
1. **Title / Priority / Status:** Core self-diagnosis omitted from onboarding and positioning; **P1**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F14`, `01_FULL_REVIEW.md:F14`, `08_PROPOSED_CORE_WORKFLOWS.md:§2`, `09_SOURCES_CITATIONS_AND_RESEARCH_GUIDE.md:A08`.
3. **Source:** `docs/core-workflows.md:6,20-56,69-86`, `README.md:9,11,16,88-93`, `docs/index.md:3,8,16,18`, `.agents/skills/self-diagnosis/SKILL.md:14`, `zensical.toml:14`.
4. **Trigger:** `self-diagnosis` was not presented as a first-class workflow in top-level onboarding.
5. **Expected / Actual:** `docs/core-workflows.md`, `README.md`, `docs/index.md`, and `.agents/skills/self-diagnosis/SKILL.md` present `self-diagnosis` (zero-subagent profiler, `--print-dispatch` cohorts, `pr-review` coupling, durable `docs/reviews/` ledger gate, and `diagnose.mjs --teardown` + `manage_subagents`) as a core operator-supervised workflow.
6. **Impact:** First-class discoverability of `/self-diagnosis` and its teardown contract.
7. **Required Remediation:** Add `docs/core-workflows.md` and surface `self-diagnosis` in `README.md`, `docs/index.md`, `zensical.toml`, and `self-diagnosis/SKILL.md`.
8. **Acceptance Evidence:** Reverified by Specialist 2 (`eac77238-3637-400d-a201-5d8ebadf44c2`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F04`, `F15`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

#### `F15` — Core PR-review standard omitted from product identity
1. **Title / Priority / Status:** Core PR-review standard omitted from product identity; **P1**, **Closed**.
2. **Contract Provenance:** `07_PRIORITIZED_FINDINGS.csv:F15`, `01_FULL_REVIEW.md:F15`, `08_PROPOSED_CORE_WORKFLOWS.md:§3`, `09_SOURCES_CITATIONS_AND_RESEARCH_GUIDE.md:A09`.
3. **Source:** `docs/core-workflows.md:7,58-68`, `README.md:10,16,92`, `docs/index.md:3,8,17`, `.agents/skills/pr-review/SKILL.md:14`, `zensical.toml:14`.
4. **Trigger:** `pr-review` (`Standard v1.3.0`) was not surfaced in top-level product positioning.
5. **Expected / Actual:** `docs/core-workflows.md`, `README.md`, `docs/index.md`, and `.agents/skills/pr-review/SKILL.md` document `pr-review` (`Standard v1.3.0`, 10 categories, commit/session provenance, `1 ID = 1 Row` durable ledgers under `docs/reviews/`) as a core repository workflow standard (explicitly noting it is enforced by `diagnose.mjs` and `npm test`, not a GitHub branch-protection setting).
6. **Impact:** First-class visibility of the v1.3.0 review standard.
7. **Required Remediation:** Document `pr-review` across `docs/core-workflows.md`, `README.md`, `docs/index.md`, and `.agents/skills/pr-review/SKILL.md`.
8. **Acceptance Evidence:** Reverified by Specialist 2 (`eac77238-3637-400d-a201-5d8ebadf44c2`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F04`, `F14`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

4. **P3 Findings:** None.
5. **Verification & Verdict:** `No findings within reviewed scope` (`F14`, `F15` closed and reverified).

### `MCP` — MCP Schemas and Public API
1. **Scope:** `mcp/index.js` and `docs/tools.md` references in PR #2 docs.
2. **Coverage:** Complete.
3. **P0 / P1 / P2 / P3 Findings:** None in PR #2 scope.
4. **Verification & Verdict:** `No findings within reviewed scope`.

### `RUN` — Core Runtime, Parsing, and Validation
1. **Scope:** Documentation of Desktop IDE dispatch and CLI `agy-squad run` preview vs. `--launch`.
2. **Coverage:** Complete (`F05`, `F09`, `F10` under `DOC`).
3. **P0 / P1 / P2 / P3 Findings:** Cross-referenced under `DOC`.
4. **Verification & Verdict:** `No findings within reviewed scope`.

### `SVC` — Services, Orchestration, and Audit Semantics
1. **Scope:** Documentation of `mcp/handoffs.mjs` and `diagnose.mjs --teardown` lifecycle contracts.
2. **Coverage:** Complete (`F03`, `F04` under `DOC`).
3. **P0 / P1 / P2 / P3 Findings:** Cross-referenced under `DOC`.
4. **Verification & Verdict:** `No findings within reviewed scope`.

### `DB` — Database, Migrations, Replay, and Concurrency
1. **Scope:** Not applicable.
2. **Coverage:** Not applicable by v1.3.0 definition.
3. **P0 / P1 / P2 / P3 Findings:** None (Not applicable).
4. **Verification & Verdict:** `Not applicable`.

### `SCRIPT` — Scripts, Evaluation, and Developer Tooling
1. **Scope:** `benchmarks/teamwork-vs-squad/verify-benchmark.mjs` and its description in `benchmarks/teamwork-vs-squad/README.md` and `docs/benchmarks.md`.
2. **Coverage:** Complete.
3. **P0 / P1 / P2 Findings (10-Field Block):**

#### `F02` — Verifier misrepresented as full experiment reproduction
1. **Title / Priority / Status:** Verifier misrepresented as full experiment reproduction; **P0**, **Closed**.
2. **Contract Provenance:** PR Review Standard v1.3.0 `SCRIPT`; `07_PRIORITIZED_FINDINGS.csv:F02`, `01_FULL_REVIEW.md:F02`, `02_PR_READY_REVIEW_COMMENT.md:#1`, `04_BENCHMARK_METHODOLOGY_PATCH.md`.
3. **Source:** `benchmarks/teamwork-vs-squad/verify-benchmark.mjs:2-7,94-116`, `benchmarks/teamwork-vs-squad/README.md:73-100`, `docs/benchmarks.md:85-99`.
4. **Trigger:** Heading and output did not separate the offline consistency check from live experiment reproduction.
5. **Expected / Actual:** `verify-benchmark.mjs` header, assertions, and console output explicitly describe its 4 offline checks (fixture suites, in-process 6-defect reproduction, `all_l1`/`ab_audit` stage compilation, and `telemetry.json` arithmetic/rubric/provenance validation), and `benchmarks/teamwork-vs-squad/README.md` and `docs/benchmarks.md` separate offline checking from live experiment reproduction.
6. **Impact:** Exact scope of offline verification vs. live reproduction is explicit.
7. **Required Remediation:** Update `verify-benchmark.mjs` and split offline vs. live sections in benchmark docs.
8. **Acceptance Evidence:** Reverified by Specialist 1 (`fe0001dc-737e-4865-b7d3-f623431780a5`) and bundle `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`.
9. **Root Cause / Related IDs:** Related to `F01`, `F07`, `F08`.
10. **Closure:** Closed in Phase 1; reverified by flat specialist squad (`PASS`).

4. **P3 Findings:** None.
5. **Verification & Verdict:** `No findings within reviewed scope` (`F02` closed and reverified).

### `TEST` — Tests and CI
1. **Scope:** `npm test` execution of `verify-benchmark.mjs` and `diagnose.mjs`.
2. **Coverage:** Complete.
3. **P0 / P1 / P2 / P3 Findings:** Cross-referenced under `SCRIPT` (`F02`) and `DOC` (`F05`, `F08`).
4. **Verification & Verdict:** `No findings within reviewed scope`.

### `DEP` — Dependencies, Packaging, and Configuration
1. **Scope:** `zensical.toml` navigation and `package.json` (`private: true` local checkout execution model).
2. **Coverage:** Complete (`F05`, `F06` under `DOC`).
3. **P0 / P1 / P2 / P3 Findings:** Cross-referenced under `DOC`.
4. **Verification & Verdict:** `No findings within reviewed scope`.

---

## 5. Cross-Category Root Causes & Remediation Order

1. **Claim Calibration & Verification Scope (`F01`, `F02`, `F03`, `F08` — Remediated & Closed):** Reframed all benchmark summaries as a recorded November 8, 2026 sequential comparison on the six-defect fixture without overstating limitations, separated `verify-benchmark.mjs` offline consistency checks from live reproduction, split SHA-256 artifact integrity from parent/LLM semantic correctness verification, and defined operational proxy units + 6-category adjudication rubric.
2. **Lifecycle & Core Skills Positioning (`F04`, `F14`, `F15` — Remediated & Closed):** Forefronted the 3-scope evidence-retention and teardown contract (keeping `0 vs 41` Git-untracked files as secondary telemetry), and elevated `self-diagnosis` and `pr-review` (`Standard v1.3.0`) to first-class core workflows in `docs/core-workflows.md`, `README.md`, and `docs/index.md`.
3. **Standalone Onboarding, Desktop IDE + POSIX/WSL2 Support & Concept Clarity (`F05`, `F06`, `F09`, `F10`, `F11`, `F12` — Remediated & Closed):** Added `docs/getting-started.md` and `docs/concepts.md`, updated `zensical.toml`, removed external sibling-repo paths from `README.md`, documented support for both Antigravity Desktop (IDE) and Antigravity CLI (`agy`) across POSIX systems (Linux, macOS, and WSL2), and consolidated the full benchmark metric table into `docs/benchmarks.md`.
4. **Live Reproducibility & Telemetry Provenance Policy (`F07`, `F13` — Remediated & Closed):** Published verbatim prompts, configuration details, timing boundaries, 6-category rubric, and `provenancePolicy` in `benchmarks/teamwork-vs-squad/README.md`, `docs/benchmarks.md`, and `results/telemetry.json`.

---

## 6. Verification Record & Remaining Gaps

| Verification Layer | Command / Evidence | Status | What It Proves / Does Not Prove |
| --- | --- | --- | --- |
| Offline benchmark consistency check | `node benchmarks/teamwork-vs-squad/verify-benchmark.mjs` | `PASS` | Proves fixture tests, in-process 6-defect reproduction, manifest compilation, and stored JSON arithmetic/rubric/provenance fields |
| Full repository test suite | `npm test` | `PASS` | Proves MCP server, dispatch compiler, handoff bundler, launcher, `/self-diagnosis`, and benchmark verifier pass |
| Anti-slop copywriting audit | Regex/character scan across all 10 PR2 docs/benchmark files | `PASS` (`0` em/en dashes, `0` buzzwords) | Proves compliance with `/antislop-copywriting` |
| Flat specialist squad reverification | `fe0001dc-737e-4865-b7d3-f623431780a5` & `eac77238-3637-400d-a201-5d8ebadf44c2` (`a18d14825b1f...`) | `PASS` (`15/15 Closed`) | Independently reverified all 15 consolidated PR2 findings against this ledger |
| Self-diagnosis profiler & ledger validator | `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr2-documentation-review-ledger.md` | `PASS` (`HEALTHY`) | Proves v1.3.0 ledger structure, skill token budgets, and `--teardown` readiness |

---

## 7. Overall Disposition & Canonical Finding/Closure Ledger

**Final Verdict:** `APPROVE` (`0` open findings; all `15` consolidated findings `F01`–`F15` `Closed` and reverified by flat specialist squad; `0` open residuals).

| ID | Original Package Ref | Cat | Priority | Status | Source | Summary & Remediation Applied | Verification & Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `F01` | CSV `F01`; Full Review `F01`; Comment #1 | `DOC` | `P0` | **Closed** | `README.md:102-108`, `docs/index.md:29-33`, `docs/benchmarks.md:3-7`, `benchmarks/teamwork-vs-squad/README.md:3,16-18` | Labeled all benchmark numbers with the recorded November 8, 2026 sequential six-defect audit context without overstating limitations | Reverified by `fe0001dc-...`; bundle `a18d14825b1f...` |
| `F02` | CSV `F02`; Full Review `F02`; Comment #1; Patch `04` | `SCRIPT` | `P0` | **Closed** | `benchmarks/teamwork-vs-squad/verify-benchmark.mjs:2-7,94-116`, `benchmarks/teamwork-vs-squad/README.md:73-100`, `docs/benchmarks.md:85-99` | Separated 4-part offline fixture/manifest/ledger consistency check from live experiment reproduction protocol | Reverified by `fe0001dc-...`; bundle `a18d14825b1f...` |
| `F03` | CSV `F03`; Full Review `F03`; Comment #2; Patch `04` | `DOC` | `P0` | **Closed** | `docs/benchmarks.md:20-21,27`, `README.md:106`, `docs/index.md:31`, `benchmarks/teamwork-vs-squad/README.md:11-12,70` | Split `20 ms` SHA-256 artifact integrity verification from parent/lead and LLM semantic correctness review | Reverified by `fe0001dc-...`; bundle `a18d14825b1f...` |
| `F04` | CSV `F04`; Full Review `F04`; Comment #3; Workflows `08` §4 | `DOC` | `P1` | **Closed** | `docs/benchmarks.md:22,29,75-83`, `docs/core-workflows.md:69-86`, `.agents/skills/self-diagnosis/SKILL.md:14` | Forefronted 3-scope evidence-retention, ledger-gated teardown, and child-stop contract; labeled `0 vs 41` Git-untracked files as secondary | Reverified by `fe0001dc-...` & `eac77238-...`; bundle `a18d14825b1f...` |
| `F05` | CSV `F05`; Full Review `F05`; Quickstart `03`; Test Plan `05` | `DOC` | `P1` | **Closed** | `README.md:24-86`, `docs/getting-started.md:1-100` | Added standalone clone -> preflight -> Desktop IDE + 3 CLI modes (offline test, preview without `--launch`, live `--launch`) -> expected output -> cleanup | Reverified by `eac77238-...`; bundle `a18d14825b1f...` |
| `F06` | CSV `F06`; Full Review `F06`; Workflows `08` | `DOC` | `P1` | **Closed** | `README.md:1-93,102-108`, `docs/index.md:1-33`, `zensical.toml:11-21` | Frontloaded onboarding and core workflows; moved full benchmark table to `docs/benchmarks.md`; added `Getting Started`, `Core Workflows`, `Concepts` to nav | Reverified by `eac77238-...`; bundle `a18d14825b1f...` |
| `F07` | CSV `F07`; Full Review `F07`; Patch `04`; Sources `09` A06 | `DOC` | `P1` | **Closed** | `benchmarks/teamwork-vs-squad/README.md:47-72,88-100`, `benchmarks/teamwork-vs-squad/results/telemetry.json:5-28,37-93`, `docs/plans/wsl-cli-verification.md:51-53` | Published verbatim prompt, arm configurations, sequential run order, timing boundaries, 6-category rubric, and excluded host artifacts | Reverified by `fe0001dc-...`; bundle `a18d14825b1f...` |
| `F08` | CSV `F08`; Full Review `F08`; Patch `04`; Sources `09` A05 | `DOC` | `P1` | **Closed** | `docs/benchmarks.md:31-38,43-50`, `benchmarks/teamwork-vs-squad/results/telemetry.json:21-27,37-94`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs:96-114` | Defined operational proxy units vs. token cost and verified 6-category finding adjudication (`6/6` seeded categories vs. `18`/`25` total items) | Reverified by `fe0001dc-...`; bundle `a18d14825b1f...` |
| `F09` | CSV `F09`; Full Review `F09`; Quickstart `03` | `DOC` | `P1` | **Closed** | `README.md:47-84`, `docs/getting-started.md:36-90` | Removed external sibling-repo (`antigravity-swarm-orchestration-suite`) setup from `README.md`; all examples are self-contained | Reverified by `eac77238-...`; bundle `a18d14825b1f...` |
| `F10` | CSV `F10`; Full Review `F10`; Test Plan `05`; Scorecard `06` | `DOC` | `P1` | **Closed** | `docs/getting-started.md:5-16,102-120`, `README.md:26-31,94-100` | Added Desktop IDE + CLI on POSIX (Linux, macOS, WSL2) compatibility matrix, troubleshooting table, `/teamwork-preview` note, and comparator table | Reverified by `eac77238-...`; bundle `a18d14825b1f...` |
| `F11` | CSV `F11`; Full Review `F11` | `DOC` | `P2` | **Closed** | `docs/concepts.md:1-68`, `zensical.toml:15`, `README.md:1-12`, `docs/index.md:1-19` | Defined terms at first mention, created `docs/concepts.md`, and moved internal ledger codes (`L1-L41`) out of intro headlines | Reverified by `eac77238-...`; bundle `a18d14825b1f...` |
| `F12` | CSV `F12`; Full Review `F12` | `DOC` | `P2` | **Closed** | `docs/benchmarks.md:9-22`, `README.md:102-108`, `docs/index.md:29-33`, `benchmarks/teamwork-vs-squad/README.md:5,16-20`, `docs/plans/wsl-cli-verification.md:49-53` | Consolidated canonical full metric table into `docs/benchmarks.md` with concise linked summaries elsewhere | Reverified by `fe0001dc-...`; bundle `a18d14825b1f...` |
| `F13` | CSV `F13`; Full Review `F13` | `DOC` | `P2` | **Closed** | `benchmarks/teamwork-vs-squad/results/telemetry.json:29-32`, `benchmarks/teamwork-vs-squad/README.md:71`, `docs/benchmarks.md:97-99` | Documented public conversation UUID provenance and host/transcript redaction policy in `telemetry.json` and benchmark docs | Reverified by `fe0001dc-...`; bundle `a18d14825b1f...` |
| `F14` | CSV `F14`; Full Review `F14`; Workflows `08` §2; Sources `09` A08 | `SKILL` | `P1` | **Closed** | `docs/core-workflows.md:6,20-56,69-86`, `README.md:9,11,16,88-93`, `docs/index.md:3,8,16,18`, `.agents/skills/self-diagnosis/SKILL.md:14` | Presented `self-diagnosis` (zero-subagent profiler, cohorts, review coupling, ledger-gated teardown) as a core supervised workflow | Reverified by `eac77238-...`; bundle `a18d14825b1f...` |
| `F15` | CSV `F15`; Full Review `F15`; Workflows `08` §3; Sources `09` A09 | `SKILL` | `P1` | **Closed** | `docs/core-workflows.md:7,58-68`, `README.md:10,16,92`, `docs/index.md:3,8,17`, `.agents/skills/pr-review/SKILL.md:14` | Presented `pr-review` (`Standard v1.3.0`, 10 categories, durable `1 ID = 1 Row` ledgers) as a core repository workflow standard | Reverified by `eac77238-...`; bundle `a18d14825b1f...` |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

None (0 open residuals, 0 deferred items).

---

## 9. `/self-diagnosis` Cohort & Bundle Ledger

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| PR2-W1 | `944c64a0-e4c9-4272-a701-e3a32108a31b` | Flat specialist squad (`skill_and_pr_review_audit`) | `fe0001dc-737e-4865-b7d3-f623431780a5`, `eac77238-3637-400d-a201-5d8ebadf44c2` | Consolidated from `Agy_Squad_PR2_Documentation_Review` (`F01`–`F15`) | `a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549` (spec-1 `434cdf02bb7b...`, spec-2 `1f8a976713ed...`) | Completed via `diagnose.mjs --teardown skill_and_pr_review_audit --accept a18d14825b1f... --ledger docs/reviews/pr2-documentation-review-ledger.md` |

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `F01` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `docs/benchmarks.md:3-7`, `README.md:102-108` | Overgeneralized single-run speed claims | Attached recorded 2026-11-08 sequential 6-defect audit scope to every benchmark headline | Reverified by `fe0001dc-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F02` | PR2-W1 / `944c64a0-...` | `SCRIPT` | **Closed** | `benchmarks/teamwork-vs-squad/verify-benchmark.mjs:2-7,94-116` | Verifier misrepresented as full experiment reproduction | Labeled 4-part offline consistency check and separated live reproduction protocol | Reverified by `fe0001dc-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F03` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `docs/benchmarks.md:20-21,27` | SHA integrity conflated with semantic reviewer agents | Split `20 ms` SHA-256 artifact integrity row from parent/lead and LLM semantic review | Reverified by `fe0001dc-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F04` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `docs/core-workflows.md:69-86`, `docs/benchmarks.md:22,75-83` | Teardown policy obscured by Git-untracked file metric | Led with 3-scope teardown and evidence-retention contract; labeled `0 vs 41` untracked files secondary | Reverified by `fe0001dc-...` & `eac77238-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F05` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `docs/getting-started.md:1-100`, `README.md:24-86` | Missing clone to first-result journey | Added standalone clone -> preflight -> Desktop IDE + 3 CLI modes -> expected output -> cleanup | Reverified by `eac77238-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F06` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `README.md:1-93`, `docs/index.md:1-33`, `zensical.toml:11-21` | Benchmark dominates first impression/navigation | Frontloaded onboarding and core workflows; moved full table to `docs/benchmarks.md`; updated `zensical.toml` | Reverified by `eac77238-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F07` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `benchmarks/teamwork-vs-squad/README.md:47-72,88-100` | Experiment prompts and environment not reproducible | Published verbatim prompt, arm configurations, run order, timing boundaries, and 6-category rubric | Reverified by `fe0001dc-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F08` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `docs/benchmarks.md:31-50`, `benchmarks/teamwork-vs-squad/results/telemetry.json:21-94` | Operational proxy metrics imply savings/quality | Defined operational telemetry units vs. token cost and verified 6-category rubric in `verify-benchmark.mjs` | Reverified by `fe0001dc-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F09` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `README.md:47-84`, `docs/getting-started.md:36-90` | External sibling repo instructions in initial README | Removed external `antigravity-swarm-orchestration-suite` paths; all examples are self-contained | Reverified by `eac77238-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F10` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `docs/getting-started.md:5-16,102-120`, `README.md:26-31,94-100` | Support and companion compatibility unclear | Added Desktop IDE + CLI on POSIX (Linux, macOS, WSL2) compatibility matrix, troubleshooting, and comparator table | Reverified by `eac77238-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F11` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `docs/concepts.md:1-68`, `zensical.toml:15` | Jargon blocks first-use comprehension | Added `docs/concepts.md` glossary and lifecycle diagram and defined terms at first mention | Reverified by `eac77238-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F12` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `docs/benchmarks.md:9-22`, `README.md:102-108`, `docs/index.md:29-33` | Duplicated tables invite drift | Kept full comparison table canonical in `docs/benchmarks.md` with concise linked summaries elsewhere | Reverified by `fe0001dc-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F13` | PR2-W1 / `944c64a0-...` | `DOC` | **Closed** | `benchmarks/teamwork-vs-squad/results/telemetry.json:29-32`, `benchmarks/teamwork-vs-squad/README.md:71` | Public conversation IDs lack publication policy | Added `provenancePolicy` in `telemetry.json` and documented redaction policy in benchmark docs | Reverified by `fe0001dc-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F14` | PR2-W1 / `944c64a0-...` | `SKILL` | **Closed** | `docs/core-workflows.md:20-56`, `.agents/skills/self-diagnosis/SKILL.md:14` | Core self-diagnosis omitted from onboarding and positioning | Documented `self-diagnosis` profiler, cohorts, and ledger-gated teardown as a core supervised workflow | Reverified by `eac77238-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
| `F15` | PR2-W1 / `944c64a0-...` | `SKILL` | **Closed** | `docs/core-workflows.md:58-68`, `.agents/skills/pr-review/SKILL.md:14` | Core PR-review standard omitted from product identity | Documented `pr-review` (`Standard v1.3.0`, 10 categories, `1 ID = 1 Row`) as a core repository workflow standard | Reverified by `eac77238-...` (`a18d14825b1f98314963149bb6971d283e9123f1c2357209fc8cfeb0a23fc549`) |
