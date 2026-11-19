# Agy-Squad v0.1.3 Launch UX & Regression Review (r2)

**Governing Standard:** Agy-Squad PR Review Standard 1.4.0
**Review type:** Independent Round-2 Launch UX, Closure Revalidation, and Regression Review
**Review date:** 2026-11-19
**Reviewer:** Senior DX & Plugin UX Reviewer (Independent Read-Only Subagent)
**Standard version:** 1.4.0

Content Verdict: PASS

---

## 1. Review metadata, Session Provenance, and evidence limits

### 1.1 Target

| Field | Value |
| --- | --- |
| Repository | `paragon-ux/Agy-Squad` |
| Target | Stacked PR #11 (`fix/ux-day-one-r2` targeting PR #10 `fix/ux-day-one-blockers` targeting PR #9 `feat/v0.1.3-remediation`), `agy-squad@0.1.3` public npm release candidate |
| Comparison base | `feat/v0.1.3-remediation` @ `8760909dabbb9ec8c3d655918293329d51e6f3f2` (PR #9 head); PR #10 `fix/ux-day-one-blockers` @ `9f402f86de0c2caf5cac8fe488bbea6af2645b1d` |
| Head / tree | `fix/ux-day-one-r2` (remediated off `9f402f86de0c2caf5cac8fe488bbea6af2645b1d`) |
| Working-tree state | Remediated & locally verified on `fix/ux-day-one-r2` (Session 4) |
| CI revision | GitHub Actions workflow `.github/workflows/ci.yml` (`ubuntu-latest`, `macos-latest`, `windows-latest`, Node 22 & 24); full local Linux verification executed in Session 4 |
| Prior review | [ux-day-one-review-r1.md](ux-day-one-review-r1.md) (`UX-SQ-001` through `UX-SQ-017`; revalidated independently in Section 3.2 and Section 7.2) |

### 1.2 Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| 1 | `04291507-36ae-4728-a17a-149dbb4714f7` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `feat/v0.1.3-remediation` @ `8760909dabbb9ec8c3d655918293329d51e6f3f2` (read-only) | Read-only Launch UX Reviewer subagent (r1 baseline) |
| 2 | `89a1f8ad-fde0-4788-98be-c127c89ca18d` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `8760909dabbb9ec8c3d655918293329d51e6f3f2..9f402f86de0c2caf5cac8fe488bbea6af2645b1d` | Principal Systems & DX Remediation subagent (PR #10) |
| 3 | `bed9be3d-cc18-433e-b097-c7ec723ced76` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `8760909dabbb9ec8c3d655918293329d51e6f3f2..9f402f86de0c2caf5cac8fe488bbea6af2645b1d` (read-only) | Independent Round-2 Launch UX & Regression Reviewer subagent (r2) |
| 4 | `9f89668a-d323-4c4b-99ad-3e9b0a4945e2` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `9f402f86de0c2caf5cac8fe488bbea6af2645b1d..fix/ux-day-one-r2` (remediated & verified) | Principal Systems & DX Remediation subagent (PR #11) |

### 1.3 Evidence available

- Session 3 direct source inspection (`Source-derived inspection`) across all manifests, installers, CLI, MCP server/planner/dispatcher/brief/handoff/verdict modules, all 4 installed skills and reference docs, Zensical configuration and all 8 public documentation pages, `CHANGELOG.md`, `README.md`, `scripts/release-preflight.mjs`, `.github/workflows/{ci,docs}.yml`, `docs/reviews/UX-day-one-blockers/ux-day-one-review-r1.md`, and regression suites.
- Session 4 local execution verification (`Local execution`, Linux Node.js `v22.19.0`) after remediating `UX-SQ-R2-001`..`UX-SQ-R2-007`: `npm test` (`10/10` suites passing), `npm run preflight` (PASS), `npm run verify:package` (`46` files verified, `docs/plans/**` and `docs/reviews/**` excluded), solo `diagnose.mjs --ledger docs/reviews/v0.1.3-self-diagnosis-review.md --markdown` (`HEALTHY`/`CLEAN`, `0` findings, `0` broken links, `swarm-governance/SKILL.md` `8047 B <= 8192 B`, `tools/list` `2821 B <= 3072 B`), unflagged `diagnose.mjs --skip-mcp-spawn --markdown` (`HEALTHY`/`CLEAN`), `agy-squad verdict` (`PASS` on both `v0.1.3-self-diagnosis-review.md` and `ux-day-one-review-r2.md`), `agy plugin validate --strict --json` (`0` errors; expected `no logo` note per `UX-SQ-016`), public-boundary grep (`0` leaks), and prose `U+2014` scan (`0` hits).

### 1.4 Evidence limits

- Session 3 ran strictly read-only (`Source-derived inspection`); Session 4 closed all 7 actionable Round-2 items plus the local Section 4.9 `finalize` and Quickstart test gaps with live local execution on Linux.
- Physical macOS and Windows native `agy` Desktop IDE and CLI live interactive runs remain external to Linux execution hosts (carried forward in Section 8 as `UX-SQ-017`).
- Brand-approved plugin logo artwork (`assets/logo.svg` + `plugin.json` `logo`) remains intentionally deferred pending human design approval (carried forward in Section 8 as `UX-SQ-016`).

---

## 2. File/artifact-to-category inventory and coverage matrix

| Artifact | Role | Primary category | Cross-references | Coverage |
| --- | --- | --- | --- | --- |
| `README.md` | First-60-seconds landing page, Quickstart, benchmark summary | DOC | RUN, SCRIPT, SKILL, DEP | Complete |
| `CHANGELOG.md` | Release changelog shipped in npm tarball (`package.json#L24`) | DOC | DEP, RUN, SCRIPT | Complete |
| `plugin.json` | Antigravity plugin storefront metadata and `suggestedPrompts` | DEP | DOC | Complete |
| `package.json` | npm package manifest, `bin` entries, `files` allowlist | DEP | TEST, SCRIPT | Complete |
| `zensical.toml` | Hosted Zensical docs navigation and Markdown extension config | DOC | SKILL | Complete |
| `install.sh`, `install.ps1` | POSIX and Windows installer wrappers | SCRIPT | DEP | Complete |
| `scripts/install-register.mjs` | Plugin copy/link, skills link, MCP config registration, shims, PATH & companion checks | SCRIPT | SKILL, DEP, DOC | Complete |
| `scripts/release-preflight.mjs` | Release metadata and `files` boundary verifier | SCRIPT | DEP, DOC | Complete |
| `bin/agy-squad.mjs` | Governance CLI entrypoint, grouped usage, 17-command `SUBCOMMAND_HELP`, `finalize` | SCRIPT | RUN, DOC | Complete |
| `mcp/index.js` | Stdio MCP server (`dispatch_squad`, `squad_planner`), multi-root workspace resolution | MCP | RUN, SVC | Complete |
| `mcp/dispatch.mjs` | Manifest loading, `formatNotFoundError`, stage compiler | MCP | RUN, SKILL | Complete |
| `mcp/planner.mjs` | `/swarm` and `subagent` cohort planner, warnings, `verificationPipeline` | RUN | SVC, MCP, SCRIPT, DOC | Complete |
| `mcp/briefs.mjs` | Compiled worker, lead, and integrity auditor prompt templates | SVC | SKILL, RUN | Complete |
| `mcp/handoffs.mjs` | `computeEvidenceDigest`, `inspectHandoffs`, `bundleReports`, `verifyBundle`, `verifyAndPruneBundle`, `buildBundleRecordInit` | SVC | RUN, SCRIPT | Complete |
| `mcp/verdicts.mjs` | Strict single-line content and integrity verdict parsers | RUN | SVC | Complete |
| `.agents/skills/swarm-governance/{SKILL.md,references/*.md}` | Native `/swarm` Execution Modifier skill and 4 reference files | SKILL | DOC, SCRIPT, SVC | Complete |
| `.agents/skills/pr-review/{SKILL.md,references/pr-review-standard.md}` | PR Review Standard 1.4.0 Task Spec skill | SKILL | DOC | Complete |
| `.agents/skills/full-review/{SKILL.md,references/*.md}` | Non-diff triage, evidence intake, role separation, and report template | SKILL | DOC | Complete |
| `.agents/skills/self-diagnosis/{SKILL.md,scripts/diagnose.mjs,resources/*.json,references/*.md}` | Maintainer self-diagnosis profiler skill, manifests, and workspace/link validator | SKILL | SCRIPT, SVC, DOC | Complete |
| `docs/{index,getting-started,core-workflows,roles-and-workflows,concepts,tools,stopping-agents,benchmarks}.md` | Public Zensical user documentation | DOC | SKILL, SCRIPT, RUN, SVC | Complete |
| `tests/test-{dispatch,planner,handoffs,run,lifecycle-installer,verdicts-and-pivot}.mjs`, `tests/verify-package.mjs`, `.github/workflows/{ci,docs}.yml` | Automated regression suite and CI matrix | TEST | RUN, SVC, SCRIPT, SKILL, DEP | Complete (source inspection) |

| Category | Scope covered | Coverage | Verdict |
| --- | --- | --- | --- |
| `ARCH` | Multi-agent governance boundary, portability model, cross-plugin boundary | Complete | No findings within reviewed scope |
| `DOC` | `README.md`, `CHANGELOG.md`, `zensical.toml`, all 8 `docs/*.md` pages | Complete | Closed (`UX-SQ-R2-002`, `UX-SQ-R2-003`, `UX-SQ-R2-006`) |
| `SKILL` | All 4 `.agents/skills/*/SKILL.md` files, `references/`, `resources/`, `diagnose.mjs` | Complete | Closed (`UX-SQ-R2-005`) |
| `MCP` | `mcp/index.js`, `mcp/dispatch.mjs` (`formatNotFoundError`) | Complete | No findings within reviewed scope |
| `RUN` | `mcp/planner.mjs` (`verificationPipeline`), `mcp/verdicts.mjs`, `bin/agy-squad.mjs` (`finalize`) | Complete | Closed (`UX-SQ-R2-001`) |
| `SVC` | `mcp/briefs.mjs`, `mcp/handoffs.mjs` (`computeEvidenceDigest`, `buildBundleRecordInit`, `bundleReports`, `verifyAndPruneBundle`) | Complete | No findings within reviewed scope |
| `DB` | Filesystem JSON/Markdown state only (no SQL/database layer) | Complete | Not applicable |
| `SCRIPT` | `install.sh`, `install.ps1`, `scripts/install-register.mjs`, `scripts/release-preflight.mjs`, `bin/agy-squad.mjs` | Complete | Closed (`UX-SQ-R2-004`, `UX-SQ-R2-007`) |
| `TEST` | Full 10-suite `npm test` + `preflight` + `verify:package` + `diagnose.mjs` + `.github/workflows/{ci,docs}.yml` | Complete (local Linux execution in Session 4) | No findings within reviewed scope |
| `DEP` | `package.json`, `plugin.json` | Complete | No findings within reviewed scope |

---

## 3. Architecture-to-implementation trace & Round-1 closure revalidation

### 3.1 Day-1 external-user contract trace (r2)

| User journey | Promised contract / doc | Actual implementation (`fix/ux-day-one-r2`) | Observed / verified result |
| --- | --- | --- | --- |
| Run Quickstart `plan -> verdict -> bundle-init --digest -> finalize` in external repo | `README.md#L58-L71`, `mcp/planner.mjs#L1012`, `bin/agy-squad.mjs#L197` | `README.md` saves `scratch/plan.json` via `--read-only --role "Security" --role "Test Audit"` (0 warnings, single-squad `squad-integrity_auditor/specialist-1/report.md`), passes `--handoffs scratch/handoffs.json` to `bundle-init --digest`; `verificationPipeline` and `SUBCOMMAND_HELP["bundle-init"]` include `--handoffs`; empty handoffs on `bundle-init --digest` throws an actionable error naming `--handoffs <file.json>` / `--handoff <worker=READY ...>`. | Satisfied (Session 4; `UX-SQ-R2-001`, `UX-SQ-R2-002` Closed) |
| Run `/pr-review` or `/full-review` in unrelated repo without dirtying git tree | `.agents/skills/pr-review/SKILL.md#L10-L11,L45`, `full-review/SKILL.md#L49`, `docs/index.md#L22` | Portable skills, references, `docs/index.md#L22`, `docs/roles-and-workflows.md#L20,L62`, and `docs/concepts.md#L75` all specify delivering structured v1.4.0 reviews in chat, an Antigravity artifact, or `docs/reviews/<slug>.md` when requested or already adopted. | Satisfied (Session 4; `UX-SQ-R2-003` Closed) |
| Standalone `npx` install + `status` onboarding (Linux, macOS, Windows) | `scripts/install-register.mjs`, `README.md#L29-L53`, `docs/getting-started.md#L17-L62` | `runInstall()` and `printStatus()` check `isDirOnPath()`, emit copy-paste OS guidance + `npx` fallback, print `2.0.4+ recommended` and `--no-integrity`/`--allow-unaudited` standalone guidance with zero prose `U+2014` em dashes (`non-fatal: ${note}`), and keep `--json` clean. | Satisfied (Session 4; `UX-SQ-R2-007` Closed) |
| Paired `Agy-Squad` + `Agy-Context-Saver` v2.0.4 execution | `mcp/briefs.mjs`, `docs/getting-started.md#L141`, `docs/concepts.md#L69` | All 8 compiled brief templates (`mcp/briefs.mjs#L13,L19,L26,L32,L39,L152-L154`) and both manifests direct workspace inspection to `rtk grep`/`rtk find` + bounded `<= 150`-line `read_file` slices and reserve `rtk read` strictly for spillovers/task logs. | Satisfied |
| Click `plugin.json` `suggestedPrompts` on Day 1 in external repo | `plugin.json#L5,L20-L24` | Plain-English description (zero internal jargon) and 3 Day-1 runnable prompts (`squad_planner`, `/pr-review`, `agy-squad status`). | Satisfied |
| Guard `self-diagnosis` and `diagnose.mjs` outside `Agy-Squad` checkout | `.agents/skills/self-diagnosis/SKILL.md#L4-L9,L14`, `diagnose.mjs#L2154-L2200` | Maintainer-only frontmatter and opening banner; `diagnose.mjs --help` exits 0 from any cwd; `assertAgySquadWorkspace()` exits 1 cleanly without stack traces in empty dirs or unrelated repos while preserving `DEP-001` unpacked tarball compatibility. | Satisfied |
| Follow skill documentation links under installed plugin depth 2 or copy-fallback | `.agents/skills/*`, `diagnose.mjs#L888-L935,L988-L1028` | Zero relative links escaping `.agents/skills/` remain; all 6 hosted Zensical URLs and `#anchor` slugs match existing `docs/*.md` files and headings; `diagnose.mjs` rejects malformed `..`/`\` hosted URLs and any relative escape outside `.agents/skills/`. | Satisfied (Session 4; `UX-SQ-R2-005` Closed) |

### 3.2 Independent revalidation of Round-1 closures (`UX-SQ-001` through `UX-SQ-015`)

Every Round-1 closure claim in [ux-day-one-review-r1.md](ux-day-one-review-r1.md) was independently checked in source:

- **Accepted as Closed cleanly (10 of 15):** `UX-SQ-001`, `UX-SQ-005`, `UX-SQ-006`, `UX-SQ-007`, `UX-SQ-008`, `UX-SQ-009`, `UX-SQ-010`, `UX-SQ-011`, `UX-SQ-012`, `UX-SQ-014`.
- **Accepted as Closed in primary target, with concrete follow-up defects/regressions opened under fresh r2 IDs (5 of 15):**
  - `UX-SQ-002`: Closed in all 4 skill/reference files and `docs/index.md#L22`; residual doc contradiction in `docs/roles-and-workflows.md#L62` and `docs/concepts.md#L75` opened as `UX-SQ-R2-003` (P2).
  - `UX-SQ-003`: Closed across portable skills, `mcp/dispatch.mjs#L304`, and `/home/paragon-ux` sanitization; rewritten Quickstart in `README.md#L58-L68` introduced a broken `bundle-init --digest` call (`UX-SQ-R2-001`, P2) and missing `scratch/plan.json` / single-squad auditor slot mismatch (`UX-SQ-R2-002`, P2).
  - `UX-SQ-004`: Closed for all shipped links and `../../../docs/` rejection; minor `diagnose.mjs` validator edge cases (`..`/`\` hosted URL skip and non-`docs` cross-root escapes) opened as `UX-SQ-R2-005` (P3).
  - `UX-SQ-013`: Closed across all 17 subcommands; `SUBCOMMAND_HELP["bundle-init"]` Example 1 fails at runtime (`UX-SQ-R2-001`, P2) and `hasHelpFlag` misses bundled short-flag conflicts like `setup -ch` (`UX-SQ-R2-004`, P3).
  - `UX-SQ-015`: Core `agy-squad finalize` runtime pipeline holds up cleanly (happy path, fail-closed checks, `--allow-unaudited`, `--replace`, `--predecessor`, `--prune`, `--keep-reports`); `verificationPipeline` preceding `bundle-init --digest` step omits `--handoffs` (`UX-SQ-R2-001`, P2), and `CHANGELOG.md` `[0.1.3]` omits `finalize` (`UX-SQ-R2-006`, P3).

---

## 4. Category reviews

### 4.1 `ARCH`: Architecture and contracts
- **Scope:** Multi-agent governance model, standalone vs. paired `Agy-Context-Saver` v2.0.4 boundaries, external-repo portability contracts across `docs/`, `mcp/`, and `.agents/skills/`.
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope (implementation/doc contract mismatches owned canonically under `RUN` and `DOC`).
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Source-derived inspection of runtime boundaries and cross-plugin contracts.
- **Category Verdict:** No findings within reviewed scope.

### 4.2 `DOC`: Documentation and change records
- **Scope:** `README.md`, `CHANGELOG.md`, `zensical.toml`, `docs/{index,getting-started,core-workflows,roles-and-workflows,concepts,tools,stopping-agents,benchmarks}.md`.
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** `UX-SQ-R2-002` (Closed), `UX-SQ-R2-003` (Closed); cross-referenced by `UX-SQ-R2-001` (`RUN`, Closed).
- **P3 (low priority):** `UX-SQ-R2-006` (Closed).
- **Verification:** Local execution and source verification of `README.md` Quickstart (`tests/test-planner.mjs`, `tests/test-handoffs.mjs`), `docs/roles-and-workflows.md`, `docs/concepts.md`, `docs/tools.md`, `CHANGELOG.md` (`tests/test-run.mjs`), public-boundary grep (`0` leaks), and prose `U+2014` scan (`0` hits).
- **Category Verdict:** No open findings within reviewed scope (all r2 items Closed).

### 4.3 `SKILL`: Skills and agent instructions
- **Scope:** `.agents/skills/{swarm-governance,pr-review,full-review,self-diagnosis}/{SKILL.md,references/*,resources/*,scripts/diagnose.mjs}`.
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope (cross-referenced by `UX-SQ-R2-003` in `DOC`, Closed).
- **P3 (low priority):** `UX-SQ-R2-005` (Closed).
- **Verification:** Local execution of `diagnose.mjs --ledger docs/reviews/v0.1.3-self-diagnosis-review.md --markdown` (`HEALTHY`/`CLEAN`, `0` broken links, `swarm-governance/SKILL.md` `8047 B <= 8192 B`) and negative link-validator tests in `tests/test-run.mjs` (`../../../README.md`, hosted `..`, and hosted `\`).
- **Category Verdict:** No open findings within reviewed scope (`UX-SQ-R2-005` Closed).

### 4.4 `MCP`: MCP schemas and public API
- **Scope:** `mcp/index.js`, `mcp/dispatch.mjs` (`formatNotFoundError`, workspace containment, `TOOLS` schemas).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Source-derived inspection and local execution of `tests/test-server.mjs` and `tests/test-dispatch.mjs`; `tools/list` response `2821 B <= 3072 B`.
- **Category Verdict:** No findings within reviewed scope.

### 4.5 `RUN`: Core runtime, parsing, and validation
- **Scope:** `mcp/planner.mjs` (`planSquadCohort`, `verificationPipeline`), `mcp/verdicts.mjs`, `bin/agy-squad.mjs` (`finalize`, `bundle-init`, `plan`, `dispatch`, `collect`, `bundle`, `verify`, `prune`).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** `UX-SQ-R2-001` (Closed).
- **P3 (low priority):** None identified within reviewed scope (CLI help-flag parser edge case owned under `SCRIPT` as `UX-SQ-R2-004`, Closed).
- **Verification:** Local execution of `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, and `tests/test-run.mjs` covering `verificationPipeline`, empty-handoffs error hint on `bundle-init --digest`, and full `plan -> bundle-init --handoff --digest -> finalize --replace --prune` pipeline.
- **Category Verdict:** No open findings within reviewed scope (`UX-SQ-R2-001` Closed).

### 4.6 `SVC`: Services, orchestration, and audit semantics
- **Scope:** `mcp/briefs.mjs` compiled templates (all 8 subagent and `/swarm` prompt builders) and `mcp/handoffs.mjs` (`inspectHandoffs`, `computeEvidenceDigest`, `bundleReports`, `verifyBundleInternal`, `verifyAndPruneBundle`, `pruneReports`).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Source-derived inspection and full local `npm test` execution confirming all compiled briefs align with `Agy-Context-Saver` v2.0.4 and `verifyAndPruneBundle` enforces `auditPolicy`, `acceptedHash`, `retainReports`, and inode/SHA-256 re-verification before unlink.
- **Category Verdict:** No findings within reviewed scope.

### 4.7 `DB`: Database, migrations, replay, and concurrency
- **Scope:** Filesystem JSON and Markdown artifacts only (`scratch/agy-squad/`, `lead/report.sources.json`); no SQL/database layer exists.
- **Coverage:** Complete.
- **P1 (high priority):** Not applicable.
- **P2 (medium priority):** Not applicable.
- **P3 (low priority):** Not applicable.
- **Verification:** Confirmed filesystem-only persistence in `mcp/handoffs.mjs` and `mcp/planner.mjs`.
- **Category Verdict:** Not applicable.

### 4.8 `SCRIPT`: Scripts, evaluation, and developer tooling
- **Scope:** `install.sh`, `install.ps1`, `scripts/install-register.mjs`, `scripts/release-preflight.mjs`, `bin/agy-squad.mjs` (`usage`, `SUBCOMMAND_HELP`, `hasHelpFlag`, lifecycle subcommands).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope (cross-referenced by `UX-SQ-R2-001` in `RUN` for `bin/agy-squad.mjs#L197`, Closed).
- **P3 (low priority):** `UX-SQ-R2-004` (Closed), `UX-SQ-R2-007` (Closed).
- **Verification:** Local execution of `tests/test-run.mjs` (bundled `setup -ch`, `plan -xh`, `plan --help=false` rejection; `bundle-init --help` `--handoffs` verification) and `tests/test-lifecycle-installer.mjs` (`status` MISSING & OUTDATED companion outputs have 0 `U+2014` em dashes and surface `2.0.4+` + `--no-integrity` / `--allow-unaudited`).
- **Category Verdict:** No open findings within reviewed scope (`UX-SQ-R2-004`, `UX-SQ-R2-007` Closed).

### 4.9 `TEST`: Tests and CI
- **Scope:** All 10 `npm test` suites (`tests/test-*.mjs`, `tests/verify-package.mjs`), `npm run preflight`, `diagnose.mjs`, `agy plugin validate --strict --json`, and `.github/workflows/{ci,docs}.yml`.
- **Coverage:** Complete by local Linux execution (Session 4).
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Executed `npm test` (`10/10` suites passing), `npm run preflight`, `npm run verify:package` (`46` files), `diagnose.mjs` (`HEALTHY`/`CLEAN`), and `agy plugin validate --strict --json` (`0` errors). Both Session 3 local verification gaps are now closed: (1) `tests/test-handoffs.mjs` exercises `--predecessor <sha256>` (match & mismatch), positive `--allow-non-passing`, and positive `--allow-partial` on `agy-squad finalize`; (2) `tests/test-planner.mjs` and `tests/test-handoffs.mjs` run the exact `README.md` Quickstart `plan -> bundle-init --digest -> finalize` sequence end-to-end (which also caught and eliminated a 24-char worker-name truncation warning on the Quickstart role titles). Physical macOS/Windows native `agy` IDE/CLI execution remains tracked in Section 8 (`UX-SQ-017`).
- **Category Verdict:** No findings within reviewed scope.

### 4.10 `DEP`: Dependencies, packaging, and configuration
- **Scope:** `package.json`, `plugin.json`, `scripts/release-preflight.mjs`, `tests/verify-package.mjs`.
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope (brand logo artwork tracked in Section 8 as `UX-SQ-016`).
- **Verification:** Source-derived inspection of `package.json` `files` allowlist (explicitly negating `docs/plans/**` and `docs/reviews/**`), zero runtime npm dependencies, and `plugin.json` metadata and `suggestedPrompts`.
- **Category Verdict:** No findings within reviewed scope.

---

## 5. Findings

### 5.1 P0/P1/P2 finding records

#### `UX-SQ-R2-001`: `bundle-init --plan ... --digest` omits required `--handoffs` / `--handoff` in `verificationPipeline`, `bundle-init --help`, and `README.md`, causing deterministic exit 1 | P2 | Closed

1. **Title, priority, status:** `bundle-init --plan ... --digest` omits required `--handoffs` / `--handoff` in `verificationPipeline`, `bundle-init --help`, and `README.md`, causing deterministic exit 1, P2, Closed.
2. **Contract provenance:** `README.md#L64-L66`, `mcp/planner.mjs#L1008-L1020`, and `bin/agy-squad.mjs#L196-L198` present copy-pasteable Day-1 commands for initializing a bundle record with its canonical `Evidence Digest` ahead of `agy-squad finalize`; `bundling-and-wire-format.md#L52,L67` documents that `handoffs` must be supplied via `--handoff` or `--handoffs` before `digest` / `inspect` can succeed.
3. **Source evidence:** `mcp/planner.mjs#L1012` (`verificationPipeline`), `bin/agy-squad.mjs#L197` (`SUBCOMMAND_HELP["bundle-init"]`), `bin/agy-squad.mjs#L819-L824` (actionable empty-handoffs error on `bundle-init --digest`), `README.md#L65-L66`, `docs/tools.md#L138`.
4. **Trigger:** Any external developer or coordinator agent runs the exact `agy-squad bundle-init --plan <plan.json> --digest --out <record.json> <file>` command emitted by `squad_planner` (`verificationPipeline`), printed by `agy-squad bundle-init --help` Example 1, or shown in `README.md` Quickstart.
5. **Expected / actual:** Expected (`Source-derived inference`): documented `bundle-init --digest` commands include `--handoffs <handoffs.json>` (or `--handoff <worker=READY ...>`) so `computeEvidenceDigest` succeeds and the emitted `<record.json>` can pass straight into `agy-squad finalize`. Actual before Session 4 (`9f402f86`): `planSquadCohort` initialized `handoffs: []` and `bundle-init --digest` threw without hinting which flag was missing. Remediated in Session 4 (`fix/ux-day-one-r2`): `--handoffs` added to `mcp/planner.mjs#L1012`, `bin/agy-squad.mjs#L197`, and `README.md#L65-L66`, and `bin/agy-squad.mjs#L819-L824` emits an explicit error telling users to pass `--handoffs <file.json>` or `--handoff <worker=READY ...>`.
6. **Impact:** Eliminates guaranteed Day-1 `exit 1` failure on the Quickstart, CLI help, and `squad_planner` `verificationPipeline`.
7. **Required remediation:** Add `--handoffs <handoffs.json>` (or `--handoff <worker=READY ...>`) to `mcp/planner.mjs#L1012`, `bin/agy-squad.mjs#L197`, and `README.md#L65-L66`, and surface an explicit empty-handoffs error hint on `bundle-init --digest`.
8. **Acceptance evidence:** Verified via `tests/test-planner.mjs` (`verificationPipeline` includes `--handoffs`), `tests/test-run.mjs` (`bundle-init --help` `--digest` example includes `--handoffs`), and `tests/test-handoffs.mjs` (empty handoffs fails with `--handoffs <file.json>` / `--handoff <worker=READY ...>` hint; with `--handoff` feeds directly into `agy-squad finalize --replace --prune`).
9. **Root cause / related IDs:** `bundle-init --digest` shorthand documented without the mandatory handoff-receipt flag when wiring `UX-SQ-013` and `UX-SQ-015`; closely related to `UX-SQ-R2-002`.
10. **Closure:** Closed in Session 4 (`fix/ux-day-one-r2`, stacked PR #11).

#### `UX-SQ-R2-002`: `README.md` Quickstart omits saving `scratch/plan.json`, uses multi-squad auditor path for a single-squad task, and triggers an inherit overlap warning | P2 | Closed

1. **Title, priority, status:** `README.md` Quickstart omits saving `scratch/plan.json`, uses multi-squad auditor path for a single-squad task, and triggers an inherit overlap warning, P2, Closed.
2. **Contract provenance:** `README.md#L55-L75` is the first-60-seconds Quickstart promised under `UX-SQ-003` to run cleanly end-to-end in any external user repository.
3. **Source evidence:** `README.md#L58-L71`, `mcp/planner.mjs#L83,L387-L394,L811-L814`, `tests/test-planner.mjs`, `tests/test-handoffs.mjs`.
4. **Trigger:** An external developer follows `README.md#L58-L71` sequentially in their own repository.
5. **Expected / actual:** Expected (`Source-derived inference`): the `plan` command compiles cleanly with zero warnings, saves `scratch/plan.json`, references the exact single-squad `squad-task_squad` and `squad-integrity_auditor/specialist-1/report.md` slots, and passes `--handoffs scratch/handoffs.json` to `bundle-init --digest` ahead of `verdict --integrity` and `finalize`. Remediated in Session 4 (`fix/ux-day-one-r2`): updated `README.md#L58-L71` to run `mkdir -p scratch && agy-squad plan --mode swarm --read-only --scope src --role "Security" --role "Test Audit" "Audit authentication flow" > scratch/plan.json` (using `< 24`-char role slugs so `warnings` is `[]`, also eliminating the 24-char worker-name truncation warning caught by the new end-to-end test), check `squad-task_squad/lead/report.md`, run `bundle-init --plan scratch/plan.json --handoffs scratch/handoffs.json --digest --out scratch/record.json src/auth.js`, check `squad-integrity_auditor/specialist-1/report.md` (with multi-squad note), and run `agy-squad finalize scratch/record.json --replace --prune`.
6. **Impact:** External developers copying the README Quickstart now execute a warning-free, causally ordered end-to-end pipeline.
7. **Required remediation:** Update `README.md#L58-L71` to create/save `scratch/plan.json` with zero warnings, reference `squad-integrity_auditor/specialist-1/report.md`, and pass `--handoffs scratch/handoffs.json`.
8. **Acceptance evidence:** Executed exact Quickstart `plan` command in `tests/test-planner.mjs` (asserting `warnings: []`, `workers[0].squadId === "task_squad"`, and `integrityAuditPlan[0].reportSlot === "scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md"`) and full `plan -> bundle-init --digest -> finalize --replace --prune` sequence in `tests/test-handoffs.mjs`.
9. **Root cause / related IDs:** Quickstart rewritten in Session 2 without end-to-end test execution; related to `UX-SQ-R2-001`.
10. **Closure:** Closed in Session 4 (`fix/ux-day-one-r2`, stacked PR #11).

#### `UX-SQ-R2-003`: Hosted docs linked by `pr-review/SKILL.md` (`docs/roles-and-workflows.md#L62` and `docs/concepts.md#L75`) still unconditionally mandate writing to `docs/reviews/` | P2 | Closed

1. **Title, priority, status:** Hosted docs linked by `pr-review/SKILL.md` (`docs/roles-and-workflows.md#L62` and `docs/concepts.md#L75`) still unconditionally mandate writing to `docs/reviews/`, P2, Closed.
2. **Contract provenance:** `UX-SQ-002` established that `/pr-review` and `/full-review` deliver structured reports in chat or Antigravity artifacts by default, writing `docs/reviews/<review-slug>.md` only when the active repository already maintains `docs/reviews/` or the user explicitly requests an in-repo ledger (enforced in `.agents/skills/pr-review/SKILL.md#L10-L11,L45`, `.agents/skills/full-review/SKILL.md#L49`, `pr-review-standard.md#L153`, and `docs/index.md#L22`).
3. **Source evidence:** `docs/roles-and-workflows.md#L20,L62`, `docs/concepts.md#L75`, `tests/test-run.mjs`.
4. **Trigger:** An external developer or Antigravity agent follows the hosted link from `pr-review/SKILL.md#L16` to `roles-and-workflows/#pr-review` or reads `docs/concepts.md` when reviewing a branch in an unrelated repository.
5. **Expected / actual:** Remediated in Session 4 (`fix/ux-day-one-r2`): updated `docs/roles-and-workflows.md#L20,L62` and `docs/concepts.md#L75` so all public docs match `pr-review/SKILL.md#L45` and `docs/index.md#L22` (deliver structured v1.4.0 reviews in chat, an Antigravity artifact, or `docs/reviews/<slug>.md` when requested or already adopted in the repository).
6. **Impact:** Eliminates the doc-vs-skill contradiction on the hosted `#pr-review` anchor linked by `pr-review/SKILL.md#L16`.
7. **Required remediation:** Update `docs/roles-and-workflows.md#L20,L62` and `docs/concepts.md#L75` to match `pr-review/SKILL.md#L45` and `docs/index.md#L22`.
8. **Acceptance evidence:** Source reconciliation, regex assertions in `tests/test-run.mjs`, and `diagnose.mjs --markdown` (`0` broken links).
9. **Root cause / related IDs:** Partial doc sweep during `UX-SQ-002` remediation.
10. **Closure:** Closed in Session 4 (`fix/ux-day-one-r2`, stacked PR #11).

### 5.2 P3 actionable advisory table

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UX-SQ-R2-004` | Session 3 | SCRIPT | Closed | `bin/agy-squad.mjs#L629-L635` | `hasHelpFlag(rest)` paired with `if (rest.length > 1)` allowed bundled short-option conflicts (`setup -ch`, `plan -xh`) and `--help=false` to print help and exit 0 instead of throwing `Conflicting flags`. | Tightened `bin/agy-squad.mjs#L630` to `if (rest.length > 1 || (rest[0] !== "--help" && rest[0] !== "-h"))`. | Verified in `tests/test-run.mjs` (`setup -ch`, `plan -xh`, `plan --help=false` all exit 1 with `Conflicting flags`) |
| `UX-SQ-R2-005` | Session 3 | SKILL | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs#L902-L921,L988-L1014` | `extractMarkdownLinks()` silently ignored hosted docs URLs containing `..` or `\` and `checkRelativeLinks()` only rejected `../../../docs` instead of all relative links escaping `.agents/skills/`. | Returned `invalidReason: "malformed hosted docs URL"` for `..`/`\` hosted URLs and enforced `path.relative(skillsRootDir, item.resolved)` escape checks on all non-hosted relative links inside `.agents/skills/`. | Verified in `tests/test-run.mjs` (`../../../docs/tools.md`, `../../../README.md`, hosted `..`, hosted `\` all fail `diagnose.mjs`) and solo `diagnose.mjs --markdown` (`0` broken links) |
| `UX-SQ-R2-006` | Session 3 | DOC | Closed | `CHANGELOG.md#L8-L22`, `package.json#L24` | `CHANGELOG.md` `[0.1.3]` omitted PR #10/PR #11 public `agy-squad finalize`, grouped `--help` / 17-command `SUBCOMMAND_HELP`, `PATH`/companion onboarding, external-repo portability, and v2.0.4 brief alignment while retaining internal `docs/plans/LEDGER.md` / `L51` / `L56` citations. | Updated `CHANGELOG.md#L8-L22` (`[0.1.3]`) with full public additions/changes/fixes and replaced internal ledger citations with plain public descriptions (leaving historical `0.1.2` and `docs/plans/LEDGER.md` untouched). | Verified in `tests/test-run.mjs`, `npm run preflight`, `npm run verify:package` (`46` files), and public-boundary grep |
| `UX-SQ-R2-007` | Session 3 | SCRIPT | Closed | `scripts/install-register.mjs#L1043,L1203,L1205,L1271` | `formatCompanionLine()` emitted prose `U+2014` em dashes in `agy-squad status` output, and `printStatus()` `[INFO]` omitted `2.0.4+ recommended` and standalone `--no-integrity` / `--allow-unaudited` guidance. | Replaced `U+2014` em dashes in `formatCompanionLine()` with `non-fatal: ${note}` and aligned `printStatus()` `[INFO]` + `runInstall()` with `>= 2.0.1, 2.0.4+ recommended` and `--no-integrity` / `--allow-unaudited` standalone guidance. | Verified in `tests/test-lifecycle-installer.mjs` (both `MISSING` and `OUTDATED` status outputs have `0` `U+2014` em dashes and surface `2.0.4+` + `--no-integrity` / `--allow-unaudited`) |

---

## 6. Cross-category root causes, strengths to preserve, and remediation plan

### 6.1 Cross-category root causes

1. **Untested end-to-end Quickstart & `verificationPipeline` wiring (`UX-SQ-R2-001`, `UX-SQ-R2-002`):** While `tests/test-handoffs.mjs` tested `bundle-init --digest` with `--handoff` and tested `finalize` against a hand-crafted record, no test validated that the exact Quickstart commands in `README.md#L58-L68`, `mcp/planner.mjs#L1012`, and `bin/agy-squad.mjs#L197` execute cleanly in sequence.
2. **Incomplete secondary doc & release-note synchronization (`UX-SQ-R2-003`, `UX-SQ-R2-006`, `UX-SQ-R2-007`):** Primary skill files and `docs/getting-started.md` / `docs/index.md` were updated cleanly in PR #10, while secondary surfaces (`docs/roles-and-workflows.md#L62`, `docs/concepts.md#L75`, `CHANGELOG.md#L8-L20`, and `printStatus()` `[INFO]`) lagged behind.

### 6.2 What already works exceptionally well (preserve in PR #11)

- **Portable external-repo skills & maintainer gating (`UX-SQ-001`, `UX-SQ-004`, `UX-SQ-008`, `UX-SQ-011`):** All 4 skills use active-repo framing or explicit maintainer gating, zero `../../../docs/` relative escapes, verified hosted Zensical `#anchor` URLs, conditional third-party skill scoping, and a clean `assertAgySquadWorkspace()` guard in `diagnose.mjs` that preserves `DEP-001` unpacked tarball runs.
- **Cross-plugin `Agy-Context-Saver` v2.0.4 harmony (`UX-SQ-006`):** Every compiled brief in `mcp/briefs.mjs` and both self-diagnosis manifests consistently pair `rtk grep`/`rtk find` with bounded `<= 150`-line `read_file` slices while reserving `rtk read` for spillovers and completed task logs.
- **First-60-seconds storefront & onboarding (`UX-SQ-005`, `UX-SQ-009`, `UX-SQ-010`, `UX-SQ-012`, `UX-SQ-014`):** `plugin.json` is crisp plain English with 3 immediately runnable Day-1 `suggestedPrompts`; `scripts/install-register.mjs` delivers cross-platform `isDirOnPath()` detection, copy-paste POSIX/PowerShell `PATH` fixes + `npx` fallback, `[NEXT STEP]` companion guidance, Desktop IDE reload `Next steps:`, and actionable `NOT INSTALLED`/`PARTIAL INSTALLATION` hints without breaking `--json`; `agy-squad --help` fits comfortably within 100 columns.
- **Fail-closed `agy-squad finalize` core runtime (`UX-SQ-015`):** `bin/agy-squad.mjs#L941-L996` composes `inspectHandoffs -> bundleReports -> verifyBundle / verifyAndPruneBundle` cleanly with proper flag forwarding, `--allow-unaudited` audit-field clearing, `--keep-reports` guard, and custom `reportRoot` parity.

### 6.3 Minimal remediation order for stacked PR #11 (estimated < 30 minutes)

1. Fix `UX-SQ-R2-001` (`mcp/planner.mjs#L1012`, `bin/agy-squad.mjs#L197`, `README.md#L67`) and `UX-SQ-R2-002` (`README.md#L58-L68`).
2. Fix `UX-SQ-R2-003` (`docs/roles-and-workflows.md#L20,L62`, `docs/concepts.md#L75`).
3. Take all 4 quick-win P3 fixes cleanly in the same PR: `UX-SQ-R2-004` (`bin/agy-squad.mjs#L630`), `UX-SQ-R2-005` (`diagnose.mjs#L904,L985`), `UX-SQ-R2-006` (`CHANGELOG.md#L8-L20`), and `UX-SQ-R2-007` (`scripts/install-register.mjs#L1203,L1205,L1271`).
4. Add targeted regression assertions in `tests/test-planner.mjs`, `tests/test-run.mjs`, and `tests/test-handoffs.mjs` (including `--predecessor`, `--allow-non-passing`, and `--allow-partial` coverage on `finalize`), then re-run `npm run preflight`, `npm test`, `npm run verify:package`, `diagnose.mjs --markdown`, and `agy plugin validate --strict --json`.

---

## 7. Overall disposition and finding closure table

### 7.1 Overall disposition

- **Coverage:** Complete across all 9 applicable categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`) with full local Linux execution verification in Session 4; `DB` Not applicable; physical macOS/Windows GUI/CLI execution remains disclosed in Section 1.4 and Section 8 (`UX-SQ-017`).
- **Blocking findings:** None (`0` open P0/P1/P2/P3 findings; all 7 Round-2 findings `UX-SQ-R2-001`..`UX-SQ-R2-007` Closed in Session 4).
- **Launch Readiness Verdict:** **READY TO SHIP** (stacked PR #11 targeting PR #10).
- **Disposition:** Approve.
- **Reason:** All 3 P2 defects (`UX-SQ-R2-001`, `UX-SQ-R2-002`, `UX-SQ-R2-003`), all 4 P3 advisories (`UX-SQ-R2-004`..`UX-SQ-R2-007`), and both local Section 4.9 test gaps (`--predecessor`, `--allow-non-passing`, `--allow-partial` on `finalize`, plus full end-to-end Quickstart execution) have been remediated and verified across `npm test` (`10/10`), `npm run preflight`, `npm run verify:package` (`46` files), `diagnose.mjs` (`HEALTHY`/`CLEAN`, `0` broken links), `agy-squad verdict` (`PASS`), `agy plugin validate --strict --json` (`0` errors), public-boundary grep (`0` leaks), and prose `U+2014` check (`0` hits).

### 7.2 Finding closure table (`1 ID = 1 Row`)

| ID | Category | Priority | Status | Summary | Evidence / Disposition |
| --- | --- | --- | --- | --- | --- |
| `UX-SQ-001` | SKILL | P0 | Closed | `pr-review` and `full-review` generalized to active repository (`<owner/repo>`) with Agy-Squad checks scoped | Revalidated in Session 3 (`9f402f86`): accepted Closed |
| `UX-SQ-002` | SKILL | P0 | Closed | `pr-review` and `full-review` skills and `docs/index.md` make `docs/reviews/` writes opt-in | Revalidated in Session 3 (`9f402f86`): accepted Closed in skills; residual public-doc contradiction closed in Session 4 under `UX-SQ-R2-003` |
| `UX-SQ-003` | SKILL | P0 | Closed | Replaced checkout-only `node bin/agy-squad.mjs` and `/home/paragon-ux` across portable skills, `mcp/dispatch.mjs#L304`, and docs | Revalidated in Session 3 (`9f402f86`): accepted Closed; rewritten Quickstart seams closed in Session 4 under `UX-SQ-R2-001` and `UX-SQ-R2-002` |
| `UX-SQ-004` | SKILL | P1 | Closed | Replaced cross-root `../../../docs/` links with validated hosted Zensical URLs + `#anchor` checks | Revalidated in Session 3 (`9f402f86`): accepted Closed; defensive validator tightening closed in Session 4 under `UX-SQ-R2-005` |
| `UX-SQ-005` | SCRIPT | P1 | Closed | Added `PATH` warning + `npx` fallback and `detectCompanionDependencies()` `[NEXT STEP]` notice in `setup`/`status` | Revalidated in Session 3 (`9f402f86`): accepted Closed |
| `UX-SQ-006` | SVC | P1 | Closed | Aligned all `mcp/briefs.mjs` templates, manifests, and docs to `rtk grep`/`rtk find` + bounded `<= 150`-line `read_file` slices | Revalidated in Session 3 (`9f402f86`): accepted Closed |
| `UX-SQ-007` | DOC | P2 | Closed | Added `scratch/` `.gitignore` / `.git/info/exclude` / `--report-root` callouts and qualified benchmark table note | Revalidated in Session 3 (`9f402f86`): accepted Closed |
| `UX-SQ-008` | SKILL | P2 | Closed | Gated `self-diagnosis/SKILL.md` as maintainer-only and added `assertAgySquadWorkspace()` in `diagnose.mjs` | Revalidated in Session 3 (`9f402f86`): accepted Closed |
| `UX-SQ-009` | DEP | P2 | Closed | Rewrote `plugin.json` description & Day-1 `suggestedPrompts` in plain English + added `README.md` opener | Revalidated in Session 3 (`9f402f86`): accepted Closed |
| `UX-SQ-010` | SCRIPT | P2 | Closed | Reformatted `agy-squad --help` into grouped `<= 100`-char sections listing `--help`/`--version` | Revalidated in Session 3 (`9f402f86`): accepted Closed |
| `UX-SQ-011` | SKILL | P2 | Closed | Removed third-party skills from `swarm-governance/SKILL.md` and scoped Section 5 as optional | Revalidated in Session 3 (`9f402f86`): accepted Closed |
| `UX-SQ-012` | DOC | P2 | Closed | Added IDE reload `Next steps:`, `Uninstall & Rollback`, and `Agy-Context-Saver >= 2.0.1 (2.0.4+ recommended)` | Revalidated in Session 3 (`9f402f86`): accepted Closed |
| `UX-SQ-013` | SCRIPT | P3 | Closed | Added `SUBCOMMAND_HELP` for all 17 active subcommands | Revalidated in Session 3 (`9f402f86`): accepted Closed; Example 1 bug and `-ch` flag conflict closed in Session 4 under `UX-SQ-R2-001` and `UX-SQ-R2-004` |
| `UX-SQ-014` | SCRIPT | P3 | Closed | Added 1-line `Next step:` setup hint on `NOT INSTALLED` / `PARTIAL INSTALLATION` while preserving clean `--json` | Revalidated in Session 3 (`9f402f86`): accepted Closed |
| `UX-SQ-015` | RUN | P3 | Closed | Added `agy-squad finalize` shorthand (`inspect -> bundle -> verify [+ prune]`) and surfaced in planner/docs | Revalidated in Session 3 (`9f402f86`): accepted Closed; `verificationPipeline` `--handoffs` and `CHANGELOG.md` closed in Session 4 under `UX-SQ-R2-001` and `UX-SQ-R2-006` |
| `UX-SQ-R2-001` | RUN | P2 | Closed | Added `--handoffs` to `bundle-init --plan ... --digest` in `mcp/planner.mjs#L1012`, `bin/agy-squad.mjs#L197`, and `README.md#L65-L66`, plus empty-handoffs hint in `bin/agy-squad.mjs#L819-L824` | Closed in Session 4 (`fix/ux-day-one-r2`): verified in `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, and `tests/test-run.mjs` |
| `UX-SQ-R2-002` | DOC | P2 | Closed | Updated `README.md#L58-L71` Quickstart to save `scratch/plan.json` warning-free (`--read-only --role "Security" --role "Test Audit"`), reference `squad-task_squad` and `squad-integrity_auditor/specialist-1/report.md`, and pass `--handoffs` | Closed in Session 4 (`fix/ux-day-one-r2`): verified end-to-end in `tests/test-planner.mjs` (`0` warnings) and `tests/test-handoffs.mjs` |
| `UX-SQ-R2-003` | DOC | P2 | Closed | Aligned `docs/roles-and-workflows.md#L20,L62` and `docs/concepts.md#L75` with opt-in `docs/reviews/<slug>.md` delivery (`pr-review/SKILL.md#L45`, `docs/index.md#L22`) | Closed in Session 4 (`fix/ux-day-one-r2`): verified in `tests/test-run.mjs` and `diagnose.mjs --markdown` (`0` broken links) |
| `UX-SQ-R2-004` | SCRIPT | P3 | Closed | Tightened `bin/agy-squad.mjs#L629-L635` so `setup -ch`, `plan -xh`, and `plan --help=false` throw `Conflicting flags` | Closed in Session 4 (`fix/ux-day-one-r2`): verified in `tests/test-run.mjs` |
| `UX-SQ-R2-005` | SKILL | P3 | Closed | Hardened `diagnose.mjs#L902-L921,L988-L1014` to flag malformed `..`/`\` hosted URLs and any relative link escaping `.agents/skills/` | Closed in Session 4 (`fix/ux-day-one-r2`): verified in `tests/test-run.mjs` and solo `diagnose.mjs --markdown` (`0` broken links) |
| `UX-SQ-R2-006` | DOC | P3 | Closed | Updated `CHANGELOG.md#L8-L22` (`[0.1.3]`) with PR #10/PR #11 public additions/fixes and removed internal `docs/plans/LEDGER.md` / `L51` / `L56` citations | Closed in Session 4 (`fix/ux-day-one-r2`): verified in `tests/test-run.mjs`, `npm run preflight`, `npm run verify:package`, and public-boundary grep |
| `UX-SQ-R2-007` | SCRIPT | P3 | Closed | Replaced prose `U+2014` em dashes in `scripts/install-register.mjs#L1203,L1205` with `non-fatal: ${note}` and aligned `printStatus()` `[INFO]` at `#L1271` with `runInstall()` (`2.0.4+ recommended`, `--no-integrity`/`--allow-unaudited`) | Closed in Session 4 (`fix/ux-day-one-r2`): verified in `tests/test-lifecycle-installer.mjs` |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UX-SQ-016` | Session 1 | DEP | Deferred / Won't Fix | `plugin.json#L1-L25` | `plugin.json` omits a `"logo"` property and `assets/logo.svg` artwork (renders generic plugin icon). | Carried forward from r1; deferred pending explicit human/brand design approval (`antislop` R-23 / `L49`). | Source-derived inspection of `plugin.json#L1-L25` at `9f402f86` |
| `UX-SQ-017` | Session 1 | TEST | Deferred / Won't Fix | `docs/getting-started.md#L3,L9` | Physical macOS and Windows native `agy` Desktop IDE and CLI live interactive runs remain unverified (Node.js CI parity covers Linux, macOS, and Windows). | Carried forward from r1; deferred on physical multi-OS hardware/GUI execution access (`L46`), honestly disclosed in `docs/getting-started.md#L3,L9`. | Source-derived inspection of `docs/getting-started.md#L3,L9` at `9f402f86` |
