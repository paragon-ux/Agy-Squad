# Independent Review: Agy-Squad PR #5 (Phase 2: Retire PTY launcher, add `squad_planner` for native `/swarm`)

> Independent of the PR's self-authored ledger ([`pr5-phase2-swarm-planner-review.md`](pr5-phase2-swarm-planner-review.md)). Initiated by a reviewer in a separate conversation (Session 1–2) and extended through live `/swarm` verification and full Hydrogen 4 High re-review (Session 3–4). Standard: **PR Review Standard v1.3.0** ([`.agents/skills/pr-review/references/pr-review-standard.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md)).

## 1. Review Metadata, Session Provenance, and Evidence Limits

| Field | Value |
| --- | --- |
| Repo / PR | paragon-ux/Agy-Squad [#5](https://github.com/paragon-ux/Agy-Squad/pull/5), `feat/phase2-swarm-planner` → `main` |
| Base Branch / SHA | `main` at 1fde6054af13b47680fcced40974fa5abb97d9d8 (1fde605) |
| Reviewed Checkpoints | 43ea410 (Session 1); 0903c4e (Session 2); 1dd9720 -> d9dc5d2 (Session 3); d9dc5d2 + Session 4 r3 bundle (2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e); Session 5 docs/visual-copywriting-pass + Phase 1 leftover remediation working tree on 44e6df4 (recorded in [pr5-layered-swarm-review.md](pr5-layered-swarm-review.md)) |
| PR Delta Size | 42 files changed in 1fde605..44e6df4 + Session 5 working-tree remediation (52 files in `npm pack --dry-run --json`) |
| Governing Standard | v1.3.0 (1 ID = 1 Row, Session Provenance, 10 mandatory categories, Sections 1–9) |
| Date | 2026-11-13 |

### Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| 1 | `23e2d977-d17c-4355-bf0d-02c35eeffaa6` | none | 2026-11-13 | 1fde605..43ea410, clean | Single-agent interactive review (Claude Sonnet 5.5) |
| 2 | `23e2d977-d17c-4355-bf0d-02c35eeffaa6` | 1 | 2026-11-13 | 43ea410..0903c4e, clean | Same reviewer remediated initial Session 1 findings; independently re-checked in Sessions 3–4 |
| 3 | `69506793-2b07-43f0-ae50-6e7aa009232d` | none | 2026-11-13 | 0903c4e..1dd9720 -> d9dc5d2; clean `scratch/` after teardown | Separate reviewer/coordinator session: live MCP (`dispatch_squad`, `squad_planner` `--known-model`), live native `/swarm` (task_squad + flat `audit-task-squad` on gemini-3.8-flash-high) -> `bundle` / `verify` / `prune`, SDK v0.1.23 reproduction, gemini-4-hydrogen-high default updates |
| 4 | `69506793-2b07-43f0-ae50-6e7aa009232d` | none | 2026-11-13 | 1fde605..d9dc5d2 + Session 4 R3 fixes; clean `scratch/` after teardown | Live native `/swarm` on Gemini 4 Hydrogen (High) (`gemini-4-hydrogen-high`): flat coordinator-led cohort r3 (`r3-runtime`, `r3-docs`, `r3-tests`, `monitor-3`) + flat `audit-r3` (`Integrity Verdict: CLEAN`) -> `inspect` / `bundle` / `verify` + teardown |
| 5 | `72686908-b468-479a-ad86-db9b9cacf078` | none | 2026-11-13 | 1fde605..44e6df4 + `docs/visual-copywriting-pass` + Decisions A1–A4 remediated; `--keep-reports` retained in `scratch/agy-squad/` | Layered `/swarm-governance` + `/pr-review` (pr5_review) + flat Phase 1 leftover audit (p1_leftovers) on Gemini 4 Hydrogen (High), followed by full remediation and verification (full 1-ID-per-row ledger in [pr5-layered-swarm-review.md](pr5-layered-swarm-review.md)) |
| 6–8 (Continuation) | `72686908-b468-479a-ad86-db9b9cacf078` | 5 | 2026-11-13 | `pr5_verify` (/pr-review test), `self_diag_flat` (bundle `ac55ca1f`, Stage 1), and `full_review` (Stage 2 non-diff + Direction) | Recorded in [pr5-layered-swarm-review.md](pr5-layered-swarm-review.md) (§1/§9) and [pr5-full-review-direction.md](pr5-full-review-direction.md) |

**Design decision accepted as given.** Retiring the Phase 1 PTY launcher (L17: `bin/terminal.py`, `mcp/run-state.mjs`, `agy-squad run`) in favor of first-party native `/swarm` orchestration (L42/L43: `squad_planner`, explicit model pinning, native Swarm UI & board, flat `integrity-auditor`, and `handoffs.mjs` SHA-256 verification) is sound architecture.

**Evidence collected across Sessions 1–4:**
- `npm test` (8/8 suites passing: `verdicts-and-pivot`, `dispatch`, `planner`, `handoffs`, `run`, `server`, `comparative-dossier`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs`).
- `node tests/verify-package.mjs --self-test` (`positive + 7 negatives`) and `npm pack --dry-run --json | node tests/verify-package.mjs` (`45 files`).
- `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` (plus per-ledger validation across `docs/reviews/*.md` and fresh equal-mtime `os.tmpdir()` checkout test).
- Live MCP stdio subprocess probes (`node mcp/index.js`: `initialize`, `tools/list`, `dispatch_squad`, `squad_planner` with `knownModels: ["gemini-4-hydrogen-high"]`).
- Live `/swarm` execution (task_squad verified & bundled at SHA 193b63dce478dd3ad9a7720911cd7872c46f3bbb3cfc8600037c44f6f438b5a5; r3 Hydrogen 4 High cohort + flat `audit-r3` verified & bundled at SHA 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e, audit SHA ce79e24b79355df413be8d75bb61225abb9e19263d9246842cf6bd95d213e778).
- `google-antigravity==0.1.23` SDK introspection (`LocalAgentConfig`, `CapabilitiesConfig.model_fields`, `BudgetConfig.model_fields`, `PreTurnHook` + `*Hook`, `Decision`, `HookContext`, `grep -rnI swarm`).

**Evidence limits:**
- Live `/swarm` execution in Session 3 exercised a flat 2-worker cohort (task_squad), and Session 4 exercises a flat 3-specialist cohort (r3); layered multi-wave `all_l1` execution on `/swarm` was verified via compiled `dispatch_squad` / `--print-dispatch` schema rather than a live multi-wave `/swarm` run.
- Host-enforced runtime attestation (`PR5-ARCH-05`), conversation-independent ledger gating (`PR5-SCRIPT-02`), and SDK/hook default-deny & spawn controls (`PR5-ARCH-06`) cannot be enforced inside Agy-Squad alone and remain tracked in [`docs/plans/native-enforcement-ledger.md`](../plans/native-enforcement-ledger.md).

---

## 2. File-to-Category Inventory and Coverage Matrix

Every file modified in `git diff 1fde605` (42 files) is mapped to **one** primary category; cross-category effects are traced in Sections 3 and 4.

| Category | Primary Mapped Files | Coverage |
| --- | --- | --- |
| ARCH | `docs/plans/LEDGER.md`, `bin/terminal.py` *(deleted)*, `mcp/run-state.mjs` *(deleted)*, `mcp/dispatch.mjs`, `mcp/handoffs.mjs` | Assessed (Full) |
| DOC | `README.md`, `docs/index.md`, `docs/getting-started.md`, `docs/concepts.md`, `docs/core-workflows.md`, `docs/tools.md`, `docs/benchmarks.md`, `docs/plans/wsl-cli-verification.md`, `docs/plans/comparative-harness-architecture.md`, `docs/plans/comparative-harness-architecture-teamwork.md`, `docs/plans/comparative-harness-architecture-retest.md`, `docs/plans/native-enforcement-ledger.md`, `docs/reviews/pr5-phase2-swarm-planner-review.md`, `docs/reviews/pr5-independent-review.md` | Assessed (Full) |
| SKILL | `.agents/skills/pr-review/SKILL.md`, `.agents/skills/pr-review/references/pr-review-standard.md`, `.agents/skills/self-diagnosis/SKILL.md`, `.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md`, `.agents/skills/swarm-governance/SKILL.md`, `.agents/skills/self-diagnosis/resources/comparative-research-manifest.json`, `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | Assessed (Full) |
| MCP | `mcp/index.js`, `mcp/planner.mjs`, `mcp/briefs.mjs` | Assessed (Full) |
| RUN | `benchmarks/teamwork-vs-squad/README.md` *(repro & live run procedure)* | Assessed (Full) |
| SVC | `mcp/verdicts.mjs` *(acceptance/integrity service boundary; audited alongside `handoffs.mjs`)* | Assessed (Full) |
| DB | None (`package.json` has zero runtime/DB dependencies) | Not applicable |
| SCRIPT | `bin/agy-squad.mjs`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Assessed (Full) |
| TEST | `tests/test-planner.mjs`, `tests/test-run.mjs`, `tests/test-dispatch.mjs`, `tests/test-handoffs.mjs`, `tests/test-server.mjs`, `tests/test-verdicts-and-pivot.mjs`, `tests/test-comparative-dossier.mjs`, `tests/verify-package.mjs` | Assessed (Full) |
| DEP | `package.json`, `.github/workflows/ci.yml` | Assessed (Full) |

---

## 3. Architecture-to-Implementation Trace

| Thesis / Requirement | Ledger IDs | Contract | Implementation | Verification |
| --- | --- | --- | --- | --- |
| Retire Phase 1 PTY launcher cleanly in favor of first-party orchestration | L17 | Reject `agy-squad run`; remove `bin/terminal.py` & `mcp/run-state.mjs` | `bin/agy-squad.mjs`, deleted files, CI drops `setup-python` | `tests/test-run.mjs`, `tests/verify-package.mjs`, doc grep (`--launch`) |
| Explicit `/swarm` planning, model pinning, overlap detection & <=24-char names | L42, L43 | `squad_planner`, `agy-squad plan`, `knownModels` validation, `provenanceScaffold` | `mcp/planner.mjs`, `mcp/index.js`, `bin/agy-squad.mjs` | `tests/test-planner.mjs`, `tests/test-server.mjs`, live `/swarm` (task_squad & r3) |
| Workspace isolation & host-enforced descriptor boundaries | L1, L2, L4, L41 | `O_NOFOLLOW`, `realpathSync`, `/proc/self/fd`, `scratch/agy-squad/` | `mcp/dispatch.mjs`, `mcp/handoffs.mjs` | `tests/test-dispatch.mjs`, `tests/test-handoffs.mjs` |
| Strict single-line verdicts, flat integrity audit & SHA-256 bundles | L2, L42 | `verdict`, `bundle`, `verify`, `prune`, honest attestation bounds | `mcp/verdicts.mjs`, `mcp/handoffs.mjs`, `bin/agy-squad.mjs` | `tests/test-verdicts-and-pivot.mjs`, task_squad bundle SHA 193b63dc... |
| Raw transcript isolation & offline test execution | L6, L7 | Zero `.system_generated/` scraping into `scratch/`, zero real subagents in tests | `mcp/briefs.mjs`, `mcp/planner.mjs`, `tests/*` | `npm test` (8/8 offline suites pass) |
| Private package boundary & Zensical / MCP docs parity | L29, L30, L31 | `"private": true`, 45-file pack boundary, 2 public MCP tools | `package.json`, `mcp/index.js`, `docs/*` | `tests/verify-package.mjs`, `tools/list`, CI `Documentation/build` |

---

## 4. Ten Category Sections

### ARCH — Architecture and Contracts
- **Scope:** `docs/plans/LEDGER.md`, retired Phase 1 files (`bin/terminal.py`, `mcp/run-state.mjs`), `mcp/dispatch.mjs`, `mcp/handoffs.mjs`.
- **Coverage:** Full architectural trace across L1–L7, L17, L21, L29–L31, L40–L43.
- **Verification:** `tests/test-dispatch.mjs`, `tests/test-handoffs.mjs`, code inspection of `handoffs.mjs` & `planner.mjs`.
- **P1:** None identified.
- **P2:** `PR5-ARCH-01` (Closed — wording aligned in 0903c4e; underlying host attestation deferred as residual `PR5-ARCH-05`).
- **P3:** `PR5-ARCH-02`, `PR5-ARCH-03` (Closed in 0903c4e); `PR5-ARCH-04` (Closed (By Design) in Section 8); `PR5-ARCH-06` (Deferred / Won't Fix to native enforcement in Section 8).
- **Verification Gaps:** `PR5-ARCH-05` host-level handoff authorship attestation (NE-04).
- **Verdict:** Pass (blocking architecture gaps closed; `PR5-ARCH-05` tracked as intentional open residual).

### DOC — Documentation and Change Records
- **Scope:** `README.md`, `docs/*.md`, `docs/plans/*.md`, `docs/reviews/*.md`.
- **Coverage:** Full diff inspection, active doc greps (`--launch`, `gemini-3.8-flash-high`, `Managed CLI session`), `google-antigravity==0.1.23` reproduction.
- **Verification:** SDK v0.1.23 Python introspection, `diagnose.mjs --ledger` across ledgers, `docs/index.md` & `pr5-independent-review.md` remediations.
- **P1:** None identified.
- **P2:** `PR5-DOC-01`, `PR5-DOC-02`, `PR5-DOC-04` (Closed in 0903c4e); `R3-DOC-01` (Closed: removed stale `--launch` in `docs/index.md:7`), `R3-DOC-02` (Closed: expanded this ledger to full v1.3.0 format).
- **P3:** `PR5-DOC-03` (Closed in 0903c4e); `R3-DOC-03` (Closed: updated Section 1/9 metadata & sort note), `R3-DOC-04` (Closed: fixed `grep -rnI swarm` in `native-enforcement-ledger.md:78`), `R3-DOC-05` (Closed: removed completed bullet in `pr5-phase2-swarm-planner-review.md:418`).
- **Verification Gaps:** None for active Phase 2 docs.
- **Verdict:** Pass (all Session 1–4 DOC findings remediated and re-verified by `r3-docs`).

### SKILL — Skills and Agent Instructions
- **Scope:** `.agents/skills/*` (`pr-review`, `self-diagnosis`, `swarm-governance` + references & manifests).
- **Coverage:** Frontmatter, relative links, retired symbol drift, progressive-disclosure token budgets, `gemini-4-hydrogen-high` defaults.
- **Verification:** `diagnose.mjs --markdown` (0 broken links, 0 drift hits across all 4 workspace skills), `test-run.mjs` drift tests.
- **P1:** None identified.
- **P2:** None identified.
- **P3:** `PR5-SKILL-01` (Closed in 0903c4e).
- **Verification Gaps:** None.
- **Verdict:** Pass.

### MCP — MCP Server, Protocol, and Schemas
- **Scope:** `mcp/index.js`, `mcp/planner.mjs`, `mcp/briefs.mjs`.
- **Coverage:** JSON-RPC 2.0 stdio framing (10 MB pre-newline ceiling + split UTF-8 recovery), `tools/list`, `squad_planner` schema & `knownModels`, `MAX_SWARM_NAME_LENGTH = 24`, `modelProvenance`.
- **Verification:** `tests/test-server.mjs`, `tests/test-planner.mjs`, live stdio subprocess probe on `gemini-4-hydrogen-high`.
- **P1:** None identified.
- **P2:** None identified.
- **P3:** `PR5-MCP-01` (Closed in 0903c4e); `MCP-PR5-R3-01` (Closed in Session 4: updated `modelProvenance.requestedModel` & `caveat` in `mcp/planner.mjs` when per-worker manifest models are pinned without top-level `model`).
- **Verification Gaps:** None.
- **Verdict:** Pass.

### RUN — Runtime Execution and Concurrency Boundaries
- **Scope:** Live `/swarm` worker lifecycle, `MAX_SWARM_NAME_LENGTH = 24` compatibility, and `benchmarks/teamwork-vs-squad/README.md` live execution steps.
- **Coverage:** End-to-end live planner -> `swarm add` -> `bundle` -> `verify` -> `prune` path and benchmark reproduction docs.
- **Verification:** Session 3 task_squad round-trip (193b63dc...), Session 4 r3 cohort on `gemini-4-hydrogen-high`.
- **P1:** None identified.
- **P2:** None identified.
- **P3:** `PR5-RUN-01` (Closed in d9dc5d2: lowered `MAX_SWARM_NAME_LENGTH` 32 -> 24 and shortened auditor name prefix `audit-${id}`); `RUN-PR5-R3-01` (Closed in Session 4: `benchmarks/teamwork-vs-squad/README.md` now notes `integrityAuditPlan` or `--no-integrity` / `--allow-unaudited` before `bundle`).
- **Verification Gaps:** Layered multi-wave `all_l1` execution on native `/swarm` remains unrun live (schema/planner-verified only).
- **Verdict:** Pass.

### SVC — Services, Acceptance, and Integrity Boundaries
- **Scope:** `mcp/verdicts.mjs` (verdict parsing, code-block stripping, `Target Squad:` validation, role conflation guard).
- **Coverage:** Strict single-line acceptance & integrity gate shared with `mcp/handoffs.mjs` and `bin/agy-squad.mjs verdict`.
- **Verification:** `tests/test-verdicts-and-pivot.mjs`, live task_squad coordinator/auditor verdict checks.
- **P1:** None identified.
- **P2:** None identified.
- **P3:** None identified.
- **Verification Gaps:** None.
- **Verdict:** Pass.

### DB — Persistence and Schema
- **Scope:** Repository dependency/storage check across `package.json`, `mcp/`, `bin/`, `tests/`.
- **Coverage:** `grep` scan confirmed zero SQLite/SQL/ORM/database dependencies or migrations.
- **Verification:** Verified N/A (`package.json` zero runtime deps; JSON/Markdown files only).
- **P1:** None.
- **P2:** None.
- **P3:** None.
- **Verification Gaps:** None.
- **Verdict:** Not applicable.

### SCRIPT — CLI Scripts and Diagnostic Tooling
- **Scope:** `bin/agy-squad.mjs`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs`.
- **Coverage:** CLI argument validation, `--teardown` safety gates, `resolveTargetReviewLedger` precedence (local vs fresh checkout), and `validateTargetReviewLedger` v1.3.0 schema enforcement.
- **Verification:** `tests/test-run.mjs`, equal-mtime fresh checkout test, and cross-ledger sweep across `docs/reviews/*.md`.
- **P1:** None identified.
- **P2:** `PR5-SCRIPT-01` (Closed in 0903c4e for docs; gate independence tracked as residual `PR5-SCRIPT-02`); `R3-SCRIPT-01` (Closed in Session 4: `resolveTargetReviewLedger` sorts `prNumber` descending before cross-family `-r<N>` so fresh checkouts never select `rebuild-wsl-dispatch-review-r2.md` over `pr5-*`).
- **P3:** `R3-SCRIPT-02` (Closed in Session 4: `validateTargetReviewLedger` now runs `validateFindingTable` on Sections 5–7 finding tables too).
- **Verification Gaps:** `PR5-SCRIPT-02` conversation-independent author check (NE-08).
- **Verdict:** Pass.

### TEST — Automated Tests and Regression Coverage
- **Scope:** All 8 test files in `tests/` + `benchmarks/teamwork-vs-squad/verify-benchmark.mjs`.
- **Coverage:** Inspected assertion diffs (`test-run.mjs`, `test-planner.mjs`, `test-dispatch.mjs`, `test-handoffs.mjs`, `test-server.mjs`, `test-verdicts-and-pivot.mjs`, `test-comparative-dossier.mjs`, `verify-package.mjs`), verified zero skipped tests (L7 offline isolation).
- **Verification:** `npm test` (8/8 suites exit 0) after Session 4 test additions.
- **P1:** None identified.
- **P2:** None identified.
- **P3:** `PR5-TEST-01` (Closed in 0903c4e); `TEST-P3-MCP-KNOWNMODELS` & `TEST-P3-PER-SPEC-KNOWNMODELS` (both Closed in Session 4 via `tests/test-server.mjs` and `tests/test-planner.mjs` assertions).
- **Verification Gaps:** None.
- **Verdict:** Pass.

### DEP — Dependencies, CI, and Packaging
- **Scope:** `package.json`, `.github/workflows/ci.yml`.
- **Coverage:** Node >=22 engine alignment with CI [22, 24] matrix, zero runtime deps, removal of unused Python CI setup, and 45-file npm pack boundary.
- **Verification:** `node tests/verify-package.mjs --self-test`, `npm pack --dry-run --json | node tests/verify-package.mjs`, GitHub PR #5 CI runs.
- **P1:** None identified.
- **P2:** None identified.
- **P3:** None identified.
- **Verification Gaps:** Final post-Session-4 push CI confirmation pending push after r3 closure.
- **Verdict:** Pass.

---

## 5. Cross-Category Root Causes and Remediation Rationale

1. **Launcher-removal doc & script tail (`PR5-DOC-01..04`, `R3-DOC-01`):** Phase 2 cleanly excised `bin/terminal.py` and `mcp/run-state.mjs`, while secondary overview/benchmark pages (`docs/index.md:7`, `docs/benchmarks.md`, `benchmarks/teamwork-vs-squad/README.md`) still echoed `--launch` or assumed Phase 1 setup until swept in Sessions 2 and 4.
2. **Host-vs-repo enforcement boundary (`PR5-ARCH-05`, `PR5-SCRIPT-02`, `PR5-ARCH-06`):** File integrity (`handoffs.mjs`) and ledger structure (`diagnose.mjs`) are deterministic inside Node.js, whereas cryptographic identity of board senders (NE-04), external review authorship (NE-08), and runtime spawn/tool policies (`NE-01..NE-06`) require Antigravity host/SDK hooks and are cleanly isolated into [`native-enforcement-ledger.md`](../plans/native-enforcement-ledger.md).
3. **Diagnostic self-consistency (`R3-DOC-02`, `R3-SCRIPT-01`, `R3-SCRIPT-02`):** Because `pr5-independent-review.md` used a shortened format and `diagnose.mjs` both skipped Section 5–7 finding tables and prioritized `-rN` suffixes over PR numbers on equal-mtime checkouts, fresh CI clones silently defaulted to an older PR #1 `-r2` file. Fixing `resolveTargetReviewLedger` (`prNumber` precedence), checking Section 5–7 tables, and upgrading this ledger to full v1.3.0 resolves all three together.

---

## 6. Verification Record and Remaining Gaps

- **Observed post-fix checks (Session 5 continuation on top of Session 4 r3, Gemini 4 Hydrogen High):**
  - Full working-tree delta (`docs/visual-copywriting-pass` + `Decisions A1–A4` & `P1L` Phase 1 leftover cleanup) audited and remediated in [`pr5-layered-swarm-review.md`](pr5-layered-swarm-review.md).
  - `npm test` (9 scripts: `verdicts-and-pivot`, `dispatch`, `planner`, `handoffs`, `run`, `server`, `comparative-dossier` 20/20, `verify-benchmark.mjs`, `verify-package.mjs --self-test`): PASS (exit 0).
  - `npm run verify:package` (`verify-package.mjs --self-test` + `npm pack --dry-run --json`, 52 files): PASS (exit 0).
  - `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort --markdown` (`Status: HEALTHY`, target `docs/reviews/pr5-independent-review.md`, 0 P1/P2, 1 advisory P3 `DOC-LEDGER-RESIDUALS-OPEN`) plus `--ledger docs/reviews/pr5-layered-swarm-review.md`: PASS (exit 0).
  - Live `/swarm` Session 4 r3 bundle (2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e), Session 5 pr5_review layered bundle (bb21a371d0628b7e222d4817929a5af0eb4ded727ce593b67b3de1c4ac7c89c9), Session 5 p1_leftovers bundle (`scratch/agy-squad/squad-p1_leftovers/`), and Zensical build (`zensical build` exit 0): PASS.
- **Remaining gaps:**
  1. Final GitHub CI checks on the pushed Session 5 commit (run immediately after commit/push).
  2. Multi-wave `all_l1` live execution on `/swarm` (verified via compiled `dispatch_squad` / `--print-dispatch` schema) and host-side `NE-*` enforcement spikes (`native-enforcement-ledger.md`).

---

## 7. Overall Disposition and Finding Closure Table

- **Overall Disposition:** **Approve** — zero open P1 or P2 defects remain across all 10 PR Review Standard v1.3.0 categories across Sessions 1–4 (r3 bundle 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e) and Session 5 post-remediation ([`pr5-layered-swarm-review.md`](pr5-layered-swarm-review.md)); two intentional host-boundary residuals (`PR5-ARCH-05`, `PR5-SCRIPT-02`) and one deferred architectural track (`PR5-ARCH-06`) live in Section 8.
- **Note on status placement:** Remediated findings closed during PR #5 Sessions 2–4 carry Closed below (with Session 5's 25 remediated findings + 27 revalidated items recorded 1-to-1 in [`pr5-layered-swarm-review.md`](pr5-layered-swarm-review.md)); detailed post-remediation/residual records live in Section 8 per `pr-review-standard.md` v1.3.0.

| ID | Session | Cat | Severity | Status | Source | Summary & Closure Reference |
| --- | --- | --- | --- | --- | --- | --- |
| `PR5-DOC-01` | 1 → 2 | DOC | P2 | Closed | `README.md:11`, `docs/benchmarks.md:79`, `docs/core-workflows.md:88` | Removed/relabeled retired launcher cleanup claims (0903c4e). |
| `PR5-DOC-02` | 1 → 2 | DOC | P2 | Closed | `docs/benchmarks.md`, `benchmarks/teamwork-vs-squad/README.md` | Labeled Nov 8 metrics as Phase 1 evidence (0903c4e). |
| `PR5-DOC-03` | 1 → 2 | DOC | P3 | Closed | `docs/concepts.md:3`, `docs/plans/comparative-harness-architecture*.md` | Fixed launcher wording & added historical banners (0903c4e). |
| `PR5-DOC-04` | 1 → 2 | DOC | P2 | Closed | `benchmarks/teamwork-vs-squad/README.md` | Updated reproduction steps from `run --launch` to `plan` (0903c4e). |
| `PR5-ARCH-01` | 1 → 2 | ARCH | P2 | Closed | `.agents/skills/swarm-governance/SKILL.md` | Clarified file-integrity layer vs unattested sender limits (0903c4e; residual `PR5-ARCH-05`). |
| `PR5-ARCH-02` | 1 → 2 | ARCH | P3 | Closed | `mcp/planner.mjs`, `tests/test-planner.mjs` | Swarm templates use roster name identity (0903c4e). |
| `PR5-ARCH-03` | 1 → 2 | ARCH | P3 | Closed | `mcp/planner.mjs`, `swarm-governance/SKILL.md` | Documented unmeasured layered lead overhead vs flat default (0903c4e). |
| `PR5-SKILL-01` | 1 → 2 | SKILL | P3 | Closed | `.agents/skills/swarm-governance/SKILL.md` | Clarified board Pointer-Over-Wire is post-hoc inspected (0903c4e). |
| `PR5-MCP-01` | 1 → 2 | MCP | P3 | Closed | `mcp/planner.mjs` | Added `modelValidation`, `preflight`, and `knownModels`/`--known-model` (0903c4e). |
| `PR5-SCRIPT-01` | 1 → 2 | SCRIPT | P2 | Closed | `docs/core-workflows.md`, `diagnose.mjs` | Documented self-authored ledger limit (0903c4e; gate tracked as `PR5-SCRIPT-02`). |
| `PR5-TEST-01` | 1 → 2 | TEST | P3 | Closed | `tests/test-run.mjs`, `tests/test-dispatch.mjs` | Verified non-launcher assertions remain covered (0903c4e). |
| `PR5-RUN-01` | 3 | RUN | P2 | Closed | `mcp/planner.mjs#L31-L69,L501-L505` | Lowered `MAX_SWARM_NAME_LENGTH` 32 → 24 + `audit-<id>` (d9dc5d2; See Section 8). |
| `R3-DOC-01` | 4 | DOC | P2 | Closed | `docs/index.md:7` | Replaced retired `--launch` workflow text with `plan` + governance commands (See Section 8). |
| `R3-DOC-02` | 4 | DOC | P2 | Closed | `docs/reviews/pr5-independent-review.md` | Upgraded review ledger to full Standard v1.3.0 Sections 1–9 (See Section 8). |
| `R3-DOC-03` | 4 | DOC | P3 | Closed | `docs/reviews/pr5-independent-review.md` | Pinned exact 42-file diff, 45-file pack, and `diagnose.mjs` sort order (See Section 8). |
| `R3-DOC-04` | 4 | DOC | P3 | Closed | `docs/plans/native-enforcement-ledger.md:78` | Fixed `grep -ri swarm` → `grep -rnI swarm` in NE-11 (See Section 8). |
| `R3-DOC-05` | 4 | DOC | P3 | Closed | `docs/reviews/pr5-phase2-swarm-planner-review.md:418` | Removed completed gap line for pr5_review integrity audit (See Section 8). |
| `R3-SCRIPT-01` | 4 | SCRIPT | P2 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:108-131` | Prioritized `prNumber` before cross-family `-rN` on equal-mtime checkouts (See Section 8). |
| `R3-SCRIPT-02` | 4 | SCRIPT | P3 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:331-339` | Enabled `validateFindingTable` on Section 5–7 finding tables (See Section 8). |
| `MCP-PR5-R3-01` | 4 | MCP | P3 | Closed | `mcp/planner.mjs:557-563` | Updated `modelProvenance.caveat` & `requestedModel` for per-worker pins (See Section 8). |
| `RUN-PR5-R3-01` | 4 | RUN | P3 | Closed | `benchmarks/teamwork-vs-squad/README.md:101` | Documented `integrityAuditPlan` / `--no-integrity` / `--allow-unaudited` before `bundle` (See Section 8). |
| `TEST-P3-MCP-KNOWNMODELS` | 4 | TEST | P3 | Closed | `tests/test-server.mjs:77-100` | Added MCP stdio `knownModels` acceptance/rejection test (See Section 8). |
| `TEST-P3-PER-SPEC-KNOWNMODELS` | 4 | TEST | P3 | Closed | `tests/test-planner.mjs:341-365` | Added per-spec `model` check against `knownModels` (See Section 8). |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PR5-ARCH-04` | 1 | ARCH | Closed (By Design) | Launcher removal | Loss of per-run tool-profile control and automatic CLI cleanup | Maintainer accepts tradeoff for first-party orchestration (native swarm UI, @mentions); isolated children remain available via `dispatch_squad` (`subagent`). | Maintainer decision, 2026-11-13 |
| `PR5-ARCH-05` | 1 | ARCH | Residual (Open) | `mcp/handoffs.mjs:100-107` | Handoff authorship is not attested: bundle record is assembled from the board | Requires host/SDK attestation (NE-04 in [`docs/plans/native-enforcement-ledger.md`](../plans/native-enforcement-ledger.md)); cannot be fixed inside repo docs/JS. | open |
| `PR5-SCRIPT-02` | 1 | SCRIPT | Residual (Open) | `diagnose.mjs` target-ledger resolution | Health gate cannot enforce author-vs-reviewer independence inside git metadata alone | Tracked as NE-08 in [`docs/plans/native-enforcement-ledger.md`](../plans/native-enforcement-ledger.md). *(Fresh-clone family precedence fixed by `R3-SCRIPT-01`.)* | open |
| `PR5-ARCH-06` | 1 | ARCH | Deferred / Won't Fix | `docs/plans/LEDGER.md` L8–L12, L35–L38 | External suggestion to rebuild retired Docker per-agent sandbox enforcement | Retired Docker container design remains superseded (L8–L12); enforcement track deferred to native Antigravity SDK/hooks (NE-01, NE-02, NE-06 in `native-enforcement-ledger.md`). | open |
| `PR5-RUN-01` | 3 | RUN | Closed (Post-Remediation) | `mcp/planner.mjs#L31-L69,L501-L505` | Native `swarm{action:"add"}` rejects `name` > 24 characters (previously capped at 32) | Lowered `MAX_SWARM_NAME_LENGTH = 24`, shortened auditor prefix `audit-${id}`, updated `tests/test-planner.mjs` (d9dc5d2). | 193b63dce478dd3ad9a7720911cd7872c46f3bbb3cfc8600037c44f6f438b5a5 |
| `R3-DOC-01` | 4 (r3) | DOC | Closed (Post-Remediation) | `docs/index.md:7` | Referenced retired `--launch` / non-`--launch` CLI workflow | Updated `docs/index.md:7` to `/swarm` planning (`plan`) and governance commands; verified zero active `--launch` refs. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-DOC-02` | 4 (r3) | DOC | Closed (Post-Remediation) | `docs/reviews/pr5-independent-review.md` | Reduced review form omitted v1.3.0 §5, §7, full 10-category blocks, and placed Closed (Post-Remediation) in §6 | Upgraded to full PR Review Standard v1.3.0 Sections 1–9 with complete 42-file inventory and separated Section 7/8 statuses. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-DOC-03` | 4 (r3) | DOC | Closed (Post-Remediation) | `docs/reviews/pr5-independent-review.md` | Stale 35-file diff count & inverted `diagnose.mjs` sort wording | Updated to 42 changed files / 45 packaged files and corrected sort description. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-DOC-04` | 4 (r3) | DOC | Closed (Post-Remediation) | `docs/plans/native-enforcement-ledger.md:78` | NE-11 SDK check omitted `-I` (`grep -ri swarm`), matching binary `bin/localharness` | Changed line 78 to `grep -rnI swarm`. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-DOC-05` | 4 (r3) | DOC | Closed (Post-Remediation) | `docs/reviews/pr5-phase2-swarm-planner-review.md:418` | Retained stale pre-audit gap line for completed pr5_review integrity audit | Removed obsolete gap bullet from Section 6 remaining gaps. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-SCRIPT-01` | 4 (r3) | SCRIPT | Closed (Post-Remediation) | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:108-131` | Equal-mtime fresh checkout compared cross-family `-r2` before PR numbers, selecting PR #1's `-r2` ledger over `pr5-*` | Extracted `prNumber` and ordered `prNumber` descending prior to `-r<N>` tie-breaking; added regression test in `tests/test-run.mjs`. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-SCRIPT-02` | 4 (r3) | SCRIPT | Closed (Post-Remediation) | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:331-339` | `validateTargetReviewLedger` skipped `validateFindingTable` on Section 5–7 tables | Added Section 5–7 table validation loop in `diagnose.mjs` and verified across all historical ledgers. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `MCP-PR5-R3-01` | 4 (r3) | MCP | Closed (Post-Remediation) | `mcp/planner.mjs:557-563` | `modelProvenance.caveat` claimed coordinator default even when per-worker specs pinned models | Updated `modelProvenance.requestedModel` and `caveat` when `pinnedModels.size > 0` without top-level `model`. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `RUN-PR5-R3-01` | 4 (r3) | RUN | Closed (Post-Remediation) | `benchmarks/teamwork-vs-squad/README.md:101` | Benchmark live rerun omitted `integrityAuditPlan` / `--no-integrity` before `bundle` | Added `integrityAuditPlan` (CLEAN) or `--no-integrity` / `--allow-unaudited` step before `bundle`. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `TEST-P3-MCP-KNOWNMODELS` | 4 (r3) | TEST | Closed (Post-Remediation) | `tests/test-server.mjs:77-100` | Live stdio test omitted `knownModels` acceptance/rejection cases | Added stdio `tools/call` assertions for valid `gemini-4-hydrogen-high` and rejected `typo-model` against `knownModels`. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `TEST-P3-PER-SPEC-KNOWNMODELS` | 4 (r3) | TEST | Closed (Post-Remediation) | `tests/test-planner.mjs:341-365` | Per-spec manifest `model` vs `knownModels` was untested directly | Added positive & negative per-spec `model` assertions against `knownModels` in `tests/test-planner.mjs`. | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |

---

## 9. `/self-diagnosis` Cohort & Bundle Ledger

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| task_squad (Session 3 Live Join) | `69506793-2b07-43f0-ae50-6e7aa009232d` | Live `squad_planner` (`--known-model`) -> `/swarm` -> `audit-task-squad` -> `bundle`/`verify` | `task-squad-code-verifier`, `task-squad-doc-verifier`, `audit-task-squad` | N/A (caught `>24`-char live spawn rejection, fixed to `MAX_SWARM_NAME_LENGTH=24`) | 193b63dce478dd3ad9a7720911cd7872c46f3bbb3cfc8600037c44f6f438b5a5 (`Content Verdict: PASS`, `Integrity Verdict: CLEAN`) | Verified, pruned & torn down (L41) |
| r3 (Session 4 Hydrogen 4 High Re-Review) | `69506793-2b07-43f0-ae50-6e7aa009232d` | Flat coordinator-led `/swarm` PR #5 re-review on `gemini-4-hydrogen-high` (`r3-runtime`, `r3-docs`, `r3-tests`, `monitor-3` -> `audit-r3`) | `r3-runtime`, `r3-docs`, `r3-tests`, `audit-r3`, `monitor-3` | N/A (3 P2 + 8 P3 remediated before bundling) | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e (`Content Verdict: PASS`, `Integrity Verdict: CLEAN`, audit SHA ce79e24b79355df413be8d75bb61225abb9e19263d9246842cf6bd95d213e778) | Verified & torn down (L41) |
| pr5_review (Session 5 Layered `/swarm` + p1_leftovers Remediation) | `72686908-b468-479a-ad86-db9b9cacf078` | Post-44e6df4 `docs/visual-copywriting-pass` review + Decisions A1–A4 & `P1L` Phase 1 leftover remediation (details in [`pr5-layered-swarm-review.md`](pr5-layered-swarm-review.md)) | `pr5-review-runtime-mcp-c`, `pr5-review-tests-scripts`, `pr5-review-docs-visual-a`, `pr5-review-lead`, `audit-pr5-review`, `monitor` | bb21a371d0628b7e222d4817929a5af0eb4ded727ce593b67b3de1c4ac7c89c9 (Audit 90956c6da58a74968f673c3999d01be95bc61cbe6400fa5868e22eb20906f545) | `pr5-layered-swarm-review.md` post-remediation verification (`npm test` + `verify:package` + `diagnose.mjs` + `zensical build` PASS) | `--keep-reports` retained in `scratch/agy-squad/`; runtime workers killed |

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PR5-RUN-01` | task_squad (Session 3) | RUN | Closed | `mcp/planner.mjs#L31-L69,L501-L505` | Native `swarm{action:"add"}` rejects `name` > 24 characters | Lowered `MAX_SWARM_NAME_LENGTH` 32 → 24 (d9dc5d2); verified via live task_squad spawn + bundle | 193b63dce478dd3ad9a7720911cd7872c46f3bbb3cfc8600037c44f6f438b5a5 |
| `R3-DOC-01` | r3 (Session 4) | DOC | Closed | `docs/index.md:7` | Stale `--launch` CLI text after Phase 2 L17 retirement | Updated `docs/index.md:7` to `/swarm` `plan` & governance subcommands | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-DOC-02` | r3 (Session 4) | DOC | Closed | `docs/reviews/pr5-independent-review.md` | Reduced review form omitted v1.3.0 §5, §7, full 10-category blocks & misplaced §6 statuses | Expanded `pr5-independent-review.md` to full Standard v1.3.0 Sections 1–9 | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-DOC-03` | r3 (Session 4) | DOC | Closed | `docs/reviews/pr5-independent-review.md` | Stale 35-file diff count & inverted `diagnose.mjs` sort wording | Corrected to 42-file diff / 45-file pack & accurate sort description | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-DOC-04` | r3 (Session 4) | DOC | Closed | `docs/plans/native-enforcement-ledger.md:78` | NE-11 SDK check omitted `-I` flag in `grep -ri swarm` | Changed line 78 to `grep -rnI swarm` | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-DOC-05` | r3 (Session 4) | DOC | Closed | `docs/reviews/pr5-phase2-swarm-planner-review.md:418` | Retained stale gap line for already-completed pr5_review integrity audit | Removed obsolete bullet from Section 6 remaining gaps | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-SCRIPT-01` | r3 (Session 4) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:108-131` | Equal-mtime fresh checkout selected PR #1 `-r2` ledger instead of `pr5-*` | Ordered `prNumber` descending before cross-family `-r<N>`; added fresh-clone test in `tests/test-run.mjs` | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `R3-SCRIPT-02` | r3 (Session 4) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:331-339` | `validateTargetReviewLedger` skipped `validateFindingTable` on Sections 5–7 | Added Section 5–7 `validateFindingTable` loop & verified all ledgers | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `MCP-PR5-R3-01` | r3 (Session 4) | MCP | Closed | `mcp/planner.mjs:557-563` | `modelProvenance.caveat` claimed coordinator default despite per-spec model pins | Backfilled `modelProvenance.requestedModel` & `caveat` for `pinnedModels.size > 0` | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `RUN-PR5-R3-01` | r3 (Session 4) | RUN | Closed | `benchmarks/teamwork-vs-squad/README.md:101` | Benchmark live rerun omitted `integrityAuditPlan` / `--no-integrity` before `bundle` | Documented `integrityAuditPlan` / `--no-integrity` / `--allow-unaudited` step | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `TEST-P3-MCP-KNOWNMODELS` | r3 (Session 4) | TEST | Closed | `tests/test-server.mjs:77-100` | Live stdio `squad_planner` test omitted `knownModels` assertions | Added stdio `knownModels` acceptance & rejection assertions | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
| `TEST-P3-PER-SPEC-KNOWNMODELS` | r3 (Session 4) | TEST | Closed | `tests/test-planner.mjs:341-365` | Per-spec manifest `model` vs `knownModels` lacked dedicated unit test | Added positive & negative per-spec `knownModels` assertions in `test-planner.mjs` | 2caec919f9c0b6c349882e3fd5c8138282fdce3ecfea58b2dd273af90369f06e |
