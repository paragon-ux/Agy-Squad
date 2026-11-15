# Post-PR #5 Governance & Working-Tree Review: Agy-Squad (`198356a` + Uncommitted Delta)

Content Verdict: PASS

> Durable post-PR #5 review ledger under Agy-Squad PR Review Standard v1.4.0 covering all uncommitted working-tree modifications after `198356a1bc23538497b371120cfc9c0e0595c802`, Cycle 1 layered `/swarm` findings (`MCP-RUN-01`, `TEST-01`, `DEP-01`, `DOC-POSTPR5-01`..`06`, `SCRIPT-DIAG-LEDGER-STATE`), Cycle 1 remediations, Cycle 2 SHA-256 bundles (`e2037a51...`, `8d15f967...`), and post-Cycle-2 transcript-audit remediation (`GOV-07` + coordinator `query_transcript` audit across all 9 worker transcripts).

---

## 1. Review Metadata, Session Provenance, and Evidence Limits

| Field | Value |
| --- | --- |
| Repository & Target | paragon-ux/Agy-Squad, uncommitted working-tree modifications after `198356a1bc23538497b371120cfc9c0e0595c802` (PR #5 `feat/phase2-swarm-planner`) |
| Governing Standard | Agy-Squad PR Review Standard v1.4.0 ([pr-review-standard.md](https://github.com/paragon-ux/Agy-Squad/blob/198356a1bc23538497b371120cfc9c0e0595c802/.agents/skills/pr-review/references/pr-review-standard.md)) |
| Base Commit (HEAD) | `198356a1bc23538497b371120cfc9c0e0595c802` (`198356a`) |
| Working-Tree Delta | 40 modified tracked files + 5 untracked files (`large-swarms.md`, `intake-and-planning.md`, `bundling-and-wire-format.md`, `execution-and-teardown.md`, `pr5-reconciled-review.md`) + `docs/reviews/post-pr5-governance-review.md` |
| Date / Reviewer | 2026-11-14 / Coordinator + Layered `/swarm` Review Cohort (`pr-review` + `swarm-governance`) |
| Overall Disposition | **Approve (`Content Verdict: PASS`, Coordinator-Audited `CLEAN` + `GOV-07` Patched Post-Bundle)** — 0 open P0/P1/P2 findings; `GOV-01`..`GOV-06` + Cycle 1 sealed by Cycle 2 SHA-256 bundles (`code`: `e2037a51...`, `gov`: `8d15f967...`), and post-Cycle-2 `GOV-07` (audit loophole closure + 9-worker coordinator `query_transcript` audit) verified directly via post-edit tests and checks. |

### Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| 12 (Prior PR #5) | `72686908-b468-479a-ad86-db9b9cacf078` | none | 2026-11-14 | `198356a` + PR #5 Stage 2–3 remediation (`pr5-reconciled-review.md`) | `pr-review`, `swarm-governance` |
| 13 (Post-PR #5 Cycle 1–2) | `87cb96f4-898d-4f57-ac33-36b138232b2e` | `72686908-b468-479a-ad86-db9b9cacf078` | 2026-11-14 | `198356a` + uncommitted working-tree delta + Cycle 1 remediations | `pr-review` + `swarm-governance` (layered `squad_planner`, `workspaceIsolation: "inherit"`, `gemini-4-hydrogen-high`) |

### Evidence Available & Limits

- **Directly inspected & executed:** All uncommitted artifacts across `mcp/`, `bin/`, `.agents/skills/`, `docs/`, `README.md`, `zensical.toml`, `.github/workflows/docs.yml`, and `tests/`; `npm test`, `npm run verify:package`, `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown --ledger docs/reviews/post-pr5-governance-review.md`, `python3 -m zensical build`, per-squad `verdict`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `prune --keep-reports` (for Cycle 2 bundles prior to `GOV-07`), and coordinator `query_transcript` verification across all 9 Session `87cb96f4` worker conversations.
- **Transcript audit gap (`GOV-07`) & resolution:** During Cycle 2, `audit-code` (`a03d8f1e`) and `audit-gov` (`bf53c412`) lacked `query_transcript` / `read_transcript` MCP tools, hit `PreToolUse` `.system_generated/` denials, and had no coordinator-extracted transcript index in `scratch/`; they therefore relied on workspace re-execution before emitting `CLEAN`. Following user identification of this gap, the coordinator directly audited all 9 Session `87cb96f4` worker transcripts via `query_transcript` (confirming genuine tool, test, and build execution across working leads and specialists) and patched `mcp/briefs.mjs`, `mcp/planner.mjs`, `swarm-governance`, `docs/roles-and-workflows.md`, `docs/plans/native-enforcement-ledger.md`, and `tests/` (`GOV-07`) so re-execution alone can never satisfy `CLEAN` and missing traces fail closed with `Integrity Verdict: INTEGRITY VIOLATION`. Cycle 2 bundles (`e2037a51`, `8d15f967`) certify the pre-`GOV-07` baseline and are retained on disk alongside Cycle 2 reports; `GOV-07` changes are verified directly by post-edit `npm test`, `npm run verify:package`, `diagnose.mjs`, and `zensical build`.
- **Evidence preservation:** All scratch reports (`scratch/agy-squad/squad-code/`, `scratch/agy-squad/squad-gov/`, `scratch/agy-squad/squad-integrity_auditor-code/`, `scratch/agy-squad/squad-integrity_auditor-gov/`) and Cycle 2 `report.sources.json` bundles are retained on disk (`--keep-reports`, `diagnose.mjs --teardown` skipped).

---

## 2. File-to-Category Inventory and Coverage Matrix

### Changed Files Inventory

| Artifact | Primary Category | Cross-Referenced Categories | Assigned Review Squad | Audit Status |
| --- | --- | --- | --- | --- |
| `mcp/briefs.mjs` | `MCP` | `RUN`, `ARCH` | `code` (`code-mcp-cli-reviewer`) | Verified (`e2037a51`) |
| `mcp/dispatch.mjs` | `RUN` | `SVC`, `MCP` | `code` (`code-mcp-cli-reviewer`) | Remediated & Verified (`e2037a51`) |
| `mcp/handoffs.mjs` | `SVC` | `RUN`, `ARCH` | `code` (`code-mcp-cli-reviewer`) | Remediated & Verified (`e2037a51`) |
| `mcp/index.js` | `MCP` | `ARCH`, `RUN` | `code` (`code-mcp-cli-reviewer`) | Remediated & Verified (`e2037a51`) |
| `mcp/planner.mjs` | `RUN` | `MCP`, `SVC`, `ARCH` | `code` (`code-mcp-cli-reviewer`) | Remediated & Verified (`e2037a51`) |
| `mcp/verdicts.mjs` | `RUN` | `SVC` | `code` (`code-mcp-cli-reviewer`) | Verified (`e2037a51`) |
| `bin/agy-squad.mjs` | `SCRIPT` | `RUN`, `SVC`, `ARCH` | `code` (`code-mcp-cli-reviewer`) | Verified (`e2037a51`) |
| `.agents/skills/full-review/SKILL.md` | `SKILL` | `DOC`, `ARCH` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `.agents/skills/full-review/references/evidence-intake.md` | `SKILL` | `DOC` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `.agents/skills/full-review/references/report-template.md` | `SKILL` | `DOC` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `.agents/skills/pr-review/SKILL.md` | `SKILL` | `DOC`, `ARCH` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `.agents/skills/pr-review/references/pr-review-standard.md` | `SKILL` | `DOC`, `ARCH` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `.agents/skills/self-diagnosis/SKILL.md` | `SKILL` | `DOC`, `SCRIPT` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `.agents/skills/self-diagnosis/references/execution-and-teardown.md` | `SKILL` | `SCRIPT`, `SVC` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md` | `SKILL` | `SCRIPT` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | `SKILL` | `RUN`, `SCRIPT` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `SCRIPT` | `SVC`, `SKILL` | `gov` (`gov-skills-reviewer`) | Remediated & Verified (`8d15f967`) |
| `.agents/skills/swarm-governance/SKILL.md` | `SKILL` | `ARCH`, `DOC` | `gov` (`gov-skills-reviewer`) | Remediated & Verified (`8d15f967`) |
| `.agents/skills/swarm-governance/references/bundling-and-wire-format.md` | `SKILL` | `SVC`, `RUN` | `gov` (`gov-skills-reviewer`) | Remediated & Verified (`8d15f967`) |
| `.agents/skills/swarm-governance/references/intake-and-planning.md` | `SKILL` | `MCP`, `DOC` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `.agents/skills/swarm-governance/references/large-swarms.md` | `SKILL` | `ARCH`, `DOC` | `gov` (`gov-skills-reviewer`) | Verified (`8d15f967`) |
| `README.md` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Remediated & Verified (`8d15f967`) |
| `docs/assets/architecture-overview.svg` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Remediated & Verified (`8d15f967`) |
| `docs/concepts.md` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Verified (`8d15f967`) |
| `docs/core-workflows.md` | `DOC` | `SKILL`, `ARCH` | `gov` (`gov-docs-site-reviewer`) | Remediated & Verified (`8d15f967`) |
| `docs/getting-started.md` | `DOC` | `MCP` | `gov` (`gov-docs-site-reviewer`) | Remediated & Verified (`8d15f967`) |
| `docs/index.md` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Remediated & Verified (`8d15f967`) |
| `docs/plans/native-enforcement-ledger.md` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Verified (`8d15f967`) |
| `docs/reviews/pr5-full-review-direction.md` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Verified (`8d15f967`) |
| `docs/reviews/pr5-independent-review.md` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Verified (`8d15f967`) |
| `docs/reviews/pr5-layered-swarm-review.md` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Verified (`8d15f967`) |
| `docs/reviews/pr5-phase2-swarm-planner-review.md` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Verified (`8d15f967`) |
| `docs/reviews/pr5-reconciled-review.md` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Verified (`8d15f967`) |
| `docs/reviews/post-pr5-governance-review.md` | `DOC` | `ARCH` | `gov` (`gov-docs-site-reviewer`) | Finalized (live ledger) |
| `docs/roles-and-workflows.md` | `DOC` | `SKILL`, `MCP` | `gov` (`gov-docs-site-reviewer`) | Remediated & Verified (`8d15f967`) |
| `docs/stopping-agents.md` | `DOC` | `SKILL`, `SVC` | `gov` (`gov-docs-site-reviewer`) | Verified (`8d15f967`) |
| `docs/tools.md` | `DOC` | `MCP`, `RUN` | `gov` (`gov-docs-site-reviewer`) | Remediated & Verified (`8d15f967`) |
| `.github/workflows/docs.yml` | `DEP` | `DOC`, `SCRIPT` | `gov` (`gov-docs-site-reviewer`) | Verified (`8d15f967`) |
| `zensical.toml` | `DEP` | `DOC` | `gov` (`gov-docs-site-reviewer`) | Verified (`8d15f967`) |
| `tests/test-comparative-dossier.mjs` | `TEST` | `SKILL`, `DOC` | `code` (`code-tests-reviewer`) | Verified (`e2037a51`) |
| `tests/test-handoffs.mjs` | `TEST` | `SVC`, `RUN` | `code` (`code-tests-reviewer`) | Remediated & Verified (`e2037a51`) |
| `tests/test-planner.mjs` | `TEST` | `RUN`, `MCP` | `code` (`code-tests-reviewer`) | Remediated & Verified (`e2037a51`) |
| `tests/test-run.mjs` | `TEST` | `SCRIPT`, `RUN` | `code` (`code-tests-reviewer`) | Remediated & Verified (`e2037a51`) |
| `tests/test-server.mjs` | `TEST` | `MCP` | `code` (`code-tests-reviewer`) | Verified (`e2037a51`) |
| `tests/test-verdicts-and-pivot.mjs` | `TEST` | `RUN`, `SVC` | `code` (`code-tests-reviewer`) | Verified (`e2037a51`) |
| `tests/verify-package.mjs` | `TEST` | `DEP`, `SCRIPT` | `code` (`code-tests-reviewer`) | Remediated & Verified (`e2037a51`) |

### Category Coverage Matrix

| Category | Scope Summary | Assigned Squad | Coverage Status |
| --- | --- | --- | --- |
| `ARCH` | Hard limits (`24`, `26`, `474`, `500`, `10MiB`), `topology=flat\|layered` neutrality, `L1–L43` compliance | `code`, `gov` | Verified (`e2037a51`, `8d15f967`) |
| `DOC` | `README.md`, `docs/*.md`, `docs/plans/native-enforcement-ledger.md`, `docs/reviews/pr5-*.md`, `docs/assets/architecture-overview.svg`, `post-pr5-governance-review.md` | `gov` | Verified (`8d15f967`) |
| `SKILL` | `.agents/skills/{swarm-governance,pr-review,full-review,self-diagnosis}` `SKILL.md` + `references/*.md` + manifest | `gov` | Verified (`8d15f967`) |
| `MCP` | `mcp/index.js`, `mcp/briefs.mjs`, `mcp/planner.mjs` schemas and planner contracts | `code` | Verified (`e2037a51`) |
| `RUN` | `mcp/dispatch.mjs`, `mcp/planner.mjs`, `mcp/verdicts.mjs` validation and containment | `code` | Verified (`e2037a51`) |
| `SVC` | `mcp/handoffs.mjs` Pointer-Over-Wire, `Evidence Digest`, multi-auditor bundling, `verify`, `prune` | `code` | Verified (`e2037a51`) |
| `DB` | Filesystem-only state persistence under `scratch/agy-squad/` (`RUN`/`SVC` covered) | `code` | Not applicable |
| `SCRIPT` | `bin/agy-squad.mjs`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `code`, `gov` | Verified (`e2037a51`, `8d15f967`) |
| `TEST` | `tests/test-*.mjs`, `tests/verify-package.mjs` | `code` | Verified (`e2037a51`) |
| `DEP` | `.github/workflows/docs.yml`, `zensical.toml`, `package.json`, `tests/verify-package.mjs` | `code`, `gov` | Verified (`e2037a51`, `8d15f967`) |

---

## 3. Architecture-to-Implementation Trace

1. **Design thesis / invariant (`L1–L7`, `L21`, `L29–L31`, `L40–L43`):** Keep Agy-Squad as the governance, planning (`squad_planner` / `agy-squad plan`), strict single-line verdict (`mcp/verdicts.mjs`), flat `audit-<id>` integrity gate, and SHA-256 verification CLI (`bin/agy-squad.mjs`) on top of Antigravity native `/swarm`, while retiring PTY launcher `agy-squad run` (`L17`).
2. **Post-PR #5 governance architecture trace:**
   - **Invariants vs. Workflow + `#section` anchors (`GOV-05`, `GOV-06`):** Verified across all 4 workspace skills (`swarm-governance/SKILL.md`, `pr-review/SKILL.md`, `full-review/SKILL.md`, `self-diagnosis/SKILL.md`) with zero broken links, uncondensed references (`intake-and-planning.md`, `bundling-and-wire-format.md`, `execution-and-teardown.md`), and `large-swarms.md` referenced exclusively by `swarm-governance`.
   - **Step 0 intake, turn lifecycle, and immediate kill (`GOV-01`, `GOV-02`, `GOV-03`, `GOV-06`):** Verified in `swarm-governance/SKILL.md`, `intake-and-planning.md`, `large-swarms.md`, `docs/stopping-agents.md`, and aligned in `docs/core-workflows.md` (`DOC-POSTPR5-05`).
   - **Custom sizing, roles, and hard vs. host limits (`GOV-04`):** Verified in `docs/roles-and-workflows.md` and `docs/tools.md` against `mcp/planner.mjs` (`MAX_SWARM_NAME_LENGTH = 24`, no hardcoded worker/squad count cap, `occupiedWorkerNames`, `roles`+`task` vs `manifest`/`manifestPath`), `mcp/handoffs.mjs` (`SWARM_MENTION_RESERVE_BYTES = 26`, `< 474` B `READY` prefix, `500` B pointer cap), and `mcp/index.js` (`10 MiB` stdio cap).
   - **Cycle 1 & post-Cycle-2 (`GOV-07`) defect closures:** Fixed `topology: "layered"` error diagnostics (`MCP-RUN-01`), `occupiedWorkerNames` schema/case normalization (`MCP-RUN-02`), `integrityAudit` parity (`MCP-SVC-01`), `diagnose.mjs` disposition/profiler filtering (`SCRIPT-DIAG-LEDGER-STATE`), `verify-package.mjs` `REQUIRED` list (`DEP-01`), `reportPath` reserve boundary tests (`TEST-01`), doc/SVG parity (`DOC-POSTPR5-01`..`06`), and integrity-auditor transcript-evidence enforcement + fail-closed `INTEGRITY VIOLATION` rule (`GOV-07`, `V-11`, `NE-10`).

---

## 4. Ten Category Sections

| Category | Cycle 1 P1 | Cycle 1 P2 | Cycle 1 P3 | Remaining Open P1/P2 | Category Verdict |
| --- | ---: | ---: | ---: | ---: | --- |
| `ARCH` | 0 | 0 | 0 | 0 | Pass |
| `DOC` | 0 | 1 (`DOC-POSTPR5-01`) | 5 (`DOC-POSTPR5-02`..`06`) | 0 | Pass (Cycle 2 + `GOV-07` docs verified) |
| `SKILL` | 0 | 1 (`GOV-07`) | 0 | 0 | Pass (`audit-<id>` & transcript-index aligned) |
| `MCP` | 0 | 0 | 1 (`MCP-RUN-02`) | 0 | Pass (`GOV-07` verified) |
| `RUN` | 0 | 1 (`MCP-RUN-01`) | 2 (`MCP-RUN-03` §8, `MCP-RUN-04`) | 0 | Pass (`GOV-07` verified) |
| `SVC` | 0 | 0 | 1 (`MCP-SVC-01`) | 0 | Pass (Cycle 2 verified) |
| `DB` | 0 | 0 | 0 | 0 | Not applicable (filesystem-only `scratch/agy-squad/`) |
| `SCRIPT` | 0 | 0 | 1 (`SCRIPT-DIAG-LEDGER-STATE`) | 0 | Pass (Cycle 2 verified) |
| `TEST` | 0 | 1 (`TEST-01`) | 3 (`TEST-02` §8, `TEST-03`, `TEST-04`) | 0 | Pass (Cycle 2 verified) |
| `DEP` | 0 | 1 (`DEP-01`) | 0 | 0 | Pass (Cycle 2 verified) |

---

## 5. Master Findings & Post-PR #5 Audit Checklist (`1 ID = 1 Row`)

### 5.1 P0

None identified within reviewed scope.

### 5.2 P1 / P2 Findings & Post-PR #5 Governance Checklist

| ID | Cat | Priority | Status | Source Target | Defect / Requirement to Verify | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GOV-01` | `SKILL` | P1 | Closed | `.agents/skills/swarm-governance/SKILL.md`, `.agents/skills/swarm-governance/references/intake-and-planning.md` | Surface `open_board` only on active `/swarm` launch turns and in-flight user updates; never emit `open_board` after all swarm workers are killed. | Verified implemented (`SKILL.md#L22,L39,L48`, `intake-and-planning.md#L105-L120`, `docs/stopping-agents.md`). | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` (`gov` CLEAN) |
| `GOV-02` | `SKILL` | P1 | Closed | `.agents/skills/swarm-governance/SKILL.md`, `.agents/skills/swarm-governance/references/intake-and-planning.md` | Warn explicitly that ending the launch turn without `swarm_wait` (to render the Swarm UI pill) causes Antigravity to show `"waiting for my reply"` / `"waiting for user reply"` until a worker message or watchdog wakes the coordinator; use `swarm_wait` on subsequent quiet turns. | Verified implemented (`SKILL.md#L22,L39`, `intake-and-planning.md#L109-L113`, `docs/stopping-agents.md`). | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` (`gov` CLEAN) |
| `GOV-03` | `SKILL` | P1 | Closed | `.agents/skills/swarm-governance/SKILL.md`, `.agents/skills/swarm-governance/references/intake-and-planning.md`, `docs/core-workflows.md` | Enforce Step 0 pre-flight `ask_question` intake when topology (flat/layered), `workspaceIsolation`, retention (`Scope 2`/`Scope 3`), or model (coordinator default unless specified) is unspecified, plus clarify Stage 3 / multi-cycle swarm handling. | Verified implemented in skills (`SKILL.md#L29-L34,L45-L48`, `intake-and-planning.md#L5-L47,L114-L117`) and aligned in `docs/core-workflows.md#L20-L29`. | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` (`gov` CLEAN) |
| `GOV-04` | `DOC` | P2 | Closed | `docs/roles-and-workflows.md`, `docs/tools.md` | Document custom swarm sizes, custom role configurations (`roles` + `task` vs. custom `manifest`/`manifestPath`, `occupiedWorkerNames`), and exact hard code limits vs. host/practical limits. | Verified in `docs/roles-and-workflows.md`, `docs/tools.md`, and `mcp/planner.mjs` / `mcp/handoffs.mjs` / `mcp/index.js`. | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` (`gov` CLEAN) + `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` (`code` CLEAN) |
| `GOV-05` | `SKILL` | P2 | Closed | `.agents/skills/{swarm-governance,pr-review,full-review,self-diagnosis}/SKILL.md`, `references/*.md` | Separate Invariants vs. Workflow cleanly across all four workspace skills without condensing examples, schemas, or edge cases, using `references/*.md` with `#section` anchors. | Verified across all 4 `SKILL.md` files and `references/*.md` (0 broken links, `<= 89` lines per `SKILL.md`). | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` (`gov` CLEAN) |
| `GOV-06` | `SKILL` | P1 | Closed | `.agents/skills/swarm-governance/references/large-swarms.md`, `.agents/skills/swarm-governance/SKILL.md`, `docs/stopping-agents.md` | Isolate large-swarm guidance (`O(N^2)` zero-chatter, `share`/`branch` pre-kill collection, 24-char/474 B limits, multi-squad bundle loop, `swarm{action: "model"}` quota switch) into `large-swarms.md` referenced only by `swarm-governance`, and enforce immediate `swarm{action: "kill"}` on user stop requests. | Verified via repo-wide `grep` (`large-swarms.md` referenced only by `swarm-governance/SKILL.md`) and `docs/stopping-agents.md#L7`. | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` (`gov` CLEAN) |
| `MCP-RUN-01` | `RUN` | P2 | Closed | `mcp/planner.mjs#L309-L316`, `mcp/dispatch.mjs#L181-L188`, `tests/test-planner.mjs#L464-L478` | `topology: "layered"` with `task` or a leadless manifest squad threw misleading `Agent 'unnamed' requires valid workspace-relative scopeFiles.` instead of reporting the missing lead or rejecting `task` + `layered`. | Added explicit `topology === "layered"` guard for `inline-task` in `mcp/planner.mjs`, explicit missing-lead error in `mcp/dispatch.mjs`, and updated `tests/test-planner.mjs`. | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` (`code` CLEAN) |
| `TEST-01` | `TEST` | P2 | Closed | `tests/test-handoffs.mjs#L347-L352`, `tests/test-run.mjs#L605-L607` | `test-handoffs.mjs` used a 463 B `reportRoot` (`509` B `READY` prefix) that missed the 26 B mention-reserve boundary (`473` vs `474` B); `test-run.mjs` checked only `typeof ...receiptHeadroomBytes === "number"`. | Added exact `439`-char (`473` B) pass and `440`-char (`474` B) throw assertions in `tests/test-handoffs.mjs` and `receiptHeadroomBytes > 0` in `tests/test-run.mjs`. | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` (`code` CLEAN) |
| `DEP-01` | `DEP` | P2 | Closed | `tests/verify-package.mjs#L6-L32,L82` | `REQUIRED` omitted post-PR #5 `references/*.md` files, `self-diagnosis-manifest.json`, and active `docs/*.md` pages. | Added all active skill `references/*.md`, `self-diagnosis-manifest.json`, and `docs/*.md` pages to `REQUIRED` and updated `selfTest()` fixture to `docs/benchmarks.md`. | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` (`code` CLEAN) |
| `DOC-POSTPR5-01` | `DOC` | P2 | Closed | `docs/reviews/post-pr5-governance-review.md` | Pre-audit Section 9 heading (`## 9. \`/self-diagnosis\` & \`/swarm\` Cohort Bundle Ledger`) and placeholder text failed `validateTargetReviewLedger` (`DOC-LEDGER-SCHEMA`); `GOV-01..GOV-06` were `Open (Pre-Remediation)`. | Renamed Section 9 to `## 9. \`/self-diagnosis\` Cohort & Bundle Ledger`, populated `9.1` and `9.2` tables, and closed all findings after Cycle 2 + bundle verification. | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` (`gov` CLEAN) |
| `GOV-07` | `SKILL` | P1 | Closed | `mcp/briefs.mjs#L133`, `mcp/planner.mjs#L576`, `.agents/skills/swarm-governance/`, `docs/roles-and-workflows.md#L24`, `docs/plans/native-enforcement-ledger.md`, `tests/test-{planner,verdicts-and-pivot}.mjs` | Native `/swarm` flat auditors (`audit-code`, `audit-gov`) lacked `query_transcript` MCP tools, hit `PreToolUse` `.system_generated/` denials, and lacked a coordinator transcript index, falling back to re-execution alone before `CLEAN`. | Tightened `/swarm` auditor briefs, planner notes, `swarm-governance` Stage 2 transcript-index protocol, `roles-and-workflows.md`, and `V-11`/`NE-10` so re-execution alone cannot satisfy `CLEAN` and missing traces fail closed with `Integrity Verdict: INTEGRITY VIOLATION`; audited all 9 Session `87cb96f4` worker transcripts via coordinator `query_transcript`. | Post-Cycle-2 `npm test`, `npm run verify:package`, `diagnose.mjs`, `zensical build`, and coordinator 9-worker `query_transcript` audit (Cycle 2 bundles `e2037a51` / `8d15f967` seal pre-`GOV-07` baseline) |

### 5.3 P3 Findings (`1 ID = 1 Row`)

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MCP-RUN-02` | Session 13 | `MCP` | Closed | `mcp/index.js#L53`, `mcp/planner.mjs#L388-L396` | `mcp/index.js` declared `occupiedWorkerNames` `minItems: 1` while `planner.mjs` accepted `[]`, and `usedWorkerNames` did not normalize casing/slugs. | Removed `minItems: 1` in `mcp/index.js` and added `slugifyName` normalization in `mcp/planner.mjs`. | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` |
| `MCP-SVC-01` | Session 13 | `SVC` | Closed | `mcp/handoffs.mjs#L690-L700` | `verifyBundleInternal` checked `integrityAudit.path`/`sha256` against `integrityAudits[0]` without checking `evidenceDigest`, `targetSquad`, or `verdict` parity. | Added `evidenceDigest`, `targetSquad`, and `verdict` parity checks when both fields are present. | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` |
| `MCP-RUN-04` | Session 13 | `RUN` | Closed | `mcp/planner.mjs#L473,L525,L541,L606` | Unused 4th `slot` arg passed to `buildSwarmWorkerBrief` and unreachable `rawSpec.Role` fallback after `canonicalizeAgentSpec`. | Removed dead `slot` args and `rawSpec.Role` fallback. | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` |
| `TEST-03` | Session 13 | `TEST` | Closed | `tests/test-handoffs.mjs#L432-L462` | Missing negative tests for 2nd-auditor tampering, `integrityAudit !== integrityAudits[0]`, `integrityAudits: []`, and `--predecessor` on missing bundle. | Added all four negative assertions to `tests/test-handoffs.mjs` (auto-discovery case tracked as `TEST-03-RES` in Section 8). | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` |
| `TEST-04` | Session 13 | `TEST` | Closed | `tests/test-planner.mjs#L554-L580` | Missing 24-char `occupiedWorkerNames` collision, exact `18` vs `19` char `squadId` warning boundary, and combined `24 characters` + `occupiedWorkerNames` assertion. | Added exact 18/19-char boundary and 24-char `occupiedWorkerNames` collision tests. | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` |
| `DOC-POSTPR5-02` | Session 13 | `DOC` | Closed | `docs/reviews/post-pr5-governance-review.md#L14` | Relative link to `pr-review-standard.md` outside `docs/` caused 1 new Zensical warning. | Replaced with pinned `198356a` GitHub blob URL. | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `DOC-POSTPR5-03` | Session 13 | `DOC` | Closed | `docs/tools.md#L111-L122` | Flags table omitted `--occupied-worker`, `--replace`, and `--predecessor`. | Added all three rows to `docs/tools.md`. | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `DOC-POSTPR5-04` | Session 13 | `DOC` | Closed | `README.md`, `docs/getting-started.md`, `docs/index.md`, `docs/roles-and-workflows.md`, `docs/assets/architecture-overview.svg` | Subcommand lists/count omitted `digest` or said `"eight subcommands"`. | Updated count to nine and added `digest` across all four docs and the SVG. | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `DOC-POSTPR5-05` | Session 13 | `DOC` | Closed | `docs/core-workflows.md#L20-L29` | Phase 0 table omitted `workspaceIsolation` and `model` prompts from `GOV-03`. | Added `Workspace isolation` and `Model` rows to Phase 0 table. | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `DOC-POSTPR5-06` | Session 13 | `DOC` | Closed | `docs/core-workflows.md#L44`, `docs/tools.md#L78-L79`, `.agents/skills/swarm-governance/SKILL.md#L20`, `bundling-and-wire-format.md#L29` | Single-squad `/swarm` auditor name was documented as `audit-1`, whereas `mcp/planner.mjs:585` emits `audit-<id>`. | Updated all four locations to `audit-<id>` while keeping `squad-integrity_auditor/specialist-1/report.md` slot distinction. | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `SCRIPT-DIAG-LEDGER-STATE` | Session 13 | `SCRIPT` | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs#L931,L1900-L1902` | `ledgerDisposition` overwrote `"INVALID"` with `"OPEN_BLOCKERS"` and `profilerBlockingCount` counted `DOC-LEDGER-SCHEMA` / `DOC-LEDGER-MISSING`. | Preserved `"INVALID"` precedence and excluded `LEDGER_DIAGNOSTIC_IDS` from `profilerBlockingCount`. | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |

---

## 6. Verification Record and Remaining Gaps

- **`npm test`:** Post-`GOV-07` run exited `0` (all 9 chained scripts passed including `GOV-07` assertions in `tests/test-verdicts-and-pivot.mjs` and `tests/test-planner.mjs`).
- **`npm run verify:package`:** Post-`GOV-07` run exited `0` (`Package boundary verified (59 files)`).
- **`node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown --ledger docs/reviews/post-pr5-governance-review.md`:** Post-`GOV-07` run exited `0` (`Status: HEALTHY`, `Profiler: HEALTHY`, `Ledger: RESIDUALS_ONLY`, 0 broken links across all 4 skills).
- **`python3 -m zensical build`:** Post-`GOV-07` run exited `0` (0 new warnings; `site/` cleaned).
- **Coordinator 9-worker transcript audit (`87cb96f4`):** Audited all 9 worker transcripts (`a37ee673`, `e5cd308c`, `97b049a5`, `3eb1e2cc`, `fed707af`, `c33d1552`, `a03d8f1e`, `bf53c412`, `c2081251`) via `query_transcript` (`roles: ["assistant"]`, `includeToolCalls: true`); verified genuine tool execution across all working leads/specialists and documented `audit-code`/`audit-gov` Step 25/Step 24 hook denials under `GOV-07`.
- **Pre-`GOV-07` Cycle 2 cryptographic bundles (retained for provenance; `GOV-07` touched bundled targets afterward):**
  - `code`: `node bin/agy-squad.mjs bundle scratch/code-bundle-record.json` -> `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` (`auditPolicy: "required"`, `Evidence Digest: ca5ff7103514dc0110e5651be2c922b26090955ac98deb6d8e7c077055e20c20`); Cycle 2 `verify` exited `0`; `prune --keep-reports` retained specialist reports.
  - `gov`: `node bin/agy-squad.mjs bundle scratch/gov-bundle-record.json` -> `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` (`auditPolicy: "required"`, `Evidence Digest: 772c1ab7237c9cd545d6ee948511748f41532fb1b786626830eef044b357c109`); Cycle 2 `verify` exited `0`; `prune --keep-reports` retained specialist reports.

---

## 7. Overall Disposition and Finding Closure Summary

- **Final Disposition:** **Approve (`Content Verdict: PASS`, Coordinator-Audited `CLEAN` + `GOV-07` Closed)** — All 7 post-PR #5 items (`GOV-01`..`GOV-07`), 4 Cycle 1 P2 findings, and 11 Cycle 1 P3 findings are closed and verified; 2 non-blocking P3 residuals (`TEST-02`, `TEST-03-RES`) and 1 `Closed (By Design)` boundary (`MCP-RUN-03`) are recorded in Section 8.

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MCP-RUN-03` | Session 13 | `RUN` | Closed (By Design) | `mcp/handoffs.mjs#L8,L53,L115` | `reportPath` reserves 26 B against `READY ` (`473` B max), so a `PARTIAL ` line at the extreme `439`-char `reportRoot` boundary reaches `502` B. | Kept `474` B `READY` ceiling (`SWARM_MENTION_RESERVE_BYTES = 26`) as documented in `docs/tools.md` and `large-swarms.md`; operators avoid deep `reportRoot` paths near 439 chars. | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` |
| `TEST-02` | Session 13 | `TEST` | Residual (Open) | `tests/test-run.mjs#L508,L644` | Live-repo tarball test references `pr5-*` ledger naming (working because `post-pr5-governance-review.md` has `prNumber = 0` under uniform `npm pack` mtimes). | Retained for PR #5 cycle; revisit with synthetic ledger fixture before PR #6. | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` |
| `TEST-03-RES` | Session 13 | `TEST` | Residual (Open) | `tests/test-handoffs.mjs#L410-L462` | Omitted `integrityAuditSlots` auto-discovery (`discoverAuditSlots`) across 2+ auditors in `bundleReports` does not yet have a dedicated multi-auditor auto-discovery test case. | Deferred as non-blocking P3 coverage enhancement (explicit 2-auditor `integrityAuditSlots` path is tested). | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` |

---

## 9. `/self-diagnosis` Cohort & Bundle Ledger

### 9.1 Cohort Provenance

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| Cycle 1–2 (`code`) | `87cb96f4-898d-4f57-ac33-36b138232b2e` | `code` + `audit-code` | `code-lead` (`97b049a5`), `code-mcp-cli-reviewer` (`a37ee673`), `code-tests-reviewer` (`e5cd308c`), `audit-code` (`a03d8f1e`) | None (Cycle 1 `FAIL`) | `e2037a51e2c8e8ca320aa3daa91805879c9bdbc6c57371bfea60eae3077d52b9` | Kept (`--keep-reports`, Scope 3 skipped) |
| Cycle 1–2 (`gov`) | `87cb96f4-898d-4f57-ac33-36b138232b2e` | `gov` + `audit-gov` | `gov-lead` (`c33d1552`), `gov-skills-reviewer` (`3eb1e2cc`), `gov-docs-site-reviewer` (`fed707af`), `audit-gov` (`bf53c412`) | None (Cycle 1 `FAIL`) | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` | Kept (`--keep-reports`, Scope 3 skipped) |

### 9.2 Wave Finding Ledger

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GOV-01` | Session 13 | `SKILL` | Closed | `.agents/skills/swarm-governance/SKILL.md` | `open_board` launch/in-flight-only rule & never post-`kill` | Verified in skills & `docs/stopping-agents.md` | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `GOV-02` | Session 13 | `SKILL` | Closed | `.agents/skills/swarm-governance/SKILL.md` | Explicit `"waiting for my reply"` launch warning + `swarm_wait` on quiet turns | Verified in skills & `docs/stopping-agents.md` | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `GOV-03` | Session 13 | `SKILL` | Closed | `.agents/skills/swarm-governance/SKILL.md`, `docs/core-workflows.md` | Step 0 `ask_question` intake + Stage 3 multi-cycle handling | Verified in skills & aligned `docs/core-workflows.md` | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `GOV-04` | Session 13 | `DOC` | Closed | `docs/roles-and-workflows.md`, `docs/tools.md` | Custom swarm sizes, roles vs manifest, `occupiedWorkerNames`, code vs host limits | Verified against `mcp/` & `bin/agy-squad.mjs` | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `GOV-05` | Session 13 | `SKILL` | Closed | `.agents/skills/*/SKILL.md` | Clean Invariants vs Workflow separation with `#section` anchors | Verified 0 broken links & uncondensed references | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `GOV-06` | Session 13 | `SKILL` | Closed | `large-swarms.md`, `docs/stopping-agents.md` | Isolate large-swarm guidance in `swarm-governance/references/large-swarms.md` + immediate `kill` | Verified exclusive reference & `docs/stopping-agents.md` | `8d15f967ac12c6fc7fb50c737a8ca953751a4a5f71d309b6357ba23aa8dcd3fd` |
| `GOV-07` | Session 13 (`87cb96f4`) | `SKILL` | Closed | `mcp/{briefs,planner}.mjs`, `.agents/skills/swarm-governance/`, `docs/{roles-and-workflows,plans/native-enforcement-ledger}.md` | Require coordinator transcript index or attached MCP trace tools before `CLEAN`; fail closed with `INTEGRITY VIOLATION` | Patched + verified (`npm test`, `verify:package`, `diagnose.mjs`, `zensical build`, 9-worker `query_transcript` audit) | Post-Cycle-2 verified directly (`e2037a51` / `8d15f967` pre-`GOV-07`) |
