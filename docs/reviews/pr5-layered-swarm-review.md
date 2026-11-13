# Layered `/swarm` Review: Agy-Squad PR #5 & Phase 1 Leftover Remediation

> Layered `/swarm-governance` + `/pr-review` (v1.3.0) review of paragon-ux/Agy-Squad PR #5 (`1fde6054..44e6df47`) plus the `docs/visual-copywriting-pass` working tree, followed by full remediation of all P2/P3 findings and Decisions A1–A4 (`p1_leftovers` cleanup), retaining specialist and audit reports (`--keep-reports`).

## 1. Review Metadata, Session Provenance, and Evidence Limits

| Field | Value |
| --- | --- |
| Repository / PR | paragon-ux/Agy-Squad [#5](https://github.com/paragon-ux/Agy-Squad/pull/5) (`feat/phase2-swarm-planner` / `docs/visual-copywriting-pass` to `main`) |
| Base Branch / SHA | `main` at `1fde6054af13b47680fcced40974fa5abb97d9d8` (`1fde605`) |
| Committed PR #5 Head SHA | `44e6df4726315af2d5fb6af662a54f21b7d53f3e` (`44e6df4`, 42 committed files changed vs `1fde605`) |
| Working-Tree Delta Reviewed & Remediated | `docs/visual-copywriting-pass` + `p1_leftovers` (Decisions A1–A4) + Session 7/8 updates: 39 modified tracked files vs `44e6df4`, `docs/roles-and-workflows.md`, 5 SVGs in `docs/assets/*.svg`, `docs/reviews/pr5-layered-swarm-review.md`, and Stage 2 `docs/reviews/pr5-full-review-direction.md` (53 files in `npm pack --dry-run --json`) |
| Governing Standard | Agy-Squad PR Review Standard v1.3.0 ([pr-review-standard.md](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md), 1 ID = 1 Row / Record) |
| Date / Model | 2026-11-13 / Gemini 4 Hydrogen (High) (`gemini-4-hydrogen-high`, verified via `swarm{action: "status"}`) |
| Cohort Bundle & Integrity Audit SHAs | `pr5_review` bundle `bb21a371d0628b7e222d4817929a5af0eb4ded727ce593b67b3de1c4ac7c89c9` (synthesis `2d610b58...` Content Verdict: PASS; audit `90956c6da58a74968f673c3999d01be95bc61cbe6400fa5868e22eb20906f545` Integrity Verdict: CLEAN); Session 6 `pr5_verify` pre-fix cohort (`Content Verdict: FAIL` on `SKILL-VERIFY-01`, `Integrity Verdict: CLEAN` after programmatic `verifiedFiles` regeneration) -> all Session 6 findings remediated; Session 7 `self_diag_flat` bundle `ac55ca1f2fce120ebb6a9059be5465ec8fab1a682f3935ec15834cbd570c0b03` (Content Verdict: PASS; re-audit Integrity Verdict: CLEAN; Scope 2 pruned) |
| Overall PR Review Disposition | Approve (post-remediation: 0 P0, 0 P1, 0 open P2, 0 open P3 across 65 §7 closed entries, 17 §8 residual/deferred/by-design/informational records, and 67 §9 Wave Finding Ledger rows [38 Session 5–6 closed entries + 29 Session 7 `self_diag_flat` closed entries]) |

### Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| 1–4 (Prior PR #5 Ledger) | `23e2d977-d17c-4355-bf0d-02c35eeffaa6` / `69506793-2b07-43f0-ae50-6e7aa009232d` | none | 2026-11-13 | `1fde605..d9dc5d2` + `44e6df4`; clean `scratch/` | Recorded in [pr5-independent-review.md](pr5-independent-review.md) (updated for Session 5 continuation) |
| 5 (`pr5_review` Layered `/swarm` + `p1_leftovers` Remediation) | `72686908-b468-479a-ad86-db9b9cacf078` | none | 2026-11-13 | `1fde6054..44e6df47` + `docs/visual-copywriting-pass` + Decisions A1–A4 remediated; `--keep-reports` retained in `scratch/agy-squad/` | `/swarm-governance` + `/pr-review` v1.3.0 Layered Review Squad (`pr5-review-runtime-mcp-c`, `pr5-review-tests-scripts`, `pr5-review-docs-visual-a`, `pr5-review-lead`, `audit-pr5-review`, `monitor`) + flat `p1_leftovers` audit |
| 6 (`pr5_verify` Layered `/swarm` Test & Remediation) | `72686908-b468-479a-ad86-db9b9cacf078` | 5 | 2026-11-13 | Pre-fix working tree (`Content Verdict: FAIL` blocked bundling as designed) -> remediated `SKILL-VERIFY-01`, `SWARM-UI-SURFACE`, & 12 P3 items (`npm test`, `verify:package`, `diagnose.mjs`, `zensical build` pass) | `/pr-review` + `/swarm-governance` Layered Review (`pr5-verify-runtime-mcp-c`, `pr5-verify-tests-scripts`, `pr5-verify-skills-docs-d`, `pr5-verify-lead`, `audit-pr5-verify`, `monitor-3`) |
| 7 (`self_diag_flat` Flat `/swarm` Self-Diagnosis & Remediation) | `72686908-b468-479a-ad86-db9b9cacf078` | 6 | 2026-11-13 | Flat Cohort across 6 specialists (`sd-flat/`); 17 P2/P3 closed during session + `SD-PR-04`/`SD-GOV-TEST-02` closed cleanly; bundle `ac55ca1f2fce120ebb6a9059be5465ec8fab1a682f3935ec15834cbd570c0b03` verified & Scope 2 pruned | `/self-diagnosis` (`diagnose.mjs --print-plan --topology flat`) + `/swarm-governance` Flat Cohort (`self-diag-flat-*`, `audit-self-diag-flat`, `monitor-4`) |

### Evidence Available & Limits

- **Directly inspected:** Full committed diff (`1fde605..44e6df4`, 42 files), complete uncommitted working tree across runtime (`mcp/*.js|mjs`, `bin/agy-squad.mjs`), tests (`tests/*.mjs`), skills (`.agents/skills/**`), docs (`README.md`, `docs/*.md`, `docs/assets/*.svg`, `zensical.toml`, `.github/workflows/docs.yml`), and retained cohort reports in `scratch/agy-squad/`.
- **Directly executed post-remediation:** `npm test` (9 scripts including `verify-package.mjs --self-test` and 20/20 dossier assertions), `npm run verify:package` (52 files in `npm pack --dry-run --json`), `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort --markdown` (`HEALTHY`), `--ledger` validation on both `pr5-layered-swarm-review.md` and `pr5-independent-review.md`, CLI `dispatch`/`plan`/`verdict`/`bundle`/`verify`/`prune` probes, MCP stdio probes against `node mcp/index.js`, `zensical build`, XML parsing across all 5 SVGs, and 4-check runtime closure (`swarm status`, `manage_subagents`, `manage_task`).
- **Evidence limits & governance observations:**
  - Remote GitHub Actions CI runs once changes are committed and pushed.
  - Automated tests launch zero real subagents (`L7`); host enforcement items `NE-01..NE-10`, `NE-12` remain Unverified in `docs/plans/native-enforcement-ledger.md`.
  - In Session 5's `pr5_review` audit, `audit-pr5-review` audited via board state, provenance, fingerprints, and direct source re-execution because `agy-context-saver` MCP tools were not attached to its worker session, and `pr5-review-bundle-record.json` initially caught a 1-character manual SHA typo via `agy-squad bundle` before programmatic `fingerprint` regeneration. Both observations are recorded honestly here; `diagnose.mjs` also validates the standalone report structure.
  - `pr5_review` `lead/report.md` text initially referred to 20 open P3 items while its finding tables contained 23 distinct open P3 IDs; all 23 are preserved 1-to-1 below.
  - Alongside `pr5_review` fixes, operator Decisions A1–A4 resolved all conflicting Phase 1 leftovers (`p1_leftovers`): removed legacy `adversarial_l1` / `adversarial_flat` / `adversarial_review` (A1), removed the standalone `mcp/handoffs.mjs` CLI entrypoint and defaulted `bundleReports` `requireIntegrityAudit: true` (A2), removed topology default bias between Flat and Layered in favor of asking the user (A3), and added the Task-Spec vs Execution-Modifier skill composition matrix + `node bin/agy-squad.mjs dispatch` subcommand + migrated `self-diagnosis` to `/swarm`/`squad_planner` primary (A4).

---

## 2. File-to-Category Inventory and Coverage Matrix

### 2.1 Committed PR #5 Delta (`1fde6054..44e6df47`, 42 files) and Working-Tree Remediation

| Area / Files | Change | Primary Cat | Cross-Ref | Post-Remediation State |
| --- | --- | --- | --- | --- |
| `mcp/index.js`, `mcp/planner.mjs` | Modified / Added | MCP | ARCH, SVC, RUN | Remediated (`oneOf`, dynamic byte limit, boolean `readOnly`, A1/A3) |
| `mcp/briefs.mjs`, `mcp/dispatch.mjs`, `mcp/handoffs.mjs` | Modified | RUN | ARCH, SVC | Remediated (swarm supervision, A1/A2 removals, `requireIntegrityAudit = true`) |
| `mcp/run-state.mjs`, `bin/terminal.py` | Deleted (`44e6df4`) | ARCH | RUN, DEP | Cleanly retired (`L17`) |
| `bin/agy-squad.mjs` | Modified | SCRIPT | RUN, SVC | Remediated (added `dispatch` subcommand & empty-`plan` guard per A4) |
| `.agents/skills/*/SKILL.md`, `references/*`, `resources/*` | Modified | SKILL | DOC, SCRIPT | Remediated (readability rule, `readOnly: true`, A1–A4 composition/parity, `< 9.3 KB` each) |
| `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Modified | SCRIPT | TEST, DOC | Remediated (unique closure IDs, `scopesOverlap()`, GFM anchor/nav/SVG checks, `--print-plan`) |
| `benchmarks/teamwork-vs-squad/README.md`, `package.json`, `.github/workflows/ci.yml`, `.github/workflows/docs.yml` | Modified | DEP | TEST, DOC | Remediated (`start`, `verify:package`, `"zensical==0.0.74"`, `chmod +x mcp/index.js`) |
| `tests/*.mjs` (9 suites + `verify-package.mjs`) | Modified | TEST | MCP, RUN, SCRIPT, DEP | Remediated & verified (all passing exit 0) |
| `README.md`, `docs/*.md`, `docs/roles-and-workflows.md`, `docs/assets/*.svg`, `zensical.toml` | Modified / Added | DOC | SKILL, ARCH | Remediated (composition matrix, surface map, 5 aligned SVGs, `zensical.toml` `nav`) |
| `docs/reviews/pr5-independent-review.md`, `docs/reviews/pr5-layered-swarm-review.md` | Modified / Added | DOC | SKILL, SCRIPT | Remediated (`DOC-PR5-VIS-05` URL fix, Session 5 sync, readable prose/tables) |

### 2.2 Category Coverage Summary

| Cat | Coverage | P0 | P1 | P2 (Open) | P3 (Open) | Residual / Deferred (§8) | Category Verdict |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| ARCH | Full | 0 | 0 | 0 | 0 | `PR5-ARCH-04` Closed (By Design), `PR5-ARCH-05` Residual (Open), `PR5-ARCH-06` Deferred / Won't Fix | No findings within reviewed scope |
| DOC | Full | 0 | 0 | 0 | 0 | `DOC-LEDGER-RESIDUALS-OPEN` Closed (By Design) | No findings within reviewed scope |
| SKILL | Full | 0 | 0 | 0 | 0 | None | No findings within reviewed scope |
| MCP | Full | 0 | 0 | 0 | 0 | None | No findings within reviewed scope |
| RUN | Full | 0 | 0 | 0 | 0 | None | No findings within reviewed scope |
| SVC | Full | 0 | 0 | 0 | 0 | None | No findings within reviewed scope |
| DB | Full | 0 | 0 | 0 | 0 | None | Not applicable |
| SCRIPT | Full | 0 | 0 | 0 | 0 | `PR5-SCRIPT-02` Residual (Open) | No findings within reviewed scope |
| TEST | Full | 0 | 0 | 0 | 0 | None | No findings within reviewed scope |
| DEP | Full | 0 | 0 | 0 | 0 | None | No findings within reviewed scope |

---

## 3. Architecture-to-Implementation Trace

| Design Thesis / Requirement | `LEDGER.md` IDs | Public Contract | Implementation (`44e6df4` + Post-Pass Remediation) | Verification Executed |
| --- | --- | --- | --- | --- |
| Host-enforced workspace & FD containment; zero shared `/tmp` state | L1, L2, L4, L41 | `O_NOFOLLOW`, `O_NONBLOCK`, `/proc/self/fd/${fd}`, `scratch/agy-squad/` slots, `--teardown` | `mcp/dispatch.mjs`, `mcp/handoffs.mjs` containment & symlink checks | `npm test` (`test-dispatch`, `test-handoffs`, `test-run`), exit 0 |
| Native stop controls, transcript isolation & offline tests | L3, L5, L6, L7 | `/agents` & `/swarm kill` (`monitor`), raw `.system_generated/` isolated from `scratch/`, 0 real subagents in `npm test`, 4-check closure gate | `mcp/briefs.mjs`, `mcp/planner.mjs`, `docs/stopping-agents.md`, `docs/roles-and-workflows.md`, `swarm-governance/SKILL.md` | `npm test` offline exit 0; live 4-check closure verification |
| Retire Phase 1 PTY launcher & standalone handoff CLI cleanly | L17 | Reject `agy-squad run`; single CLI entrypoint `node bin/agy-squad.mjs`; remove `adversarial_*` legacy audit modes | `bin/terminal.py` & `mcp/run-state.mjs` deleted; `bin/agy-squad.mjs` adds `dispatch` & rejects `run`; `mcp/handoffs.mjs` library-only (`requireIntegrityAudit = true`) | `test-verdicts-and-pivot.mjs`, `test-handoffs.mjs`, `test-run.mjs` exit 0 |
| Deny-by-default admission, private package, Zensical docs parity & 2 MCP tools | L21, L29, L30, L31, L40 | `"private": true`, `dispatch_squad` & `squad_planner` only (`oneOf`), `zensical==0.0.74`, native enforcement tracked honestly | `package.json`, `mcp/index.js`, `zensical.toml`, `.github/workflows/docs.yml`, `docs/plans/native-enforcement-ledger.md` | `verify-package.mjs` (52 files), stdio `tools/list` probe, `zensical build` exit 0 |
| Native `/swarm` governance, strict verdicts, `<=24`-char pinning, overlap checks & SHA-256 bundles | L42, L43 | `squad_planner`, all 8 `agy-squad` subcommands, `knownModels`, `scopeOverlaps`, boolean `readOnly`, flat `audit-<id>` / `integrity_auditor`, neutral A3 topology rule | `mcp/planner.mjs`, `mcp/verdicts.mjs`, `mcp/handoffs.mjs`, `bin/agy-squad.mjs`, all 4 skills & 5 SVGs | `npm test` (9 scripts exit 0), `diagnose.mjs --markdown` (`HEALTHY`) |

---

## 4. Ten Category Sections

### 4.1 ARCH — Architecture and Contracts
- **Scope:** `docs/plans/LEDGER.md`, `docs/plans/native-enforcement-ledger.md`, retired `bin/terminal.py` & `mcp/run-state.mjs`, `mcp/dispatch.mjs`, `mcp/handoffs.mjs`.
- **Coverage:** Complete.
- **P1 — high priority:** None identified within reviewed scope.
- **P2 — medium priority:** None identified within reviewed scope.
- **P3 — low priority (Revalidated Closed):**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PR5-ARCH-01` | Revalidated (Session 5) | ARCH | Closed | `docs/tools.md`, `docs/concepts.md` | Prior finding: overstated `handoffs.mjs` attestation bounds | Revalidated closed (`docs/tools.md` & `docs/concepts.md` separate file integrity vs board authorship). | Bundle `bb21a371` |
| `PR5-ARCH-02` | Revalidated (Session 5) | ARCH | Closed | `mcp/planner.mjs` | Prior finding: disclose layered vs flat `/swarm` token cost | Revalidated closed (`notes` neutrally states layered leads vs flat tradeoffs per A3). | `npm test` exit 0 |
| `PR5-ARCH-03` | Revalidated (Session 5) | ARCH | Closed | `mcp/planner.mjs` | Prior finding: disclose Pointer-Over-Wire convention vs post-hoc `inspect` | Revalidated closed (`notes` states convention is post-hoc inspected). | `npm test` exit 0 |

- **Carried-Forward Non-Closed (see Section 8):** `PR5-ARCH-04` Closed (By Design), `PR5-ARCH-05` Residual (Open), `PR5-ARCH-06` Deferred / Won't Fix.
- **Verification:** `npm test` (`test-dispatch.mjs`, `test-handoffs.mjs` exit 0); missing proof: host enforcement `NE-01..NE-10`, `NE-12`.
- **Verdict:** No findings within reviewed scope

---

### 4.2 DOC — Documentation and Change Records
- **Scope:** `README.md`, `docs/*.md`, `docs/roles-and-workflows.md`, `docs/assets/*.svg`, `docs/plans/*.md`, `docs/reviews/pr5-*.md`.
- **Coverage:** Complete.
- **P1 — high priority:** None identified within reviewed scope.
- **P2 — medium priority (Closed Post-Remediation):**

#### `DOC-PR5-VIS-01`
- **Title, priority, status:** Sync `docs/reviews/pr5-independent-review.md` with `docs/visual-copywriting-pass` & Session 5 remediation — P2 — Closed
- **Contract provenance:** PR Review Standard v1.3.0 (`pr-review-standard.md` §1 Session Provenance & delta invalidation rule).
- **Source evidence:** `docs/reviews/pr5-independent-review.md` Session 5 provenance row, Section 6 verification summary, Section 7 disposition note, and Section 9 `pr5_review` row.
- **Trigger:** Merging `docs/visual-copywriting-pass` changes without updating `pr5-independent-review.md`.
- **Expected / actual:** Initially stopped at Session 4 (`44e6df4`, 42 files, 45 pack files); now records Session 5 continuation (52 pack files) and links `docs/reviews/pr5-layered-swarm-review.md`.
- **Impact:** Eliminated stale PR review metadata prior to merge.
- **Required remediation:** Completed in `docs/reviews/pr5-independent-review.md`.
- **Acceptance evidence:** `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort --ledger docs/reviews/pr5-independent-review.md --markdown` exits 0 (`HEALTHY`).
- **Root cause / related IDs:** `docs/visual-copywriting-pass` added on top of `44e6df4`.
- **Closure:** Closed.

- **P3 — low priority (All Closed Post-Remediation / By-Design):**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DOC-PR5-VIS-02` | `pr5_review` (Session 5) | DOC | Closed | `docs/tools.md`, `docs/assets/manifest-and-modes.svg` | Diagram omitted `dispatch_squad` and mixed MCP args with CLI flags | Updated `manifest-and-modes.svg` to separate `squad_planner` vs `dispatch_squad`, `readOnly`-aware overlaps, and outputs. | SVG XML valid; `zensical build` exit 0 |
| `DOC-PR5-VIS-03` | `pr5_review` (Session 5) | DOC | Closed | `docs/assets/architecture-overview.svg` | `NODE A3` omitted CLI subcommands and bidirectional return arrows | Updated `architecture-overview.svg` with all 8 CLI subcommands plus return arrows (`READY <=500B & verify`, `hook rewrite & logs`). | SVG XML valid; `zensical build` exit 0 |
| `DOC-PR5-VIS-04` | `pr5_review` (Session 5) | DOC | Closed | `zensical.toml`, `docs/plans/native-enforcement-ledger.md` | Merged (`DEP-PR5-WC-02`): `native-enforcement-ledger.md` omitted from `zensical.toml` `nav` | Added Native Enforcement Ledger to `zensical.toml` `nav` and checked on disk via `diagnose.mjs`. | `zensical build` & `diagnose.mjs` exit 0 |
| `DOC-PR5-VIS-05` | `pr5_review` (Session 5) | DOC | Closed | `docs/reviews/pr5-independent-review.md` | Relative `../../.agents/...` link escaped `docs/` and warned under Zensical `--strict` | Switched link in `pr5-independent-review.md` to canonical GitHub blob URL. | `zensical build --strict` drops from 45 to 44 pre-PR5 issues |
| `DOC-PR5-VIS-06` | `pr5_review` (Session 5) | DOC | Closed | `docs/stopping-agents.md`, `docs/roles-and-workflows.md` | Closure checklist named `monitor-*` only instead of native `monitor` | Updated both docs and `swarm-governance/SKILL.md` to name `monitor` (and `monitor-*`). | `diagnose.mjs` & `test-run.mjs` exit 0 |
| `PR5-DOC-01` | Revalidated (Session 5) | DOC | Closed | `README.md`, `docs/*.md` | Prior finding: stale launcher-era teardown/benchmark claims | Revalidated closed and refreshed across PR #5 & Decisions A1–A4. | Bundle `bb21a371` |
| `PR5-DOC-02` | Revalidated (Session 5) | DOC | Closed | `docs/benchmarks.md`, `benchmarks/teamwork-vs-squad/README.md` | Prior finding: Phase 1 vs Phase 2 benchmark labeling | Revalidated closed. | Bundle `bb21a371` |
| `PR5-DOC-03` | Revalidated (Session 5) | DOC | Closed | `docs/plans/comparative-harness-architecture*.md` | Prior finding: historical banners on retired harness docs | Revalidated closed. | Bundle `bb21a371` |
| `PR5-DOC-04` | Revalidated (Session 5) | DOC | Closed | `docs/plans/wsl-cli-verification.md` | Prior finding: trial verification doc parity | Revalidated closed (`mcp/handoffs.mjs` noted as Phase 1 history). | Bundle `bb21a371` |
| `R3-DOC-01` | Revalidated (Session 5) | DOC | Closed | `docs/index.md` | Prior finding: stale `--launch` reference | Revalidated closed. | Bundle `bb21a371` |
| `R3-DOC-02` | Revalidated (Session 5) | DOC | Closed | `docs/reviews/pr5-independent-review.md` | Prior finding: full v1.3.0 ledger expansion | Revalidated closed. | Bundle `bb21a371` |
| `R3-DOC-03` | Revalidated (Session 5) | DOC | Closed | `docs/reviews/pr5-independent-review.md` | Prior finding: Section 1/9 metadata & sort note | Revalidated closed. | Bundle `bb21a371` |
| `R3-DOC-04` | Revalidated (Session 5) | DOC | Closed | `docs/plans/native-enforcement-ledger.md` | Prior finding: `grep -rnI swarm` flag | Revalidated closed. | Bundle `bb21a371` |
| `R3-DOC-05` | Revalidated (Session 5) | DOC | Closed | `docs/reviews/pr5-phase2-swarm-planner-review.md` | Prior finding: stale remaining-gap bullet | Revalidated closed. | Bundle `bb21a371` |

- **Carried-Forward Non-Closed (see Section 8):** `DOC-LEDGER-RESIDUALS-OPEN` Closed (By Design).
- **Verification:** `zensical build` exit 0, 5/5 SVG XML check passed, `diagnose.mjs --allow-active-cohort --ledger docs/reviews/pr5-layered-swarm-review.md --markdown` exit 0 (`HEALTHY`).
- **Verdict:** No findings within reviewed scope

---

### 4.3 SKILL — Skills and Agent Instructions
- **Scope:** `.agents/skills/full-review/**`, `.agents/skills/pr-review/**`, `.agents/skills/self-diagnosis/**`, `.agents/skills/swarm-governance/SKILL.md`.
- **Coverage:** Complete.
- **P1 — high priority:** None identified within reviewed scope.
- **P2 — medium priority:** None identified within reviewed scope.
- **P3 — low priority (All Closed Post-Remediation):**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SKILL-PR5-VIS-01` | `pr5_review` (Session 5) | SKILL | Closed | `.agents/skills/swarm-governance/SKILL.md` | Referred to flat auditor as `integrity-auditor` rather than `audit-<id>` | Aligned `swarm-governance/SKILL.md` to canonical `audit-<id>` (and `integrity_auditor[:<id>]`). | `diagnose.mjs` exit 0 |
| `SKILL-PR5-VIS-02` | `pr5_review` (Session 5) | SKILL | Closed | `.agents/skills/swarm-governance/SKILL.md` | Closure step 1 specified `monitor-*` only | Updated to `monitor` (and `monitor-*`). | `diagnose.mjs` & `test-run.mjs` exit 0 |
| `SKILL-PR5-VIS-03` | `pr5_review` (Session 5->6) | SKILL | Closed | `.agents/skills/self-diagnosis/SKILL.md` | Pointed to `node mcp/handoffs.mjs` rather than `node bin/agy-squad.mjs` | Initial Session 5 update left legacy flags on lines 30, 76–81 (`SKILL-VERIFY-01`); fully fixed to exact `bin/agy-squad.mjs` syntax in Session 6 | `npm test`, `diagnose.mjs` & CLI help/flags exit 0 |
| `SKILL-PR5-VIS-04` | `pr5_review` (Session 5) | SKILL | Closed | `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | Read-only diagnostic specialists omitted `"readOnly": true` | Added `"readOnly": true` to all 6 read-only audit specialists in manifest. | `agy-squad plan` & `diagnose.mjs` exit 0 |
| `SKILL-PR5-VIS-05` | `pr5_review` (Session 5) | SKILL | Closed | `.agents/skills/pr-review/SKILL.md`, `.agents/skills/full-review/SKILL.md` | Stale Mandatory Adversarial Review Gate label; `full-review/SKILL.md` at 12,106 B | Updated gate label; trimmed `full-review/SKILL.md` (8,540 B) and `self-diagnosis/SKILL.md` (9,246 B) under 10,240 B cap with Task-Spec/Modifier framing. | `diagnose.mjs` exit 0 |
| `PR5-SKILL-01` | Revalidated (Session 5) | SKILL | Closed | `.agents/skills/swarm-governance/SKILL.md` | Prior finding: `swarm-governance` pointer-over-wire & model caveats | Revalidated closed. | Bundle `bb21a371` |

- **Verification:** `diagnose.mjs --allow-active-cohort --markdown` (0 broken links, 0 retired symbol drift hits, all 4 `SKILL.md` files under 10,240 B / <=100 lines), `npm test` (`test-run.mjs` exit 0).
- **Verdict:** No findings within reviewed scope

---

### 4.4 MCP — MCP Schemas and Public API
- **Scope:** `mcp/index.js`, `mcp/planner.mjs`, `mcp/briefs.mjs`.
- **Coverage:** Complete.
- **P1 — high priority:** None identified within reviewed scope.
- **P2 — medium priority:** None identified within reviewed scope.
- **P3 — low priority (All Closed Post-Remediation):**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `S1-MCP-01` | `pr5_review` (Session 5) | MCP | Closed | `mcp/index.js` | `writeOversizedError` hardcoded "10MB safety ceiling" even when `AGY_MAX_STDIO_PAYLOAD_BYTES` overrode limit | Interpolated `${MAX_STDIO_PAYLOAD_BYTES}-byte safety ceiling` dynamically. | `test-server.mjs` (`2048-byte safety ceiling` assertion) exit 0 |
| `S1-MCP-02` | `pr5_review` (Session 5) | MCP | Closed | `mcp/index.js`, `mcp/planner.mjs` | `squad_planner.inputSchema` used `anyOf` rather than `oneOf` and lacked property descriptions | Switched to `oneOf`, added property descriptions, removed `adversarial_*` schema references. | `test-server.mjs` `tools/list` assertion exit 0 |
| `MCP-PR5-01` | Revalidated (Session 5) | MCP | Closed | `mcp/planner.mjs` | Prior finding: explicit `model` validation & `workspaceIsolation` (`inherit`, `share`, `branch`) | Revalidated closed. | `test-planner.mjs` exit 0 |
| `MCP-PR5-02` | Revalidated (Session 5) | MCP | Closed | `mcp/planner.mjs` | Prior finding: `scopeOverlaps` normalized containment (`scopesOverlap`) | Revalidated closed. | `test-planner.mjs` exit 0 |
| `MCP-PR5-03` | Revalidated (Session 5) | MCP | Closed | `mcp/planner.mjs` | Prior finding: empty whitespace `knownModels` validation | Revalidated closed. | `test-planner.mjs` exit 0 |
| `PR5-MCP-01` | Revalidated (Session 5) | MCP | Closed | `mcp/planner.mjs` | Prior finding: `knownModels` validation & preflight guidance | Revalidated closed. | `test-planner.mjs` exit 0 |
| `MCP-PR5-R3-01` | Revalidated (Session 5) | MCP | Closed | `mcp/planner.mjs` | Prior finding: `modelProvenance.caveat` wording on per-worker specs | Revalidated closed. | `test-planner.mjs` exit 0 |

- **Verification:** `tests/test-server.mjs`, `tests/test-planner.mjs` exit 0.
- **Verdict:** No findings within reviewed scope

---

### 4.5 RUN — Core Runtime, Parsing, and Validation
- **Scope:** `mcp/dispatch.mjs`, `mcp/handoffs.mjs`, `mcp/verdicts.mjs`, `bin/agy-squad.mjs`.
- **Coverage:** Complete.
- **P1 — high priority:** None identified within reviewed scope.
- **P2 — medium priority:** None identified within reviewed scope.
- **P3 — low priority (All Closed Post-Remediation):**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `S1-RUN-01` | `pr5_review` (Session 5) | RUN | Closed | `mcp/handoffs.mjs`, `bin/agy-squad.mjs` | `mcp/handoffs.mjs` standalone CLI left `requireIntegrityAudit` optional (`undefined`) vs `bin/agy-squad.mjs` default `true` | Removed standalone `mcp/handoffs.mjs` CLI (Decision A2) and defaulted `requireIntegrityAudit = true` inside `bundleReports`. | `test-handoffs.mjs` & `test-verdicts-and-pivot.mjs` exit 0 |
| `RUN-PR5-01` | Revalidated (Session 5) | RUN | Closed | `mcp/handoffs.mjs`, `mcp/planner.mjs` | Prior finding: unvalidated `reportRoot` traversal | Revalidated closed (`normalizeReportRoot`). | `npm test` exit 0 |
| `RUN-PR5-02` | Revalidated (Session 5) | RUN | Closed | `mcp/handoffs.mjs` | Prior finding: custom `reportRoot` admitted default `scratch/agy-squad` | Revalidated closed (`allowedRoots`). | `npm test` exit 0 |
| `PR5-RUN-01` | Revalidated (Session 5) | RUN | Closed | `mcp/planner.mjs` | Prior finding: native `swarm{action: "add"}` rejects names > 24 chars | Revalidated closed (`MAX_SWARM_NAME_LENGTH = 24`). | `test-planner.mjs` exit 0 |

- **Verification:** `tests/test-handoffs.mjs`, `tests/test-verdicts-and-pivot.mjs` exit 0.
- **Verdict:** No findings within reviewed scope

---

### 4.6 SVC — Services, Orchestration, and Audit Semantics
- **Scope:** `mcp/briefs.mjs`, `mcp/dispatch.mjs`, `mcp/planner.mjs`, `mcp/handoffs.mjs`.
- **Coverage:** Complete.
- **P1 — high priority:** None identified within reviewed scope.
- **P2 — medium priority:** None identified within reviewed scope.
- **P3 — low priority (All Closed Post-Remediation):**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `S1-SVC-01` | `pr5_review` (Session 5) | SVC | Closed | `mcp/planner.mjs` | `planSquadCohort` treated non-boolean `spec.readOnly` (e.g., `"true"`) as writable silently | Added strict boolean validation on `spec.readOnly` (both lead & specialists). | `test-planner.mjs` exit 0 |
| `SVC-PR5-01` | Revalidated (Session 5) | SVC | Closed | `mcp/planner.mjs` | Prior finding: colliding `workerName` slugs across manifest | Revalidated closed (`allocateWorkerName`). | `test-planner.mjs` exit 0 |
| `SVC-PR5-02` | Revalidated (Session 5) | SVC | Closed | `mcp/planner.mjs`, `mcp/briefs.mjs` | Prior finding: inline manifests told leads to call `dispatch_squad` with `"inline-manifest"` | Revalidated closed (`hasManifestFile` guard + swarm `superviseSwarmCohort`). | `test-planner.mjs` & `test-dispatch.mjs` exit 0 |

- **Verification:** `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, `tests/test-verdicts-and-pivot.mjs` exit 0.
- **Verdict:** No findings within reviewed scope

---

### 4.7 DB — Database, Migrations, Replay, and Concurrency
- **Scope:** Entire repository (0 SQL/database dependencies; filesystem state audited under RUN and SVC).
- **Coverage:** Complete.
- **P1 — high priority:** None identified (Not applicable).
- **P2 — medium priority:** None identified (Not applicable).
- **P3 — low priority:** None identified (Not applicable).
- **Verification:** `package.json` dependency inspection (0 DB packages).
- **Verdict:** Not applicable (0 SQL/database persistence layers).

---

### 4.8 SCRIPT — Scripts, Evaluation, and Developer Tooling
- **Scope:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs`, `bin/agy-squad.mjs`, `benchmarks/teamwork-vs-squad/README.md`.
- **Coverage:** Complete.
- **P1 — high priority:** None identified within reviewed scope.
- **P2 — medium priority (Closed Post-Remediation):**

#### `SCRIPT-PR5-WC-01`
- **Title, priority, status:** Split duplicate `DOC-CLOSURE-CHECKLIST` finding ID across two checked docs in `diagnose.mjs` — P2 — Closed
- **Contract provenance:** PR Review Standard v1.3.0 (1 ID = 1 Row / Record) and `diagnose.mjs` `validateTargetReviewLedger` duplicate-ID guard.
- **Source evidence:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs` (`DOC-CLOSURE-CHECKLIST-stopping-agents` and `DOC-CLOSURE-CHECKLIST-roles-and-workflows`).
- **Trigger:** Simultaneous closure-section failure in both `docs/stopping-agents.md` and `docs/roles-and-workflows.md`.
- **Expected / actual:** Originally reused `"DOC-CLOSURE-CHECKLIST"` for both files; now emits distinct per-file IDs.
- **Impact:** Prevents duplicate finding IDs in ledger validation.
- **Required remediation:** Completed in `diagnose.mjs` and verified in `tests/test-run.mjs`.
- **Acceptance evidence:** `node tests/test-run.mjs` mutates both docs and asserts both distinct IDs (`DOC-CLOSURE-CHECKLIST-stopping-agents`, `DOC-CLOSURE-CHECKLIST-roles-and-workflows`) pass (exit 0).
- **Root cause / related IDs:** Related to `TEST-PR5-WC-01`.
- **Closure:** Closed.

- **P3 — low priority (All Closed Post-Remediation):**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SCRIPT-PR5-WC-02` | `pr5_review` (Session 5) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `#anchor` validation limited to `docs/roles-and-workflows.md`; `slugifyHeading()` collapsed spaces differently from GFM `--` | Extended `#anchor` check to all relative `.md` links in `checkRelativeLinks` and aligned `slugifyHeading` (`\s` to `-`). | `diagnose.mjs` & `test-run.mjs` exit 0 |
| `SCRIPT-PR5-03` | `pr5_review` (Session 5) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `runSquadCanaryAndOptimization()` used exact string match for `scopeFiles` overlaps | Imported `scopesOverlap()` from `mcp/planner.mjs` and skipped `readOnly === true` specs. | `diagnose.mjs` & `test-run.mjs` exit 0 |
| `SCRIPT-PR5-04` | `pr5_review` (Session 5) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `auditSkills()` did not check `zensical.toml` `nav` entries or `docs/assets/*.svg` references | Added `zensical.toml` `nav` existence & `docs/assets/*.svg` XML/reference checks to `diagnose.mjs`. | `diagnose.mjs` exit 0 |
| `R3-SCRIPT-01` | Revalidated (Session 5) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Prior finding: equal-mtime fresh checkout selected PR #1 `-r2` ledger | Revalidated closed (`prNumber` descending sort). | `tests/test-run.mjs` exit 0 |
| `R3-SCRIPT-02` | Revalidated (Session 5) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Prior finding: `validateTargetReviewLedger` skipped Sections 5–7 | Revalidated closed. | `diagnose.mjs` exit 0 |

- **Carried-Forward Non-Closed (see Section 8):** `PR5-SCRIPT-02` Residual (Open) (`NE-08`).
- **Verification:** `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort --markdown` (`HEALTHY`), `node tests/test-run.mjs` exit 0.
- **Verdict:** No findings within reviewed scope

---

### 4.9 TEST — Tests and CI
- **Scope:** `tests/*.mjs`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs`.
- **Coverage:** Complete.
- **P1 — high priority:** None identified within reviewed scope.
- **P2 — medium priority:** None identified within reviewed scope.
- **P3 — low priority (All Closed Post-Remediation):**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `TEST-PR5-WC-01` | `pr5_review` (Session 5) | TEST | Closed | `tests/test-run.mjs` | Closure tests did not mutate `docs/roles-and-workflows.md` or assert unique finding IDs | Added dual-doc closure mutation assertions (`DOC-CLOSURE-CHECKLIST-stopping-agents` & `DOC-CLOSURE-CHECKLIST-roles-and-workflows`) in `tests/test-run.mjs`. | `tests/test-run.mjs` exit 0 |
| `TEST-PR5-WC-02` | `pr5_review` (Session 5) | TEST | Closed | `tests/verify-package.mjs` | `REQUIRED` omitted `.agents/skills/full-review/SKILL.md` and `docs/roles-and-workflows.md` | Expanded `REQUIRED` with `full-review/SKILL.md` & `docs/roles-and-workflows.md` (52 packaged files verified). | `npm run verify:package` exit 0 |
| `TEST-PR5-03` | `pr5_review` (Session 5) | TEST | Closed | `tests/test-run.mjs` | Regex replacement assumed another `## ` heading followed checklist in docs | Updated closure section test regexes to match `(?=\n## \|$)` / `(?=\n#{2,3} \|$)`. | `tests/test-run.mjs` exit 0 |
| `TEST-P3-MCP-KNOWNMODELS` | Revalidated (Session 5) | TEST | Closed | `tests/test-server.mjs` | Prior finding: live stdio `squad_planner` test omitted `knownModels` | Revalidated closed. | `npm test` exit 0 |
| `TEST-P3-PER-SPEC-KNOWNMODELS` | Revalidated (Session 5) | TEST | Closed | `tests/test-planner.mjs` | Prior finding: per-spec `model` vs `knownModels` test | Revalidated closed. | `npm test` exit 0 |

- **Verification:** `npm test` (9 scripts pass exit 0), `npm run verify:package` (exit 0). Missing proof: `L7` automated real-subagent tests (prohibited by `L7`), post-commit remote CI run.
- **Verdict:** No findings within reviewed scope

---

### 4.10 DEP — Dependencies, Packaging, and Configuration
- **Scope:** `package.json`, `.github/workflows/ci.yml`, `.github/workflows/docs.yml`, `zensical.toml`.
- **Coverage:** Complete.
- **P1 — high priority:** None identified within reviewed scope.
- **P2 — medium priority:** None identified within reviewed scope.
- **P3 — low priority (All Closed Post-Remediation):**

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DEP-PR5-01` | `pr5_review` (Session 5) | DEP | Closed | `.github/workflows/docs.yml` | Unpinned `pip install zensical` in docs workflow | Pinned `pip install "zensical==0.0.74"` in `.github/workflows/docs.yml` (kept non-strict build because 44 pre-PR5 historical anchor warnings live in `plans/comparative-harness-architecture*.md` and `reviews/pr3-*.md`). | `zensical build` exit 0 |
| `DEP-PR5-03` | `pr5_review` (Session 5) | DEP | Closed | `package.json`, `docs/getting-started.md` | Python `zensical` prerequisite for `npm run docs` undocumented for contributors | Documented `Python 3.11+` + `pip install "zensical==0.0.74"` prerequisite in `docs/getting-started.md` compatibility matrix; added `"start"` & `"verify:package"` scripts in `package.json`. | `npm run verify:package` exit 0 |

*(Note: `DEP-PR5-WC-02` regarding `zensical.toml` `nav` omitting `plans/native-enforcement-ledger.md` was merged into `DOC-PR5-VIS-04`.)*

- **Verification:** `npm run verify:package` (52 files, exit 0), `zensical build` (exit 0, 0 nav warnings).
- **Verdict:** No findings within reviewed scope

---

## 5. Cross-Category Root Causes and Remediation Order

1. **Uncommitted `docs/visual-copywriting-pass` additions + Phase 1 leftover drift:** Adding `docs/roles-and-workflows.md`, 5 SVG diagrams, and closure-checklist assertions after `44e6df4` created duplicate `DOC-CLOSURE-CHECKLIST` IDs and left `docs/reviews/pr5-independent-review.md` pinned to Session 4, while legacy Phase 1 artifacts (`adversarial_*`, standalone `mcp/handoffs.mjs` CLI, Flat/Layered bias, overlapping skill discoverability) remained unresolved.
2. **Completed remediation sequence (Session 5):**
   - **Step 1 (Decisions A1–A4 & Runtime/CLI fixes):** Removed `adversarial_*` & standalone `mcp/handoffs.mjs` CLI; added `node bin/agy-squad.mjs dispatch`; enforced boolean `readOnly`, `oneOf` schema, dynamic stdio byte ceiling, neutral A3 topology framing, and `requireIntegrityAudit = true` default.
   - **Step 2 (`SCRIPT-PR5-WC-01`, `SCRIPT-PR5-WC-02`, `SCRIPT-PR5-03`, `SCRIPT-PR5-04`, `TEST-PR5-*`):** Split closure IDs in `diagnose.mjs`, added GFM anchor/nav/SVG/overlap checks, and added matching regression suites.
   - **Step 3 (Skills, Docs, SVGs, & Ledgers):** Added upfront Task-Spec vs Execution-Modifier & MCP/CLI surface maps across skills/docs, fixed all 5 SVGs, trimmed `full-review/SKILL.md` (8,540 B) and `self-diagnosis/SKILL.md` (9,246 B), pinned `zensical==0.0.74`, fixed `DOC-PR5-VIS-05`, eliminated readability backtick clutter, and synchronized `pr5-independent-review.md` & `pr5-layered-swarm-review.md`.

---

## 6. Verification Record and Remaining Gaps

1. `npm test`: Exit 0 (9 scripts pass: `verdicts-and-pivot`, `dispatch`, `planner`, `handoffs`, `run`, `server`, `comparative-dossier` 20/20, `verify-benchmark.mjs`, `verify-package.mjs --self-test`).
2. `npm run verify:package`: Exit 0 (positive + 7 negative self-tests; 52 packaged files verified in `npm pack --dry-run --json`).
3. `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort --markdown`: Exit 0 (Status: `HEALTHY`, 0 P1/P2, and 1 advisory P3 `DOC-LEDGER-RESIDUALS-OPEN` in both `pr5-independent-review.md` and `--ledger docs/reviews/pr5-layered-swarm-review.md` tracking open §8 residuals `PR5-ARCH-05` and `PR5-SCRIPT-02`).
4. CLI & stdio probes: `node bin/agy-squad.mjs --help` / `dispatch` / `plan` / `verdict` / `bundle` / `verify` / `prune` and `node mcp/index.js` stdio tests pass exit 0.
5. Local Zensical & SVG checks: `zensical build` (0.0.74) exit 0 (0 nav warnings; `DOC-PR5-VIS-05` fixed); 5/5 SVGs valid XML via `xml.etree.ElementTree`.
6. **4-check runtime closure gate:** `swarm{action: "status"}` confirms all `pr5_review` (6/6) and `pr5_verify` (6/6, incl. `monitor-3` & `audit-pr5-verify`) workers killed, `manage_subagents(Action='list')` reports 0 active subagents, `manage_task(Action='list')` reports 0 running tasks, and no child commands linger.
7. **Remaining gaps:** Remote GitHub Actions CI run post-commit; `L7` offline constraint (no real subagents in `npm test`); host enforcement spikes `NE-01..NE-10`, `NE-12` (`docs/plans/native-enforcement-ledger.md`).

---

## 7. Overall Disposition and Finding Closure Table

- **Overall PR Review Disposition:** **Approve** (0 open P1 or P2 blockers; 0 open P3 items; 65 §7 closed entries [27 revalidated + 24 Session 5 + 14 Session 6] across all 10 categories, plus 29 Session 7 closed rows in §9; 17 by-design / host-boundary residual / deferred / informational records tracked in §8).

| ID | Cat | Priority | Status | Source | Summary |
| --- | :---: | :---: | --- | --- | --- |
| `DOC-PR5-VIS-01` | DOC | P2 | Closed | `docs/reviews/pr5-independent-review.md` | Synchronized Session 5 `docs/visual-copywriting-pass` & A1–A4 provenance, pack count (52), and `pr5-layered-swarm-review.md` link |
| `SCRIPT-PR5-WC-01` | SCRIPT | P2 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Split duplicate `DOC-CLOSURE-CHECKLIST` into `DOC-CLOSURE-CHECKLIST-stopping-agents` & `DOC-CLOSURE-CHECKLIST-roles-and-workflows` |
| `DOC-PR5-VIS-02` | DOC | P3 | Closed | `docs/tools.md`, `docs/assets/manifest-and-modes.svg` | Separated `squad_planner` vs `dispatch_squad`, `readOnly`-aware overlaps, and outputs in diagram |
| `DOC-PR5-VIS-03` | DOC | P3 | Closed | `docs/assets/architecture-overview.svg` | Updated `NODE A3` with all 8 CLI subcommands plus bidirectional verification & hook return arrows |
| `DOC-PR5-VIS-04` | DOC | P3 | Closed | `zensical.toml`, `docs/plans/native-enforcement-ledger.md` | Added Native Enforcement Ledger to `zensical.toml` `nav` (merged `DEP-PR5-WC-02`) |
| `DOC-PR5-VIS-05` | DOC | P3 | Closed | `docs/reviews/pr5-independent-review.md` | Replaced relative `../../.agents/...` link with canonical GitHub blob URL |
| `DOC-PR5-VIS-06` | DOC | P3 | Closed | `docs/stopping-agents.md`, `docs/roles-and-workflows.md` | Updated closure checklist monitor wording to cover native `monitor` and `monitor-*` |
| `SKILL-PR5-VIS-01` | SKILL | P3 | Closed | `.agents/skills/swarm-governance/SKILL.md` | Aligned flat auditor worker name to canonical `audit-<id>` (and `integrity_auditor[:<id>]`) |
| `SKILL-PR5-VIS-02` | SKILL | P3 | Closed | `.agents/skills/swarm-governance/SKILL.md` | Updated closure step 1 to cite `monitor` (and `monitor-*`) |
| `SKILL-PR5-VIS-03` | SKILL | P3 | Closed | `.agents/skills/self-diagnosis/SKILL.md` | Migrated `self-diagnosis/SKILL.md` & rubric to `node bin/agy-squad.mjs` & `--print-plan` primary |
| `SKILL-PR5-VIS-04` | SKILL | P3 | Closed | `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | Added `"readOnly": true` to all 6 read-only diagnostic specialists |
| `SKILL-PR5-VIS-05` | SKILL | P3 | Closed | `.agents/skills/pr-review/SKILL.md`, `.agents/skills/full-review/SKILL.md` | Updated Mandatory Flat Integrity Auditor Gate label; trimmed `full-review/SKILL.md` (Session 5: 8,540 B; current: 8,750 B) and `self-diagnosis/SKILL.md` (Session 5: 9,246 B; Session 7 `SD-OPT-03`: 8,774 B) |
| `S1-MCP-01` | MCP | P3 | Closed | `mcp/index.js` | Interpolated dynamic `${MAX_STDIO_PAYLOAD_BYTES}-byte safety ceiling` in `writeOversizedError` |
| `S1-MCP-02` | MCP | P3 | Closed | `mcp/index.js`, `mcp/planner.mjs` | Switched `squad_planner.inputSchema` to `oneOf` and added property descriptions |
| `S1-RUN-01` | RUN | P3 | Closed | `mcp/handoffs.mjs`, `bin/agy-squad.mjs` | Removed standalone `mcp/handoffs.mjs` CLI (Decision A2) and defaulted `requireIntegrityAudit = true` |
| `S1-SVC-01` | SVC | P3 | Closed | `mcp/planner.mjs` | Rejected non-boolean `spec.readOnly` with explicit validation error |
| `SCRIPT-PR5-WC-02` | SCRIPT | P3 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Extended `#anchor` check across relative `.md` links and aligned `slugifyHeading` (`\s` to `-`) |
| `SCRIPT-PR5-03` | SCRIPT | P3 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Reused `scopesOverlap()` from `mcp/planner.mjs` in canary overlap checks |
| `SCRIPT-PR5-04` | SCRIPT | P3 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Added `zensical.toml` `nav` target and `docs/assets/*.svg` XML/reference checks |
| `TEST-PR5-WC-01` | TEST | P3 | Closed | `tests/test-run.mjs` | Added dual-doc closure mutation assertions asserting unique finding IDs |
| `TEST-PR5-WC-02` | TEST | P3 | Closed | `tests/verify-package.mjs` | Added `.agents/skills/full-review/SKILL.md` and `docs/roles-and-workflows.md` to `REQUIRED` |
| `TEST-PR5-03` | TEST | P3 | Closed | `tests/test-run.mjs` | Updated closure section regexes to handle EOF or nested subsections |
| `DEP-PR5-01` | DEP | P3 | Closed | `.github/workflows/docs.yml` | Pinned `zensical==0.0.74` in docs workflow |
| `DEP-PR5-03` | DEP | P3 | Closed | `docs/getting-started.md`, `package.json` | Documented `Python 3.11+` + `zensical==0.0.74` prerequisite for `npm run docs`; added `start` & `verify:package` scripts |
| `PR5-ARCH-01` | ARCH | P3 | Closed | `docs/tools.md`, `docs/concepts.md` | Revalidated closed |
| `PR5-ARCH-02` | ARCH | P3 | Closed | `mcp/planner.mjs` | Revalidated closed |
| `PR5-ARCH-03` | ARCH | P3 | Closed | `mcp/planner.mjs` | Revalidated closed |
| `PR5-DOC-01` | DOC | P2 | Closed | `README.md`, `docs/*.md` | Revalidated closed |
| `PR5-DOC-02` | DOC | P2 | Closed | `docs/benchmarks.md`, `benchmarks/teamwork-vs-squad/README.md` | Revalidated closed |
| `PR5-DOC-03` | DOC | P3 | Closed | `docs/plans/comparative-harness-architecture*.md` | Revalidated closed |
| `PR5-DOC-04` | DOC | P2 | Closed | `docs/plans/wsl-cli-verification.md` | Revalidated closed |
| `R3-DOC-01` | DOC | P2 | Closed | `docs/index.md` | Revalidated closed |
| `R3-DOC-02` | DOC | P2 | Closed | `docs/reviews/pr5-independent-review.md` | Revalidated closed |
| `R3-DOC-03` | DOC | P3 | Closed | `docs/reviews/pr5-independent-review.md` | Revalidated closed |
| `R3-DOC-04` | DOC | P3 | Closed | `docs/plans/native-enforcement-ledger.md` | Revalidated closed |
| `R3-DOC-05` | DOC | P3 | Closed | `docs/reviews/pr5-phase2-swarm-planner-review.md` | Revalidated closed |
| `PR5-SKILL-01` | SKILL | P3 | Closed | `.agents/skills/swarm-governance/SKILL.md` | Revalidated closed |
| `MCP-PR5-01` | MCP | P2 | Closed | `mcp/planner.mjs` | Revalidated closed |
| `MCP-PR5-02` | MCP | P2 | Closed | `mcp/planner.mjs` | Revalidated closed |
| `MCP-PR5-03` | MCP | P3 | Closed | `mcp/planner.mjs` | Revalidated closed |
| `PR5-MCP-01` | MCP | P3 | Closed | `mcp/planner.mjs` | Revalidated closed |
| `MCP-PR5-R3-01` | MCP | P3 | Closed | `mcp/planner.mjs` | Revalidated closed |
| `RUN-PR5-01` | RUN | P1 | Closed | `mcp/handoffs.mjs`, `mcp/planner.mjs` | Revalidated closed |
| `RUN-PR5-02` | RUN | P3 | Closed | `mcp/handoffs.mjs` | Revalidated closed |
| `PR5-RUN-01` | RUN | P2 | Closed | `mcp/planner.mjs` | Revalidated closed |
| `SVC-PR5-01` | SVC | P1 | Closed | `mcp/planner.mjs` | Revalidated closed |
| `SVC-PR5-02` | SVC | P2 | Closed | `mcp/planner.mjs`, `mcp/briefs.mjs` | Revalidated closed |
| `R3-SCRIPT-01` | SCRIPT | P2 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Revalidated closed |
| `R3-SCRIPT-02` | SCRIPT | P3 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Revalidated closed |
| `TEST-P3-MCP-KNOWNMODELS` | TEST | P3 | Closed | `tests/test-server.mjs` | Revalidated closed |
| `TEST-P3-PER-SPEC-KNOWNMODELS` | TEST | P3 | Closed | `tests/test-planner.mjs` | Revalidated closed |
| `SKILL-VERIFY-01` | SKILL | P2 | Closed | `.agents/skills/self-diagnosis/SKILL.md` | Replaced invalid Session 5 CLI flags at lines 30, 76–81 with exact `bin/agy-squad.mjs` arguments |
| `SWARM-UI-SURFACE` | SKILL | P2 | Closed | `.agents/skills/*/SKILL.md`, `docs/roles-and-workflows.md` | Added mandatory launch-turn rule to surface `open_board` (`[Open the Swarm UI](sidecar://swarm/swarm_board/)`) on its own line |
| `SKILL-VERIFY-02` | SKILL | P3 | Closed | `.agents/skills/self-diagnosis/resources/comparative-research-manifest.json` | Changed line 14 `expectedDeliverable` from `PASS` bias to `PASS \| FAIL \| BLOCKED` |
| `PR5-VER-ARCH-01` | ARCH | P3 | Closed | `docs/plans/LEDGER.md` | Added `dispatch` to `L42` `bin/agy-squad.mjs` CLI subcommand list |
| `PR5-VER-ARCH-02` | ARCH | P3 | Closed | `mcp/handoffs.mjs` | Documented read-only legacy pre-Phase-2 `parsed.adversarialReview` compatibility in `verifyBundleInternal` |
| `PR5-VER-ARCH-03` | ARCH | P3 | Closed | `mcp/planner.mjs`, `tests/test-planner.mjs` | Aligned `L6 enforced` string at line 636 to `L6 convention` matching `native-enforcement-ledger.md` |
| `DOC-VERIFY-01` | DOC | P3 | Closed | `docs/reviews/pr5-independent-review.md` | Removed plain numeric/status/category inline backtick pills while preserving code identifiers and paths |
| `DOC-VERIFY-02` | DOC | P3 | Closed | `docs/reviews/pr5-layered-swarm-review.md` | Corrected §1/§7 counts (`51` -> `65` §7 + `5` §8 = `70`) and updated `SKILL-PR5-VIS-03` completion status |
| `DOC-VERIFY-03` | DOC | P3 | Closed | `docs/assets/skill-role-workflows.svg`, `docs/assets/role-and-verdict-gate.svg` | Widened `AUD` and `AU` auditor boxes from 224 px to 256 px (`x="-128"`) for clean padding |
| `DOC-VERIFY-04` | DOC | P3 | Closed | `docs/reviews/pr5-layered-swarm-review.md` | Updated line 326 to reflect 1 advisory P3 (`DOC-LEDGER-RESIDUALS-OPEN`) when checking `--ledger` |
| `V6-SCRIPT-01` | SCRIPT | P3 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Added same-file `#anchor` links, `[label](url)` heading stripping, and duplicate heading suffix support |
| `V6-SCRIPT-02` | SCRIPT | P3 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Excluded `docs/reviews/` from `DOC-SVG-ORPHAN-*` coverage scan |
| `V6-TEST-01` | TEST | P3 | Closed | `tests/test-run.mjs` | Added negative-branch assertions for `DOC-SVG-ORPHAN-*` (including `docs/reviews/` mention) and `DOC-ZENSICAL-NAV-MISSING-*` |
| `V6-TEST-02` | TEST | P3 | Closed | `tests/test-verdicts-and-pivot.mjs` | Added `"dispatch"` to CLI `--help` subcommand assertion loop |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PR5-ARCH-04` | Revalidated (Session 5) | ARCH | Closed (By Design) | `docs/plans/LEDGER.md` (`L17`, `L42`), `bin/terminal.py` (deleted), `mcp/run-state.mjs` (deleted) | Loss of per-run PTY tool-profile control and automatic CLI cleanup upon launcher retirement | Maintainer decision to adopt native `/swarm` orchestration (`invoke_subagent` remains available via `dispatch_squad`). | Bundle `bb21a371` |
| `PR5-ARCH-05` | Revalidated (Session 5) | ARCH | Residual (Open) | `mcp/handoffs.mjs`, `docs/plans/native-enforcement-ledger.md` (`NE-04`) | Handoff authorship is not host-attested; bundle records are coordinator-assembled from the swarm board | Tracked as Unverified (`NE-04`) in `native-enforcement-ledger.md`; requires Antigravity host/SDK attestation (`Spike S4`/`S5`). | Open host boundary |
| `PR5-ARCH-06` | Revalidated (Session 5) | ARCH | Deferred / Won't Fix | `docs/plans/LEDGER.md` (`L8-L12`, `L35-L38`) | Rebuild retired Docker per-agent container sandboxes | Deferred to native Antigravity SDK/hooks (`NE-01`, `NE-02`, `NE-06`). | Open host boundary |
| `PR5-SCRIPT-02` | Revalidated (Session 5) | SCRIPT | Residual (Open) | `.agents/skills/self-diagnosis/scripts/diagnose.mjs`, `docs/plans/native-enforcement-ledger.md` (`NE-08`) | `diagnose.mjs` does not yet enforce conversation-independent ledger authorship | Tracked as Unverified (`NE-08`) in `native-enforcement-ledger.md` (`Spike S7`). | Open host boundary |
| `DOC-LEDGER-RESIDUALS-OPEN` | `pr5_review` (Session 5) | DOC | Closed (By Design) | `docs/reviews/pr5-independent-review.md` §8 | `diagnose.mjs` emits P3 advisory whenever §8 contains open host-boundary residuals | Tracks `PR5-ARCH-05` and `PR5-SCRIPT-02` until Antigravity host spikes close (re-observed in Session 7). | `diagnose.mjs` exit 0 |
| `SD-OPT-01` | `self_diag_flat` (Session 7) | SKILL | Deferred / Won't Fix | `.agents/skills/self-diagnosis/SKILL.md`, `.agents/skills/pr-review/SKILL.md` | Further condensing `self-diagnosis/SKILL.md` (< 7.5 KB) or `pr-review/SKILL.md` Steps 5–6 (~1.2 KB) | Both files are already well below 10,240 B; deferred post-PR #5. | Bundle `ac55ca1f` |
| `S5-BRIEFS-TEMPLATE` | `self_diag_flat` (Session 7) | RUN | Deferred / Won't Fix | `mcp/briefs.mjs` | Compacting `Specialist` (1,545 B) and `Lead` (2,758 B) template wording | Both templates remain well under compiled prompt budgets; deferred post-PR #5. | Bundle `ac55ca1f` |
| `S5-TARGET-SCOPE-DEDUP` | `self_diag_flat` (Session 7) | RUN | Deferred / Won't Fix | `mcp/planner.mjs:502-504`, `mcp/briefs.mjs:126-127` | Deduplicating `targetScopeNote` prose across planner and briefs | Minor token optimization (~30–60 B); deferred post-PR #5. | Bundle `ac55ca1f` |
| `S5-SWARM-GOV-SHARE` | `self_diag_flat` (Session 7) | SKILL | Deferred / Won't Fix | `.agents/skills/swarm-governance/SKILL.md`, `.agents/skills/*/SKILL.md` | Extracting `bundle-schema.md` from `swarm-governance/SKILL.md` (8,074 B, 100% entry share, below 8,192 B threshold) and deduplicating `open_board` prose | Preserved single-file clarity below 8,192 B threshold; standalone `share` test covered in Stage 3. | Bundle `ac55ca1f` |
| `SD-SCRIPT-02` | `self_diag_flat` (Session 7) | SCRIPT | Deferred / Won't Fix | `.agents/skills/self-diagnosis/scripts/diagnose.mjs`, `.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md` | Dividing `dispatchCompileMs / 4` and asserting `squadPlannerMs > 25` threshold | Current compile latencies (5.05 ms / 3.11 ms) stay well under cap. | Bundle `ac55ca1f` |
| `SD-SCRIPT-03` | `self_diag_flat` (Session 7) | SCRIPT | Deferred / Won't Fix | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Reconsidering `readOnly` specialist exclusion in `ARCH-OVERLAP` | Matches `L42` write-overlap design; deferred post-PR #5. | Bundle `ac55ca1f` |
| `SD-SCRIPT-04` | `self_diag_flat` (Session 7) | SCRIPT | Deferred / Won't Fix | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Measuring dual `subagent` and `swarm` minimal prompt templates | Low-value advisory (`subagent` 1,545 B vs `swarm` 1,577 B). | Bundle `ac55ca1f` |
| `SD-PR-05` | `self_diag_flat` (Session 7) | SKILL | Deferred / Won't Fix | `.agents/skills/*/SKILL.md`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Automated `diagnose.mjs` `open_board` UI-link check and wording polish | Covered by `test-run.mjs` UI-link test; script lint deferred post-PR #5. | Bundle `ac55ca1f` |
| `RUN-BRIEFS-SCOPE-SLASH-AND-TYPENAME-CASE` | `self_diag_flat` (Session 7) | RUN | Deferred / Won't Fix | `mcp/briefs.mjs` | Trailing slash normalization in `validateScopeFiles` and case-sensitive `DISALLOWED_BUILTINS` check | Strict path safety preserved pending compatibility check. | Bundle `ac55ca1f` |
| `SVC-HANDOFF-NOREPORT-SPACE-AND-PRUNE` | `self_diag_flat` (Session 7) | SVC | Deferred / Won't Fix | `mcp/handoffs.mjs`, `mcp/verdicts.mjs` | Double-space `NO_REPORT`, empty `integrityReport: ""`, fd unlink in `pruneReports`, and `parseTargetSquad` slash class | Minor hardenings outside PR #5 scope; deferred post-PR #5. | Bundle `ac55ca1f` |
| `S6-COMPOSITE-PRUNE` | `self_diag_flat` (Session 7) | SCRIPT | Deferred / Won't Fix | `bin/agy-squad.mjs`, `mcp/handoffs.mjs`, `mcp/dispatch.mjs`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Composite `verify --prune`, `publish(..., replace=true)` fast-path, manifest mtime cache, writable-lead overlap, and `--verify-stdio` split | Handoffs pipeline dropped to 20.48–23.89 ms/squad after `S6-READLINK-FD`; deferred post-PR #5. | Bundle `ac55ca1f` |
| `SVC-ACTIVE-COHORT-integrity_auditor` | `self_diag_flat` (Session 7) | SVC | Informational | `scratch/agy-squad/squad-integrity_auditor` | Fixed Step 0 scan detected uncleaned `squad-integrity_auditor` dir from prior cohort | Flagged for cleanup in Stage 2 Direction and `--teardown` closure. | Bundle `ac55ca1f` |

---

## 9. `/self-diagnosis` Cohort & Bundle Ledger

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| `pr5_review` (Layered `/swarm`) | `72686908-b468-479a-ad86-db9b9cacf078` | PR #5 (`44e6df4`) + `docs/visual-copywriting-pass` (`specialist-1..3` -> `pr5-review-lead` -> `audit-pr5-review`) | `pr5-review-runtime-mcp-c` (`5d137e1e`), `pr5-review-tests-scripts` (`67c7ddd4`), `pr5-review-docs-visual-a` (`720750be`), `pr5-review-lead` (`cbeb7b99`), `audit-pr5-review` (`9432369b`), `monitor` (`ecbb5a36`) | `bb21a371d0628b7e222d4817929a5af0eb4ded727ce593b67b3de1c4ac7c89c9` (Audit `90956c6da58a74968f673c3999d01be95bc61cbe6400fa5868e22eb20906f545`) | Direct post-remediation verification (`npm test`, `verify:package`, `diagnose.mjs`, `zensical build` exit 0) | `--keep-reports` retained in `scratch/agy-squad/`; runtime workers killed (6/6) |
| `p1_leftovers` (Session 5 Layered Phase 1 Leftovers Audit) | `72686908-b468-479a-ad86-db9b9cacf078` | Phase 1 leftover audit (`seq 12..26`; `specialist-1..3` -> lead `p1-verifier` + flat peer `audit-p1-leftovers`, `monitor-2`) + Decisions A1–A4 | `p1-skills-auditor` (`e4cbc3c4`), `p1-docs-auditor` (`d08a0a10`), `p1-code-auditor` (`4ed85884`), `p1-verifier` (`ecce91f1`), `audit-p1-leftovers` (`seq #22..#25`), `monitor-2` (`e9d360d4`) | `a7a40e6bb20e7cd028a6cb16e5cf8f3e6b1de852dfa2e8a0f97286cacc66fd55` (Content Verdict: PASS; Audit `CLEAN` `#25`) | Re-verified post-remediation before Decisions A1–A4 rollout | `--keep-reports` retained in `scratch/agy-squad/`; all workers killed (6/6) |
| `pr5_verify` (Session 6 `/pr-review` Layered Test) | `72686908-b468-479a-ad86-db9b9cacf078` | Verification review (`specialist-1..3` -> `pr5-verify-lead` -> `audit-pr5-verify`) + remediation | `pr5-verify-runtime-mcp-c` (`657b37c3`), `pr5-verify-tests-scripts` (`70264dd3`), `pr5-verify-skills-docs-d` (`31c9c3ae`), `pr5-verify-lead` (`1fb52714`), `audit-pr5-verify` (`702f0a9b`), `monitor-3` (`a64cbc38`) | N/A (`bundle` blocked `Content Verdict: FAIL` on `SKILL-VERIFY-01`, exit 1; `audit-pr5-verify` `CLEAN` after programmatic hashes) | Post-fix verification (`npm test`, `verify:package`, `diagnose.mjs`, `zensical build`, SVG XML check exit 0) | Pre-fix `verify-session6/` unbundled due to `FAIL`; all workers killed (6/6) |
| `self_diag_flat` (Session 7 `/self-diagnosis` Flat Test) | `72686908-b468-479a-ad86-db9b9cacf078` | Flat Cohort (`specialist-1..6` -> coordinator synthesis -> `audit-self-diag-flat`) + remediation | `self-diag-flat-self-diag` (`f6f85a8f`), `self-diag-flat-pr-review` (`53d3e81e`), `self-diag-flat-mcp-dispa` (`c3fecc1d`), `self-diag-flat-governanc` (`7070e6f9`), `self-diag-flat-prompt-sc` (`c046781e`), `self-diag-flat-i-o-concu` (`f2a173d0`), `audit-self-diag-flat` (`ee56b97b`), `monitor-4` (`7adad538`) | Pre-fix flat findings remediated in-session (`audit-self-diag-flat` caught 4 integrity violations on `#62`, all fixed before bundling) | `ac55ca1f2fce120ebb6a9059be5465ec8fab1a682f3935ec15834cbd570c0b03` (Audit `CLEAN` `#73`/`#75`; 18/18 programmatic `verifiedFiles` matched) | Scope 2 `prune` removed 6 loose specialist reports; all workers & monitor killed (8/8) |

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DOC-PR5-VIS-01` | `pr5_review` (Session 5) | DOC | Closed | `docs/reviews/pr5-independent-review.md` | Prior PR #5 ledger stopped at `44e6df4` (42 files) without `docs/visual-copywriting-pass` | Updated `pr5-independent-review.md` with Session 5 provenance, 52 pack files & link | `bb21a371...`; `diagnose.mjs` exit 0 |
| `SCRIPT-PR5-WC-01` | `pr5_review` (Session 5) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Duplicate `DOC-CLOSURE-CHECKLIST` ID across two checked docs | Split per-file IDs (`stopping-agents` & `roles-and-workflows`) + test | `bb21a371...`; `test-run.mjs` exit 0 |
| `DOC-PR5-VIS-02` | `pr5_review` (Session 5) | DOC | Closed | `docs/tools.md`, `docs/assets/manifest-and-modes.svg` | Diagram omitted `dispatch_squad` and mixed MCP args with CLI flags | Updated `manifest-and-modes.svg` to separate planner & compiler flows | `bb21a371...`; SVG XML valid |
| `DOC-PR5-VIS-03` | `pr5_review` (Session 5) | DOC | Closed | `docs/assets/architecture-overview.svg` | `NODE A3` omitted CLI subcommands and return verification/hook arrows | Added all 8 CLI subcommands & bidirectional return arrows in SVG | `bb21a371...`; SVG XML valid |
| `DOC-PR5-VIS-04` | `pr5_review` (Session 5) | DOC | Closed | `zensical.toml`, `docs/plans/native-enforcement-ledger.md` | Merged (`DEP-PR5-WC-02`): `native-enforcement-ledger.md` omitted from `nav` | Added Native Enforcement Ledger to `zensical.toml` `nav` | `bb21a371...`; `zensical build` exit 0 |
| `DOC-PR5-VIS-05` | `pr5_review` (Session 5) | DOC | Closed | `docs/reviews/pr5-independent-review.md` | Relative `../../.agents/...` link triggered Zensical `--strict` warning | Replaced with canonical GitHub blob URL | `bb21a371...`; `zensical build --strict` 44 pre-PR5 only |
| `DOC-PR5-VIS-06` | `pr5_review` (Session 5) | DOC | Closed | `docs/stopping-agents.md`, `docs/roles-and-workflows.md` | Closure checklist named `monitor-*` only rather than native `monitor` | Updated both docs to include native `monitor` & `monitor-*` | `bb21a371...`; `diagnose.mjs` exit 0 |
| `SKILL-PR5-VIS-01` | `pr5_review` (Session 5) | SKILL | Closed | `.agents/skills/swarm-governance/SKILL.md` | Referred to `integrity-auditor` instead of `audit-<id>` | Aligned `swarm-governance/SKILL.md` to canonical `audit-<id>` | `bb21a371...`; `diagnose.mjs` exit 0 |
| `SKILL-PR5-VIS-02` | `pr5_review` (Session 5) | SKILL | Closed | `.agents/skills/swarm-governance/SKILL.md` | Closure step 1 specified `monitor-*` only | Updated to `monitor` (and `monitor-*`) | `bb21a371...`; `test-run.mjs` exit 0 |
| `SKILL-PR5-VIS-03` | `pr5_review` (Session 5->6) | SKILL | Closed | `.agents/skills/self-diagnosis/SKILL.md` | Pointed to `node mcp/handoffs.mjs` rather than `node bin/agy-squad.mjs` | Completed migration in Session 6 (`SKILL-VERIFY-01`) with exact `bin/agy-squad.mjs` arguments | `npm test`, `diagnose.mjs` & CLI help/flags exit 0 |
| `SKILL-PR5-VIS-04` | `pr5_review` (Session 5) | SKILL | Closed | `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | Read-only diagnostic specs omitted `"readOnly": true` | Added `"readOnly": true` to all 6 read-only specialists | `bb21a371...`; `agy-squad plan` exit 0 |
| `SKILL-PR5-VIS-05` | `pr5_review` (Session 5) | SKILL | Closed | `.agents/skills/pr-review/SKILL.md`, `.agents/skills/full-review/SKILL.md` | Stale Mandatory Adversarial Review Gate label; `full-review/SKILL.md` at 12,106 B | Renamed gate; trimmed `full-review/SKILL.md` (8,540 B) and `self-diagnosis/SKILL.md` (9,246 B) | `bb21a371...`; `diagnose.mjs` exit 0 |
| `S1-MCP-01` | `pr5_review` (Session 5) | MCP | Closed | `mcp/index.js` | `writeOversizedError` hardcoded "10MB safety ceiling" | Interpolated dynamic `${MAX_STDIO_PAYLOAD_BYTES}-byte safety ceiling` | `bb21a371...`; `test-server.mjs` exit 0 |
| `S1-MCP-02` | `pr5_review` (Session 5) | MCP | Closed | `mcp/index.js`, `mcp/planner.mjs` | `squad_planner.inputSchema` used `anyOf` instead of `oneOf` | Switched to `oneOf` & added descriptions | `bb21a371...`; `test-server.mjs` exit 0 |
| `S1-RUN-01` | `pr5_review` (Session 5) | RUN | Closed | `mcp/handoffs.mjs`, `bin/agy-squad.mjs` | `mcp/handoffs.mjs` CLI left `requireIntegrityAudit` optional | Removed standalone `mcp/handoffs.mjs` CLI (A2) & defaulted `requireIntegrityAudit = true` | `bb21a371...`; `test-handoffs.mjs` exit 0 |
| `S1-SVC-01` | `pr5_review` (Session 5) | SVC | Closed | `mcp/planner.mjs` | Non-boolean `spec.readOnly` silently treated as writable | Added strict boolean validation on `spec.readOnly` | `bb21a371...`; `test-planner.mjs` exit 0 |
| `SCRIPT-PR5-WC-02` | `pr5_review` (Session 5) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `#anchor` validation limited; `slugifyHeading` differed from GFM `--` | Validated `.md#anchor` links across all skills & refs; aligned `slugifyHeading` | `bb21a371...`; `diagnose.mjs` exit 0 |
| `SCRIPT-PR5-03` | `pr5_review` (Session 5) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Exact-string `scopeFiles` overlap missed prefix overlaps | Reused `scopesOverlap()` from `mcp/planner.mjs` | `bb21a371...`; `diagnose.mjs` exit 0 |
| `SCRIPT-PR5-04` | `pr5_review` (Session 5) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `auditSkills()` omitted `zensical.toml` `nav` & SVG checks | Added `zensical.toml` `nav` & `docs/assets/*.svg` checks | `bb21a371...`; `diagnose.mjs` exit 0 |
| `TEST-PR5-WC-01` | `pr5_review` (Session 5) | TEST | Closed | `tests/test-run.mjs` | Closure tests did not mutate `docs/roles-and-workflows.md` | Added dual-doc closure mutation assertions | `bb21a371...`; `test-run.mjs` exit 0 |
| `TEST-PR5-WC-02` | `pr5_review` (Session 5) | TEST | Closed | `tests/verify-package.mjs` | `REQUIRED` omitted `full-review/SKILL.md` and `docs/roles-and-workflows.md` | Added both files to `REQUIRED` in `verify-package.mjs` | `bb21a371...`; `verify-package` exit 0 |
| `TEST-PR5-03` | `pr5_review` (Session 5) | TEST | Closed | `tests/test-run.mjs` | `origStoppingDoc.replace` assumed subsequent `## ` heading | Updated closure regexes to match `(?=\n## \|$)` & `(?=\n#{2,3} \|$)` | `bb21a371...`; `test-run.mjs` exit 0 |
| `DEP-PR5-01` | `pr5_review` (Session 5) | DEP | Closed | `.github/workflows/docs.yml` | Unpinned `pip install zensical` in docs workflow | Pinned `pip install "zensical==0.0.74"` | `bb21a371...`; `zensical build` exit 0 |
| `DEP-PR5-03` | `pr5_review` (Session 5) | DEP | Closed | `package.json`, `docs/getting-started.md` | Python `zensical` prerequisite for `npm run docs` undocumented | Documented `Python 3.11+` + `zensical==0.0.74` prerequisite in `docs/getting-started.md` | `bb21a371...`; `npm test` exit 0 |
| `SKILL-VERIFY-01` | `pr5_verify` (Session 6) | SKILL | Closed | `.agents/skills/self-diagnosis/SKILL.md` | Lines 30, 76–81 passed retired `mcp/handoffs.mjs` flags (`--manifest`, `--summary`, `<squadId>`) to `bin/agy-squad.mjs` (exit 1) | Updated to exact `bin/agy-squad.mjs` positional `<file...>`, `<record.json>`, `<report.sources.json> <sha256>` syntax | `bin/agy-squad.mjs --help`, `npm test` & `diagnose.mjs` exit 0 |
| `SWARM-UI-SURFACE` | `pr5_verify` (Session 6) | SKILL | Closed | `.agents/skills/*/SKILL.md`, `docs/roles-and-workflows.md` | Skill orchestrators parked into `swarm_wait` on launch instead of ending the turn with `open_board` pill | Added explicit Swarm UI launch-turn rule across all 4 skills and `roles-and-workflows.md` | `diagnose.mjs` (<10,240 B, 0 broken links) & `test-run.mjs` exit 0 |
| `SKILL-VERIFY-02` | `pr5_verify` (Session 6) | SKILL | Closed | `.agents/skills/self-diagnosis/resources/comparative-research-manifest.json` | Line 14 `expectedDeliverable` biased verdict toward `Content Verdict: PASS` | Updated to neutral `Content Verdict: PASS \| FAIL \| BLOCKED` | `agy-squad plan` & `diagnose.mjs` exit 0 |
| `PR5-VER-ARCH-01` | `pr5_verify` (Session 6) | ARCH | Closed | `docs/plans/LEDGER.md` | `L42` `bin/agy-squad.mjs` CLI subcommand list omitted `dispatch` | Added `dispatch` to `L42` in `docs/plans/LEDGER.md` | `diagnose.mjs` & `npm test` exit 0 |
| `PR5-VER-ARCH-02` | `pr5_verify` (Session 6) | ARCH | Closed | `mcp/handoffs.mjs` | `verifyBundleInternal` kept undocumented `parsed.adversarialReview` branch | Added inline rationale documenting read-only pre-Phase-2 bundle verification compatibility | `test-handoffs.mjs` & `test-verdicts-and-pivot.mjs` exit 0 |
| `PR5-VER-ARCH-03` | `pr5_verify` (Session 6) | ARCH | Closed | `mcp/planner.mjs`, `tests/test-planner.mjs` | Line 636 claimed `L6 enforced` while `native-enforcement-ledger.md` classifies host enforcement `NE-01..10` Unverified | Changed `L6 enforced` to `L6 convention` in `mcp/planner.mjs:636` and `tests/test-planner.mjs:37` | `test-planner.mjs` exit 0 |
| `DOC-VERIFY-01` | `pr5_verify` (Session 6) | DOC | Closed | `docs/reviews/pr5-independent-review.md` | Contained non-code plain numeric, status, and category inline backtick clutter | Cleaned non-code backticks while preserving identifiers, paths, and commands | `diagnose.mjs --ledger pr5-independent-review.md` `HEALTHY` |
| `DOC-VERIFY-02` | `pr5_verify` (Session 6) | DOC | Closed | `docs/reviews/pr5-layered-swarm-review.md` | Section 1/7 tally (`57`) mismatched §7 + §8 row count (`56`); `SKILL-PR5-VIS-03` closed early | Reconciled tally (`65` §7 + `5` §8 = `70`) and documented Session 6 completion of `SKILL-PR5-VIS-03` | `diagnose.mjs --ledger pr5-layered-swarm-review.md` `HEALTHY` |
| `DOC-VERIFY-03` | `pr5_verify` (Session 6) | DOC | Closed | `docs/assets/skill-role-workflows.svg`, `docs/assets/role-and-verdict-gate.svg` | Auditor nodes (`AUD`, `AU`) had tight 224 px width for 30+ char labels | Widened `AUD` and `AU` rects from `224` px to `256` px (`x="-128"`) | SVG XML parse (5/5 OK) & `zensical build` exit 0 |
| `DOC-VERIFY-04` | `pr5_verify` (Session 6) | DOC | Closed | `docs/reviews/pr5-layered-swarm-review.md` | Line 326 claimed `0 P1/P2/P3` on `--ledger` despite open §8 residual advisory | Corrected §6 item 3 to cite 1 advisory P3 `DOC-LEDGER-RESIDUALS-OPEN` across both ledgers | `diagnose.mjs --ledger` output verified directly |
| `V6-SCRIPT-01` | `pr5_verify` (Session 6) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Skipped same-file `#anchor` links and failed to normalize `[label](url)` headings or duplicate suffixes | Added same-file `#anchor`, link-label stripping, and duplicate heading suffix handling | `diagnose.mjs` & `test-run.mjs` exit 0 |
| `V6-SCRIPT-02` | `pr5_verify` (Session 6) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `DOC-SVG-ORPHAN-*` scanned `docs/reviews/`, letting review mentions mask unlinked SVGs | Excluded `docs/reviews/` from `DOC-SVG-ORPHAN-*` scan | `test-run.mjs` negative test & `diagnose.mjs` exit 0 |
| `V6-TEST-01` | `pr5_verify` (Session 6) | TEST | Closed | `tests/test-run.mjs` | Lacked isolated negative-branch assertions for `DOC-SVG-ORPHAN-*` and `DOC-ZENSICAL-NAV-MISSING-*` | Added isolated negative tests (including `docs/reviews/` mention guard) in `tests/test-run.mjs` | `test-run.mjs` exit 0 |
| `V6-TEST-02` | `pr5_verify` (Session 6) | TEST | Closed | `tests/test-verdicts-and-pivot.mjs` | `--help` subcommand check loop omitted `dispatch` | Added `"dispatch"` to subcommand `--help` loop at line 269 | `test-verdicts-and-pivot.mjs` exit 0 |
| `SD-SKILL-01` | `self_diag_flat` (Session 7) | SKILL | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs`, `SKILL.md` | `--print-plan` lacked `--topology flat\|layered` and `--flat` | Added `--topology` and `--flat` to `diagnose.mjs` & `SKILL.md:26,61,66` | `ac55ca1f...`; `test-run.mjs` exit 0 |
| `SD-PR-01` | `self_diag_flat` (Session 7) | SKILL | Closed | `.agents/skills/self-diagnosis/SKILL.md` | Duplicate observation of `--print-plan` topology CLI gap (`SD-SKILL-01`) | Resolved via `--topology flat\|layered` support | `ac55ca1f...`; `--print-plan` exit 0 |
| `SVC-PRINT-PLAN-TOPOLOGY` | `self_diag_flat` (Session 7) | SVC | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Duplicate observation of `--print-plan` topology CLI gap (`SD-SKILL-01`) | Resolved via `--topology flat\|layered` support | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `SD-GOV-SCRIPT-03` | `self_diag_flat` (Session 7) | SCRIPT | Closed | `bin/agy-squad.mjs`, `diagnose.mjs`, `SKILL.md` | Duplicate observation of `--topology` CLI alignment (`SD-SKILL-01`) | Resolved across `bin/agy-squad.mjs`, `diagnose.mjs`, and `SKILL.md` | `ac55ca1f...`; `npm test` exit 0 |
| `SD-GOV-SKILL-01` | `self_diag_flat` (Session 7) | SKILL | Closed | `.agents/skills/self-diagnosis/SKILL.md` | Secondary alias inside S4 Section 2 for `SD-GOV-SCRIPT-03` | Resolved alongside `SD-SKILL-01` and `SD-PR-02` | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `SD-SKILL-02` | `self_diag_flat` (Session 7) | SKILL | Closed | `.agents/skills/self-diagnosis/SKILL.md` | Misattributed `all_specialists` target to MCP `dispatch_squad` | Clarified `all_specialists` is `diagnose.mjs --print-dispatch` only (`SKILL.md:27`) | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `SD-PR-02` | `self_diag_flat` (Session 7) | SKILL | Closed | `.agents/skills/self-diagnosis/SKILL.md` | Duplicate observation of `all_specialists` and omitted CLI flags | Documented `[squadId]` on `--print-plan` and `--accept`/`--force`/`--help` on `--teardown` | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `SD-SCRIPT-01` | `self_diag_flat` (Session 7) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `--teardown` and Step 0 missed companion `squad-integrity_auditor-*` directories | Extended Step 0 and `teardownSelfDiagnosisDirs()` + added `test-run.mjs` §3f2 test | `ac55ca1f...`; `test-run.mjs` exit 0 |
| `SD-SKILL-03` | `self_diag_flat` (Session 7) | SKILL | Closed | `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | Lead `expectedDeliverable` biased toward PASS and kept broken 33-char `@mention` | Switched to neutral `PASS \| FAIL \| BLOCKED`, removed broken `@mention`, and trimmed boilerplate | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `SD-PR-03` | `self_diag_flat` (Session 7) | SKILL | Closed | `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | Duplicate observation of manifest verdict bias and broken `@mention` | Resolved with neutral `PASS \| FAIL \| BLOCKED` across all squads | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `SD-PR-04` | `self_diag_flat` (Session 7) | DOC | Closed | `docs/tools.md:64`, `.agents/skills/pr-review/SKILL.md:54`, `pr-review-standard.md:124` | Understated manifest `workspace === "inherit"` scope (`squad_planner` vs `invoke_subagent`) | Updated all three docs to specify `workspace === "inherit"` for both tools vs top-level `workspaceIsolation` | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `RUN-PLAN-INHERIT-MODEL` | `self_diag_flat` (Session 7) | RUN | Closed | `mcp/planner.mjs:297` | Explicit `model: "inherit"` in `swarm` mode leaked into `swarmAdd.model` | Applied `normalizeExplicitModel(model)` in `mcp/planner.mjs` + test coverage | `ac55ca1f...`; `test-planner.mjs` exit 0 |
| `MCP-DISPATCH-NULL-AUDITOR` | `self_diag_flat` (Session 7) | MCP | Closed | `mcp/dispatch.mjs:73-93` | Unchecked `integrity_auditor: null` and `children` + `specialists` conflict | Added plain-object guard and mutual-exclusion check in `resolveIntegrityAuditor` | `ac55ca1f...`; `test-dispatch.mjs` exit 0 |
| `SVC-HANDOFF-PREFIX-AND-LENGTH` | `self_diag_flat` (Session 7) | SVC | Closed | `mcp/handoffs.mjs`, `mcp/briefs.mjs:158` | Unbounded `READY <slot> — ` prefix and unstripped `/swarm` `@mention` prefix | Added < 500 B prefix budget check, optional `@mention` strip in `reconcileHandoffs()`, and brief hint | `ac55ca1f...`; `test-handoffs.mjs` exit 0 |
| `SD-GOV-SCRIPT-01` | `self_diag_flat` (Session 7) | SCRIPT | Closed | `bin/agy-squad.mjs` | Truthy defaulting masked invalid non-boolean `requireIntegrityAudit: "false"` | Switched `bundle` defaulting to strict `=== undefined` check | `ac55ca1f...`; `test-verdicts-and-pivot.mjs` exit 0 |
| `SD-GOV-SCRIPT-02` | `self_diag_flat` (Session 7) | SCRIPT | Closed | `bin/agy-squad.mjs` | `bogus --help` exited 0 and subcommands ignored unknown options | Checked `KNOWN_COMMANDS` before `--help` and added strict `parseSubcommandArgs()` | `ac55ca1f...`; `test-verdicts-and-pivot.mjs` exit 0 |
| `SD-GOV-TEST-01` | `self_diag_flat` (Session 7) | TEST | Closed | `tests/test-verdicts-and-pivot.mjs` | Negative CLI checks lacked `stderr` assertions and malformed verdict coverage | Added `stderr` regexes plus malformed content and integrity verdict CLI assertions | `ac55ca1f...`; `test-verdicts-and-pivot.mjs` exit 0 |
| `SD-GOV-TEST-02` | `self_diag_flat` (Session 7) | TEST | Closed | `tests/test-verdicts-and-pivot.mjs:213-219` | Redundant identical `handleDispatchSquad` call without payload assertions | Removed duplicate call and asserted `Subagents.length === 1`, `Target Squad: alpha`, and policy | `ac55ca1f...`; `test-verdicts-and-pivot.mjs` exit 0 |
| `MCP-JSONRPC-PARAMS-TYPE` | `self_diag_flat` (Session 7) | MCP | Closed | `mcp/index.js:101-104` | Non-object `tools/call` `params` (`null`, `[]`) triggered internal error `-32000` | Validated object `params` and string `params.name`, returning `-32602 Invalid params` | `ac55ca1f...`; `test-server.mjs` exit 0 |
| `RUN-PLANNER-MULTI-SQUAD-FLAT` | `self_diag_flat` (Session 7) | RUN | Closed | `mcp/planner.mjs`, `mcp/index.js` | Multi-squad manifests lacked flat compilation option in `squad_planner` | Added explicit `topology: "flat" \| "layered"` parameter and schema field (`layered` default kept strict) | `ac55ca1f...`; `test-planner.mjs` exit 0 |
| `SVC-MANIFEST-SCOPE-GAP` | `self_diag_flat` (Session 7) | SVC | Closed | `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | Omitted `mcp/verdicts.mjs` from S1 `scopeFiles`, omitted S2 lead scopes, and skewed instructions | Added missing `scopeFiles` entries and unified lead instructions across all squads | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `SD-PR-06` | `self_diag_flat` (Session 7) | ARCH | Closed | `mcp/planner.mjs`, `docs/tools.md:53` | PascalCase `ReadOnly` unsupported and doc scope ambiguous | Added PascalCase `ReadOnly` + conflict check in `planner.mjs` and scoped `docs/tools.md:53` | `ac55ca1f...`; `test-planner.mjs` exit 0 |
| `SD-PR-07` | `self_diag_flat` (Session 7) | DOC | Closed | `.agents/skills/pr-review/SKILL.md:33`, `docs/tools.md:108` | Missing `plans/` segment in WSL doc link and omitted `--no-integrity` bundle effect | Fixed link path in `SKILL.md:33` and documented `--no-integrity` `bundleRecordTemplates` effect | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `SD-OPT-03` | `self_diag_flat` (Session 7) | SKILL | Closed | `.agents/skills/self-diagnosis/SKILL.md` | Inline 7-command `bin/agy-squad.mjs` block pushed entry size to 9,938 B | Deduplicated CLI block (`81` lines / `8,774 B`, `-1,164 B`) | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `SD-OPT-02` | `self_diag_flat` (Session 7) | RUN | Closed | `mcp/planner.mjs`, `self-diagnosis-manifest.json` | Redundant `Shared workspace mode` note inflated `swarm` briefs (+3,332 B) | Removed redundant `inherit` note in `buildSwarmWorkerBrief` (`-3,332 B` layered total) | `ac55ca1f...`; `test-planner.mjs` exit 0 |
| `S5-SCHEMA-TRIM` | `self_diag_flat` (Session 7) | MCP | Closed | `mcp/index.js` | Verbose `TOOLS` schema descriptions inflated `tools/list` (`2,825 B`) | Tightened `TOOLS` descriptions (`2,597 B` net including new `topology` field) | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `S6-READLINK-FD` | `self_diag_flat` (Session 7) | RUN | Closed | `mcp/handoffs.mjs:178`, `mcp/dispatch.mjs:32` | `fs.realpathSync("/proc/self/fd/...")` added extra symlink resolution overhead | Replaced with `fs.readlinkSync` (`handoffs` `fs` time `-62.5%`, `126 -> 34` `realpathSync` calls) | `ac55ca1f...`; `npm test` exit 0 |
| `SVC-LATENCY-HANDOFF` | `self_diag_flat` (Session 7) | SVC | Closed | `mcp/handoffs.mjs` | Baseline `diagnose.mjs` canary hit `54.19 ms/squad` (> 25 ms/squad threshold) | Post-`S6-READLINK-FD` canary dropped to `20.48–23.89 ms/squad`, clearing advisory | `ac55ca1f...`; `diagnose.mjs` exit 0 |
| `SD-DOC-01` | `self_diag_flat` (Session 7) | DOC | Closed | `.agents/skills/self-diagnosis/SKILL.md:48` | Target (<= 10,240 B) vs warning (> 12,288 B) phrasing ambiguity | Clarified target `<= 10,240 B` and warning `> 12,288 B` (`rubric.md:54` polished post-PR #5) | `ac55ca1f...`; `diagnose.mjs` exit 0 |

*(All 111 atomic 1 ID = 1 Row / Record entries across §7 [65 closed], §8 [17 residual/deferred/by-design/informational], and §9 [29 new Session 7 `self_diag_flat` closed entries plus 38 Session 5–6 wave records] preserve 1-to-1 granularity across Sessions 5, 6, and 7 with clean prose and verified post-remediation closures.)*
