# PR #5 Review Ledger — Phase 2 `squad_planner` & PTY Launcher Retirement (`L17` / `L42` / `L43`)

## 1. Review Metadata, Session Provenance, and Evidence Limits

- **Repository:** `https://github.com/paragon-ux/Agy-Squad`
- **Pull Request:** PR #5 (`feat/phase2-swarm-planner` -> `main`)
- **Review Date:** `2026-11-13`
- **Reviewer:** `pr5-review-lead` (synthesizing `pr5-runtime-auditor`, `pr5-cli-docs-auditor`, and `pr5-live-tester`, subject to flat `integrity_auditor` verification)
- **Standard Version:** Agy-Squad PR Review Standard `v1.3.0` (`.agents/skills/pr-review/SKILL.md`, `.agents/skills/pr-review/references/pr-review-standard.md`, `.agents/skills/swarm-governance/SKILL.md`)
- **Pinned Base SHA:** `1fde6054af13b47680fcced40974fa5abb97d9d8` (`Merge pull request #4 from paragon-ux/feat/swarm-governance-pivot`)
- **Initial Audited Head SHA:** `657b037840d7f5ec81f276992dc9e2b8b01b6987` (`feat(phase2): retire PTY launcher and add squad_planner for native /swarm`)
- **Final Verified Head SHA:** `279e30d428c758f05c734d703984d88801de1fde` (`fix(phase2): remediate PR #5 P1/P2/P3 review findings`; full delta `1fde605..279e30d`)
- **Working-Tree State:** Clean on tracked files prior to this review ledger (`docs/reviews/pr5-phase2-swarm-planner-review.md`) and active cohort scratch reports (`scratch/agy-squad/squad-pr5_review/`).

### Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| Session 1 | `69506793-2b07-43f0-ae50-6e7aa009232d` | Coordinator `/swarm` session (`pr5_review`) | `2026-11-13` | `1fde6054af13b47680fcced40974fa5abb97d9d8..657b037840d7f5ec81f276992dc9e2b8b01b6987` (clean tracked tree at audit start; active review scratch in `scratch/agy-squad/squad-pr5_review/`) | `pr-review` (`v1.3.0`) + `swarm-governance` (`coordinator` -> `pr5-runtime-auditor`, `pr5-cli-docs-auditor`, `pr5-live-tester` -> `pr5-review-lead`) |
| Session 2 (Re-Verification) | `69506793-2b07-43f0-ae50-6e7aa009232d` | Coordinator `/swarm` session (`pr5_review`) | `2026-11-13` | `657b037840d7f5ec81f276992dc9e2b8b01b6987..279e30d428c758f05c734d703984d88801de1fde` (remediation `279e30d`; active review scratch in `scratch/agy-squad/squad-pr5_review/`) | `pr-review` (`v1.3.0`) + `swarm-governance` re-verification (`pr5-runtime-fixer`, `pr5-docs-tests-fixer` -> `pr5-runtime-auditor`, `pr5-cli-docs-auditor`, `pr5-live-tester` -> `pr5-review-lead`) |

### Evidence Available & Limits

- **Directly Inspected Sources:** Full PR #5 diff (`1fde605..279e30d`) and remediation delta (`657b037..279e30d`, `20` files changed: `+807 / -142`), including `mcp/planner.mjs`, `mcp/index.js`, `mcp/dispatch.mjs`, `mcp/briefs.mjs`, `mcp/handoffs.mjs`, `mcp/verdicts.mjs`, `bin/agy-squad.mjs`, deleted `bin/terminal.py` and `mcp/run-state.mjs`, `package.json`, `.github/workflows/ci.yml`, `tests/*`, `.agents/skills/*`, `docs/plans/LEDGER.md`, `docs/tools.md`, `docs/core-workflows.md`, `docs/concepts.md`, `docs/plans/wsl-cli-verification.md`, `docs/getting-started.md`, `docs/index.md`, `README.md`, and `zensical.toml`.
- **Directly Executed Checks (on `279e30d428c758f05c734d703984d88801de1fde`):** `npm test` (`8/8` scripts exit `0`, including `test-comparative-dossier.mjs` `20/20`), `node tests/verify-package.mjs --self-test` (exit `0`), `npm pack --dry-run --json | node tests/verify-package.mjs` (`43` files, exit `0`), `npm pack --dry-run --json | node tests/verify-package.mjs -` (`43` files, exit `0`), `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort --markdown` (`HEALTHY`, exit `0`), live stdio JSON-RPC `mcp/index.js` probes, and isolated `/tmp` CLI governance round-trip (`plan` -> `verdict` -> `fingerprint` -> `inspect` -> `bundle` -> `verify` -> `prune`).
- **Unavailable Inputs:** Remote GitHub Actions CI run logs for PR #5 and live `agy` PTY sessions (`L7`).

---

## 2. File-to-Category Inventory and Coverage Matrix

Every changed file in `1fde605..279e30d` maps to **one primary category** below, with secondary impacts cross-referenced rather than double-counted.

| File (`1fde605..279e30d`) | Change Type | Primary Category | Cross-References |
| --- | --- | :---: | --- |
| `mcp/dispatch.mjs` | Modified | `ARCH` | `SVC`, `RUN` |
| `README.md` | Modified | `DOC` | `SKILL` |
| `docs/concepts.md` | Modified (`279e30d`) | `DOC` | `ARCH` |
| `docs/core-workflows.md` | Modified (`279e30d`) | `DOC` | `SKILL`, `SCRIPT` |
| `docs/getting-started.md` | Modified | `DOC` | `SCRIPT` |
| `docs/index.md` | Modified | `DOC` | `ARCH` |
| `docs/plans/LEDGER.md` | Modified | `DOC` | `ARCH` |
| `docs/plans/wsl-cli-verification.md` | Modified (`279e30d`) | `DOC` | `SCRIPT` |
| `docs/tools.md` | Modified | `DOC` | `MCP` |
| `.agents/skills/pr-review/SKILL.md` | Modified | `SKILL` | `DOC` |
| `.agents/skills/pr-review/references/pr-review-standard.md` | Modified | `SKILL` | `DOC` |
| `.agents/skills/self-diagnosis/SKILL.md` | Modified | `SKILL` | `SCRIPT` |
| `.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md` | Modified | `SKILL` | `MCP` |
| `.agents/skills/self-diagnosis/resources/comparative-research-manifest.json` | Modified | `SKILL` | `ARCH` |
| `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | Modified | `SKILL` | `SVC` |
| `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Modified | `SKILL` | `SCRIPT`, `RUN` |
| `.agents/skills/swarm-governance/SKILL.md` | Modified | `SKILL` | `DOC`, `MCP` |
| `mcp/index.js` | Modified | `MCP` | `RUN` |
| `mcp/handoffs.mjs` | Modified | `RUN` | `SVC` |
| `mcp/planner.mjs` | Added + Remediated | `SVC` | `ARCH`, `MCP`, `RUN` |
| `mcp/briefs.mjs` | Modified | `SVC` | `RUN` |
| `mcp/run-state.mjs` | Deleted | `SVC` | `ARCH` |
| `bin/agy-squad.mjs` | Modified | `SCRIPT` | `MCP`, `RUN` |
| `bin/terminal.py` | Deleted | `SCRIPT` | `ARCH`, `DEP` |
| `tests/test-comparative-dossier.mjs` | Modified (`279e30d`) | `TEST` | `DOC` |
| `tests/test-dispatch.mjs` | Modified | `TEST` | `ARCH` |
| `tests/test-handoffs.mjs` | Modified | `TEST` | `RUN` |
| `tests/test-planner.mjs` | Added + Remediated | `TEST` | `MCP`, `RUN`, `SVC` |
| `tests/test-run.mjs` | Modified | `TEST` | `SCRIPT`, `SKILL` |
| `tests/test-server.mjs` | Modified | `TEST` | `MCP` |
| `tests/test-verdicts-and-pivot.mjs` | Modified | `TEST` | `RUN`, `SCRIPT` |
| `tests/verify-package.mjs` | Modified | `TEST` | `SCRIPT`, `DEP` |
| `.github/workflows/ci.yml` | Modified | `DEP` | `TEST` |
| `package.json` | Modified | `DEP` | `SCRIPT`, `TEST` |

### Category Coverage Matrix

| Category | Coverage | Open P1 | Open P2 | Open P3 | Closed | Category Outcome |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `ARCH` | Complete | 0 | 0 | 0 | 1 | No findings within reviewed scope |
| `DOC` | Complete | 0 | 0 | 0 | 5 | No findings within reviewed scope |
| `SKILL` | Complete | 0 | 0 | 0 | 5 | No findings within reviewed scope |
| `MCP` | Complete | 0 | 0 | 0 | 3 | No findings within reviewed scope |
| `RUN` | Complete | 0 | 0 | 0 | 2 | No findings within reviewed scope |
| `SVC` | Complete | 0 | 0 | 0 | 2 | No findings within reviewed scope |
| `DB` | Complete (N/A) | 0 | 0 | 0 | 0 | Not applicable |
| `SCRIPT` | Complete | 0 | 0 | 0 | 2 | No findings within reviewed scope |
| `TEST` | Complete | 0 | 0 | 0 | 5 | No findings within reviewed scope |
| `DEP` | Complete | 0 | 0 | 0 | 0 | No findings within reviewed scope |
| **Total** | **10 / 10 Complete** | **0** | **0** | **0** | **25** | **No findings within reviewed scope** |

---

## 3. Architecture-to-Implementation Trace

1. **Retirement of PTY Launcher (`L17` -> `L42`):**
   - *Design thesis -> Decision -> Contract -> Implementation -> Verification:* Retire `bin/terminal.py`, `mcp/run-state.mjs`, `AGY_SQUAD_RUN_DIR`, `AGY_SQUAD_SESSION`, `.mcp-ready`, and managed dispatch mode (`L17` retired in `docs/plans/LEDGER.md#L14`), retaining `agy-squad` as a pure planning and SHA-256 governance layer (`L42`). Verified clean across runtime, CLI, tests, active docs (`docs/core-workflows.md`, `docs/concepts.md`, `docs/plans/wsl-cli-verification.md`), and skills (`pr-review/SKILL.md`, `optimization-and-review-rubric.md`, `diagnose.mjs` `findSkillDriftMatches`).
2. **`squad_planner` Explicit Pinning, Scope Overlap, & `L6` Provenance (`L43`):**
   - *Design thesis -> Decision -> Contract -> Implementation -> Verification:* Expose `squad_planner` (`mcp/index.js#L30-L59`, `mcp/planner.mjs`, `bin/agy-squad.mjs#L19-L49`) supporting `manifestPath`/`manifest`/`task`, `executionMode` (`swarm` default vs. `subagent`), explicit `model` pinning (`swarm add`/`swarm status`), writable `scopeFiles` overlap detection (exempting `readOnly: true` and audit squads), `L6`-safe `provenanceScaffold`, and `bundleRecordTemplates`. Remediation `279e30d` resolved all planner/runtime gaps: `normalizeReportRoot` enforces `isValidRelativePrefix` inside `reportPath` and `planSquadCohort`, `allocateWorkerName` guarantees cohort-wide unique 32-char worker slugs, `resolveWorkerModels` propagates `spec.model` and emits `subagent` warnings, `workers[].lead` emits `swarmAdd` in `swarm` mode, inline-manifest lead briefs omit `"manifestPath":"inline-manifest"`, and `integrityAuditPlan` maps all `auditSpecs`.
3. **Carry-Over PR #4 & Wave 1 Hardening (`F-01`, `F-02`, `F-04`, `F-05`, `F-07(6)`, `S1-F3`, `S2-OPT2`, `SCRIPT-P3-04`):**
   - Verified closed and regression-tested on `279e30d`: `F-01`/`F-02` `reportRoot` validation and strict `reconcileHandoffs` root narrowing (`RUN-PR5-01`, `RUN-PR5-02`), `DISALLOWED_BUILTINS`, `adversarial_flat:<targetSquad>`, `superviseIntegrityCohort`, `S2-OPT2`, positive-int `AGY_MAX_STDIO_PAYLOAD_BYTES`, and `--allow-unaudited`.

---

## 4. Category Sections

### 4.1 `ARCH` — Architecture and Contracts

1. **Scope:** `mcp/dispatch.mjs` (changed), `mcp/planner.mjs` (cross-ref), `mcp/run-state.mjs` (deleted, cross-ref), `docs/plans/LEDGER.md` (cross-ref).
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ARCH-PR5-01` | Session 1 / Re-Verify | `ARCH` | `Closed` | [`mcp/planner.mjs#L463-L515`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/planner.mjs#L463-L515) | `integrityAuditPlan` read only `auditSpecs[0]`, silently dropping additional specialists in a custom multi-specialist `integrity_auditor` manifest. | Fixed in `279e30d`: `targetWorkingIds.flatMap(...)` compiles every entry in `auditSpecs` with unique `workerName`s (`specialist-1`, `specialist-2`). | Verified by `tests/test-planner.mjs` + specialist-1 probe (`integrityAuditPlan.length === 2`). |

6. **Verification:** Inspected `mcp/dispatch.mjs`, `mcp/planner.mjs#L463-L515`, and executed `npm test` (`8/8` pass on `279e30d`).
7. **Category Verdict:** `No findings within reviewed scope` (`ARCH-PR5-01` verified `Closed` on `279e30d`).

---

### 4.2 `DOC` — Documentation and Change Records

1. **Scope:** `README.md`, `docs/getting-started.md`, `docs/index.md`, `docs/plans/LEDGER.md`, `docs/tools.md`, `docs/core-workflows.md`, `docs/concepts.md`, `docs/plans/wsl-cli-verification.md`, `docs/stopping-agents.md`, `docs/benchmarks.md`, `zensical.toml`.
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**
   - **Title, priority, status:** `DOC-PR5-01` — `docs/core-workflows.md` three-scope teardown table documents retired `agy-squad run` session cleanup | `P2` | `Closed`
     - **Contract provenance:** [`docs/plans/LEDGER.md#L14,L21-L22`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/plans/LEDGER.md#L14), [`bin/agy-squad.mjs#L51-L120`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/bin/agy-squad.mjs#L51-L120).
     - **Source evidence:** [`docs/core-workflows.md#L92-L96`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/core-workflows.md#L92-L96).
     - **Trigger:** Operator reads the "Three-scope evidence retention and teardown contract" table in `docs/core-workflows.md`.
     - **Expected / actual:** Expected Scope 1 to reflect `agy-squad plan` / native `/swarm` governance and Scope 2 to cite `node bin/agy-squad.mjs`; actual `#L94` on `657b037` documented retired `.agents/plugins/agy-squad-*/`, `.agents/agents/agy-squad-*.md`, and `scratch/agy-squad/run-<uuid>/`.
     - **Impact:** Misled operators regarding removed Phase 1 files/directories.
     - **Required remediation:** Update `docs/core-workflows.md#L92-L96` to reflect `agy-squad plan` + native `/swarm` + `bin/agy-squad.mjs`.
     - **Acceptance evidence:** Direct diff inspection of `docs/core-workflows.md#L92-L96` on `279e30d`.
     - **Root cause / related IDs:** `docs/core-workflows.md` omitted from initial PR #5 doc sweep. Related: `DOC-PR5-02`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`; Scope 1/2 updated to `agy-squad plan` + `/swarm` + `bin/agy-squad.mjs`, verified by `diagnose.mjs` (`HEALTHY`, 0 drift findings).
   - **Title, priority, status:** `DOC-PR5-02` — `docs/core-workflows.md` references removed `managed and unmanaged` compilation and active `L17` | `P2` | `Closed`
     - **Contract provenance:** [`docs/plans/LEDGER.md#L14,L21-L22`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/plans/LEDGER.md#L14), [`.agents/skills/self-diagnosis/scripts/diagnose.mjs#L757-L858`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/.agents/skills/self-diagnosis/scripts/diagnose.mjs#L757-L858).
     - **Source evidence:** [`docs/core-workflows.md#L45,L82`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/core-workflows.md#L45).
     - **Trigger:** Reader inspects `self-diagnosis` profiler description or `pr-review` ledger trace list in `docs/core-workflows.md`.
     - **Expected / actual:** Expected `dispatch_squad` + `squad_planner` compilation and `L1-L7, L21, L29-L31, L40-L43`; actual `#L45,L82` on `657b037` cited `managed and unmanaged` and active `L17`.
     - **Impact:** Misled contributors about active ledger IDs and removed template telemetry.
     - **Required remediation:** Update `docs/core-workflows.md#L45,L82`.
     - **Acceptance evidence:** Direct diff inspection of `docs/core-workflows.md` on `279e30d`.
     - **Root cause / related IDs:** `docs/core-workflows.md` missed in initial PR #5 doc sweep. Related: `DOC-PR5-01`, `DOC-PR5-03`, `SKILL-PR5-01`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
   - **Title, priority, status:** `DOC-PR5-03` — `docs/concepts.md` lists `L17` (`CLI sandbox execution`) as active and omits `L42`/`L43` | `P2` | `Closed`
     - **Contract provenance:** [`docs/plans/LEDGER.md#L14,L21-L22`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/plans/LEDGER.md#L14), [`bin/agy-squad.mjs#L61-L63`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/bin/agy-squad.mjs#L61-L63).
     - **Source evidence:** [`docs/concepts.md#L18,L64-L68`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/concepts.md#L18).
     - **Trigger:** Operator consults `docs/concepts.md` for ledger code meanings or `agy-squad run` status.
     - **Expected / actual:** Expected `L1`–`L43` with `L17` retired and `agy-squad run` retired; actual `#L18,L64-L68` on `657b037` listed `L1`–`L41`, `L17` active, and `agy-squad run` deprecated.
     - **Impact:** Contradicted `docs/plans/LEDGER.md` and `docs/index.md`.
     - **Required remediation:** Update `docs/concepts.md#L18,L64-L68` to `L1`–`L43` with `L17` retired and `L42`/`L43` active.
     - **Acceptance evidence:** Direct diff inspection of `docs/concepts.md` on `279e30d`.
     - **Root cause / related IDs:** `docs/concepts.md` missed in initial PR #5 doc sweep. Related: `DOC-PR5-02`, `SKILL-PR5-01`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
   - **Title, priority, status:** `DOC-PR5-04` — `docs/plans/wsl-cli-verification.md` retains active `agy-squad run --launch` / `bin/terminal.py` / `.mcp-ready` instructions | `P2` | `Closed`
     - **Contract provenance:** [`docs/plans/LEDGER.md#L14`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/plans/LEDGER.md#L14), `zensical.toml#L19`.
     - **Source evidence:** [`docs/plans/wsl-cli-verification.md#L17-L18`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/plans/wsl-cli-verification.md#L17-L18).
     - **Trigger:** Operator follows Zensical-published "WSL CLI Verification" checklist before live dispatch.
     - **Expected / actual:** Expected active Phase 2 `plan` + `/swarm` workflow with retired `bin/terminal.py` marked historical; actual `#L17` on `657b037` gave active `agy-squad run --launch` / `bin/terminal.py` instructions.
     - **Impact:** Operators hit deleted files and retired commands.
     - **Required remediation:** Separate active Phase 2 workflow (`L42`, `L43`) from historical `L17` note.
     - **Acceptance evidence:** Direct diff inspection of `docs/plans/wsl-cli-verification.md#L17-L18` on `279e30d`.
     - **Root cause / related IDs:** Active-nav doc missed when `bin/terminal.py` was removed.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DOC-PR5-05` | Session 1 / Re-Verify | `DOC` | `Closed` | [`docs/tools.md#L16`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/tools.md#L16) | Documented `squad_planner` emitting `swarmAdds` (plural) instead of `swarmAdd` (singular). | Fixed in `279e30d`: updated `swarmAdds` -> `swarmAdd`. | Direct diff inspection + `git grep -n "swarmAdds"` (`0` matches outside `docs/reviews/` & `scratch/`). |

6. **Verification:** Direct diff inspection of `docs/core-workflows.md`, `docs/concepts.md`, `docs/plans/wsl-cli-verification.md`, `docs/tools.md` on `279e30d` + `diagnose.mjs --allow-active-cohort --markdown` (`HEALTHY`, `0` broken links).
7. **Category Verdict:** `No findings within reviewed scope` (`DOC-PR5-01`..`05` verified `Closed` on `279e30d`).

---

### 4.3 `SKILL` — Skills and Agent Instructions

1. **Scope:** `.agents/skills/pr-review/SKILL.md`, `.agents/skills/pr-review/references/pr-review-standard.md`, `.agents/skills/self-diagnosis/SKILL.md`, `.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md`, `.agents/skills/self-diagnosis/resources/comparative-research-manifest.json`, `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs`, `.agents/skills/swarm-governance/SKILL.md`, `.agents/skills/full-review/*`.
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**
   - **Title, priority, status:** `SKILL-PR5-01` — `.agents/skills/pr-review/SKILL.md` lists `L17` as active WSL architecture and omits `L42`/`L43` | `P2` | `Closed`
     - **Contract provenance:** [`docs/plans/LEDGER.md#L14,L21-L22`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/plans/LEDGER.md#L14), [`.agents/skills/self-diagnosis/SKILL.md#L89`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/.agents/skills/self-diagnosis/SKILL.md#L89).
     - **Source evidence:** [`.agents/skills/pr-review/SKILL.md#L44-L46`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/.agents/skills/pr-review/SKILL.md#L44-L46).
     - **Trigger:** Reviewer executes Step 2 ("Trace Architecture Before Runtime") of `pr-review/SKILL.md`.
     - **Expected / actual:** Expected `L1–L7, L21, L29–L31, L40–L43` active and `L17` retired; actual `#L45` on `657b037` listed `L17` active without `L42`/`L43`.
     - **Impact:** Reviewers traced against retired `L17`.
     - **Required remediation:** Update `.agents/skills/pr-review/SKILL.md#L45-L46`.
     - **Acceptance evidence:** Direct diff inspection of `.agents/skills/pr-review/SKILL.md#L45-L46` on `279e30d`.
     - **Root cause / related IDs:** Missed during initial PR #5 update of `pr-review/SKILL.md`. Related: `DOC-PR5-02`, `DOC-PR5-03`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
   - **Title, priority, status:** `SKILL-PR5-02` — `optimization-and-review-rubric.md` instructs calling `dispatch_squad` with retired `managed manifest` | `P2` | `Closed`
     - **Contract provenance:** [`mcp/index.js#L16-L28`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/index.js#L16-L28), [`tests/test-server.mjs#L62-L64`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/tests/test-server.mjs#L62-L64).
     - **Source evidence:** [`.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md#L52`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md#L52).
     - **Trigger:** Agent follows `Skill Tool/API Drift` remediation row in `optimization-and-review-rubric.md`.
     - **Expected / actual:** Expected `dispatch_squad (squadId, manifestPath)`, `squad_planner`, and `node bin/agy-squad.mjs`; actual `#L52` on `657b037` cited `managed manifest`.
     - **Impact:** Guided agents to pass invalid parameter to `dispatch_squad`.
     - **Required remediation:** Update line 52 to current Phase 2 tools.
     - **Acceptance evidence:** Direct diff inspection of `.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md#L52` on `279e30d`.
     - **Root cause / related IDs:** Partial PR #5 update of `optimization-and-review-rubric.md`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SKILL-PR5-03` | Session 1 / Re-Verify | `SKILL` | `Closed` | [`.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json#L92`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json#L92) | `token_and_execution_optimization.lead.objective` cited `L1-L41` instead of `L1-L43`. | Fixed in `279e30d`: updated to `L1-L43 guarantees`. | Direct diff inspection + `npm test`. |
| `SKILL-PR5-04` | Session 1 / Re-Verify | `SKILL` | `Closed` | [`.agents/skills/self-diagnosis/scripts/diagnose.mjs#L588-L615,L687-L708`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/.agents/skills/self-diagnosis/scripts/diagnose.mjs#L588-L615) | `auditSkills` drift detector scanned only `SKILL.md` for `subagent_brief`/`spawnPacingMs`, missing Phase 2 retired symbols and `references/*.md`. | Fixed in `279e30d`: `findSkillDriftMatches` scans `SKILL.md` + `references/*.md` for Phase 1 & 2 retired symbols with historical exemptions. | Verified by `diagnose.mjs --allow-active-cohort --markdown` (`HEALTHY`) + `tests/test-run.mjs#L148-L169`. |
| `SKILL-PR5-05` | Session 1 / Re-Verify | `SKILL` | `Closed` | [`.agents/skills/swarm-governance/SKILL.md#L17`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/.agents/skills/swarm-governance/SKILL.md#L17) | Documented `squad_planner` emitting `swarmAdds` (plural) instead of `swarmAdd` (singular). | Fixed in `279e30d`: updated `swarmAdds` -> `swarmAdd`. | Direct diff inspection + `git grep -n "swarmAdds"`. |

6. **Verification:** Executed `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort --markdown` (`HEALTHY`, `0` broken links, `0` drift findings) and `npm test` (`test-run.mjs` drift assertions pass) on `279e30d`.
7. **Category Verdict:** `No findings within reviewed scope` (`SKILL-PR5-01`..`05` verified `Closed` on `279e30d`).

---

### 4.4 `MCP` — MCP Schemas and Public API

1. **Scope:** `mcp/index.js`, `mcp/planner.mjs` (API surface & model provenance).
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**
   - **Title, priority, status:** `MCP-PR5-01` — `planSquadCohort` drops manifest specialist `spec.model` from `swarmAdd` / brief and suppresses `subagent` model warnings | `P2` | `Closed`
     - **Contract provenance:** [`docs/plans/LEDGER.md#L22`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/plans/LEDGER.md#L22), [`docs/tools.md#L16`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/tools.md#L16).
     - **Source evidence:** [`mcp/planner.mjs#L70-L105,L366-L383,L517-L520`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/planner.mjs#L70-L105).
     - **Trigger:** Call `planSquadCohort` without top-level `args.model` on a manifest specialist defining `model`.
     - **Expected / actual:** Expected `swarmAdd.model` and brief to reflect `spec.model` and `subagent` mode to warn when `spec.model` is coerced to `"inherit"`; actual on `657b037` dropped `spec.model` from `swarmAdd` and suppressed `modelProvenance.warning`.
     - **Impact:** Per-specialist model overrides were dropped in `swarm` mode and silently coerced in `subagent` mode.
     - **Required remediation:** Propagate `targetModel = requestedModel ?? explicitSpecModel` via `resolveWorkerModels` and populate `modelProvenance.warning` via `overriddenSubagentModels`.
     - **Acceptance evidence:** `tests/test-planner.mjs` + live MCP stdio probes on `279e30d`.
     - **Root cause / related IDs:** `planSquadCohort` gated pinning/warnings solely on top-level `requestedModel`. Related: `MCP-PR5-02`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`; `resolveWorkerModels` and `overriddenSubagentModels` verified by `npm test` and live MCP stdio probes.
   - **Title, priority, status:** `MCP-PR5-02` — `planSquadCohort` `workers[].lead` ignores top-level `args.model` and lacks `swarmAdd` in `swarm` mode | `P2` | `Closed`
     - **Contract provenance:** [`docs/plans/LEDGER.md#L22`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/plans/LEDGER.md#L22), [`mcp/planner.mjs#L340-L352,L417-L433`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/planner.mjs#L340-L352).
     - **Source evidence:** [`mcp/planner.mjs#L340-L352,L417-L433`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/planner.mjs#L340-L352).
     - **Trigger:** Call `planSquadCohort({ manifest, executionMode: "swarm", model: "gemini-3.8-flash-high" })` on a manifest with a squad `lead`.
     - **Expected / actual:** Expected `workers[].lead` in `swarm` mode to emit `swarmAdd` with `requestedModel ?? leadSpec.model` matching `provenanceScaffold`; actual on `657b037` emitted unpinned `Subagent.Model: "inherit"`.
     - **Impact:** Layered `/swarm` cohorts received unpinned leads contradicting `provenanceScaffold`.
     - **Required remediation:** Emit `workers[].lead.swarmAdd` in `swarm` mode using `resolveWorkerModels` and unique `workerName`.
     - **Acceptance evidence:** `tests/test-planner.mjs` + `PROBE_4` / specialist-1 & specialist-3 verification on `279e30d`.
     - **Root cause / related IDs:** `cleanedLead` lacked `resolveWorkerModels` and `swarmAdd` branch. Related: `MCP-PR5-01`, `SVC-PR5-02`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MCP-PR5-03` | Session 1 / Re-Verify | `MCP` | `Closed` | [`mcp/planner.mjs#L151-L153`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/planner.mjs#L151-L153) | `deriveTaskSquads` silently fell back to `["Task Worker"]` on non-array or empty `roles`. | Fixed in `279e30d`: rejects `roles !== undefined && (!Array.isArray(roles) \|\| roles.length === 0)`. | Verified by `tests/test-planner.mjs` + live MCP stdio negative `roles` probes. |

6. **Verification:** Executed `npm test` (`test-planner.mjs`, `test-server.mjs`) and inspected `mcp/planner.mjs#L70-L155,L340-L520` on `279e30d`.
7. **Category Verdict:** `No findings within reviewed scope` (`MCP-PR5-01`..`03` verified `Closed` on `279e30d`).

---

### 4.5 `RUN` — Core Runtime, Parsing, and Validation

1. **Scope:** `mcp/handoffs.mjs`, `mcp/verdicts.mjs`, `mcp/planner.mjs` (path validation).
2. **Coverage:** Complete.
3. **P1 — high priority:**
   - **Title, priority, status:** `RUN-PR5-01` (merges `MCP-PR5-LIVE-01`) — `planSquadCohort` and `reportPath` fail to validate `reportRoot`, allowing path traversal and malformed slots | `P1` | `Closed`
     - **Contract provenance:** [`docs/plans/LEDGER.md#L7`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/plans/LEDGER.md#L7), [`mcp/handoffs.mjs#L9-L17,L27-L50`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/handoffs.mjs#L27-L50).
     - **Source evidence:** [`mcp/handoffs.mjs#L27-L50`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/handoffs.mjs#L27-L50), [`mcp/planner.mjs#L235`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/planner.mjs#L235).
     - **Trigger:** Pass `../../etc`, `/tmp/evil`, `""`, `"   "`, `"foo\\bar"`, `"a/../b"`, or `"custom/out/"` as `reportRoot`.
     - **Expected / actual:** Expected rejection via `isValidRelativePrefix` and trailing-slash normalization; actual on `657b037` emitted raw out-of-workspace paths in briefs and `bundleRecordTemplates`.
     - **Impact:** Violated `L1`/`L2` workspace confinement.
     - **Required remediation:** Validate and trim trailing slashes in `normalizeReportRoot` inside `reportPath` and `planSquadCohort`.
     - **Acceptance evidence:** `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, and live MCP/CLI probes on `279e30d` reject all unsafe `reportRoot` inputs and normalize trailing slashes.
     - **Root cause / related IDs:** `reportPath` lacked `isValidRelativePrefix` validation. Related: `RUN-PR5-02`, `TEST-PR5-01`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
4. **P2 — medium priority:** None identified within reviewed scope.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RUN-PR5-02` | Session 1 / Re-Verify | `RUN` | `Closed` | [`mcp/handoffs.mjs#L75-L81`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/handoffs.mjs#L75-L81) | `reconcileHandoffs` / `inspectHandoffs` admitted `"scratch/agy-squad"` even when `record.reportRoot` set a different custom root. | Fixed in `279e30d`: narrows `allowedRoots` to `new Set([trimmed])` when `customReportRoot !== "scratch/agy-squad"`. | Verified by `tests/test-handoffs.mjs` + specialist-1 probe. |

6. **Verification:** Inspected `mcp/handoffs.mjs` diff and ran `npm test` (`test-handoffs.mjs`, `test-planner.mjs` pass on `279e30d`).
7. **Category Verdict:** `No findings within reviewed scope` (`RUN-PR5-01`..`02` verified `Closed` on `279e30d`).

---

### 4.6 `SVC` — Services, Orchestration, and Audit Semantics

1. **Scope:** `mcp/planner.mjs`, `mcp/briefs.mjs`, `mcp/run-state.mjs` (deleted).
2. **Coverage:** Complete.
3. **P1 — high priority:**
   - **Title, priority, status:** `SVC-PR5-01` (merges `RUN-PR5-LIVE-01` + `SVC-PR5-02`) — `planSquadCohort` produces colliding `workerName` / `swarmAdd.name` IDs on `self-diagnosis-manifest.json`, duplicate roles, and >32-char prefix roles | `P1` | `Closed`
     - **Contract provenance:** Native `/swarm` unique roster name contract and distinct `assignmentsTemplate` mapping ([`mcp/planner.mjs#L48-L68`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/planner.mjs#L48-L68)).
     - **Source evidence:** [`mcp/planner.mjs#L48-L68,L352,L378-L382,L495`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/planner.mjs#L48-L68).
     - **Trigger:** Plan `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json`, duplicate roles, or >32-char prefix roles.
     - **Expected / actual:** Expected globally unique 32-char `workerName`s; actual on `657b037` emitted duplicate `"token-and-execution-optimization"`.
     - **Impact:** Native `/swarm` worker name collision and ambiguous `bundleRecordTemplates`.
     - **Required remediation:** Track `usedWorkerNames` `Set` across cohort via `allocateWorkerName`.
     - **Acceptance evidence:** `tests/test-planner.mjs` + live MCP stdio (`12` unique `workerName`s on `self-diagnosis-manifest.json`, including `token-and-execution-optimizati-2` / `-3`) on `279e30d`.
     - **Root cause / related IDs:** `slugifyName` truncated without uniqueness tracking. Related: `TEST-PR5-01`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
4. **P2 — medium priority:**
   - **Title, priority, status:** `SVC-PR5-02` (`SVC-PR5-01`) — `planSquadCohort` embeds uncallable `manifestPath: "inline-manifest"` in lead prompts | `P2` | `Closed`
     - **Contract provenance:** `dispatch_squad` `manifestPath` workspace file contract ([`mcp/briefs.mjs#L107-L120`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/briefs.mjs#L107-L120)).
     - **Source evidence:** [`mcp/planner.mjs#L317-L320`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/planner.mjs#L317-L320), [`mcp/briefs.mjs#L107-L120`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/briefs.mjs#L107-L120).
     - **Trigger:** Call `planSquadCohort` with inline `manifest`.
     - **Expected / actual:** Expected lead brief not to instruct calling `dispatch_squad` with `"inline-manifest"`; actual on `657b037` emitted `call dispatch_squad with {"squadId":...,"manifestPath":"inline-manifest"}`.
     - **Impact:** Delegated inline-manifest leads failed with `ENOENT`.
     - **Required remediation:** Suppress `dispatch_squad` instruction when `manifestPath` is `"inline-manifest"` or `"inline-task"`.
     - **Acceptance evidence:** Direct diff inspection of `mcp/briefs.mjs#L107-L120` + `tests/test-planner.mjs` on `279e30d`.
     - **Root cause / related IDs:** Sentinel `"inline-manifest"` passed as file path into `buildSubagentSpec`. Related: `MCP-PR5-02`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:** Inspected `mcp/planner.mjs` & `mcp/briefs.mjs` diffs and executed `npm test` (`test-planner.mjs` pass on `279e30d`).
7. **Category Verdict:** `No findings within reviewed scope` (`SVC-PR5-01`..`02` verified `Closed` on `279e30d`).

---

### 4.7 `DB` — Database, Migrations, Replay, and Concurrency

1. **Scope:** Repository-wide check for SQL/database persistence.
2. **Coverage:** Complete (`Not applicable`).
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope.
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:** Confirmed zero database persistence exists in `Agy-Squad`; filesystem state covered under `RUN` and `SVC`.
7. **Category Verdict:** `Not applicable`.

---

### 4.8 `SCRIPT` — Scripts, Evaluation, and Developer Tooling

1. **Scope:** `bin/agy-squad.mjs`, `bin/terminal.py` (deleted), `tests/verify-package.mjs` (CLI pipe), `.agents/skills/self-diagnosis/scripts/diagnose.mjs`.
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SCRIPT-PR5-01` | Session 1 / Re-Verify | `SCRIPT` | `Closed` | [`bin/agy-squad.mjs#L87-L89`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/bin/agy-squad.mjs#L87-L89) | `agy-squad bundle <record.json>` threw raw `TypeError` when JSON parsed to `null`. | Fixed in `279e30d`: guards `!record \|\| typeof record !== "object" \|\| Array.isArray(record)` -> throws `"Provide a valid bundle record."`. | Direct diff inspection + CLI probe (`exit 1`, `"Provide a valid bundle record."`). |
| `SCRIPT-PR5-02` | Session 1 / Re-Verify | `SCRIPT` | `Closed` | [`tests/verify-package.mjs#L77-L91`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/tests/verify-package.mjs#L77-L91) | `npm pack --dry-run --json \| node tests/verify-package.mjs` exited `1` because stdin was unsupported. | Fixed in `279e30d`: supports `<file>`, `-`, and stdin pipe (`process.argv.length === 2` when non-TTY). | Executed pipe (`exit 0`, `43 files`) and `--self-test` (`exit 0`). |

6. **Verification:** Inspected `bin/agy-squad.mjs` diff, executed `npm pack --dry-run --json | node tests/verify-package.mjs` (`exit 0`, `43 files`) and `--self-test` (`exit 0`) on `279e30d`.
7. **Category Verdict:** `No findings within reviewed scope` (`SCRIPT-PR5-01`..`02` verified `Closed` on `279e30d`).

---

### 4.9 `TEST` — Tests and CI

1. **Scope:** `tests/test-planner.mjs`, `tests/test-run.mjs`, `tests/test-server.mjs`, `tests/test-dispatch.mjs`, `tests/test-handoffs.mjs`, `tests/test-verdicts-and-pivot.mjs`, `tests/verify-package.mjs`, `tests/test-comparative-dossier.mjs`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs`.
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**
   - **Title, priority, status:** `TEST-PR5-01` (merges `TEST-PR5-LIVE-01`) — `tests/test-planner.mjs` omits `swarm`+`lead`, `readOnly` exemption, key options, `workerName` uniqueness, and negative validation coverage | `P2` | `Closed`
     - **Contract provenance:** [`mcp/planner.mjs#L14-L520`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/mcp/planner.mjs#L14-L520), PR Review Standard `v1.3.0` Section 6.
     - **Source evidence:** [`tests/test-planner.mjs#L95-L320`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/tests/test-planner.mjs#L95-L320).
     - **Trigger:** `npm test` runs `node tests/test-planner.mjs`.
     - **Expected / actual:** Expected coverage of full `ALLOWED_PLANNER_KEYS` matrix, `self-diagnosis-manifest.json` uniqueness, invalid `reportRoot` rejection, `swarm`+`lead`, and negative validations; actual on `657b037` covered only smoke scenarios.
     - **Impact:** Planner regressions previously went undetected.
     - **Required remediation:** Expand `tests/test-planner.mjs`.
     - **Acceptance evidence:** `tests/test-planner.mjs` (`+225` lines) executed and passed in `npm test` on `279e30d`.
     - **Root cause / related IDs:** Initial smoke-only `test-planner.mjs`. Related: `SVC-PR5-01`, `RUN-PR5-01`, `MCP-PR5-01..03`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
   - **Title, priority, status:** `TEST-PR5-02` — `tests/test-run.mjs` lacks positive/negative tests for `diagnose.mjs --teardown` and positive tests for `--print-dispatch` | `P2` | `Closed`
     - **Contract provenance:** [`docs/plans/LEDGER.md#L20`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/docs/plans/LEDGER.md#L20) (`L41`), [`.agents/skills/self-diagnosis/scripts/diagnose.mjs#L118-L250`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/.agents/skills/self-diagnosis/scripts/diagnose.mjs#L118-L250).
     - **Source evidence:** [`tests/test-run.mjs#L115-L298`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c734d703984d88801de1fde/tests/test-run.mjs#L115-L298).
     - **Trigger:** `npm test` runs `node tests/test-run.mjs`.
     - **Expected / actual:** Expected isolated tests for positive `--print-dispatch` and positive/negative `--teardown` gating; actual on `657b037` tested only flag-error exits.
     - **Impact:** `--teardown` safety gates lacked regression coverage.
     - **Required remediation:** Add isolated `--print-dispatch` and `--teardown` tests in `tests/test-run.mjs`.
     - **Acceptance evidence:** `tests/test-run.mjs` (`+245/-` lines) executed and passed in `npm test` on `279e30d`.
     - **Root cause / related IDs:** Phase 2 rewrite of `test-run.mjs` omitted execution paths. Related: `TEST-PR5-03`.
     - **Closure:** Closed in `279e30d428c758f05c734d703984d88801de1fde`.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `TEST-PR5-03` | Session 1 / Re-Verify | `TEST` | `Closed` | [`tests/test-run.mjs#L13-L114`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/tests/test-run.mjs#L13-L114) | Created `scratch-test-${process.pid}` inside `repoRoot` instead of `os.tmpdir()`. | Fixed in `279e30d`: isolated all `diagnose.mjs` runs into `os.tmpdir()` via `copyIsolatedRepo`. | Executed `npm test` (`test-run.mjs` pass, clean `repoRoot`). |
| `TEST-PR5-04` | Session 1 / Re-Verify | `TEST` | `Closed` | [`package.json#L16`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/package.json#L16), [`tests/test-comparative-dossier.mjs#L10-L12,L524-L534`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/tests/test-comparative-dossier.mjs#L10-L12) | `test-comparative-dossier.mjs` was omitted from `npm test`/CI and checked `L1–L41` without `L42`/`L43`. | Fixed in `279e30d`: wired into `package.json` `scripts.test` and updated Tier 4 to check `L17` Retired + `L42`/`L43` Active. | Executed `npm test` (`20/20` dossier assertions pass). |
| `TEST-PR5-05` | Session 1 / Re-Verify | `TEST` | `Closed` | [`tests/test-server.mjs#L65-L76,L112-L120`](https://github.com/paragon-ux/Agy-Squad/blob/279e30d428c758f05c734d703984d88801de1fde/tests/test-server.mjs#L65-L76) | Omitted `"abc"`/`"0"` `AGY_MAX_STDIO_PAYLOAD_BYTES` fallback tests and valid live stdio `dispatch_squad` test. | Fixed in `279e30d`: added `"abc"`/`"0"` fallback checks and valid live `tools/call` `dispatch_squad` test. | Executed `npm test` (`test-server.mjs` pass). |

6. **Verification:** Executed `npm test` (`8/8` suites exit `0`), `node tests/verify-package.mjs --self-test` (exit `0`), and `npm pack --dry-run --json | node tests/verify-package.mjs` (`43` files, exit `0`) on `279e30d`.
7. **Category Verdict:** `No findings within reviewed scope` (`TEST-PR5-01`..`05` verified `Closed` on `279e30d`).

---

### 4.10 `DEP` — Dependencies, Packaging, and Configuration

1. **Scope:** `package.json`, `.github/workflows/ci.yml`, `.github/workflows/docs.yml`, `zensical.toml`, `.gitignore`, `tests/verify-package.mjs`.
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope.
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:** Verified `package.json` (`8/8` test scripts, zero external deps), `.github/workflows/ci.yml` (`npm test` + `verify-package.mjs`), and `npm pack --dry-run --json | node tests/verify-package.mjs` (`43` files, exit `0`) on `279e30d`.
7. **Category Verdict:** `No findings within reviewed scope`.

---

## 5. Cross-Category Root Causes and Rationale for Remediation Order

All four root-cause clusters from Session 1 (`657b037`) were resolved cleanly in `279e30d428c758f05c734d703984d88801de1fde`:
1. **Planner Input & Identity Boundaries (`SVC-PR5-01`, `RUN-PR5-01`, `RUN-PR5-02`, `MCP-PR5-03`):** Closed via `allocateWorkerName`, `normalizeReportRoot`, `reconcileHandoffs` root narrowing, and strict `roles` validation.
2. **Model Provenance & Inline-Manifest Lead Alignment (`MCP-PR5-01`, `MCP-PR5-02`, `SVC-PR5-02`, `ARCH-PR5-01`):** Closed via `resolveWorkerModels`, `workers[].lead.swarmAdd`, `hasManifestFile` brief gating, and `flatMap` over `auditSpecs`.
3. **Documentation & Skill Drift (`DOC-PR5-01`..`05`, `SKILL-PR5-01`..`05`):** Closed across active docs, skills, manifests, and `diagnose.mjs` `findSkillDriftMatches`.
4. **CLI & Regression Coverage (`SCRIPT-PR5-01`..`02`, `TEST-PR5-01`..`05`):** Closed via `bin/agy-squad.mjs` `null`-record guard, `verify-package.mjs` stdin support, and expanded `test-planner.mjs`/`test-run.mjs`/`test-server.mjs`/`test-comparative-dossier.mjs`.

---

## 6. Verification Record and Remaining Gaps

### Executed Checks (Final Verified Head `279e30d428c758f05c734d703984d88801de1fde`)

| Check | Outcome | Observed Result |
| --- | :---: | --- |
| `npm test` | Pass (`0`) | `8/8` suites passed (`test-verdicts-and-pivot`, `test-dispatch`, `test-planner`, `test-handoffs`, `test-run`, `test-server`, `test-comparative-dossier` `20/20`, `verify-benchmark`) |
| `node tests/verify-package.mjs --self-test` | Pass (`0`) | `Package verifier self-test passed (positive + 7 negatives)` |
| `npm pack --dry-run --json \| node tests/verify-package.mjs` | Pass (`0`) | `Package boundary verified (43 files)` |
| `npm pack --dry-run --json \| node tests/verify-package.mjs -` | Pass (`0`) | `Package boundary verified (43 files)` |
| `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort --markdown` | Pass (`0`) | `Status: HEALTHY` (`0` broken links across 4 skills; Specialist `1545 B`, Lead `2758 B`, `tools/list` `2071 B`, `0` findings) |
| Live stdio JSON-RPC (`node mcp/index.js`) & `/tmp` CLI round-trip (`specialist-3`) | Pass (`0`) | Confirmed `12` unique `workerName`s on `self-diagnosis-manifest.json`, `reportRoot` & `roles` rejections, `spec.model` pinning, `null`-bundle rejection, and full isolated round-trip (`0` regressions) |

### Remaining Verification Gaps

- Remote GitHub Actions CI run logs for PR #5 and live `agy` PTY sessions (`L7`) were not executed in this review.
- Flat `integrity_auditor` verification of cohort `pr5_review` is the remaining gate before final acceptance bundling.

---

## 7. Overall Disposition and Finding Closure Table

- **Overall Disposition:** **Approve** (`0` open `P1`/`P2`/`P3`; `25` closed in `279e30d428c758f05c734d703984d88801de1fde`).
- **Content Verdict:** `PASS`

### PR #5 Atomic Finding Ledger (`25` Findings — `1 ID = 1 Row`)

| ID | Category | Severity | Status | Source | Summary | Target Remediation |
| --- | --- | :---: | --- | --- | --- | --- |
| `ARCH-PR5-01` | `ARCH` | `P3` | `Closed` | `mcp/planner.mjs#L463-L515` | `integrityAuditPlan` read only `auditSpecs[0]`, dropping extra custom `integrity_auditor` specialists | Fixed in `279e30d`: `flatMap` compiles all `auditSpecs` with unique names |
| `DOC-PR5-01` | `DOC` | `P2` | `Closed` | `docs/core-workflows.md#L92-L96` | Three-scope teardown table documented retired `agy-squad run` session cleanup | Fixed in `279e30d`: updated Scope 1/2 to `agy-squad plan`, `/swarm`, `bin/agy-squad.mjs` |
| `DOC-PR5-02` | `DOC` | `P2` | `Closed` | `docs/core-workflows.md#L45,L82` | Referenced removed `managed and unmanaged` compilation and active `L17` | Fixed in `279e30d`: updated to `dispatch_squad`/`squad_planner` & `L1-L7, L21, L29-L31, L40-L43` |
| `DOC-PR5-03` | `DOC` | `P2` | `Closed` | `docs/concepts.md#L18,L64-L68` | Listed `L17` active, titled ledger `L1 through L41`, called `run` `deprecated` | Fixed in `279e30d`: updated to `L1`–`L43`, `L17` retired, `L42`/`L43` active, `run` retired |
| `DOC-PR5-04` | `DOC` | `P2` | `Closed` | `docs/plans/wsl-cli-verification.md#L17-L18` | Active-nav checklist retained active `agy-squad run --launch` / `bin/terminal.py` instructions | Fixed in `279e30d`: active Phase 2 (`L42`/`L43`) separated from historical `L17` note |
| `DOC-PR5-05` | `DOC` | `P3` | `Closed` | `docs/tools.md#L16` | Documented `squad_planner` emitting `swarmAdds` (plural) instead of `swarmAdd` | Fixed in `279e30d`: updated `swarmAdds` -> `swarmAdd` |
| `SKILL-PR5-01` | `SKILL` | `P2` | `Closed` | `.agents/skills/pr-review/SKILL.md#L44-L46` | Listed `L17` under Active WSL architecture and omitted `L42`/`L43` | Fixed in `279e30d`: moved `L17` to retired and added `L42`/`L43` to active |
| `SKILL-PR5-02` | `SKILL` | `P2` | `Closed` | `.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md#L52` | Instructed updating skills to call `dispatch_squad` with retired `managed manifest` | Fixed in `279e30d`: updated to `dispatch_squad`, `squad_planner`, `bin/agy-squad.mjs` |
| `SKILL-PR5-03` | `SKILL` | `P3` | `Closed` | `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json#L92` | `token_and_execution_optimization.lead.objective` cited `L1-L41` instead of `L1-L43` | Fixed in `279e30d`: updated to `L1-L43 guarantees` |
| `SKILL-PR5-04` | `SKILL` | `P3` | `Closed` | `.agents/skills/self-diagnosis/scripts/diagnose.mjs#L588-L615` | `auditSkills` drift regex missed Phase 2 retired symbols and skipped `references/*.md` | Fixed in `279e30d`: `findSkillDriftMatches` scans `SKILL.md` + `references/*.md` |
| `SKILL-PR5-05` | `SKILL` | `P3` | `Closed` | `.agents/skills/swarm-governance/SKILL.md#L17` | Stated `squad_planner` emits `swarmAdds` (plural) instead of `swarmAdd` | Fixed in `279e30d`: updated `swarmAdds` -> `swarmAdd` |
| `MCP-PR5-01` | `MCP` | `P2` | `Closed` | `mcp/planner.mjs#L70-L105,L366-L383,L517-L520` | Dropped manifest `spec.model` from `swarmAdd`/brief and suppressed `subagent` warnings | Fixed in `279e30d`: `resolveWorkerModels` + `overriddenSubagentModels` warning |
| `MCP-PR5-02` | `MCP` | `P2` | `Closed` | `mcp/planner.mjs#L340-L352,L417-L433` | `workers[].lead` ignored `args.model` and lacked `swarmAdd` in `swarm` mode | Fixed in `279e30d`: emits `workers[].lead.swarmAdd` matching `provenanceScaffold` |
| `MCP-PR5-03` | `MCP` | `P3` | `Closed` | `mcp/planner.mjs#L151-L153` | `deriveTaskSquads` silently fell back to `["Task Worker"]` on non-array/empty `roles` | Fixed in `279e30d`: throws on non-array or empty `roles` |
| `RUN-PR5-01` | `RUN` | `P1` | `Closed` | `mcp/handoffs.mjs#L27-L50`, `mcp/planner.mjs#L235` | `planSquadCohort` and `reportPath` did not validate `reportRoot` | Fixed in `279e30d`: `normalizeReportRoot` enforces `isValidRelativePrefix` |
| `RUN-PR5-02` | `RUN` | `P3` | `Closed` | `mcp/handoffs.mjs#L75-L81` | `reconcileHandoffs` admitted `"scratch/agy-squad"` when custom `reportRoot` was set | Fixed in `279e30d`: restricts `allowedRoots` to `[trimmed]` for custom roots |
| `SVC-PR5-01` | `SVC` | `P1` | `Closed` | `mcp/planner.mjs#L48-L68,L352,L378-L382,L495` | 32-char `slugifyName` truncation collided `workerName`/`swarmAdd.name` | Fixed in `279e30d`: `allocateWorkerName` enforces cohort-wide unique 32-char slugs |
| `SVC-PR5-02` | `SVC` | `P2` | `Closed` | `mcp/planner.mjs#L317-L320`, `mcp/briefs.mjs#L107-L120` | Inline `manifest` plans told leads to call `dispatch_squad` with `"inline-manifest"` | Fixed in `279e30d`: `hasManifestFile` suppresses `dispatch_squad` call on inline plans |
| `SCRIPT-PR5-01` | `SCRIPT` | `P3` | `Closed` | `bin/agy-squad.mjs#L87-L89` | `agy-squad bundle <record.json>` threw raw `TypeError` on `null` JSON | Fixed in `279e30d`: validates non-null plain object before reading fields |
| `SCRIPT-PR5-02` | `SCRIPT` | `P3` | `Closed` | `tests/verify-package.mjs#L77-L91` | `npm pack --dry-run --json \| node tests/verify-package.mjs` exited `1` | Fixed in `279e30d`: supports `<file>`, `-`, and non-TTY stdin pipe |
| `TEST-PR5-01` | `TEST` | `P2` | `Closed` | `tests/test-planner.mjs#L95-L320` | Omitted `swarm`+`lead`, `readOnly`, options matrix, `workerName` uniqueness, negative tests | Fixed in `279e30d`: full positive + negative coverage added in `test-planner.mjs` |
| `TEST-PR5-02` | `TEST` | `P2` | `Closed` | `tests/test-run.mjs#L115-L298` | Lacked positive/negative `--teardown` and positive `--print-dispatch` tests | Fixed in `279e30d`: isolated `--print-dispatch`, drift, and `--teardown` gating tests |
| `TEST-PR5-03` | `TEST` | `P3` | `Closed` | `tests/test-run.mjs#L13-L114` | Created `scratch-test-${process.pid}` inside `repoRoot` instead of `os.tmpdir()` | Fixed in `279e30d`: isolated into `os.tmpdir()` via `copyIsolatedRepo` |
| `TEST-PR5-04` | `TEST` | `P3` | `Closed` | `package.json#L16`, `tests/test-comparative-dossier.mjs#L10-L12,L524-L534` | `test-comparative-dossier.mjs` omitted from `npm test`/CI and checked `L1–L41` only | Fixed in `279e30d`: wired into `scripts.test` and updated to `L17` Retired + `L42`/`L43` Active |
| `TEST-PR5-05` | `TEST` | `P3` | `Closed` | `tests/test-server.mjs#L65-L76,L112-L120` | Omitted `"abc"`/`"0"` `AGY_MAX_STDIO_PAYLOAD_BYTES` and valid live `dispatch_squad` test | Fixed in `279e30d`: added `"abc"`/`"0"` checks and valid `dispatch_squad` stdio test |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

None (0 open residuals, 0 deferred items)

---

## 9. `/self-diagnosis` Cohort & Bundle Ledger

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| `pr5_review` (Pre-Fix & Re-Verify) | `63469708-ef4c-4f3e-9d29-545cee047070` | PR #5 Review, Live Testing, Remediation & Integrity Audit (`specialist-1..3` -> `pr5-review-lead` + `pr5-runtime-fixer` / `pr5-docs-tests-fixer` -> `pr5-integrity-auditor`) | `pr5-runtime-auditor`, `pr5-cli-docs-auditor`, `pr5-live-tester`, `pr5-review-lead`, `pr5-runtime-fixer`, `pr5-docs-tests-fixer`, `pr5-integrity-auditor` | N/A (`Content Verdict: FAIL`; 25 findings) | `a1fe9fdcf0ad49fccc3535b5944bd7445ee44975a5ac0f75bd89ef84e971ca8c` (`Content Verdict: PASS`, `Integrity Verdict: CLEAN`, audit SHA `aa5ea0d0401c5d37a3d117b307c30f3a3593d8658b4f379217078287f5a99bb8`) | Verified & pruned (`L41`) |

None (0 wave findings) — *(all 25 PR #5 findings resolved and verified closed on `279e30d428c758f05c734d703984d88801de1fde`; proof bundle verified offline with `node bin/agy-squad.mjs bundle` / `verify` and torn down via `prune`).*
