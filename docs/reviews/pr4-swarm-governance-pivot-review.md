# PR #4 Review Ledger — Option B-Lite Stabilization & Native `/swarm` Governance Pivot

## 1. Review Metadata, Session Provenance, and Evidence Limits

- **Repository:** `https://github.com/paragon-ux/Agy-Squad`
- **Pull Request:** `https://github.com/paragon-ux/Agy-Squad/pull/4` (`feat/swarm-governance-pivot` -> `feat/squad-alignment`)
- **Review Date:** `2026-11-13`
- **Reviewer:** `review-lead` (with `runtime-auditor` and `cli-docs-auditor` specialist audits, subject to flat `integrity-auditor` verification)
- **Standard Version:** Agy-Squad PR Review Standard `v1.3.0` (`.agents/skills/pr-review/SKILL.md`, `.agents/skills/swarm-governance/SKILL.md`)
- **Pinned Base SHA:** `d675580cdb2ffc8272a14325231673779ec9b2c3` (`feat/squad-alignment`)
- **Initial Audited Head SHA:** `8fce168be1ca1e5914ff1d5511f690406f0c96e9` (`feat(governance): implement Option B-Lite stabilization and native /swarm governance pivot`)
- **Re-Verified Head SHA (Pass 1):** `146938b81faf8dbdbac865549b64c4b36be315d3` (remediation commits `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`, `146938b81faf8dbdbac865549b64c4b36be315d3`)
- **Final Verified Head SHA (Pass 2):** `de82071d723ab34803828c9cdd29899639946975` (`fix(governance): close SKILL-PR4-02 verifiedFiles schema and RUN-PR4-06 negation casing`; full delta `d675580..de82071`)
- **Working-Tree State:** Clean on tracked files prior to Session 3 ledger closure; review scratch reports under `scratch/agy-squad/pr4-review/` and this review file under `docs/reviews/`.

### Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| Session 1 | `a17ebb12-8e95-4697-9094-c4f40e3c864e` | Coordinator `/swarm` session | `2026-11-13` | `d675580cdb2ffc8272a14325231673779ec9b2c3..8fce168be1ca1e5914ff1d5511f690406f0c96e9` (tracked tree clean; review scratch in `scratch/agy-squad/pr4-review/`) | `pr-review` (`v1.3.0`) + `swarm-governance` (native `/swarm`: `coordinator` -> `runtime-auditor`, `cli-docs-auditor` -> `review-lead` -> `integrity-auditor`) |
| Session 2 (Re-Verification) | `a17ebb12-8e95-4697-9094-c4f40e3c864e` | Coordinator `/swarm` session | `2026-11-13` | `8fce168be1ca1e5914ff1d5511f690406f0c96e9..146938b81faf8dbdbac865549b64c4b36be315d3` (remediation `3bffc5d` + `146938b`; review scratch in `scratch/agy-squad/pr4-review/`) | `pr-review` (`v1.3.0`) + `swarm-governance` re-verification (`coordinator` -> `runtime-auditor`, `cli-docs-auditor` -> `review-lead` -> `integrity-auditor`) |
| Session 3 (Final Re-Verification) | `a17ebb12-8e95-4697-9094-c4f40e3c864e` | Coordinator `/swarm` session | `2026-11-13` | `146938b81faf8dbdbac865549b64c4b36be315d3..de82071d723ab34803828c9cdd29899639946975` (final remediation `de82071`; review scratch in `scratch/agy-squad/pr4-review/`) | `pr-review` (`v1.3.0`) + `swarm-governance` final verification (`coordinator` -> `runtime-auditor`, `cli-docs-auditor` -> `review-lead` -> `integrity-auditor`) |

### Evidence Available & Limits

- **Directly Inspected Sources:** Full PR delta `d675580..de82071` and final remediation `146938b..de82071` (`3` files changed, `+7 / -3`), including `.agents/skills/swarm-governance/SKILL.md`, `.agents/skills/self-diagnosis/SKILL.md`, `bin/agy-squad.mjs`, `mcp/verdicts.mjs`, `mcp/handoffs.mjs`, `mcp/dispatch.mjs`, `mcp/briefs.mjs`, `mcp/index.js`, `tests/test-verdicts-and-pivot.mjs`, `tests/verify-package.mjs`, `docs/plans/LEDGER.md`, active docs (`README.md`, `docs/index.md`, `docs/getting-started.md`, `docs/concepts.md`, `docs/core-workflows.md`, `docs/tools.md`), and `docs/reviews/pr3-squad-alignment-full-review.md`.
- **Directly Executed Checks (on `de82071d723ab34803828c9cdd29899639946975`):** `npm test` (`6/6` suites exit `0`), `node tests/verify-package.mjs --self-test` (exit `0`), `npm pack --dry-run --json` -> `node tests/verify-package.mjs` (`43` files, exit `0`), `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort` (exit `0`, `HEALTHY`), `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr4-swarm-governance-pivot-review.md --allow-active-cohort` (exit `0`, `HEALTHY`), and end-to-end Node probes for `SKILL-PR4-02` (`<bundle-record.json>` schema) and `RUN-PR4-06` (case-insensitive negation prefixes).
- **Unavailable / Out-of-Scope Inputs:** External GitHub Actions CI run logs for PR #4 and live `agy` PTY execution (`L7` prohibits automated subagent launches in tests).

---

## 2. File-to-Category Inventory and Coverage Matrix

### Changed-File Inventory (`d675580..8fce168`) & Examined Unchanged Dependencies

| File | Diff (`+ / -`) | Primary Category | Cross-Referenced Categories | Coverage | Summary |
| --- | --- | --- | --- | --- | --- |
| `.agents/skills/swarm-governance/SKILL.md` | `+59 / -0` | `SKILL` | `ARCH`, `DOC` | Complete | New native `/swarm` governance, Pointer-Over-Wire, and CLI bundling skill |
| `bin/agy-squad.mjs` | `+49 / -9` | `SCRIPT` | `RUN`, `SVC` | Complete | Added `bundle`, `verify`, `prune`, `verdict` subcommands; marked `run` deprecated |
| `mcp/verdicts.mjs` | `+116 / -0` | `RUN` | `SVC` | Complete | New strict single-line content/integrity verdict and `Target Squad` parser |
| `mcp/handoffs.mjs` | `+116 / -66` | `SVC` | `ARCH`, `RUN` | Complete | Integrated `verdicts.mjs`, `integrityAudit` hash binding, `retainReports` |
| `mcp/dispatch.mjs` | `+28 / -6` | `MCP` | `ARCH`, `RUN` | Complete | Added `integrity_auditor` / `integrity_auditor:<target>` and `all_l1` exclusion |
| `mcp/briefs.mjs` | `+7 / -4` | `RUN` | `MCP`, `ARCH` | Complete | Added `isIntegrityAuditor` alignment line |
| `package.json` | `+1 / -1` | `DEP` | `SKILL` | Complete | Added `tests/test-verdicts-and-pivot.mjs` to `scripts.test` |
| `tests/test-verdicts-and-pivot.mjs` | `+131 / -0` | `TEST` | `RUN`, `SVC`, `SCRIPT`, `MCP` | Complete | Added unit/CLI smoke tests for verdicts, bundling, `integrity_auditor:alpha`, CLI |
| `tests/test-handoffs.mjs` | `+3 / -3` | `TEST` | `SVC` | Complete | Updated `pruneReports` error-message regex assertions |
| `mcp/index.js` *(unchanged)* | `0 / 0` | `MCP` | — | Complete | Inspected `dispatch_squad` schema (`squadId.description`) |
| `docs/plans/LEDGER.md` *(unchanged)* | `0 / 0` | `DOC` | `ARCH` | Complete | Audited `L1`–`L41` against `run` deprecation and `/swarm` pivot |
| `docs/tools.md`, `docs/core-workflows.md`, `docs/getting-started.md`, `docs/concepts.md`, `docs/index.md`, `README.md` *(unchanged)* | `0 / 0` | `DOC` | `SKILL` | Complete | Audited active docs for PR #4 CLI, `integrity_auditor`, and `run` deprecation |
| `docs/reviews/pr3-squad-alignment-full-review.md` *(unchanged)* | `0 / 0` | `DOC` | `SCRIPT` | Complete | Audited Section 9 schema failure reported by `diagnose.mjs` |
| `.agents/skills/self-diagnosis/SKILL.md` *(unchanged)* | `0 / 0` | `SKILL` | `ARCH` | Complete | Audited Step 0 Option 3 against `integrity_auditor` role separation |
| `tests/verify-package.mjs` *(unchanged)* | `0 / 0` | `TEST` | `DEP` | Complete | Audited `REQUIRED` file list for new PR #4 artifacts |

### Category Coverage Matrix (Final Verified `de82071`)

| Category | Scope Status | Open P1 | Open P2 | Open P3 | Verdict |
| --- | --- | :---: | :---: | :---: | --- |
| `ARCH` | Complete | 0 | 0 | 0 | No findings within reviewed scope |
| `DOC` | Complete | 0 | 0 | 0 | No findings within reviewed scope |
| `SKILL` | Complete | 0 | 0 | 0 | No findings within reviewed scope |
| `MCP` | Complete | 0 | 0 | 0 | No findings within reviewed scope |
| `RUN` | Complete | 0 | 0 | 0 | No findings within reviewed scope |
| `SVC` | Complete | 0 | 0 | 0 | No findings within reviewed scope |
| `DB` | Not applicable | 0 | 0 | 0 | Not applicable |
| `SCRIPT` | Complete | 0 | 0 | 0 | No findings within reviewed scope |
| `TEST` | Complete | 0 | 0 | 0 | No findings within reviewed scope |
| `DEP` | Complete | 0 | 0 | 0 | No findings within reviewed scope |
| **Total** | **10 / 10 covered** | **0** | **0** | **0** | **Approve (`30` closed, `0` open findings)** |

---

## 3. Architecture-to-Implementation Trace

1. **Design Thesis (Native `/swarm` Governance Pivot):** PR #4 pivots `Agy-Squad` from an imperative local process launcher (`agy-squad run` under `L17`) to a lightweight governance, role-separation, and offline SHA-256 verification layer paired with Antigravity native `/swarm`.
2. **Role Separation (`Working Lead` vs. `Integrity Auditor`):**
   - *Contract:* Working leads emit `Content Verdict: PASS | FAIL | BLOCKED` (`Verdict:` accepted for compatibility). Independent flat `integrity-auditor` peers emit `Target Squad: <id>` and `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` (never content `PASS`).
   - *Implementation & Gaps:* `mcp/verdicts.mjs` implements strict single-line parsing, `mcp/dispatch.mjs` adds `integrity_auditor[:<target>]`, and `mcp/briefs.mjs` adds `isIntegrityAuditor` alignment instructions. However, `parseContentVerdict` retains an unanchored prose scan (`RUN-PR4-01`) and case-sensitive negation (`RUN-PR4-02`), `parseTargetSquad` + `readIntegrityAudit` fail open on formatted/missing `Target Squad` (`SVC-PR4-01`), `verifyBundleInternal` trusts untrusted `audit.targetSquad` (`SVC-PR4-02`), `resolveIntegrityAuditor` collides on a single slot across targets (`ARCH-PR4-01`) and emits `targetIds[0]` on multi-squad untargeted dispatches (`ARCH-PR4-02`), and `mcp/dispatch.mjs` leaves empty/synthetic `flatTarget` holes (`MCP-PR4-01`, `MCP-PR4-02`).
3. **Offline Governance CLI & Cryptographic Bundling (`L1`/`L2` Containment):**
   - *Contract:* `agy-squad bundle|verify|prune|verdict` must enforce workspace-relative paths and symlink rejection (`readFile` via `O_NOFOLLOW` + parent `realpathSync` + `/proc/self/fd/${fd}`), bind `integrityAudit` SHA-256 digests programmatically, and preserve `synthesis` and `integrityAudit` on `prune`.
   - *Implementation & Gaps:* `mcp/handoffs.mjs` enforces symlink containment and deletion protection on `verify`/`prune`, while `bin/agy-squad.mjs` bypasses `readFile` with `fs.readFileSync(path.resolve(root, ...))` in `bundle` and `verdict` (`SCRIPT-PR4-01`). `bundleReports` defaults `requireIntegrityAudit` to `false` (`ARCH-PR4-03`) and exhibits legacy `adversarial_review` fallback/re-verification flaws (`SVC-PR4-03`, `SVC-PR4-04`, `SVC-PR4-05`).
4. **Skills, Documentation, & Ledger Consistency (`L17`, `L30`, `L31`):**
   - *Contract:* `.agents/skills/swarm-governance/SKILL.md`, active `docs/`, and `docs/plans/LEDGER.md` must match CLI paths, `<bundle-record.json>` schema, and active architecture decisions.
   - *Implementation & Gaps:* `swarm-governance/SKILL.md` references nonexistent `bundle.json` instead of `lead/report.sources.json` (`SKILL-PR4-01`), omits `<bundle-record.json>` schema / `@lead ` prefix stripping (`SKILL-PR4-02`), and relies on `npx agy-squad` on a `"private": true` package (`SKILL-PR4-04`). Active `docs/` and `LEDGER.md` (`L17`) remain un-updated (`DOC-PR4-01`, `DOC-PR4-02`), `self-diagnosis/SKILL.md` teaches pre-pivot `PASS` adversarial audits (`SKILL-PR4-03`), and `diagnose.mjs` fails on `pr3-squad-alignment-full-review.md` Section 9 (`DOC-PR4-03`).

---

## 4. Category Sections

### 4.1 `ARCH` — Architecture and Contracts

1. **Scope:** `mcp/dispatch.mjs` (changed), `mcp/handoffs.mjs` (changed), `docs/plans/LEDGER.md` (unchanged), `.agents/skills/swarm-governance/SKILL.md` (changed).
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**
   - **Title, priority, status:** `ARCH-PR4-01` — Per-target `integrity_auditor:<target>` dispatches collide on a single report slot (`P2`, `Closed`).
     - **Contract provenance:** `L4` / `Pointer-Over-Wire` isolated report-slot invariant (`mcp/handoffs.mjs` `reportPath`).
     - **Source evidence:** [`mcp/dispatch.mjs#L116-L139`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/dispatch.mjs#L116-L139) (`resolveIntegrityAuditor`).
     - **Trigger:** Dispatching `integrity_auditor:alpha` and `integrity_auditor:beta` in the same workspace/run.
     - **Expected / actual:** Expected disjoint report slots per audited target squad (and matching discovery in `bundleReports`); actual hardcodes `id: "integrity_auditor", number: 1`, compiling both to `scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md` (causing slot overwrite/collision).
     - **Impact:** Multi-squad reviews cannot run per-target flat integrity auditors concurrently without clobbering reports.
     - **Required remediation:** Assign target-scoped report slots (e.g., `integrity_auditor-<target>` or target-scoped directory/slot) and align `bundleReports` auto-discovery (`mcp/handoffs.mjs#L352-L359`).
     - **Acceptance evidence:** Dispatching `integrity_auditor:alpha` and `integrity_auditor:beta` yields distinct report paths and both bundle cleanly.
     - **Root cause / related IDs:** Single hardcoded `id: "integrity_auditor"` slot design; related to `ARCH-PR4-02`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
   - **Title, priority, status:** `ARCH-PR4-02` — Untargeted `integrity_auditor` emits `Target Squad: <targetIds[0]>` on multi-squad manifests (`P2`, `Closed`).
     - **Contract provenance:** Integrity target binding (`readIntegrityAudit` in `mcp/handoffs.mjs#L279-L282`).
     - **Source evidence:** [`mcp/dispatch.mjs#L123-L134`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/dispatch.mjs#L123-L134).
     - **Trigger:** Calling `handleDispatchSquad({ squadId: "integrity_auditor" })` on a manifest with working squads `alpha` and `beta`.
     - **Expected / actual:** Expected deliverable instructions consistent with multi-squad bundling (or requiring `<target>` when `>1` working squads exist); actual observed prompt prints `Target Squad: alpha'` (`targetIds[0]`), causing `bundleReports` for `beta` to reject the auto-discovered report (`Target Squad 'alpha' does not match 'beta'`).
     - **Impact:** Untargeted `integrity_auditor` silently breaks bundling for every working squad after the first.
     - **Required remediation:** Either require `integrity_auditor:<target>` when multiple working squads exist, support multi-target/wildcard semantics explicitly in `bundleReports`, or scope untargeted deliverables consistently.
     - **Acceptance evidence:** Multi-squad test verifying `integrity_auditor` and `bundleReports` across `alpha` and `beta`.
     - **Root cause / related IDs:** `targetIds[0]` shorthand in `resolveIntegrityAuditor`; related to `ARCH-PR4-01`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
   - **Title, priority, status:** `ARCH-PR4-03` — `bundleReports` defaults `requireIntegrityAudit` to `false`, allowing un-audited bundles (`P2`, `Closed`).
     - **Contract provenance:** `.agents/skills/swarm-governance/SKILL.md` §1/§3 pre-acceptance integrity gate vs. `mcp/handoffs.mjs#L361-L363`.
     - **Source evidence:** [`mcp/handoffs.mjs#L361-L363`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/handoffs.mjs#L361-L363) (`bundleReports`).
     - **Trigger:** Running `agy-squad bundle <record.json>` without `requireIntegrityAudit: true` when no integrity report exists on disk.
     - **Expected / actual:** Expected explicit enforcement (or documented opt-out) matching `swarm-governance` mandatory audit policy; actual silently omits `integrityAudit` and returns a valid bundle without any integrity verification.
     - **Impact:** Operators or CI callers omitting the undocumented `requireIntegrityAudit: true` flag bypass the governance layer completely.
     - **Required remediation:** Require `integrityAudit` by default in `agy-squad bundle` (with an explicit opt-out if legacy callers need it) or make `requireIntegrityAudit: true` explicit in CLI/skill contract and tests.
     - **Acceptance evidence:** `agy-squad bundle` rejects missing integrity audit by default (or documented opt-out tested).
     - **Root cause / related IDs:** Legacy backwards-compatibility default carried over from `requireAdversarialReview`; related to `SKILL-PR4-02`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:** Empirical Node probes on `146938b` confirmed `integrity_auditor:alpha` and `integrity_auditor:beta` compile to disjoint slots, untargeted `integrity_auditor` rejects multi-squad manifests, `agy-squad bundle` enforces `requireIntegrityAudit: true` by default, and `all_l1` excludes `integrity_auditor` and `adversarial_review`.
7. **Verdict:** `No findings within reviewed scope` (`ARCH-PR4-01`–`03` verified `Closed` on `146938b`).

---

### 4.2 `DOC` — Documentation and Change Records

1. **Scope:** `docs/plans/LEDGER.md`, `docs/tools.md`, `docs/core-workflows.md`, `docs/getting-started.md`, `docs/concepts.md`, `docs/index.md`, `README.md`, `docs/reviews/pr3-squad-alignment-full-review.md` (all unchanged in PR #4).
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**
   - **Title, priority, status:** `DOC-PR4-01` — Active documentation contradicts PR #4 governance CLI, `run` deprecation, and `integrity_auditor` (`P2`, `Closed`).
     - **Contract provenance:** `L30` published docs accuracy and PR #4 implementation (`bin/agy-squad.mjs`, `mcp/dispatch.mjs`, `mcp/handoffs.mjs`).
     - **Source evidence:** [`docs/tools.md#L5-L20,L53-L55`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/docs/tools.md#L5-L20), [`docs/core-workflows.md#L28-L38`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/docs/core-workflows.md#L28-L38), [`docs/getting-started.md#L55-L90`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/docs/getting-started.md#L55-L90), [`docs/concepts.md#L20-L49`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/docs/concepts.md#L20-L49), [`docs/index.md#L10-L25`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/docs/index.md#L10-L25), [`README.md#L51-L75`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/README.md#L51-L75).
     - **Trigger:** Consulting any active documentation page for CLI usage, `dispatch_squad` `squadId` options, or pre-acceptance audit gates.
     - **Expected / actual:** Expected docs to reflect `agy-squad bundle|verify|prune|verdict`, `run` deprecation in favor of native `/swarm`, `swarm-governance`, `integrity_auditor`, `Integrity Verdict: CLEAN | INTEGRITY VIOLATION`, and `Target Squad`; actual omits all PR #4 additions and teaches `agy-squad run` and `adversarial_l1`/`adversarial_flat` `Verdict: PASS`.
     - **Impact:** Every user-facing guide directly contradicts the PR #4 pivot thesis.
     - **Required remediation:** Update `README.md`, `docs/index.md`, `docs/getting-started.md`, `docs/concepts.md`, `docs/core-workflows.md`, and `docs/tools.md` to match PR #4 contracts.
     - **Acceptance evidence:** Updated active docs reviewed against `bin/agy-squad.mjs`, `mcp/dispatch.mjs`, and `mcp/handoffs.mjs` with `diagnose.mjs` broken-link check passing (`0` broken links).
     - **Root cause / related IDs:** PR #4 added `.agents/skills/swarm-governance/SKILL.md` without updating `docs/` or `README.md`; related to `DOC-PR4-02`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
   - **Title, priority, status:** `DOC-PR4-02` — `docs/plans/LEDGER.md` still lists deprecated `agy-squad run` (`L17`) as `Active` with no pivot entry (`P2`, `Closed`).
     - **Contract provenance:** `docs/plans/LEDGER.md` normative decision tracking vs. `bin/agy-squad.mjs#L23`.
     - **Source evidence:** [`docs/plans/LEDGER.md#L14`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/docs/plans/LEDGER.md#L14) (`L17`) vs. [`bin/agy-squad.mjs#L23`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/bin/agy-squad.mjs#L23).
     - **Trigger:** Auditing active ledger decisions against PR #4's deprecation of `agy-squad run`.
     - **Expected / actual:** Expected `L17` marked superseded/deprecated for execution and a new `Active` ledger ID recording the native `/swarm` + `swarm-governance` + `integrity_auditor` pivot; actual leaves `L17` `Active` with zero mention of the pivot.
     - **Impact:** Architecture decision ledger disagrees with the repository's primary workflow and CLI deprecation.
     - **Required remediation:** Update `docs/plans/LEDGER.md` to supersede/amend `L17` and record the native `/swarm` governance pivot ID.
     - **Acceptance evidence:** Inspected `docs/plans/LEDGER.md` diff showing updated `L17` status and new active pivot entry.
     - **Root cause / related IDs:** Omitted ledger update in PR #4; related to `DOC-PR4-01`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
   - **Title, priority, status:** `DOC-PR4-03` — `pr3-squad-alignment-full-review.md` empty Section 9 causes `diagnose.mjs` `DOC-LEDGER-SCHEMA` failure (`P2`, `Closed`).
     - **Contract provenance:** `.agents/skills/pr-review/SKILL.md#L76` and `.agents/skills/self-diagnosis/scripts/diagnose.mjs#L364-L405`.
     - **Source evidence:** [`docs/reviews/pr3-squad-alignment-full-review.md#L718-L720`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/docs/reviews/pr3-squad-alignment-full-review.md#L718-L720).
     - **Trigger:** Running `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort` on PR #4 head `8fce168`.
     - **Expected / actual:** Expected `diagnose.mjs` to pass schema validation (`exit 0` modulo active cohorts); actual exits `1` (`status: "CHANGES_REQUIRED"`) with `DOC-LEDGER-SCHEMA` because Section 9 is present without Cohort Provenance or Wave Finding Ledger tables.
     - **Impact:** Automated repository health check fails out of the box on PR #4.
     - **Required remediation:** Remove the unused Section 9 heading from `pr3-squad-alignment-full-review.md` (or populate valid Section 9 tables) and target the PR #4 review ledger.
     - **Acceptance evidence:** `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr4-swarm-governance-pivot-review.md` reports `0` `DOC-LEDGER-SCHEMA` errors.
     - **Root cause / related IDs:** `diagnose.mjs` resolves the latest review file under `docs/reviews/` and rejects an empty Section 9 heading.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:** Inspected `README.md`, `docs/index.md`, `docs/getting-started.md`, `docs/concepts.md`, `docs/core-workflows.md`, `docs/tools.md`, `docs/plans/LEDGER.md` (`L17` deprecated in favor of active `L42`), and `docs/reviews/pr3-squad-alignment-full-review.md` on `146938b`; `node .agents/skills/self-diagnosis/scripts/diagnose.mjs` exited `0` (`"status": "HEALTHY"`).
7. **Verdict:** `No findings within reviewed scope` (`DOC-PR4-01`–`03` verified `Closed` on `146938b`).

---

### 4.3 `SKILL` — Skills and Agent Instructions

1. **Scope:** `.agents/skills/swarm-governance/SKILL.md` (changed), `.agents/skills/self-diagnosis/SKILL.md` (unchanged), `.agents/skills/pr-review/SKILL.md` (unchanged), `package.json` (unchanged `"private": true`).
2. **Coverage:** Complete.
3. **P1 — high priority:**
   - **Title, priority, status:** `SKILL-PR4-01` — `swarm-governance/SKILL.md` instructs `verify` and `prune` with nonexistent `bundle.json` path (`P1`, `Closed`).
     - **Contract provenance:** `bundlePath` (`mcp/handoffs.mjs#L209-L211`) and `verifyBundleInternal` (`mcp/handoffs.mjs#L453-L456`).
     - **Source evidence:** [`.agents/skills/swarm-governance/SKILL.md#L53,L56`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/.agents/skills/swarm-governance/SKILL.md#L53).
     - **Trigger:** Running `npx agy-squad verify scratch/agy-squad/squad-<id>/bundle.json` or `prune .../bundle.json ...` as documented in §3.
     - **Expected / actual:** Expected `scratch/agy-squad/squad-<id>/lead/report.sources.json` (empirically returned by `bundleReports` as `b.path`); actual `bundle.json` neither exists after `bundle` nor passes `verifyBundleInternal` (`relative !== bundlePath(squadId, rootPrefix)`).
     - **Impact:** Every operator or CI script following the new governance skill fails deterministically at `verify` and `prune`.
     - **Required remediation:** Replace `scratch/agy-squad/squad-<id>/bundle.json` with `scratch/agy-squad/squad-<id>/lead/report.sources.json` in `.agents/skills/swarm-governance/SKILL.md#L53,L56` (and clarify `<report.sources.json>` in `bin/agy-squad.mjs#L19-L20`).
     - **Acceptance evidence:** End-to-end CLI run using the exact documented path exits `0` for `bundle`, `verify`, and `prune`.
     - **Root cause / related IDs:** Author assumed `bundle.json` filename instead of `report.sources.json`; related to `SKILL-PR4-02`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
4. **P2 — medium priority:**
   - **Title, priority, status:** `SKILL-PR4-02` — `swarm-governance/SKILL.md` `<bundle-record.json>` schema documents object `verifiedFiles` rejected by `bundleReports` (`P2`, `Closed`).
     - **Contract provenance:** `fingerprint` / `verifyFiles` (`mcp/handoffs.mjs#L174-L189`) and `reconcileHandoffs` (`mcp/handoffs.mjs#L107-L120`).
     - **Source evidence:** [`.agents/skills/swarm-governance/SKILL.md#L70`](https://github.com/paragon-ux/Agy-Squad/blob/de82071d723ab34803828c9cdd29899639946975/.agents/skills/swarm-governance/SKILL.md#L70) vs. [`mcp/handoffs.mjs#L174-L189`](https://github.com/paragon-ux/Agy-Squad/blob/de82071d723ab34803828c9cdd29899639946975/mcp/handoffs.mjs#L174-L189).
     - **Trigger:** Constructing `<bundle-record.json>` using the example schema in `.agents/skills/swarm-governance/SKILL.md#L64-L74` and running `node bin/agy-squad.mjs bundle <bundle-record.json>`.
     - **Expected / actual:** Expected `"verifiedFiles": { "<file>": "<64-hex>" }` matching `node bin/agy-squad.mjs fingerprint` output and `verifyFiles` (`hash !== verifiedFiles[file]`); `3bffc5d` introduced `{ sha256, bytes }` at line `70`, which was fixed to flat `"verifiedFiles": { "<file>": "<64-hex>" }` in `de82071`.
     - **Impact:** Operators or CI scripts following the `<bundle-record.json>` example schema previously failed `agy-squad bundle`.
     - **Required remediation:** Update `.agents/skills/swarm-governance/SKILL.md#L70` to `"verifiedFiles": { "<file>": "<64-hex>" }`.
     - **Acceptance evidence:** Verified end-to-end on `de82071` with `bundleReports`/`verifyBundle` and `cli-docs-auditor` isolated CLI E2E run (`bundle`, `verify`, `prune --keep-reports` exited `0`).
     - **Root cause / related IDs:** Schema example drafted with `{ sha256, bytes }` object instead of flat `fingerprint()` map; related to `SKILL-PR4-01`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1` and `de82071d723ab34803828c9cdd29899639946975`; verified on `de82071`.
   - **Title, priority, status:** `SKILL-PR4-03` — `self-diagnosis/SKILL.md` still instructs pre-pivot `PASS` adversarial review gate (`P2`, `Closed`).
     - **Contract provenance:** PR #4 role separation (`swarm-governance/SKILL.md` §1, `mcp/verdicts.mjs`).
     - **Source evidence:** [`.agents/skills/self-diagnosis/SKILL.md#L31-L32`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/.agents/skills/self-diagnosis/SKILL.md#L31-L32).
     - **Trigger:** Running `/self-diagnosis` intake Step 0 Option 3.
     - **Expected / actual:** Expected instruction to dispatch `integrity_auditor` enforcing `Integrity Verdict: CLEAN` (and `Target Squad: <id>`); actual still specifies `"Mandatory Adversarial Review Squad Enabled: Stage independent adversarial audit squad after working squads complete, enforcing PASS verdict before acceptance"`.
     - **Impact:** `/self-diagnosis` sessions continue reintroducing the conflated content-`PASS` pattern PR #4 removes.
     - **Required remediation:** Update `.agents/skills/self-diagnosis/SKILL.md#L31-L32` to reference `integrity_auditor` / `Integrity Verdict: CLEAN` and `.agents/skills/swarm-governance/SKILL.md`.
     - **Acceptance evidence:** Updated `self-diagnosis/SKILL.md` passes `diagnose.mjs` without broken links or stale `PASS` audit instructions.
     - **Root cause / related IDs:** Un-updated sibling skill during governance pivot.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
   - **Title, priority, status:** `SKILL-PR4-04` — `swarm-governance/SKILL.md` instructs `npx agy-squad` on a `"private": true` package (`P2`, `Closed`).
     - **Contract provenance:** `L29` private distribution (`package.json#L4`) vs. `.agents/skills/swarm-governance/SKILL.md#L47-L56`.
     - **Source evidence:** [`.agents/skills/swarm-governance/SKILL.md#L47-L56`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/.agents/skills/swarm-governance/SKILL.md#L47-L56) and [`package.json#L4`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/package.json#L4).
     - **Trigger:** Running `npx agy-squad ...` in any external target workspace where `Agy-Squad` is used as a governance plugin/tool.
     - **Expected / actual:** Expected a working invocation path (`node <path-to-Agy-Squad>/bin/agy-squad.mjs` or `npm link` + `npx --no-install agy-squad`); actual `npx agy-squad` fails outside the `Agy-Squad` checkout because `package.json` is `"private": true` and unpublished on npm.
     - **Impact:** External `/swarm` workspaces following `swarm-governance` fail to invoke the CLI.
     - **Required remediation:** Document `node <agy-squad-repo>/bin/agy-squad.mjs ...` (or local `npm link` + `npx --no-install agy-squad`) in `swarm-governance/SKILL.md`.
     - **Acceptance evidence:** Documented CLI command succeeds from both repo root and an external workspace.
     - **Root cause / related IDs:** `L29` private package status overlooked in skill examples.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:** Inspected `swarm-governance/SKILL.md`, `self-diagnosis/SKILL.md`, `pr-review/SKILL.md`, and `package.json` on `de82071`; empirically verified `SKILL-PR4-01`–`04` closed including end-to-end bundling with `.agents/skills/swarm-governance/SKILL.md#L64-L74` verbatim (`40e8a9eb...`).
7. **Verdict:** `No findings within reviewed scope` (`SKILL-PR4-01`–`04` verified `Closed` on `de82071`).

---

### 4.4 `MCP` — MCP Schemas and Public API

1. **Scope:** `mcp/dispatch.mjs` (changed), `mcp/index.js` (unchanged).
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**
   - **Title, priority, status:** `MCP-PR4-01` — `handleDispatchSquad` accepts empty target `"integrity_auditor:"` / `"adversarial_flat:"` (`P2`, `Closed`).
     - **Contract provenance:** `dispatch_squad` input validation (`mcp/dispatch.mjs#L230-L242`).
     - **Source evidence:** [`mcp/dispatch.mjs#L233-L235`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/dispatch.mjs#L233-L235).
     - **Trigger:** Calling `dispatch_squad` with `squadId: "integrity_auditor:"` (trailing colon, empty target).
     - **Expected / actual:** Expected validation error (`isError: true`); actual observed `flatTarget` becomes `""` (falsy), bypassing line `240` (`if (flatTarget && ...)`) and silently compiling an untargeted auditor (`isError: false`).
     - **Impact:** Typo or malformed targeted dispatch silently widens scope instead of failing fast.
     - **Required remediation:** Reject empty `flatTarget` whenever `squadId.includes(":")` (`if ((isAdvFlat || isIntegrityAuditor) && squadId.includes(":") && !flatTarget) throw ...`).
     - **Acceptance evidence:** Unit test asserting `handleDispatchSquad({ squadId: "integrity_auditor:" })` returns `isError: true`.
     - **Root cause / related IDs:** Falsy check on `flatTarget` string; related to `MCP-PR4-02`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
   - **Title, priority, status:** `MCP-PR4-02` — `defaultAdversarialSquad` synthesized before `flatTarget` validation (`P2`, `Closed`).
     - **Contract provenance:** `dispatch_squad` target-squad validation (`mcp/dispatch.mjs#L237-L242`).
     - **Source evidence:** [`mcp/dispatch.mjs#L237-L242`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/dispatch.mjs#L237-L242).
     - **Trigger:** Calling `dispatch_squad` with `squadId: "integrity_auditor:adversarial_review"` on a manifest containing only working squads (`alpha`, `beta`).
     - **Expected / actual:** Expected `Unknown targetSquad 'adversarial_review'` error; actual observed line `238` injects `squads.adversarial_review` before line `240` checks `Object.hasOwn(squads, flatTarget)`, returning `isError: false`.
     - **Impact:** Targeting a non-existent `adversarial_review` squad silently succeeds.
     - **Required remediation:** Validate `flatTarget` against working squads (`!["adversarial_review", "integrity_auditor"].includes(flatTarget) && Object.hasOwn(squads, flatTarget)`) before synthesizing `defaultAdversarialSquad`.
     - **Acceptance evidence:** Unit test asserting `integrity_auditor:adversarial_review` fails when `adversarial_review` is not a working squad.
     - **Root cause / related IDs:** Ordering of `defaultAdversarialSquad` synthesis before `flatTarget` check; related to `MCP-PR4-01`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MCP-PR4-03` | Session 1 | `MCP` | `Closed` | [`mcp/index.js#L58`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/index.js#L58) | `dispatch_squad` discovery schema `squadId.description` omits `integrity_auditor` and `integrity_auditor:<target>`. | Update `squadId.description` in `mcp/index.js#L58` (staying under MCP `tools/list` byte budget). | Inspected `mcp/index.js#L58`; `503 B` `tools/list` measured. |

6. **Verification:** Empirical Node probes on `146938b` confirmed `handleDispatchSquad` returns `isError: true` for `integrity_auditor:` and `integrity_auditor:adversarial_review`; inspected `mcp/index.js#L58` (`tools/list` `527 B`).
7. **Verdict:** `No findings within reviewed scope` (`MCP-PR4-01`–`03` verified `Closed` on `146938b`).

---

### 4.5 `RUN` — Core Runtime, Parsing, and Validation

1. **Scope:** `mcp/verdicts.mjs` (changed), `mcp/briefs.mjs` (changed).
2. **Coverage:** Complete.
3. **P1 — high priority:**
   - **Title, priority, status:** `RUN-PR4-01` — `parseContentVerdict` unanchored `/\b(?:FAIL|BLOCKED)\b/` prose scan triggers false conflicts and fabricates `BLOCKED` verdicts (`P1`, `Closed`).
     - **Contract provenance:** Strict single-line verdict contract (`mcp/verdicts.mjs#L50-L75`, `.agents/skills/swarm-governance/SKILL.md` §1).
     - **Source evidence:** [`mcp/verdicts.mjs#L59-L67`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/verdicts.mjs#L59-L67).
     - **Trigger:** Any report containing `Content Verdict: PASS` plus unquoted uppercase `FAIL` or `BLOCKED` in prose (e.g., `"Verified that bad input causes FAIL."`), or any non-verdict prose containing `BLOCKED` (e.g., `"Nothing was BLOCKED during run."`).
     - **Expected / actual:** Expected `"PASS"` on the valid report and an error on the report lacking a verdict line; actual empirically threw `"Report contains conflicting content verdicts: PASS, FAIL."` on the valid report and returned `"BLOCKED"` on the verdict-less prose report.
     - **Impact:** Valid `PASS` lead reports discussing failure modes are falsely rejected, while reports missing a verdict line can be fabricated as `BLOCKED`.
     - **Required remediation:** Remove the unanchored `/\b(?:FAIL|BLOCKED)\b/` loop or restrict contradiction checks to labeled status/verdict lines, and require `parseStrictLines` to find at least one strict declaration (`if (found.size === 0) throw ...` before any secondary check).
     - **Acceptance evidence:** Unit tests covering `"Content Verdict: PASS\nVerified bad input causes FAIL."` (`"PASS"`) and `"Nothing was BLOCKED."` (throws).
     - **Root cause / related IDs:** Over-broad fallback scan added on top of `parseStrictLines`; related to `RUN-PR4-02`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
4. **P2 — medium priority:**
   - **Title, priority, status:** `RUN-PR4-02` — `parseContentVerdict` negation regex omits `/i` flag, ignoring lowercase `"did not pass"` (`P2`, `Closed`).
     - **Contract provenance:** Contradictory verdict rejection (`mcp/verdicts.mjs#L64`).
     - **Source evidence:** [`mcp/verdicts.mjs#L64-L66`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/verdicts.mjs#L64-L66).
     - **Trigger:** Report containing `"Content Verdict: PASS\nThe check did not pass."` (lowercase `pass`).
     - **Expected / actual:** Expected contradiction error (`PASS` vs `FAIL`); actual empirically returned `"PASS"` because line `64` matches uppercase `\bPASS\b` without `/i`.
     - **Impact:** Lowercase negation phrases bypass contradiction detection.
     - **Required remediation:** Add `/i` flag (and ensure line `64` runs only after confirming `parseStrictLines` found a strict verdict).
     - **Acceptance evidence:** Unit test verifying `"Content Verdict: PASS\nThe check did not pass."` throws.
     - **Root cause / related IDs:** Missing `/i` regex flag at `mcp/verdicts.mjs#L64`; related to `RUN-PR4-01`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RUN-PR4-03` | Session 1 | `RUN` | `Closed` | [`mcp/verdicts.mjs#L10-L14`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/verdicts.mjs#L10-L14) | `stripCode` strips fenced blocks before inline spans, so an inline `` ` ``` ` `` swallows subsequent lines until the next triple backtick. | Strip fenced blocks line-by-line (tracking matching fence tokens) before inline code spans. | Inspected `mcp/verdicts.mjs#L10-L14`. |
| `RUN-PR4-04` | Session 1 | `RUN` | `Closed` | [`mcp/verdicts.mjs#L29-L31`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/verdicts.mjs#L29-L31) | `exactRe` rejects trailing punctuation (`Content Verdict: PASS.`) as hedged and ignores Markdown heading declarations (`## Content Verdict: PASS`). | Explicitly allow optional trailing `.` or document strict exclusion for punctuation/headings. | Inspected `mcp/verdicts.mjs#L29-L31`. |
| `RUN-PR4-05` | Session 1 | `RUN` | `Closed` | [`mcp/briefs.mjs#L111-L125`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/briefs.mjs#L111-L125) | `buildSubagentSpec` `isLead` branches check only `isAdversarial`, instructing a custom `squads.integrity_auditor` lead to emit `PASS, FAIL, or BLOCKED`. | Handle `isIntegrityAuditor` in `isLead` branches (or disallow `lead` on `integrity_auditor`). | Inspected `mcp/briefs.mjs#L111-L125`; prompt budgets verified `<= 1800 B` / `<= 3300 B`. |
| `RUN-PR4-06` | Session 2 | `RUN` | `Closed` | [`mcp/verdicts.mjs#L90-L94`](https://github.com/paragon-ux/Agy-Squad/blob/de82071d723ab34803828c9cdd29899639946975/mcp/verdicts.mjs#L90-L94) | Lowercase-only negation prefix tokens missed sentence-initial `"Not PASS on smoke."`. | Closed in `de82071` via case-insensitive negation prefix regex + regression test (`tests/test-verdicts-and-pivot.mjs#L50`). | Verified on `de82071`: `"Not PASS on smoke."` throws; `"does not pass invalid events."` returns `"PASS"`. |

6. **Verification:** Empirical Node probes on `de82071` verified `RUN-PR4-01`–`06` closed (`"Not PASS on smoke."` and `"Cannot PASS smoke."` throw while `"The endpoint does not pass invalid events."` returns `"PASS"`); `npm test` (`6/6`) and `diagnose.mjs` prompt budgets pass.
7. **Verdict:** `No findings within reviewed scope` (`RUN-PR4-01`–`06` verified `Closed` on `de82071`).

---

### 4.6 `SVC` — Services, Orchestration, and Audit Semantics

1. **Scope:** `mcp/handoffs.mjs` (changed), `mcp/verdicts.mjs` (`parseTargetSquad` interaction).
2. **Coverage:** Complete.
3. **P1 — high priority:**
   - **Title, priority, status:** `SVC-PR4-01` — `parseTargetSquad` + `readIntegrityAudit` fail open on formatted, missing, or conflicting `Target Squad` lines (`P1`, `Closed`).
     - **Contract provenance:** Cross-squad integrity audit binding (`swarm-governance/SKILL.md` §1, `mcp/handoffs.mjs#L279-L282`).
     - **Source evidence:** [`mcp/verdicts.mjs#L99-L107`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/verdicts.mjs#L99-L107) and [`mcp/handoffs.mjs#L279-L282`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/handoffs.mjs#L279-L282).
     - **Trigger:** Integrity report for `beta` formatted as `**Target Squad:** **beta**`, `- Target Squad: beta`, `Target Squad: beta, gamma`, or omitting `Target Squad:` entirely, bundled for `squadId: "alpha"`.
     - **Expected / actual:** Expected `readIntegrityAudit` to parse bullet/double-emphasis `Target Squad`, reject conflicting/malformed declarations, and fail closed when `expectedSquadId` is set and `Target Squad` is absent; actual empirically returned `parseTargetSquad("**Target Squad:** **beta**") === undefined`, causing `if (targetSquad && expectedSquadId && ...)` at `mcp/handoffs.mjs#L280` to skip validation and bundle `beta`'s `CLEAN` report for `alpha`.
     - **Impact:** Cross-squad integrity audit spoofing: an audit report for another squad (or with bold formatting) bypasses `Target Squad` enforcement.
     - **Required remediation:** Align `parseTargetSquad` with `parseStrictLines` (bullet/double-emphasis support, reject malformed or conflicting `Target Squad` lines), and fail closed in `readIntegrityAudit` whenever `expectedSquadId` is provided and `targetSquad` is missing.
     - **Acceptance evidence:** Tests verifying `**Target Squad:** **beta**` is parsed and rejected for `alpha`, missing `Target Squad:` is rejected when `expectedSquadId` is set, and conflicting `Target Squad:` lines throw.
     - **Root cause / related IDs:** Asymmetric regex in `parseTargetSquad` + `if (targetSquad && ...)` fail-open guard; related to `SVC-PR4-02`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
   - **Title, priority, status:** `SVC-PR4-02` — `verifyBundleInternal` trusts untrusted `audit.targetSquad` from `bundle.json` instead of `squadId` (`P1`, `Closed`).
     - **Contract provenance:** Tamper-evident offline bundle verification (`mcp/handoffs.mjs#L473-L482`).
     - **Source evidence:** [`mcp/handoffs.mjs#L478`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/handoffs.mjs#L478).
     - **Trigger:** Calling `verifyBundle` (without `acceptedHash`) on a `bundle.json` for `squadId: "alpha"` whose `integrityAudit` object specifies `"targetSquad": "beta"` and `path`/`sha256` pointing to `beta`'s `CLEAN` report.
     - **Expected / actual:** Expected `verifyBundle` to bind `integrityAudit` to the bundle's `squadId` (`"alpha"`) and reject `"beta"`; actual empirically passed `audit.targetSquad ?? squadId` (`"beta"`) to `readIntegrityAudit`, returning valid verification for `alpha`.
     - **Impact:** A tampered `report.sources.json` (when `acceptedHash` is not yet pinned) can substitute another squad's `CLEAN` integrity report.
     - **Required remediation:** Pass `squadId` unconditionally to `readIntegrityAudit` at `mcp/handoffs.mjs#L478` and assert `audit.targetSquad === squadId` whenever `audit.targetSquad` is present.
     - **Acceptance evidence:** Unit test verifying `verifyBundle` rejects a `bundle.json` whose `integrityAudit.targetSquad` or report `Target Squad` does not match `squadId`.
     - **Root cause / related IDs:** `audit.targetSquad ?? squadId` precedence error; related to `SVC-PR4-01`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
4. **P2 — medium priority:**
   - **Title, priority, status:** `SVC-PR4-03` — Stale `integrity_auditor` file on disk silently suppresses explicit `requireAdversarialReview` / `adversarialReport` (`P2`, `Closed`).
     - **Contract provenance:** Explicit gating flags (`bundleReports` in `mcp/handoffs.mjs#L351-L385`).
     - **Source evidence:** [`mcp/handoffs.mjs#L351-L385`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/handoffs.mjs#L351-L385).
     - **Trigger:** Calling `bundleReports` with `requireAdversarialReview: true` and a failing `adversarialReport` while a stale `squad-integrity_auditor/specialist-1/report.md` (`CLEAN` for the squad) exists on disk.
     - **Expected / actual:** Expected explicit `adversarialReport` / `requireAdversarialReview` to be evaluated and block acceptance; actual `integrityCandidate` runs first and skips the `else` branch entirely, ignoring `adversarialReport` and `requireAdversarialReview`.
     - **Impact:** Stale files in `scratch/agy-squad/squad-integrity_auditor/` override explicit caller-provided adversarial review parameters.
     - **Required remediation:** Evaluate explicit `requireAdversarialReview` / `adversarialReport` directly when specified (outside `else`) rather than hiding them behind auto-discovered `integrityCandidate`.
     - **Acceptance evidence:** Unit test confirming explicit `adversarialReport` / `requireAdversarialReview` still enforces even when `squad-integrity_auditor/specialist-1/report.md` exists.
     - **Root cause / related IDs:** `if (integrityCandidate) ... else ...` control-flow shadowing; related to `SVC-PR4-04`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
   - **Title, priority, status:** `SVC-PR4-04` — Legacy `adversarial_review` fallback tests `/Integrity Verdict:/im` on unstripped Markdown (`P2`, `Closed`).
     - **Contract provenance:** Code-block stripping invariant (`mcp/verdicts.mjs#L10`, `mcp/handoffs.mjs#L388`).
     - **Source evidence:** [`mcp/handoffs.mjs#L388`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/handoffs.mjs#L388).
     - **Trigger:** Legacy `adversarial_review` report recording `Verdict: PASS` plus a fenced code block quoting `Integrity Verdict: CLEAN` (e.g., reviewing governance docs).
     - **Expected / actual:** Expected fenced code examples not to trigger integrity-report routing (`readSynthesis` should parse `Verdict: PASS`); actual line `388` tests `/^\s*...\s*Integrity Verdict.../im` on unstripped `advMarkdown`, routing into `readIntegrityAudit`, which strips the fenced block and throws `Integrity audit report must record an unambiguous single-line 'Integrity Verdict: ...'`.
     - **Impact:** False rejection of legacy `adversarial_review` reports that quote `Integrity Verdict:` in code blocks.
     - **Required remediation:** Strip code blocks (via an exported helper in `mcp/verdicts.mjs`) before testing for `Integrity Verdict:` at `mcp/handoffs.mjs#L388`.
     - **Acceptance evidence:** Unit test verifying legacy `adversarial_review` report with `Verdict: PASS` and fenced `Integrity Verdict: CLEAN` succeeds.
     - **Root cause / related IDs:** Raw regex check on unstripped Markdown; related to `SVC-PR4-03`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
   - **Title, priority, status:** `SVC-PR4-05` — `verifyBundleInternal` skips verdict re-verification for `parsed.adversarialReview` (`P2`, `Closed`).
     - **Contract provenance:** Offline bundle verification parity (`verifyBundleInternal` at `mcp/handoffs.mjs#L468-L492`).
     - **Source evidence:** [`mcp/handoffs.mjs#L483-L492`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/handoffs.mjs#L483-L492).
     - **Trigger:** Calling `verifyBundle` (without `acceptedHash`) on a legacy `bundle.json` whose `adversarialReview` object points to a `Verdict: FAIL` report with matching `sha256`.
     - **Expected / actual:** Expected `verifyBundleInternal` to re-verify `readSynthesis` (`Verdict: PASS`) just as it does for `synthesis` (`L468`) and `integrityAudit` (`L478`); actual only calls `readEvidence` (`L488`), verifying the byte hash without checking the verdict.
     - **Impact:** Tampered `report.sources.json` with `adversarialReview` pointing to a `FAIL` report passes `verifyBundle`.
     - **Required remediation:** Replace `readEvidence` at `mcp/handoffs.mjs#L488` with `readSynthesis(root, adv.path, verifiedDirs)` (asserting `verdict === "PASS"`).
     - **Acceptance evidence:** Unit test verifying `verifyBundle` rejects `adversarialReview` pointing to a `Verdict: FAIL` file even when `sha256` matches.
     - **Root cause / related IDs:** Asymmetric verification helper in `verifyBundleInternal`; related to `SVC-PR4-02`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SVC-PR4-06` | Session 1 | `SVC` | `Closed` | [`mcp/handoffs.mjs#L423,L510,L522`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/handoffs.mjs#L423) | `bundleReports` and `verifyBundleInternal` coerce `retainReports` via truthy/`Boolean(...)` instead of rejecting non-boolean values (e.g., `"false"` string silently retains reports). | Validate `retainReports === undefined \|\| typeof retainReports === "boolean"` in `bundleReports` and `verifyBundleInternal`. | Inspected `mcp/handoffs.mjs#L423,L510,L522`. |

6. **Verification:** Empirical Node probes and `npm test` on `146938b` verified `SVC-PR4-01`–`06` closed (bold/bullet `Target Squad`, missing/conflicting `Target Squad` rejection, `verifyBundle` `squadId` binding, explicit `requireAdversarialReview`, stripped `advMarkdown`, `adversarialReview` `readSynthesis` check, and boolean `retainReports`).
7. **Verdict:** `No findings within reviewed scope` (`SVC-PR4-01`–`06` verified `Closed` on `146938b`).

---

### 4.7 `DB` — Database, Migrations, Replay, and Concurrency

1. **Scope:** Whole repository (`mcp/`, `bin/`, `tests/`).
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope.
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:** Confirmed repository uses no SQL or external database engine; all persistence is workspace-local JSON and Markdown files covered under `RUN`, `SVC`, and `SCRIPT`.
7. **Verdict:** `Not applicable` (filesystem-only persistence).

---

### 4.8 `SCRIPT` — Scripts, Evaluation, and Developer Tooling

1. **Scope:** `bin/agy-squad.mjs` (changed), `.agents/skills/self-diagnosis/scripts/diagnose.mjs` (unchanged).
2. **Coverage:** Complete.
3. **P1 — high priority:**
   - **Title, priority, status:** `SCRIPT-PR4-01` — `agy-squad bundle` and `agy-squad verdict` bypass workspace confinement and symlink rejection (`P1`, `Closed`).
     - **Contract provenance:** `L1`/`L2` workspace confinement and symlink rejection (`mcp/handoffs.mjs#L144-L179`, `pr-review/SKILL.md` Boundary 2).
     - **Source evidence:** [`bin/agy-squad.mjs#L222,L246`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/bin/agy-squad.mjs#L222) vs. [`mcp/handoffs.mjs#L551-L552`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/mcp/handoffs.mjs#L551-L552).
     - **Trigger:** Running `agy-squad verdict ../outside.md`, `agy-squad verdict /abs/path.md`, `agy-squad verdict symlink.md`, or `agy-squad bundle ../outside.json`.
     - **Expected / actual:** Expected rejection of `..`, absolute paths, and symlinks (`O_NOFOLLOW`, `realpathSync`, `/proc/self/fd`), matching `verify`, `prune`, and `mcp/handoffs.mjs`; actual `fs.readFileSync(path.resolve(root, ...))` follows symlinks and reads arbitrary host files outside `root` (empirically observed `agy-squad verdict ../outside.md` exited `0` returning `{"verdict":"PASS"}`).
     - **Impact:** Breaks `L1`/`L2` workspace confinement on the new governance CLI subcommands.
     - **Required remediation:** Export `readFile` from `mcp/handoffs.mjs` and replace `fs.readFileSync(path.resolve(root, ...))` at `bin/agy-squad.mjs#L222` and `#L246` with `readFile(root, ...).toString("utf8")` (or `decodeUtf8`).
     - **Acceptance evidence:** Negative CLI tests asserting `bundle` and `verdict` exit non-zero on `../`, `/abs/path`, and symlinks.
     - **Root cause / related IDs:** Direct `fs.readFileSync(path.resolve(...))` instead of reusing `mcp/handoffs.mjs` `readFile`; related to `TEST-PR4-01`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
4. **P2 — medium priority:** None identified within reviewed scope.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SCRIPT-PR4-02` | Session 1 | `SCRIPT` | `Closed` | [`bin/agy-squad.mjs#L213,L220-L250`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/bin/agy-squad.mjs#L213) | `bundle --help`, `verify --help`, `prune --help`, and `verdict --help` do not print usage (`exit 0`), failing instead with `ENOENT` or arg-count errors (`exit 1`); `verdict ""` throws `EISDIR`. | Handle `--help`/`-h` before positional reads in subcommands; routing via `readFile` fixes `""`. | Observed `cli-docs-auditor` probe and inspected `bin/agy-squad.mjs#L213-L250`. |
| `SCRIPT-PR4-03` | Session 1 | `SCRIPT` | `Closed` | [`bin/agy-squad.mjs#L16-L28,L220-L260`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/bin/agy-squad.mjs#L16) | `agy-squad` CLI omits `fingerprint` and `inspect` subcommands (forcing separate `node mcp/handoffs.mjs` calls), and deprecated `run` emits no stderr deprecation warning. | Consider exposing `fingerprint`/`inspect` on `bin/agy-squad.mjs` and warning to stderr in `run`. | Inspected `bin/agy-squad.mjs#L16-L28,L220-L260` vs. `mcp/handoffs.mjs#L550-L557`. |

6. **Verification:** Isolated CLI probes on `146938b` verified `SCRIPT-PR4-01`–`03` closed (`verdict ../outside`, `/abs`, symlink, and `""` exit `1`; `--help` on all `6` governance subcommands exits `0`; `fingerprint`/`inspect` work; `run` prints deprecation warning to stderr).
7. **Verdict:** `No findings within reviewed scope` (`SCRIPT-PR4-01`–`03` verified `Closed` on `146938b`).

---

### 4.9 `TEST` — Tests and CI

1. **Scope:** `tests/test-verdicts-and-pivot.mjs` (added), `tests/test-handoffs.mjs` (changed), `tests/verify-package.mjs` (unchanged).
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**
   - **Title, priority, status:** `TEST-PR4-01` — `test-verdicts-and-pivot.mjs` lacks negative CLI security/error tests and negative `integrity_auditor` dispatch tests (`P2`, `Closed`).
     - **Contract provenance:** `pr-review/SKILL.md` §3 (`TEST`: adversarial cases) and `L1`/`L2` boundary tests.
     - **Source evidence:** [`tests/test-verdicts-and-pivot.mjs#L98-L127`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/tests/test-verdicts-and-pivot.mjs#L98-L127).
     - **Trigger:** Inspecting automated test assertions for `bin/agy-squad.mjs` and `handleDispatchSquad("integrity_auditor...")`.
     - **Expected / actual:** Expected tests verifying CLI rejection of `../`, absolute paths, symlinks, `--help`, hedged/malformed verdicts (`exit 1`), `FAIL`/`BLOCKED`/`INTEGRITY VIOLATION` CLI outputs, actual `prune` deletion without `--keep-reports`, plus bare `integrity_auditor` and invalid `integrity_auditor:<unknown>` dispatch tests; actual covers only happy-path CLI calls and `integrity_auditor:alpha`.
     - **Impact:** Path-traversal (`SCRIPT-PR4-01`), parser (`RUN-PR4-01`/`02`), and dispatch (`MCP-PR4-01`/`02`) defects shipped undetected despite `npm test` passing.
     - **Required remediation:** Add negative CLI security/verdict tests and negative `integrity_auditor` dispatch tests to `tests/test-verdicts-and-pivot.mjs`.
     - **Acceptance evidence:** `npm test` executes and passes new negative assertions after fixes.
     - **Root cause / related IDs:** Happy-path-only test coverage for new PR #4 entry points; related to `SCRIPT-PR4-01`, `MCP-PR4-01`, `RUN-PR4-01`.
     - **Closure:** Closed in `3bffc5d46c3f34373dd5eaaeef2fc8a5e671baa1`; verified by `npm test`, `verify-package.mjs`, and `diagnose.mjs`.
5. **P3 — low priority:**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `TEST-PR4-02` | Session 1 | `TEST` | `Closed` | [`tests/verify-package.mjs#L5-L16`](https://github.com/paragon-ux/Agy-Squad/blob/8fce168be1ca1e5914ff1d5511f690406f0c96e9/tests/verify-package.mjs#L5-L16) | `REQUIRED` package-boundary assertions omit PR #4's new runtime module `mcp/verdicts.mjs` and `.agents/skills/swarm-governance/SKILL.md`. | Add `"mcp/verdicts.mjs"` and `".agents/skills/swarm-governance/SKILL.md"` to `REQUIRED`. | Inspected `tests/verify-package.mjs#L5-L16`; ran `--self-test` (`exit 0`). |

6. **Verification:** Executed `npm test` (`6/6` suites exited `0`), `node tests/verify-package.mjs --self-test` (`exit 0`), and `npm pack --dry-run --json` -> `node tests/verify-package.mjs` (`exit 0`, `43` files) on `146938b`.
7. **Verdict:** `No findings within reviewed scope` (`TEST-PR4-01`–`02` verified `Closed` on `146938b`).

---

### 4.10 `DEP` — Dependencies, Packaging, and Configuration

1. **Scope:** `package.json` (changed).
2. **Coverage:** Complete.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope.
5. **P3 — low priority:** None identified within reviewed scope. (`"private": true` impact on `npx agy-squad` instructions is tracked in `SKILL-PR4-04` to avoid double-counting.)
6. **Verification:** Inspected `package.json` (`"engines": { "node": ">=22" }`, zero external dependencies, `scripts.test` prepends `tests/test-verdicts-and-pivot.mjs`); verified `npm pack --dry-run --json` (`42` files, `exit 0`).
7. **Verdict:** `No findings within reviewed scope`.

---

## 5. Cross-Category Root Causes and Rationale for Remediation Order

1. **Fail-Open Validation & Asymmetric Helper Reuse (`P1` Priority 1):** Three `P1` defects (`SCRIPT-PR4-01`, `SVC-PR4-01`, `SVC-PR4-02`) and one `P1` parser defect (`RUN-PR4-01`) stem from skipping shared containment/strict-parsing helpers (`readFile` bypassed in `bin/agy-squad.mjs`, `parseTargetSquad` failing open in `readIntegrityAudit`, `verifyBundleInternal` trusting `audit.targetSquad`, and `parseContentVerdict` scanning unanchored prose). Fix these first so offline verification and CLI boundaries fail closed.
2. **Multi-Squad Audit Topology & Legacy Fallback Control Flow (`P2` Priority 2):** `ARCH-PR4-01`, `ARCH-PR4-02`, `ARCH-PR4-03`, `MCP-PR4-01`, `MCP-PR4-02`, `SVC-PR4-03`, `SVC-PR4-04`, and `SVC-PR4-05` stem from bolting `integrity_auditor` onto single-slot/legacy-fallback paths without multi-target slot isolation or clean control-flow separation.
3. **Skill, Active Doc, & Ledger Alignment (`P1`/`P2` Priority 3):** Fix `SKILL-PR4-01` (`bundle.json` -> `lead/report.sources.json`), `SKILL-PR4-02`, `SKILL-PR4-04`, `SKILL-PR4-03`, `DOC-PR4-01`, `DOC-PR4-02`, and `DOC-PR4-03` together once the CLI/bundle contract is locked.
4. **Regression Tests & Ergonomics (`P2`/`P3` Priority 4):** Land `TEST-PR4-01`, `TEST-PR4-02`, and remaining `P3` items (`MCP-PR4-03`, `RUN-PR4-03`..`05`, `SVC-PR4-06`, `SCRIPT-PR4-02`..`03`) and re-run `npm test`, `verify-package.mjs`, and `diagnose.mjs`.

---

## 6. Verification Record and Remaining Gaps

### Executed Checks (Final Verified Head `de82071d723ab34803828c9cdd29899639946975`)

| Check | Outcome | Observed Result |
| --- | :---: | --- |
| `npm test` | Pass (`0`) | 6/6 suites passed (`test-verdicts-and-pivot.mjs`, `test-dispatch.mjs`, `test-handoffs.mjs`, `test-run.mjs`, `test-server.mjs`, `verify-benchmark.mjs`) |
| `node tests/verify-package.mjs --self-test` | Pass (`0`) | `Package verifier self-test passed (positive + 7 negatives)` |
| `npm pack --dry-run --json > /tmp/pack-verify.json && node tests/verify-package.mjs /tmp/pack-verify.json && rm -f /tmp/pack-verify.json` | Pass (`0`) | `Package boundary verified (43 files)` |
| `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort` | Pass (`0`) | `status: "HEALTHY"`, `findings: []`; prompt budgets (`1545 B`, `950 B`, `2767 B`, `1398 B`, `527 B`) and `brokenLinksCount: 0` passed |
| `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/pr4-swarm-governance-pivot-review.md --allow-active-cohort` | Pass (`0`) | `status: "HEALTHY"`, `targetReviewLedger: "docs/reviews/pr4-swarm-governance-pivot-review.md"`, `findings: []` |
| Empirical Node probes (`SKILL-PR4-02`, `RUN-PR4-06`, + carried-forward `146938b` probes) | `30/30` Closed | Verified `bundleReports`/`verifyBundle` using `.agents/skills/swarm-governance/SKILL.md#L64-L74` verbatim (`40e8a9eb...`), and `"Not PASS on smoke."` / `"Cannot PASS smoke."` throwing while `"does not pass invalid events."` returns `"PASS"` |

### Remaining Verification Gaps

- External GitHub Actions CI run logs for PR #4 and live `agy` PTY sessions (`L7`) were not executed in this review.

---

## 7. Overall Disposition and Finding Closure Table

- **Overall Disposition:** **Approve** (`0` open `P1`/`P2`/`P3`; `30` closed across `3bffc5d`, `146938b`, `de82071`).
- **Content Verdict:** `PASS`

### PR #4 Atomic Finding Ledger (`30` Findings — `1 ID = 1 Row`)

| ID | Category | Severity | Status | Source | Summary | Target Remediation |
| --- | --- | :---: | --- | --- | --- | --- |
| `ARCH-PR4-01` | `ARCH` | `P2` | `Closed` | `mcp/dispatch.mjs#L116-L139` | Per-target `integrity_auditor:<target>` dispatches collide on `squad-integrity_auditor/specialist-1/report.md` | Isolate per-target report slots and align `bundleReports` auto-discovery |
| `ARCH-PR4-02` | `ARCH` | `P2` | `Closed` | `mcp/dispatch.mjs#L123-L134` | Untargeted `integrity_auditor` emits `Target Squad: <targetIds[0]>` on multi-squad manifests | Require `<target>` on multi-squad manifests or support multi-squad bundling |
| `ARCH-PR4-03` | `ARCH` | `P2` | `Closed` | `mcp/handoffs.mjs#L361-L363` | `bundleReports` defaults `requireIntegrityAudit` to `false`, silently omitting missing integrity audits | Require integrity audit by default or document explicit enforcement in CLI/skill |
| `DOC-PR4-01` | `DOC` | `P2` | `Closed` | `docs/tools.md`, `docs/core-workflows.md`, `docs/getting-started.md`, `docs/concepts.md`, `docs/index.md`, `README.md` | Active docs contradict PR #4 governance CLI, `run` deprecation, and `integrity_auditor` | Update all active docs to reflect PR #4 governance workflow and CLI |
| `DOC-PR4-02` | `DOC` | `P2` | `Closed` | `docs/plans/LEDGER.md#L14` | `L17` (`agy-squad run`) remains `Active` with no `/swarm` governance pivot entry | Mark `L17` superseded/deprecated and add active pivot decision ID |
| `DOC-PR4-03` | `DOC` | `P2` | `Closed` | `docs/reviews/pr3-squad-alignment-full-review.md#L718-L720` | Empty Section 9 heading causes `diagnose.mjs` `DOC-LEDGER-SCHEMA` exit `1` | Remove empty Section 9 (or populate tables) and validate PR #4 ledger |
| `SKILL-PR4-01` | `SKILL` | `P1` | `Closed` | `.agents/skills/swarm-governance/SKILL.md#L53,L56` | `verify` and `prune` examples hardcode nonexistent `bundle.json` instead of `lead/report.sources.json` | Update paths to `scratch/agy-squad/squad-<id>/lead/report.sources.json` |
| `SKILL-PR4-02` | `SKILL` | `P2` | `Closed` | `.agents/skills/swarm-governance/SKILL.md#L70` | `3bffc5d` added schema/`fingerprint`/`@lead ` stripping; `de82071` fixed line `70` to flat `<64-hex>` string matching `fingerprint()`/`verifyFiles()` | Update `.agents/skills/swarm-governance/SKILL.md#L70` to `"verifiedFiles": { "<file>": "<64-hex>" }` |
| `SKILL-PR4-03` | `SKILL` | `P2` | `Closed` | `.agents/skills/self-diagnosis/SKILL.md#L31-L32` | Step 0 Option 3 teaches pre-pivot `PASS` adversarial audit gate | Update Step 0 Option 3 to `integrity_auditor` (`Integrity Verdict: CLEAN`) |
| `SKILL-PR4-04` | `SKILL` | `P2` | `Closed` | `.agents/skills/swarm-governance/SKILL.md#L47-L56`, `package.json#L4` | Skill instructs `npx agy-squad` on a `"private": true` unpublished package | Document `node <repo>/bin/agy-squad.mjs` or `npm link` + `npx --no-install` |
| `MCP-PR4-01` | `MCP` | `P2` | `Closed` | `mcp/dispatch.mjs#L233-L235` | Empty target `integrity_auditor:` / `adversarial_flat:` silently compiles untargeted auditor | Reject empty target string whenever `squadId.includes(":")` |
| `MCP-PR4-02` | `MCP` | `P2` | `Closed` | `mcp/dispatch.mjs#L237-L242` | `defaultAdversarialSquad` synthesized before `flatTarget` check, allowing `integrity_auditor:adversarial_review` | Validate `flatTarget` against working squads before synthesizing `adversarial_review` |
| `MCP-PR4-03` | `MCP` | `P3` | `Closed` | `mcp/index.js#L58` | `dispatch_squad` schema `squadId.description` omits `integrity_auditor` / `integrity_auditor:<target>` | Document `integrity_auditor` in `mcp/index.js#L58` |
| `RUN-PR4-01` | `RUN` | `P1` | `Closed` | `mcp/verdicts.mjs#L59-L67` | Unanchored `/\b(?:FAIL\|BLOCKED)\b/` prose scan triggers false conflicts and fabricates `BLOCKED` | Remove unanchored prose scan and require `parseStrictLines` >= 1 match |
| `RUN-PR4-02` | `RUN` | `P2` | `Closed` | `mcp/verdicts.mjs#L64-L66` | Negation regex omits `/i`, ignoring lowercase `did not pass` | Add `/i` flag on negation check after strict verdict match |
| `RUN-PR4-03` | `RUN` | `P3` | `Closed` | `mcp/verdicts.mjs#L10-L14` | `stripCode` strips fenced blocks before inline spans, letting inline `` ` ``` ` `` swallow lines | Strip fenced blocks line-by-line before inline code spans |
| `RUN-PR4-04` | `RUN` | `P3` | `Closed` | `mcp/verdicts.mjs#L29-L31` | `exactRe` rejects `Content Verdict: PASS.` and ignores `## Content Verdict: PASS` headings | Clarify or support trailing period and document heading exclusion |
| `RUN-PR4-05` | `RUN` | `P3` | `Closed` | `mcp/briefs.mjs#L111-L125` | `isLead` branches omit `isIntegrityAuditor`, instructing custom `integrity_auditor` lead to emit `PASS` | Handle `isIntegrityAuditor` in `isLead` branches |
| `RUN-PR4-06` | `RUN` | `P3` | `Closed` | `mcp/verdicts.mjs#L90-L94` | `de82071` added case-insensitive negation prefix regex + regression test catching `"Not PASS on smoke."` | Add case-insensitive matching on negation prefix group at `mcp/verdicts.mjs#L90` |
| `SVC-PR4-01` | `SVC` | `P1` | `Closed` | `mcp/verdicts.mjs#L99-L107`, `mcp/handoffs.mjs#L279-L282` | `parseTargetSquad` + `readIntegrityAudit` fail open on formatted, missing, or conflicting `Target Squad` | Support bullet/bold syntax, reject conflicts, and fail closed when `expectedSquadId` set |
| `SVC-PR4-02` | `SVC` | `P1` | `Closed` | `mcp/handoffs.mjs#L478` | `verifyBundleInternal` passes untrusted `audit.targetSquad ?? squadId` to `readIntegrityAudit` | Pass `squadId` unconditionally and assert `audit.targetSquad === squadId` if present |
| `SVC-PR4-03` | `SVC` | `P2` | `Closed` | `mcp/handoffs.mjs#L351-L385` | Stale `integrity_auditor` report on disk shadows explicit `requireAdversarialReview` / `adversarialReport` | Evaluate explicit `requireAdversarialReview` / `adversarialReport` outside `else` |
| `SVC-PR4-04` | `SVC` | `P2` | `Closed` | `mcp/handoffs.mjs#L388` | `/Integrity Verdict:/im` runs on unstripped `advMarkdown`, misrouting fenced code examples | Strip code blocks before checking for `Integrity Verdict:` |
| `SVC-PR4-05` | `SVC` | `P2` | `Closed` | `mcp/handoffs.mjs#L483-L492` | `verifyBundleInternal` only checks byte hash (`readEvidence`) on `adversarialReview`, skipping `readSynthesis` | Re-verify `adversarialReview` with `readSynthesis` (`PASS`) in `verifyBundleInternal` |
| `SVC-PR4-06` | `SVC` | `P3` | `Closed` | `mcp/handoffs.mjs#L423,L510,L522` | Truthy / `Boolean()` coercion on `retainReports` treats `"false"` string as `true` | Validate `retainReports` is `undefined` or `boolean` |
| `SCRIPT-PR4-01` | `SCRIPT` | `P1` | `Closed` | `bin/agy-squad.mjs#L222,L246` | `bundle` and `verdict` use `fs.readFileSync(path.resolve(...))`, bypassing `L1`/`L2` path and symlink containment | Route `bundle` and `verdict` file reads through `readFile` exported from `mcp/handoffs.mjs` |
| `SCRIPT-PR4-02` | `SCRIPT` | `P3` | `Closed` | `bin/agy-squad.mjs#L213,L220-L250` | Subcommand `--help`/`-h` fails with `ENOENT` or arg errors; `verdict ""` throws `EISDIR` | Handle `--help`/`-h` before positional reads and use `readFile` |
| `SCRIPT-PR4-03` | `SCRIPT` | `P3` | `Closed` | `bin/agy-squad.mjs#L16-L28,L220-L260` | CLI omits `fingerprint` and `inspect` subcommands; `run` emits no stderr deprecation notice | Consider exposing `fingerprint`/`inspect` and logging stderr warning in `run` |
| `TEST-PR4-01` | `TEST` | `P2` | `Closed` | `tests/test-verdicts-and-pivot.mjs#L98-L127` | Missing negative CLI path/symlink/`--help`/verdict tests and negative `integrity_auditor` dispatch tests | Add comprehensive negative CLI and dispatch tests to `test-verdicts-and-pivot.mjs` |
| `TEST-PR4-02` | `TEST` | `P3` | `Closed` | `tests/verify-package.mjs#L5-L16` | `REQUIRED` list omits `mcp/verdicts.mjs` and `.agents/skills/swarm-governance/SKILL.md` | Add both new PR #4 artifacts to `REQUIRED` |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

None (0 open residuals, 0 deferred items)
