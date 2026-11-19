# Agy-Squad v0.1.3 Final Launch UX & Merge-Gate Review (r3)

**Governing Standard:** Agy-Squad PR Review Standard 1.4.0
**Review type:** Independent Round-3 Final Launch UX & Merge-Gate Review
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
| Head / tree | `fix/ux-day-one-r2` @ `c131359d83a6ca86bebcc635ed3978320c88c45e` (PR #11 head) |
| Working-tree state | Read-only independent inspection at `c131359d83a6ca86bebcc635ed3978320c88c45e` |
| CI revision | GitHub Actions workflow `.github/workflows/ci.yml` (`ubuntu-latest`, `macos-latest`, `windows-latest`, Node 22 & 24); Session 4 recorded full local Linux Node.js v22.19.0 execution in `ux-day-one-review-r2.md` |
| Prior review | [ux-day-one-review-r1.md](ux-day-one-review-r1.md) (`UX-SQ-001` through `UX-SQ-017`) and [ux-day-one-review-r2.md](ux-day-one-review-r2.md) (`UX-SQ-R2-001` through `UX-SQ-R2-007`; independently revalidated in Section 3.2 and Section 7.2) |

### 1.2 Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| 1 | `04291507-36ae-4728-a17a-149dbb4714f7` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `feat/v0.1.3-remediation` @ `8760909dabbb9ec8c3d655918293329d51e6f3f2` (read-only) | Read-only Launch UX Reviewer subagent (r1 baseline) |
| 2 | `89a1f8ad-fde0-4788-98be-c127c89ca18d` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `8760909dabbb9ec8c3d655918293329d51e6f3f2..9f402f86de0c2caf5cac8fe488bbea6af2645b1d` | Principal Systems & DX Remediation subagent (PR #10) |
| 3 | `bed9be3d-cc18-433e-b097-c7ec723ced76` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `8760909dabbb9ec8c3d655918293329d51e6f3f2..9f402f86de0c2caf5cac8fe488bbea6af2645b1d` (read-only) | Independent Round-2 Launch UX & Regression Reviewer subagent (r2) |
| 4 | `9f89668a-d323-4c4b-99ad-3e9b0a4945e2` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `9f402f86de0c2caf5cac8fe488bbea6af2645b1d..c131359d83a6ca86bebcc635ed3978320c88c45e` (remediated & verified) | Principal Systems & DX Remediation subagent (PR #11) |
| 5 | `5f84e928-aa5a-45dd-9cee-684a69813b98` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `9f402f86de0c2caf5cac8fe488bbea6af2645b1d..c131359d83a6ca86bebcc635ed3978320c88c45e` (read-only) | Independent Round-3 Final Launch UX & Merge-Gate Reviewer subagent (r3) |

### 1.3 Evidence available

- **Session 5 direct source inspection (Source-derived inspection at `c131359d83a6ca86bebcc635ed3978320c88c45e`):** Independently read every Round-2 remediation target and regression suite on disk: `README.md`, `CHANGELOG.md`, `plugin.json`, `package.json`, `zensical.toml`, `install.sh`, `install.ps1`, `scripts/install-register.mjs`, `scripts/release-preflight.mjs`, `bin/agy-squad.mjs`, `mcp/index.js`, `mcp/dispatch.mjs`, `mcp/planner.mjs`, `mcp/briefs.mjs`, all 4 `.agents/skills/*/SKILL.md` files and all 9 skill `references/*.md` files, `.agents/skills/self-diagnosis/scripts/diagnose.mjs`, all 8 public `docs/*.md` pages, `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, `tests/test-run.mjs`, `tests/test-lifecycle-installer.mjs`, `tests/verify-package.mjs`, `.github/workflows/ci.yml`, `docs/reviews/UX-day-one-blockers/ux-day-one-review-r1.md`, and `docs/reviews/UX-day-one-blockers/ux-day-one-review-r2.md`.
- **Session 4 recorded local verification (`ux-day-one-review-r2.md#L39`, Linux Node.js v22.19.0):** Recorded passing runs of `npm test` (10/10 suites), `npm run preflight`, `npm run verify:package` (46 verified files with `docs/plans/**` and `docs/reviews/**` excluded), solo `diagnose.mjs --ledger docs/reviews/v0.1.3-self-diagnosis-review.md --markdown` (HEALTHY/CLEAN, 0 findings, 0 broken links, `swarm-governance/SKILL.md` 8047 B <= 8192 B, `tools/list` 2821 B <= 3072 B), unflagged `diagnose.mjs --skip-mcp-spawn --markdown`, `agy-squad verdict` (PASS), `agy plugin validate --strict --json` (0 errors; expected logo note per `UX-SQ-016`), public-boundary grep (0 leaks), and prose `U+2014` scan (0 hits).

### 1.4 Evidence limits

- Session 5 executed strictly read-only without shell/write tools (Source-derived inspection); every behavioral conclusion in Session 5 was verified directly against the actual implementation and test assertions on disk, paired with Session 4's recorded local Linux execution at `c131359d83a6ca86bebcc635ed3978320c88c45e`.
- Physical macOS and Windows native `agy` Desktop IDE and CLI live interactive runs remain external to Linux execution hosts (carried forward in Section 8 as `UX-SQ-017`; `.github/workflows/ci.yml#L24-L25` provides Node 22/24 CI parity across `ubuntu-latest`, `macos-latest`, and `windows-latest`).
- Brand-approved plugin logo artwork (`assets/logo.svg` + `plugin.json` `logo`) remains intentionally deferred pending explicit human design approval (carried forward in Section 8 as `UX-SQ-016`).

---

## 2. File/artifact-to-category inventory and coverage matrix

| Artifact | Role | Primary category | Cross-references | Coverage |
| --- | --- | --- | --- | --- |
| `README.md` | First-60-seconds landing page, Quickstart (`#L58-L77`), CLI summary, benchmark table | DOC | RUN, SCRIPT, SKILL, DEP | Complete |
| `CHANGELOG.md` | Release changelog shipped in npm tarball (`package.json#L24`, `[0.1.3]` at `#L8-L22`) | DOC | DEP, RUN, SCRIPT | Complete |
| `plugin.json` | Antigravity plugin storefront metadata and 3 Day-1 `suggestedPrompts` (`#L1-L25`) | DEP | DOC | Complete |
| `package.json` | npm package manifest, `bin` entries, `files` allowlist negating `docs/plans` and `docs/reviews` (`#L10-L26`) | DEP | TEST, SCRIPT | Complete |
| `zensical.toml` | Hosted Zensical 8-page public navigation and Markdown extension config (`#L1-L92`) | DOC | SKILL | Complete |
| `install.sh`, `install.ps1` | POSIX (`#L1-L4`) and Windows (`#L1-L26`) installer wrappers | SCRIPT | DEP | Complete |
| `scripts/install-register.mjs` | Plugin copy/link, skills link, MCP registration, shims, `isDirOnPath`, companion checks, `formatCompanionLine`, `printStatus` (`#L1-L1386`) | SCRIPT | SKILL, DEP, DOC | Complete |
| `scripts/release-preflight.mjs` | Release metadata, `plugin.json`, `CHANGELOG.md`, `files` allowlist, and test-suite parity verifier (`#L1-L254`) | SCRIPT | DEP, DOC | Complete |
| `bin/agy-squad.mjs` | Governance CLI entrypoint, grouped usage, 17-command `SUBCOMMAND_HELP`, `hasHelpFlag`, `bundle-init --digest` guard, `finalize` (`#L1-L1038`) | SCRIPT | RUN, DOC | Complete |
| `mcp/index.js` | Stdio MCP server (`dispatch_squad`, `squad_planner`), JSON-RPC 2.0 validation, multi-root workspace resolution (`#L1-L300`) | MCP | RUN, SVC | Complete |
| `mcp/dispatch.mjs` | Manifest loading, `formatNotFoundError` (`#L294-L305`), stage compiler | MCP | RUN, SKILL | Complete |
| `mcp/planner.mjs` | `/swarm` and `subagent` cohort planner, `allocateWorkerName` (`#L71-L107`), single-squad auditor routing (`#L809-L860`), `verificationPipeline` (`#L1008-L1020`) | RUN | SVC, MCP, SCRIPT, DOC | Complete |
| `mcp/briefs.mjs` | Compiled worker, lead, and integrity auditor prompt templates aligned to `Agy-Context-Saver` v2.0.4 (`#L1-L245`) | SVC | SKILL, RUN | Complete |
| `.agents/skills/{swarm-governance,pr-review,full-review,self-diagnosis}/{SKILL.md,references/*}` | All 4 installed skills and all 9 reference files | SKILL | DOC, SCRIPT, SVC | Complete |
| `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Maintainer profiler, `validateTargetReviewLedger` (`#L371-L590`), `extractMarkdownLinks` (`#L890-L932`), `checkRelativeLinks` (`#L988-L1028`), `assertAgySquadWorkspace` (`#L2182-L2223`) | SKILL | SCRIPT, SVC, DOC | Complete |
| `docs/{index,getting-started,core-workflows,roles-and-workflows,concepts,tools,stopping-agents,benchmarks}.md` | All 8 public Zensical user documentation pages | DOC | SKILL, SCRIPT, RUN, SVC | Complete |
| `tests/test-{planner,handoffs,run,lifecycle-installer}.mjs`, `tests/verify-package.mjs`, `.github/workflows/ci.yml` | Regression suites proving every Round-2 fix and `finalize` option, plus 3-OS CI matrix | TEST | RUN, SVC, SCRIPT, SKILL, DEP | Complete (source inspection + Session 4 recorded run) |

| Category | Scope covered | Coverage | Verdict |
| --- | --- | --- | --- |
| `ARCH` | Multi-agent governance boundary, external-repo portability model, standalone vs. paired `Agy-Context-Saver` v2.0.4 boundaries | Complete | No findings within reviewed scope |
| `DOC` | `README.md`, `CHANGELOG.md`, `zensical.toml`, all 8 `docs/*.md` pages | Complete | No findings within reviewed scope (`UX-SQ-R2-002`, `UX-SQ-R2-003`, `UX-SQ-R2-006` verified Closed) |
| `SKILL` | All 4 `.agents/skills/*/SKILL.md` files, all 9 `references/*.md` files, `diagnose.mjs` link validator and workspace guard | Complete | No findings within reviewed scope (`UX-SQ-R2-005` verified Closed) |
| `MCP` | `mcp/index.js`, `mcp/dispatch.mjs` (`formatNotFoundError`, `TOOLS` schemas, multi-root resolution) | Complete | No findings within reviewed scope |
| `RUN` | `mcp/planner.mjs` (`allocateWorkerName`, single-squad auditor slot, `verificationPipeline`), `bin/agy-squad.mjs` (`bundle-init --digest` guard, `finalize`) | Complete | No findings within reviewed scope (`UX-SQ-R2-001` verified Closed) |
| `SVC` | `mcp/briefs.mjs` compiled templates (all 8 subagent and `/swarm` prompt builders), `finalize` handoff/bundle/verify/prune composition | Complete | No findings within reviewed scope |
| `DB` | Filesystem JSON/Markdown state only (no SQL/database layer exists) | Complete | Not applicable |
| `SCRIPT` | `install.sh`, `install.ps1`, `scripts/install-register.mjs`, `scripts/release-preflight.mjs`, `bin/agy-squad.mjs` | Complete | No findings within reviewed scope (`UX-SQ-R2-004`, `UX-SQ-R2-007` verified Closed) |
| `TEST` | `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, `tests/test-run.mjs`, `tests/test-lifecycle-installer.mjs`, `tests/verify-package.mjs`, `.github/workflows/ci.yml` | Complete (source verification of assertions + Session 4 recorded execution) | No findings within reviewed scope |
| `DEP` | `package.json`, `plugin.json` | Complete | No findings within reviewed scope (`UX-SQ-016` deferred in Section 8) |

---

## 3. Architecture-to-implementation trace & Round-2 closure revalidation

### 3.1 Day-1 external-user contract trace (r3)

| User journey | Promised contract / doc | Actual implementation (`c131359d`) | Verified result |
| --- | --- | --- | --- |
| Install via `npx` and check status on Linux, macOS, Windows | `README.md#L29-L53`, `docs/getting-started.md#L17-L62`, `scripts/install-register.mjs#L1026-L1052,L1198-L1284` | `runInstall()` and `printStatus()` detect `PATH` via `isDirOnPath()`, emit OS-specific copy-paste `PATH` fixes plus `npx` fallback, print `>= 2.0.1, 2.0.4+ recommended` and `--no-integrity` / `--allow-unaudited` standalone guidance with zero prose `U+2014` em dashes, emit Desktop IDE reload `Next steps:`, and keep `status --json` pure JSON. | Satisfied |
| Execute README Quickstart `plan -> verdict -> bundle-init --digest -> verdict --integrity -> finalize` in an external repo | `README.md#L58-L71`, `mcp/planner.mjs#L1012`, `bin/agy-squad.mjs#L197,L819-L824`, `docs/tools.md#L138` | `plan --mode swarm --read-only --scope src --role "Security" --role "Test Audit" "Audit authentication flow" > scratch/plan.json` produces 0 warnings (`task-squad-security` 19 chars, `task-squad-test-audit` 21 chars, `audit-task-squad` 16 chars, all <= 24 chars), targets single-squad `squad-task_squad` and `squad-integrity_auditor/specialist-1/report.md`, passes `--handoffs scratch/handoffs.json` to `bundle-init --digest`, and feeds directly into `agy-squad finalize scratch/record.json --replace --prune`. Empty handoffs on `bundle-init --digest` fail closed before writing `--out` with an actionable flag hint. | Satisfied |
| Invoke `/pr-review` or `/full-review` in an unrelated user repo | `.agents/skills/pr-review/SKILL.md#L10-L11,L45`, `.agents/skills/full-review/SKILL.md#L49`, `docs/index.md#L22`, `docs/roles-and-workflows.md#L20,L62`, `docs/concepts.md#L75` | All portable skills, reference templates (`report-template.md#L3,L23`), and public docs consistently target the active repository (`<owner/repo>`) and deliver structured 1.4.0 reports in chat, an Antigravity artifact, or `docs/reviews/<slug>.md` only when requested or already adopted. | Satisfied |
| Click `plugin.json` `suggestedPrompts` or run `agy-squad <cmd> --help` on Day 1 | `plugin.json#L5,L20-L24`, `bin/agy-squad.mjs#L16-L301,L575-L588,L608-L635` | Plain-English plugin description and 3 immediately runnable Day-1 `suggestedPrompts`; grouped <= 100-column top-level `--help` with `--version`/`-v`; 17 focused `SUBCOMMAND_HELP` pages; bundled short-flag help conflicts (`setup -ch`, `plan -xh`) and `--help=false` fail closed with `Conflicting flags`. | Satisfied |
| Pair `Agy-Squad` with `Agy-Context-Saver` v2.0.4 | `mcp/briefs.mjs#L13,L19,L26,L32,L39,L152-L154`, `docs/getting-started.md#L141`, `docs/concepts.md#L69`, `ecosystem-and-modifiers.md#L43` | Every compiled specialist, lead, and integrity auditor brief directs workspace inspection to `rtk grep`/`rtk find` + bounded <= 150-line `read_file` slices (`StartLine`/`EndLine`) and reserves `rtk read` strictly for step spillovers and completed task logs. | Satisfied |
| Guard maintainer-only `self-diagnosis` and skill links under copy-fallback | `.agents/skills/self-diagnosis/SKILL.md#L4-L9,L14`, `diagnose.mjs#L888-L932,L988-L1028,L2182-L2223` | `self-diagnosis` is explicitly gated to Agy-Squad checkouts; `diagnose.mjs --help` exits 0 anywhere while non-checkout invocations exit 1 with a friendly message and no stack trace; zero relative links escape `.agents/skills/`, and `diagnose.mjs` rejects malformed `..`/`\` hosted URLs and any relative escape outside `.agents/skills/`. | Satisfied |

### 3.2 Independent revalidation of Round-2 closures (`UX-SQ-R2-001` through `UX-SQ-R2-007`) and Section 4.9 test gaps

Every Round-2 fix and regression test cited in [ux-day-one-review-r2.md](ux-day-one-review-r2.md) was independently verified on disk at `c131359d83a6ca86bebcc635ed3978320c88c45e`:

1. **`UX-SQ-R2-001` (Accepted Closed):**
   - `mcp/planner.mjs#L1012` emits `"agy-squad bundle-init --plan <plan.json> --handoffs <handoffs.json> --digest --out <bundle-record.json> <verified-files...>"`.
   - `bin/agy-squad.mjs#L197` updates `SUBCOMMAND_HELP["bundle-init"]` Example 1 to pass `--handoffs scratch/handoffs.json`.
   - `bin/agy-squad.mjs#L819-L824` validates `values.digest && (!Array.isArray(record.handoffs) || record.handoffs.length === 0)` before `--out` file creation (`#L825-L850`), throwing an explicit message naming `--handoffs <file.json>` and `--handoff <worker=READY ...>`.
   - `docs/tools.md#L138` explicitly documents that `--digest` requires `--handoffs` or `--handoff` (`--out` optional).
   - `README.md#L65-L66` passes `--handoffs scratch/handoffs.json` ahead of `--digest --out scratch/record.json src/auth.js`.
   - Regression tests genuinely prove every guarantee: `tests/test-planner.mjs#L1213-L1219` checks `verificationPipeline`, `tests/test-run.mjs#L1099-L1103` checks `bundle-init --help`, and `tests/test-handoffs.mjs#L1780-L1817` asserts empty handoffs fail closed with both flag hints without creating `--out`, while passing `--handoff` yields a 64-hex `evidenceDigest` and completes `finalize --replace --prune`.
2. **`UX-SQ-R2-002` (Accepted Closed):**
   - `README.md#L58-L71` creates `scratch/` and saves `scratch/plan.json` via `--mode swarm --read-only --scope src --role "Security" --role "Test Audit" "Audit authentication flow"`, checks `squad-task_squad/lead/report.md`, passes `--handoffs scratch/handoffs.json` to `bundle-init --digest`, checks single-squad `squad-integrity_auditor/specialist-1/report.md` (with multi-squad `squad-integrity_auditor-<id>` note), and calls `agy-squad finalize scratch/record.json --replace --prune`.
   - Traced `allocateWorkerName` (`mcp/planner.mjs#L71-L107`) and single-squad auditor slot selection (`mcp/planner.mjs#L809-L817`): all compiled worker names stay <= 24 characters (`task-squad-security` 19 chars, `task-squad-test-audit` 21 chars, `audit-task-squad` 16 chars) and `readOnly: true` exempts overlapping read scopes, producing zero warnings.
   - Regression tests prove both compilation and end-to-end execution: `tests/test-planner.mjs#L1220-L1241` executes the exact CLI `plan` command asserting `warnings: []`, `workers[0].squadId === "task_squad"`, and `integrityAuditPlan[0].reportSlot === "scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md"`; `tests/test-handoffs.mjs#L1761-L1817` runs the complete `plan -> bundle-init --digest -> finalize --replace --prune` sequence.
3. **`UX-SQ-R2-003` (Accepted Closed):**
   - `docs/roles-and-workflows.md#L20` and `#L62` plus `docs/concepts.md#L75` now match `.agents/skills/pr-review/SKILL.md#L45` and `docs/index.md#L22` verbatim on delivering structured 1.4.0 reports in chat, an Antigravity artifact, or `docs/reviews/<slug>.md` when requested or already adopted.
   - Regression assertions verified in `tests/test-run.mjs#L1115-L1119`.
4. **`UX-SQ-R2-004` (Accepted Closed):**
   - `bin/agy-squad.mjs#L629-L635` tightens the `hasHelpFlag(rest)` guard (`#L575-L588`) to `if (rest.length > 1 || (rest[0] !== "--help" && rest[0] !== "-h"))`, rejecting bundled short-option conflicts (`setup -ch`, `plan -xh`) and `--help=false` while preserving `-- --help` after option termination (`#L584`).
   - Regression tests verified in `tests/test-run.mjs#L1105-L1113` (all 3 invalid invocations assert exit 1 and `Conflicting flags`).
5. **`UX-SQ-R2-005` (Accepted Closed):**
   - `.agents/skills/self-diagnosis/scripts/diagnose.mjs#L902-L921` emits `{ resolved: null, isHostedDocs: true, invalidReason: "malformed hosted docs URL" }` when hosted Zensical URL slugs contain `..` or `\`.
   - `diagnose.mjs#L988-L1014` enforces `item.invalidReason` reporting and checks `path.relative(skillsRootDir, item.resolved)` (`=== ".."`, `startsWith(".." + path.sep)`, or `path.isAbsolute`) for every non-hosted relative link inside `.agents/skills/`.
   - Regression tests verified in `tests/test-run.mjs#L1041-L1055` covering all 4 negative cases (`../../../docs/tools.md`, `../../../README.md`, hosted `..`, hosted `\`) and asserting exit 1 with `SKILL-LINKS-pr-review`.
6. **`UX-SQ-R2-006` (Accepted Closed):**
   - `CHANGELOG.md#L8-L22` (`## [0.1.3] - 2026-11-19`) documents `agy-squad finalize`, grouped <= 100-char `--help`, 17-command `SUBCOMMAND_HELP`, `PATH`/companion onboarding, external-repo portability, `Agy-Context-Saver` v2.0.4 brief alignment, and all 7 Round-2 fixes with zero internal `docs/plans/LEDGER.md` or `L51`/`L56` citations (historical `[0.1.2]` preserved at `#L24-L32`).
   - Regression assertions verified in `tests/test-run.mjs#L1120-L1123`.
7. **`UX-SQ-R2-007` (Accepted Closed):**
   - `scripts/install-register.mjs#L1198-L1206` (`formatCompanionLine`) replaces `U+2014` em dashes with `; non-fatal: ${note}` and `(non-fatal: ${note})`.
   - `scripts/install-register.mjs#L1270-L1272` (`printStatus` `[INFO]`) aligns cleanly with `runInstall()` (`#L1041-L1045`), stating `Agy-Context-Saver (>= 2.0.1, 2.0.4+ recommended) + RTK (>= 1.1.0)` and standalone `--no-integrity` / `--allow-unaudited` flags for `agy-squad plan`, `agy-squad bundle`, and `agy-squad finalize`.
   - Regression tests verified in `tests/test-lifecycle-installer.mjs#L291-L304` (OUTDATED companions) and `#L939-L947` (MISSING companions), both asserting zero `\u2014` characters plus `non-fatal:`, `2.0.4+`, and `--no-integrity` / `--allow-unaudited`.
8. **Round-2 Section 4.9 `finalize` flag coverage (Accepted Closed):**
   - `tests/test-handoffs.mjs#L1712-L1760` exercises positive `--allow-non-passing` (`#L1713-L1721`), failing `--predecessor` mismatch (`#L1723-L1730`), succeeding `--predecessor` match (`#L1732-L1737`), rejected `PARTIAL` handoff without `--allow-partial` (`#L1739-L1751`), and succeeding `--allow-partial` (`#L1753-L1759`) against `bin/agy-squad.mjs#L946-L1001`.

### 3.3 Final adversarial regression scan (r3)

- **Public-surface leak check:** Inspected `README.md`, `CHANGELOG.md#L8-L22`, `plugin.json`, `package.json`, `zensical.toml`, all 8 `docs/*.md` pages, all 3 portable skills (`pr-review`, `full-review`, `swarm-governance`) plus their references, `bin/agy-squad.mjs`, `scripts/install-register.mjs`, and `mcp/{index.js,dispatch.mjs,planner.mjs,briefs.mjs}`. Found 0 internal `LEDGER.md` or `L#` leaks in public surfaces (`self-diagnosis/references/optimization-and-review-rubric.md#L11,L17-L18` explicitly qualifies `docs/plans/LEDGER.md` as Agy-Squad maintainer-checkout only, and `package.json#L16-L19` + `tests/verify-package.mjs#L88-L91` exclude `docs/plans/**` and `docs/reviews/**` from the npm tarball).
- **Prose `U+2014` em-dash check:** Inspected all public docs, `README.md`, `CHANGELOG.md`, `plugin.json`, skills, references, CLI help, and installer output. Found 0 prose `U+2014` em dashes; the only `U+2014` characters present are the required R-02 machine-protocol delimiters in `READY`/`PARTIAL`/`NO_REPORT` wire formats (`mcp/briefs.mjs#L208-L209`, `docs/getting-started.md#L121`, `docs/roles-and-workflows.md#L110`, `docs/concepts.md#L54-L56`, `docs/tools.md#L59,L77`, and swarm/handoff references).
- **Zero regressions found across Day-1 Quickstart, installers, CLI, MCP, or skill links:** No new actionable defects (`UX-SQ-R3-*`) were identified.

---

## 4. Category reviews

### 4.1 `ARCH`: Architecture and contracts
- **Scope:** Multi-agent governance model, external-repo portability contracts, standalone vs. paired `Agy-Context-Saver` v2.0.4 boundaries across `README.md`, `docs/`, `mcp/`, and `.agents/skills/`.
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Source-derived inspection of cross-plugin boundaries, opt-in `docs/reviews/` contract alignment, and fail-closed verification pipelines at `c131359d`.
- **Category Verdict:** No findings within reviewed scope.

### 4.2 `DOC`: Documentation and change records
- **Scope:** `README.md`, `CHANGELOG.md`, `zensical.toml`, and all 8 public `docs/*.md` pages (`index`, `getting-started`, `core-workflows`, `roles-and-workflows`, `concepts`, `tools`, `stopping-agents`, `benchmarks`).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope (`UX-SQ-R2-002` and `UX-SQ-R2-003` independently verified Closed).
- **P3 (low priority):** None identified within reviewed scope (`UX-SQ-R2-006` independently verified Closed).
- **Verification:** Direct source inspection of `README.md#L58-L77`, `docs/tools.md#L138`, `docs/roles-and-workflows.md#L20,L62`, `docs/concepts.md#L75`, `CHANGELOG.md#L8-L22`, all remaining `docs/*.md` pages, and regression checks in `tests/test-run.mjs#L1115-L1123`.
- **Category Verdict:** No findings within reviewed scope.

### 4.3 `SKILL`: Skills and agent instructions
- **Scope:** All 4 `.agents/skills/*/SKILL.md` files, all 9 `references/*.md` files, and `.agents/skills/self-diagnosis/scripts/diagnose.mjs`.
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope (`UX-SQ-R2-005` independently verified Closed).
- **Verification:** Direct source inspection of `diagnose.mjs#L888-L932,L988-L1028,L2182-L2223`, all 4 skills and 9 references, plus negative link/workspace tests in `tests/test-run.mjs#L1041-L1070` and Session 4 recorded `diagnose.mjs` runs.
- **Category Verdict:** No findings within reviewed scope.

### 4.4 `MCP`: MCP schemas and public API
- **Scope:** `mcp/index.js` (`TOOLS`, `handleRequest`, multi-root workspace resolution) and `mcp/dispatch.mjs` (`formatNotFoundError`, stage compiler).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Source-derived inspection of `mcp/index.js#L1-L300` and `mcp/dispatch.mjs#L250-L350`, paired with Session 4 recorded `npm test` and `tools/list` byte-budget verification (2821 B <= 3072 B).
- **Category Verdict:** No findings within reviewed scope.

### 4.5 `RUN`: Core runtime, parsing, and validation
- **Scope:** `mcp/planner.mjs` (`allocateWorkerName`, single-squad auditor slot selection, `verificationPipeline`), `bin/agy-squad.mjs` (`bundle-init --digest` guard, `finalize`).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope (`UX-SQ-R2-001` independently verified Closed).
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Direct source inspection of `mcp/planner.mjs#L71-L107,L809-L860,L1008-L1020`, `bin/agy-squad.mjs#L819-L855,L946-L1001`, and behavioral assertions in `tests/test-planner.mjs#L1213-L1241` and `tests/test-handoffs.mjs#L1618-L1818`.
- **Category Verdict:** No findings within reviewed scope.

### 4.6 `SVC`: Services, orchestration, and audit semantics
- **Scope:** `mcp/briefs.mjs` (all 8 subagent and `/swarm` prompt templates) and `finalize` composition over `inspectHandoffs -> bundleReports -> verifyBundle / verifyAndPruneBundle`.
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Direct source inspection of `mcp/briefs.mjs#L1-L245` and `bin/agy-squad.mjs#L946-L1001`, paired with `tests/test-planner.mjs#L687-L702` and `tests/test-handoffs.mjs#L1618-L1818`.
- **Category Verdict:** No findings within reviewed scope.

### 4.7 `DB`: Database, migrations, replay, and concurrency
- **Scope:** Filesystem JSON and Markdown artifacts only (`scratch/agy-squad/`, `lead/report.sources.json`); no SQL/database layer exists.
- **Coverage:** Complete.
- **P1 (high priority):** Not applicable.
- **P2 (medium priority):** Not applicable.
- **P3 (low priority):** Not applicable.
- **Verification:** Confirmed filesystem-only persistence across `mcp/planner.mjs`, `bin/agy-squad.mjs`, and `scripts/install-register.mjs`.
- **Category Verdict:** Not applicable.

### 4.8 `SCRIPT`: Scripts, evaluation, and developer tooling
- **Scope:** `install.sh`, `install.ps1`, `scripts/install-register.mjs`, `scripts/release-preflight.mjs`, and `bin/agy-squad.mjs` (`usage`, `SUBCOMMAND_HELP`, `hasHelpFlag`).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope (`UX-SQ-R2-004` and `UX-SQ-R2-007` independently verified Closed).
- **Verification:** Direct source inspection of `bin/agy-squad.mjs#L16-L301,L575-L635`, `scripts/install-register.mjs#L1-L1386`, `install.sh`, `install.ps1`, `scripts/release-preflight.mjs`, and regression suites `tests/test-run.mjs#L1072-L1113` and `tests/test-lifecycle-installer.mjs#L291-L304,L910-L995`.
- **Category Verdict:** No findings within reviewed scope.

### 4.9 `TEST`: Tests and CI
- **Scope:** `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, `tests/test-run.mjs`, `tests/test-lifecycle-installer.mjs`, `tests/verify-package.mjs`, and `.github/workflows/ci.yml`.
- **Coverage:** Complete (source inspection of all new assertions in Session 5; full local Linux execution recorded in Session 4 at `c131359d`).
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Audited every new test block line-by-line to confirm genuine behavioral proof rather than vacuous string checks: `tests/test-planner.mjs#L1213-L1241`, `tests/test-handoffs.mjs#L1712-L1817`, `tests/test-run.mjs#L1041-L1158`, `tests/test-lifecycle-installer.mjs#L291-L304,L910-L995`, and `.github/workflows/ci.yml#L17-L46`. Physical macOS/Windows native `agy` IDE/CLI interactive runs remain transparently tracked in Section 8 (`UX-SQ-017`).
- **Category Verdict:** No findings within reviewed scope.

### 4.10 `DEP`: Dependencies, packaging, and configuration
- **Scope:** `package.json`, `plugin.json`, `scripts/release-preflight.mjs`, `tests/verify-package.mjs`.
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope (brand logo artwork deferred in Section 8 as `UX-SQ-016`).
- **Verification:** Source inspection of `package.json#L1-L63` (zero runtime dependencies, `node >= 22`, explicit exclusion of `docs/plans/**` and `docs/reviews/**`), `plugin.json#L1-L25`, and `tests/verify-package.mjs#L6-L150`.
- **Category Verdict:** No findings within reviewed scope.

---

## 5. Findings

### 5.1 P0/P1/P2 finding records

None identified within reviewed scope (0 new Round-3 P0/P1/P2 findings; all Round-2 P2 findings `UX-SQ-R2-001`, `UX-SQ-R2-002`, and `UX-SQ-R2-003` independently verified Closed at `c131359d83a6ca86bebcc635ed3978320c88c45e`).

### 5.2 P3 actionable advisory table

None identified within reviewed scope (0 new Round-3 P3 advisories; all Round-2 P3 advisories `UX-SQ-R2-004`, `UX-SQ-R2-005`, `UX-SQ-R2-006`, and `UX-SQ-R2-007` independently verified Closed at `c131359d83a6ca86bebcc635ed3978320c88c45e`).

---

## 6. Cross-category summary and strengths to preserve

### 6.1 Cross-category verification summary

All 7 Round-2 defects and advisories (`UX-SQ-R2-001` through `UX-SQ-R2-007`) and both Round-2 Section 4.9 test gaps (`finalize` `--predecessor`/`--allow-non-passing`/`--allow-partial` plus end-to-end Quickstart execution) are closed cleanly across code, docs, and regression tests at `c131359d83a6ca86bebcc635ed3978320c88c45e` with zero regressions, zero internal `LEDGER.md`/`L#` leaks in public surfaces, and zero prose `U+2014` em dashes.

### 6.2 What already works exceptionally well (preserve in release `0.1.3`)

- **Warning-free Day-1 Quickstart & fail-closed `bundle-init --digest` (`README.md#L58-L71`, `mcp/planner.mjs#L1012`, `bin/agy-squad.mjs#L197,L819-L824`):** External developers can run the exact documented `plan -> verdict -> bundle-init --handoffs --digest -> verdict --integrity -> finalize --replace --prune` sequence with 0 warnings, matching single-squad auditor slots, and immediate actionable flag guidance if handoffs are omitted.
- **External-repo skill portability & opt-in `docs/reviews/` (`pr-review`, `full-review`, `swarm-governance`, `docs/`):** Portable skills target `<owner/repo>`, default to chat/artifact reports unless `docs/reviews/` is requested or already adopted, invoke global `agy-squad`, and use validated hosted Zensical URLs that survive copy-fallback installs across Linux, macOS, and Windows.
- **Clean onboarding, PATH detection, and companion guidance (`scripts/install-register.mjs`, `plugin.json`, `bin/agy-squad.mjs`):** `plugin.json` ships crisp plain-English copy and 3 runnable Day-1 `suggestedPrompts`; `setup` and `status` emit cross-platform `PATH` remediation, `npx` fallback, `Agy-Context-Saver >= 2.0.1 (2.0.4+ recommended)` guidance, standalone `--no-integrity`/`--allow-unaudited` opt-outs, Desktop IDE reload instructions, and clean `--json` output; `--help` stays grouped within 100 columns with 17 focused subcommand help pages and strict flag-conflict validation.
- **Cross-plugin `Agy-Context-Saver` v2.0.4 alignment (`mcp/briefs.mjs`):** All 8 compiled specialist, lead, and auditor brief templates consistently instruct `rtk grep`/`rtk find` + bounded <= 150-line `read_file` slices while reserving `rtk read` strictly for step spillovers and completed task logs.
- **Packaging and maintainer boundary enforcement (`package.json`, `scripts/release-preflight.mjs`, `tests/verify-package.mjs`, `diagnose.mjs`):** Maintainer plans/reviews stay out of the npm tarball, `self-diagnosis` and `diagnose.mjs` fail cleanly outside an Agy-Squad checkout without stack traces, and `diagnose.mjs` blocks malformed hosted URLs and relative links escaping `.agents/skills/`.

---

## 7. Overall disposition and finding closure table

### 7.1 Overall disposition

- **Coverage:** Complete across all 9 applicable categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`); `DB` Not applicable; physical macOS/Windows native `agy` IDE/CLI execution remains disclosed in Section 1.4 and Section 8 (`UX-SQ-017`).
- **Blocking findings:** None (0 open P0/P1/P2/P3 findings; all 15 Round-1 findings `UX-SQ-001`..`UX-SQ-015` and all 7 Round-2 findings `UX-SQ-R2-001`..`UX-SQ-R2-007` independently verified Closed).
- **Launch Readiness Verdict:** **SHIP NOW** (`agy-squad@0.1.3`, merge stacked PR #11 `fix/ux-day-one-r2` @ `c131359d83a6ca86bebcc635ed3978320c88c45e` -> PR #10 -> PR #9 -> `main`).
- **Disposition:** Approve.
- **Reason:** Independent Round-3 source and test-assertion verification at `c131359d83a6ca86bebcc635ed3978320c88c45e` confirmed that every Round-2 fix (`UX-SQ-R2-001` through `UX-SQ-R2-007`) and both Round-2 Section 4.9 test gaps (`finalize` `--predecessor`/`--allow-non-passing`/`--allow-partial` and end-to-end Quickstart execution) hold up with zero regressions, zero broken Day-1 Quickstart commands, zero public-surface internal ledger leaks, and zero prose `U+2014` em dashes.

### 7.2 Finding closure table (1 ID = 1 Row)

| ID | Category | Priority | Status | Summary | Evidence / Disposition |
| --- | --- | --- | --- | --- | --- |
| `UX-SQ-001` | SKILL | P0 | Closed | `pr-review` and `full-review` generalized to active repository (`<owner/repo>`) with Agy-Squad checks scoped | Revalidated in Session 3 and Session 5 (`c131359d`): accepted Closed |
| `UX-SQ-002` | SKILL | P0 | Closed | `pr-review` and `full-review` skills and public docs make `docs/reviews/` writes opt-in | Revalidated in Session 5 (`c131359d`): accepted Closed alongside `UX-SQ-R2-003` |
| `UX-SQ-003` | SKILL | P0 | Closed | Replaced checkout-only `node bin/agy-squad.mjs` and author paths across portable skills, `mcp/dispatch.mjs#L304`, and docs | Revalidated in Session 5 (`c131359d`): accepted Closed alongside `UX-SQ-R2-001` and `UX-SQ-R2-002` |
| `UX-SQ-004` | SKILL | P1 | Closed | Replaced cross-root `../../../docs/` links with validated hosted Zensical URLs and `#anchor` checks | Revalidated in Session 5 (`c131359d`): accepted Closed alongside `UX-SQ-R2-005` |
| `UX-SQ-005` | SCRIPT | P1 | Closed | Added `PATH` warning + `npx` fallback and `detectCompanionDependencies()` `[NEXT STEP]` notice in `setup`/`status` | Revalidated in Session 5 (`c131359d`): accepted Closed alongside `UX-SQ-R2-007` |
| `UX-SQ-006` | SVC | P1 | Closed | Aligned all `mcp/briefs.mjs` templates, manifests, and docs to `rtk grep`/`rtk find` + bounded <= 150-line `read_file` slices | Revalidated in Session 5 (`c131359d`): accepted Closed |
| `UX-SQ-007` | DOC | P2 | Closed | Added `scratch/` `.gitignore` / `.git/info/exclude` / `--report-root` callouts and qualified benchmark table note | Revalidated in Session 5 (`c131359d`): accepted Closed |
| `UX-SQ-008` | SKILL | P2 | Closed | Gated `self-diagnosis/SKILL.md` as maintainer-only and added `assertAgySquadWorkspace()` in `diagnose.mjs#L2182-L2223` | Revalidated in Session 5 (`c131359d`): accepted Closed |
| `UX-SQ-009` | DEP | P2 | Closed | Rewrote `plugin.json` description and Day-1 `suggestedPrompts` in plain English + added `README.md` opener | Revalidated in Session 5 (`c131359d`): accepted Closed |
| `UX-SQ-010` | SCRIPT | P2 | Closed | Reformatted `agy-squad --help` into grouped <= 100-char sections listing `--help`/`--version` | Revalidated in Session 5 (`c131359d`): accepted Closed |
| `UX-SQ-011` | SKILL | P2 | Closed | Removed third-party skills from `swarm-governance/SKILL.md` and scoped `ecosystem-and-modifiers.md` Section 5 as optional | Revalidated in Session 5 (`c131359d`): accepted Closed |
| `UX-SQ-012` | DOC | P2 | Closed | Added IDE reload `Next steps:`, `Uninstall & Rollback`, and `Agy-Context-Saver >= 2.0.1 (2.0.4+ recommended)` | Revalidated in Session 5 (`c131359d`): accepted Closed |
| `UX-SQ-013` | SCRIPT | P3 | Closed | Added focused `SUBCOMMAND_HELP` for all 17 active subcommands | Revalidated in Session 5 (`c131359d`): accepted Closed alongside `UX-SQ-R2-001` and `UX-SQ-R2-004` |
| `UX-SQ-014` | SCRIPT | P3 | Closed | Added 1-line `Next step:` setup hint on NOT INSTALLED / PARTIAL INSTALLATION while preserving pure `--json` | Revalidated in Session 5 (`c131359d`): accepted Closed |
| `UX-SQ-015` | RUN | P3 | Closed | Added `agy-squad finalize` shorthand (`inspect -> bundle -> verify [+ prune]`) and surfaced in planner/docs | Revalidated in Session 5 (`c131359d`): accepted Closed alongside `UX-SQ-R2-001`, `UX-SQ-R2-006`, and `tests/test-handoffs.mjs#L1712-L1760` |
| `UX-SQ-R2-001` | RUN | P2 | Closed | Added `--handoffs` to `bundle-init --plan ... --digest` in `mcp/planner.mjs#L1012`, `bin/agy-squad.mjs#L197`, `README.md#L65-L66`, `docs/tools.md#L138`, plus empty-handoffs fail-closed hint in `bin/agy-squad.mjs#L819-L824` | Independently verified in Session 5 (`c131359d`) across source and `tests/test-planner.mjs#L1213-L1219`, `tests/test-run.mjs#L1099-L1103`, `tests/test-handoffs.mjs#L1780-L1817` |
| `UX-SQ-R2-002` | DOC | P2 | Closed | Updated `README.md#L58-L71` Quickstart to save `scratch/plan.json` warning-free (`--read-only --role "Security" --role "Test Audit"`), reference `squad-task_squad` and `squad-integrity_auditor/specialist-1/report.md`, and pass `--handoffs` | Independently verified in Session 5 (`c131359d`) across `README.md#L58-L71`, `mcp/planner.mjs#L71-L107,L809-L817`, `tests/test-planner.mjs#L1220-L1241`, and `tests/test-handoffs.mjs#L1761-L1817` |
| `UX-SQ-R2-003` | DOC | P2 | Closed | Aligned `docs/roles-and-workflows.md#L20,L62` and `docs/concepts.md#L75` with opt-in `docs/reviews/<slug>.md` delivery (`pr-review/SKILL.md#L45`, `docs/index.md#L22`) | Independently verified in Session 5 (`c131359d`) across both docs and `tests/test-run.mjs#L1115-L1119` |
| `UX-SQ-R2-004` | SCRIPT | P3 | Closed | Tightened `bin/agy-squad.mjs#L629-L635` so `setup -ch`, `plan -xh`, and `plan --help=false` fail closed with `Conflicting flags` | Independently verified in Session 5 (`c131359d`) across `bin/agy-squad.mjs#L575-L588,L629-L635` and `tests/test-run.mjs#L1105-L1113` |
| `UX-SQ-R2-005` | SKILL | P3 | Closed | Hardened `diagnose.mjs#L902-L921,L988-L1014` to flag malformed `..`/`\` hosted URLs and any relative link escaping `.agents/skills/` | Independently verified in Session 5 (`c131359d`) across `diagnose.mjs` and `tests/test-run.mjs#L1041-L1055` |
| `UX-SQ-R2-006` | DOC | P3 | Closed | Updated `CHANGELOG.md#L8-L22` (`[0.1.3]`) with PR #10/PR #11 public additions/fixes and removed internal `docs/plans/LEDGER.md` / `L51` / `L56` citations | Independently verified in Session 5 (`c131359d`) across `CHANGELOG.md#L8-L22` and `tests/test-run.mjs#L1120-L1123` |
| `UX-SQ-R2-007` | SCRIPT | P3 | Closed | Replaced prose `U+2014` em dashes in `scripts/install-register.mjs#L1198-L1206` with `non-fatal: ${note}` and aligned `printStatus()` `[INFO]` at `#L1270-L1272` with `runInstall()` (`2.0.4+ recommended`, `--no-integrity`/`--allow-unaudited`) | Independently verified in Session 5 (`c131359d`) across `scripts/install-register.mjs#L1041-L1045,L1198-L1206,L1270-L1272` and `tests/test-lifecycle-installer.mjs#L291-L304,L939-L947` |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UX-SQ-016` | Session 1 | DEP | Deferred / Won't Fix | `plugin.json#L1-L25` | `plugin.json` omits a `"logo"` property and `assets/logo.svg` artwork (renders generic plugin icon). | Carried forward from r1 and r2; deferred pending explicit human/brand design approval (`antislop` R-23). | Source-derived inspection of `plugin.json#L1-L25` at `c131359d` |
| `UX-SQ-017` | Session 1 | TEST | Deferred / Won't Fix | `docs/getting-started.md#L3,L9` | Physical macOS and Windows native `agy` Desktop IDE and CLI live interactive runs remain unverified (Node.js CI parity covers Linux, macOS, and Windows in `.github/workflows/ci.yml#L24-L25`). | Carried forward from r1 and r2; deferred on physical multi-OS hardware/GUI execution access, honestly disclosed in `docs/getting-started.md#L3,L9`. | Source-derived inspection of `docs/getting-started.md#L3,L9` and `.github/workflows/ci.yml#L24-L25` at `c131359d` |
