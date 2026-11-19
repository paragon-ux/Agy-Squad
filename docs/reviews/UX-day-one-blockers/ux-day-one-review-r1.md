# Agy-Squad v0.1.3 Launch UX & Day-One Readiness Review (r1)

**Governing Standard:** Agy-Squad PR Review Standard 1.4.0
**Review type:** Launch UX & Day-One Merge Readiness Review (External User Onboarding & Portability)
**Review date:** 2026-11-19
**Reviewer:** Senior DX & Plugin UX Reviewer (Subagent)
**Standard version:** 1.4.0

Content Verdict: PASS

---

## 1. Review metadata, Session Provenance, and evidence limits

### 1.1 Target

| Field | Value |
| --- | --- |
| Repository | `paragon-ux/Agy-Squad` |
| Target | Stacked PR #10 (`fix/ux-day-one-blockers` targeting PR #9 `feat/v0.1.3-remediation`), v0.1.3 npm release candidate |
| Comparison base | `feat/v0.1.3-remediation` @ `8760909dabbb9ec8c3d655918293329d51e6f3f2` (PR #9 head) |
| Head / tree | `fix/ux-day-one-blockers` (PR #10 remediation branch, verified prior to commit & push) |
| Working-tree state | Clean post-remediation verification across all 10 test suites, `release-preflight.mjs`, `verify:package`, `diagnose.mjs`, and `agy plugin validate --strict --json` |
| CI revision | Local Node.js v22 verification executed across all 10 suites; PR #10 GitHub Actions CI triggered on push |
| Prior review | Session 1 (`r1` pre-remediation baseline at `8760909dabbb9ec8c3d655918293329d51e6f3f2`) |

### 1.2 Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| 1 | `04291507-36ae-4728-a17a-149dbb4714f7` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `feat/v0.1.3-remediation` @ `8760909dabbb9ec8c3d655918293329d51e6f3f2` (read-only) | Read-only Launch UX Reviewer subagent |
| 2 | `89a1f8ad-fde0-4788-98be-c127c89ca18d` | `a6f36288-2461-4e1f-96d5-bceff25feb98` | 2026-11-19 | `8760909dabbb9ec8c3d655918293329d51e6f3f2..fix/ux-day-one-blockers` (remediated & verified) | Principal Systems & DX Remediation subagent (PR #10) |

### 1.3 Evidence available

- Full source inspection and remediation of user-facing metadata, installers, CLI, MCP server/planner/dispatcher/brief compiler, all 4 installed skills and references, manifests, Zensical documentation, and regression test suites (`tests/test-dispatch.mjs`, `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, `tests/test-run.mjs`, `tests/test-lifecycle-installer.mjs`, `tests/verify-package.mjs`).
- Observed local verification gates executed in Session 2: `npm test` (10/10 suites), `npm run preflight`, `npm run verify:package`, solo `diagnose.mjs --ledger docs/reviews/v0.1.3-self-diagnosis-review.md --markdown`, solo unflagged `diagnose.mjs --skip-mcp-spawn --markdown`, `agy-squad verdict`, `agy plugin validate --strict --json`, public-boundary grep, and zero prose `U+2014` em-dash check.

### 1.4 Evidence limits

- Physical macOS and Windows native `agy` Desktop IDE and CLI interactive verification remains external to Linux execution hosts (tracked in Section 8 as `UX-SQ-017`; Node.js CI parity covers Linux, macOS, and Windows).
- Brand-approved visual logo artwork (`assets/logo.svg` + `plugin.json` `logo` field) requires explicit human design sign-off rather than autonomous SVG fabrication (tracked in Section 8 as `UX-SQ-016`).

---

## 2. File/artifact-to-category inventory and coverage matrix

| Artifact | Role | Primary category | Cross-references | Coverage |
| --- | --- | --- | --- | --- |
| `README.md` | First-60-seconds landing page, quickstart, benchmark summary | DOC | SKILL, SCRIPT, DEP | Complete |
| `plugin.json` | Antigravity plugin card metadata and `suggestedPrompts` | DEP | DOC | Complete |
| `package.json` | npm package manifest, `bin` entries, `files` whitelist | DEP | TEST, SCRIPT | Complete |
| `zensical.toml` | Docs site navigation and theme configuration | DOC | None | Complete |
| `install.sh`, `install.ps1` | POSIX and Windows installer wrappers | SCRIPT | DEP | Complete |
| `scripts/install-register.mjs` | Plugin copy/link, skills link, MCP config registration, CLI shims, status | SCRIPT | SKILL, DEP, DOC | Complete |
| `bin/agy-squad.mjs` | Governance CLI entrypoint, help text, subcommand validation | SCRIPT | RUN, DOC | Complete |
| `mcp/index.js` | Stdio MCP server (`squad_planner`, `dispatch_squad`) and multi-root workspace resolution | MCP | RUN, SVC | Complete |
| `mcp/planner.mjs` | `/swarm` and `subagent` cohort planner, warnings, `verificationPipeline` | RUN | SVC, MCP, SCRIPT | Complete |
| `mcp/dispatch.mjs` | Manifest loading, `formatNotFoundError`, stage compiler | MCP | RUN, SKILL | Complete |
| `mcp/briefs.mjs` | Compiled worker, lead, and integrity auditor prompt templates | SVC | SKILL, RUN | Complete |
| `.agents/skills/swarm-governance/{SKILL.md,references/*.md}` | Native `/swarm` Execution Modifier skill and reference docs | SKILL | DOC, SCRIPT, SVC | Complete |
| `.agents/skills/pr-review/{SKILL.md,references/pr-review-standard.md}` | PR Review Standard 1.4.0 Task Spec skill | SKILL | DOC | Complete |
| `.agents/skills/full-review/{SKILL.md,references/report-template.md}` | Non-diff triage and Direction decision Task Spec skill | SKILL | DOC | Complete |
| `.agents/skills/self-diagnosis/{SKILL.md,scripts/diagnose.mjs,resources/self-diagnosis-manifest.json,references/execution-and-teardown.md}` | Maintainer self-diagnosis profiler skill and manifest | SKILL | SCRIPT, SVC | Complete |
| `docs/{index,getting-started,core-workflows,roles-and-workflows,concepts,tools,stopping-agents}.md` | Public user documentation | DOC | SKILL, SCRIPT, SVC | Complete |

| Category | Scope covered | Coverage | Verdict |
| --- | --- | --- | --- |
| ARCH | Multi-agent governance boundary, portability model, cross-plugin boundary | Complete | No findings within reviewed scope |
| DOC | `README.md`, `zensical.toml`, `docs/*.md` | Complete | No findings within reviewed scope (all remediated in Session 2) |
| SKILL | All 4 `.agents/skills/*/SKILL.md` files, `references/`, and `diagnose.mjs` | Complete | No findings within reviewed scope (all remediated in Session 2) |
| MCP | `mcp/index.js`, `mcp/dispatch.mjs` (`formatNotFoundError` updated under `UX-SQ-003`) | Complete | No findings within reviewed scope |
| RUN | `mcp/planner.mjs`, `bin/agy-squad.mjs` (`finalize` added under `UX-SQ-015`) | Complete | No findings within reviewed scope (all remediated in Session 2) |
| SVC | `mcp/briefs.mjs` compiled worker/lead/auditor alignment and tool guidance | Complete | No findings within reviewed scope (all remediated in Session 2) |
| DB | Filesystem JSON/Markdown state only (no SQL/database layer) | Complete | Not applicable |
| SCRIPT | `install.sh`, `install.ps1`, `scripts/install-register.mjs`, `bin/agy-squad.mjs` | Complete | No findings within reviewed scope (all remediated in Session 2) |
| TEST | 10-suite regression matrix including new UX assertions in `tests/test-{dispatch,planner,handoffs,run,lifecycle-installer}.mjs` | Complete (Node.js automated parity; physical multi-OS GUI tracked in `UX-SQ-017`) | No findings within reviewed scope |
| DEP | `package.json`, `plugin.json` | Complete | No findings within reviewed scope (all remediated in Session 2) |

---

## 3. UX Launch Contract Trace

Each external-developer Day-1 user journey is traced along `user journey -> contract/doc -> implementation -> verification`:

| User journey | Promised contract / doc | Actual implementation | Verification / gap | Result |
| --- | --- | --- | --- | --- |
| Run `/pr-review` or `/full-review` in user's own unrelated repo | `README.md`, `plugin.json`: reusable PR review and full review skills installed globally via `agy-squad setup` | `.agents/skills/pr-review/SKILL.md`, `full-review/SKILL.md`, `pr-review-standard.md`, and `report-template.md` now target "the active repository" (`<owner/repo>`), scope Agy-Squad internals to "when reviewing `Agy-Squad` itself", and make `docs/reviews/<slug>.md` writes opt-in | Verified in `tests/test-run.mjs` and `diagnose.mjs --markdown` | Verified (`UX-SQ-001`, `UX-SQ-002` Closed) |
| Follow README Quickstart and run governed `/swarm` in external repo | `README.md`, `docs/getting-started.md`: zero-clone `npx` global install usable in any workspace | Quickstart uses repo-agnostic `agy-squad plan --mode swarm --scope src --role "Implementer" --role "Reviewer" "Audit authentication flow"`; all portable skills, `mcp/dispatch.mjs`, and docs invoke global `agy-squad`; `/home/paragon-ux` replaced with `/path/to/your-repo` | Verified in `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, and `tests/test-run.mjs` | Verified (`UX-SQ-003` Closed) |
| Agent follows doc links inside installed plugin skills | `scripts/install-register.mjs`, `diagnose.mjs`: plugin doc links work on Linux, macOS, and Windows | Cross-root `../../../docs/...` and `../../../../docs/...` links in `.agents/skills/` replaced with hosted Zensical URLs (`https://paragon-ux.github.io/Agy-Squad/<page>/`) validated against `docs/` and anchors in `diagnose.mjs` | Verified in `diagnose.mjs --markdown` (0 broken links) and `tests/test-lifecycle-installer.mjs` (`forceCopyFallback: true`) | Verified (`UX-SQ-004` Closed) |
| Standalone `Agy-Squad` install via `npx` | `scripts/install-register.mjs`, `README.md`, `docs/getting-started.md`: clear onboarding when `PATH` or companion tools are absent | `runInstall()` and `printStatus()` detect missing `antigravityBinDir` on `PATH` (printing OS-specific POSIX/PowerShell snippets + `npx` fallback); `runInstall()` invokes `detectCompanionDependencies()` and prints `[NEXT STEP]` guidance for `agy-context setup` or `--no-integrity` / `--allow-unaudited` | Verified in `tests/test-lifecycle-installer.mjs` | Verified (`UX-SQ-005` Closed) |
| Paired `Agy-Squad` + `Agy-Context-Saver` v2.0.4 live execution | `README.md`, `docs/index.md`: seamless collaboration between both plugins | `mcp/briefs.mjs`, `docs/getting-started.md`, `docs/concepts.md`, `self-diagnosis-manifest.json`, and `comparative-research-manifest.json` direct workspace code inspection to `rtk grep`/`rtk find` + bounded `<= 150`-line `read_file` slices, reserving `rtk read` for spillovers and task logs only | Verified in `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, and `diagnose.mjs` template byte budgets | Verified (`UX-SQ-006` Closed) |
| Clean git working tree in external repo after `/swarm` | `README.md`, `docs/getting-started.md`, `swarm-governance/SKILL.md`: explicit scratch ignore guidance | Quickstart, Getting Started, and `swarm-governance/SKILL.md` advise adding `scratch/` to `.gitignore` or `.git/info/exclude` (or `--report-root <ignored-dir>`); `README.md` benchmark note qualified | Verified via source reconciliation and `diagnose.mjs --markdown` | Verified (`UX-SQ-007` Closed) |

---

## 4. Category reviews

### 4.1 `ARCH`: Architecture and contracts
- **Scope:** Overall planner/coordinator/auditor/bundler architecture and cross-plugin boundaries (`docs/index.md`, `docs/concepts.md`, `docs/roles-and-workflows.md`).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope (external-repo portability breaches mapped to their primary owning categories `SKILL`, `SVC`, `SCRIPT`, `DOC`).
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Source inspection of architecture docs and runtime modules.
- **Category Verdict:** No findings within reviewed scope.

### 4.2 `DOC`: Documentation and change records
- **Scope:** `README.md`, `zensical.toml`, `docs/index.md`, `docs/getting-started.md`, `docs/core-workflows.md`, `docs/roles-and-workflows.md`, `docs/concepts.md`, `docs/tools.md`, `docs/stopping-agents.md`, `docs/benchmarks.md`.
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** `UX-SQ-007` (Closed), `UX-SQ-012` (Closed).
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Source reconciliation, `diagnose.mjs --markdown`, `npm run preflight`, and `npm run verify:package`.
- **Category Verdict:** No findings within reviewed scope.

### 4.3 `SKILL`: Skills and agent instructions
- **Scope:** `.agents/skills/{swarm-governance,pr-review,full-review,self-diagnosis}/SKILL.md`, `references/`, `resources/`, and `self-diagnosis/scripts/diagnose.mjs`.
- **Coverage:** Complete.
- **P0 (critical launch blockers):** `UX-SQ-001` (Closed), `UX-SQ-002` (Closed), `UX-SQ-003` (Closed).
- **P1 (high priority):** `UX-SQ-004` (Closed).
- **P2 (medium priority):** `UX-SQ-008` (Closed), `UX-SQ-011` (Closed).
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** `diagnose.mjs --markdown` (0 broken links, `swarm-governance/SKILL.md` 8,047 B <= 8,192 B), `tests/test-run.mjs`, and `tests/test-lifecycle-installer.mjs`.
- **Category Verdict:** No findings within reviewed scope.

### 4.4 `MCP`: MCP schemas and public API
- **Scope:** `mcp/index.js`, `mcp/dispatch.mjs` (`formatNotFoundError` updated under `UX-SQ-003`).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** `tests/test-dispatch.mjs`, `tests/test-server.mjs`, and `diagnose.mjs --markdown` (`tools/list` 2,821 B <= 3,072 B).
- **Category Verdict:** No findings within reviewed scope.

### 4.5 `RUN`: Core runtime, parsing, and validation
- **Scope:** `mcp/planner.mjs`, `bin/agy-squad.mjs` (`finalize` added under `UX-SQ-015`).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** `UX-SQ-015` (Closed).
- **Verification:** `tests/test-handoffs.mjs` and `tests/test-planner.mjs` (`finalize` happy-path audited, unaudited, `--prune`, `--keep-reports`, and fail-closed rejections).
- **Category Verdict:** No findings within reviewed scope.

### 4.6 `SVC`: Services, orchestration, and audit semantics
- **Scope:** `mcp/briefs.mjs` compiled prompts, alignment rules, and companion tool directives across `/swarm` and `subagent` modes.
- **Coverage:** Complete.
- **P1 (high priority):** `UX-SQ-006` (Closed).
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, and `diagnose.mjs --markdown` prompt template byte ceilings.
- **Category Verdict:** No findings within reviewed scope.

### 4.7 `DB`: Database, migrations, replay, and concurrency
- **Scope:** Filesystem JSON and Markdown artifacts only (`scratch/agy-squad/`, `lead/report.sources.json`); no database layer exists.
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Confirmed filesystem-only state persistence in `mcp/planner.mjs` and `bin/agy-squad.mjs`.
- **Category Verdict:** Not applicable (filesystem-only persistence covered under `RUN` and `SVC`).

### 4.8 `SCRIPT`: Scripts, evaluation, and developer tooling
- **Scope:** `install.sh`, `install.ps1`, `scripts/install-register.mjs`, `bin/agy-squad.mjs`.
- **Coverage:** Complete.
- **P1 (high priority):** `UX-SQ-005` (Closed).
- **P2 (medium priority):** `UX-SQ-010` (Closed).
- **P3 (low priority):** `UX-SQ-013` (Closed), `UX-SQ-014` (Closed).
- **Verification:** `tests/test-lifecycle-installer.mjs` and `tests/test-run.mjs`.
- **Category Verdict:** No findings within reviewed scope.

### 4.9 `TEST`: Tests and CI
- **Scope:** 10-suite test matrix in `package.json#L33-L35` plus new Session 2 regression coverage for `UX-SQ-001` through `UX-SQ-015` (`UX-SQ-017` physical multi-OS native `agy` GUI validation remains tracked in Section 8).
- **Coverage:** Complete for automated Node.js verification.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** None identified within reviewed scope.
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** Executed `npm test` (10/10 suites passing), `npm run preflight`, and `npm run verify:package`.
- **Category Verdict:** No findings within reviewed scope.

### 4.10 `DEP`: Dependencies, packaging, and configuration
- **Scope:** `package.json`, `plugin.json` (brand-approved logo tracked in Section 8 as `UX-SQ-016`).
- **Coverage:** Complete.
- **P1 (high priority):** None identified within reviewed scope.
- **P2 (medium priority):** `UX-SQ-009` (Closed).
- **P3 (low priority):** None identified within reviewed scope.
- **Verification:** `agy plugin validate --strict --json`, `npm run preflight`, `npm run verify:package`, and `tests/test-run.mjs`.
- **Category Verdict:** No findings within reviewed scope.

---

## 5. Findings

### 5.1 P0/P1/P2 finding records

#### `UX-SQ-001`: Global skills `pr-review` and `full-review` hardcode "in/on Agy-Squad" in YAML frontmatter, enforce Agy-Squad-only checks, and pre-fill `paragon-ux/Agy-Squad` | P0 | Closed

1. **Title, priority, status:** Global skills `pr-review` and `full-review` hardcode "in/on Agy-Squad" in YAML frontmatter, enforce Agy-Squad-only checks, and pre-fill `paragon-ux/Agy-Squad`, P0, Closed.
2. **Contract provenance:** `README.md#L16` and `plugin.json#L22` ship `pr-review` and `full-review` as globally installed Antigravity skills for reviewing pull requests and branches in any user repository.
3. **Source evidence:** `.agents/skills/pr-review/SKILL.md`, `.agents/skills/full-review/SKILL.md`, `.agents/skills/full-review/references/report-template.md`, `.agents/skills/full-review/references/evidence-intake.md`, `.agents/skills/pr-review/references/pr-review-standard.md`.
4. **Trigger:** An external developer installs `Agy-Squad` globally and asks Antigravity to "review my PR against main" or "do a full review of my auth service" in their own React, Python, or Go repo.
5. **Expected / actual:** Expected: skill frontmatter descriptions apply to the active repository so Antigravity's skill router activates them cleanly, and Agy-Squad internal verification items apply only when reviewing `Agy-Squad` itself. Actual (pre-fix): `pr-review/SKILL.md` and `full-review/SKILL.md` scoped activation to Agy-Squad and `report-template.md` hardcoded `paragon-ux/Agy-Squad`.
6. **Impact:** Skill auto-triggering failed in external user repositories and emitted Agy-Squad-specific noise and wrong repo metadata.
7. **Required remediation:** Rewrite `pr-review/SKILL.md`, `full-review/SKILL.md`, `pr-review-standard.md#L120`, and `report-template.md#L23` to target the active repository (`<owner/repo>`) and scope Agy-Squad checks to "When reviewing `Agy-Squad` itself".
8. **Acceptance evidence:** Verified in `tests/test-run.mjs` portable skill hygiene assertions plus `diagnose.mjs --markdown` (0 findings).
9. **Root cause / related IDs:** Repo-local maintainer skills exported globally without generalizing target-repo framing; closely linked to `UX-SQ-002` and `UX-SQ-003`.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): generalized `.agents/skills/pr-review/SKILL.md`, `.agents/skills/full-review/SKILL.md`, `.agents/skills/pr-review/references/pr-review-standard.md`, `.agents/skills/full-review/references/report-template.md`, and `.agents/skills/full-review/references/evidence-intake.md`; locked in `tests/test-run.mjs`.

#### `UX-SQ-002`: `pr-review` and `full-review` unconditionally write `docs/reviews/<review-slug>.md` into external user repositories | P0 | Closed

1. **Title, priority, status:** `pr-review` and `full-review` unconditionally write `docs/reviews/<review-slug>.md` into external user repositories, P0, Closed.
2. **Contract provenance:** A globally installed review skill must not silently create untracked repository documentation folders inside an external developer's PR branch unless requested or already adopted by that repo.
3. **Source evidence:** `.agents/skills/pr-review/SKILL.md`, `.agents/skills/full-review/SKILL.md`, `.agents/skills/full-review/references/report-template.md`, `.agents/skills/pr-review/references/pr-review-standard.md`.
4. **Trigger:** A developer runs `/pr-review` or `/full-review` on an active feature/PR branch in an external repository that does not use `docs/reviews/`.
5. **Expected / actual:** Expected: deliver structured v1.4.0 reviews in chat or Antigravity artifacts by default, writing `docs/reviews/<review-slug>.md` only when requested or when `docs/reviews/` already exists. Actual (pre-fix): both skills unconditionally instructed writing `docs/reviews/<review-slug>.md`.
6. **Impact:** Surprised external developers with untracked `docs/reviews/` files dirtying their PR diffs.
7. **Required remediation:** Make `docs/reviews/<review-slug>.md` writes opt-in across `pr-review/SKILL.md`, `full-review/SKILL.md`, `report-template.md`, and `pr-review-standard.md`, while keeping `self-diagnosis` gated on `docs/reviews/`.
8. **Acceptance evidence:** Source verification across all 4 files plus `diagnose.mjs --markdown` and `npm test`.
9. **Root cause / related IDs:** `Agy-Squad`'s internal `docs/reviews/` ledger convention assumed as universal across external user repos; related to `UX-SQ-001` and `UX-SQ-007`.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): updated `pr-review/SKILL.md`, `full-review/SKILL.md`, `report-template.md`, and `pr-review-standard.md` to make `docs/reviews/` writes opt-in while preserving `self-diagnosis` teardown gating.

#### `UX-SQ-003`: Checkout-only commands (`node bin/agy-squad.mjs`, `.agents/skills/self-diagnosis/...`) and hardcoded author path pervade global skills, MCP errors, and Quickstart | P0 | Closed

1. **Title, priority, status:** Checkout-only commands (`node bin/agy-squad.mjs`, `.agents/skills/self-diagnosis/...`) and hardcoded author path pervade global skills, MCP errors, and Quickstart, P0, Closed.
2. **Contract provenance:** `README.md` and `docs/getting-started.md` promise a zero-clone global `npx` installation with an `agy-squad` CLI shim usable from any external repository.
3. **Source evidence:** `.agents/skills/{swarm-governance,pr-review,full-review,self-diagnosis}/{SKILL.md,references/*.md}`, `mcp/dispatch.mjs#L304`, `README.md`, `docs/{index,getting-started,core-workflows,roles-and-workflows,concepts,tools,stopping-agents,benchmarks}.md`.
4. **Trigger:** An external developer installs via `npx --package=agy-squad agy-squad setup`, opens their own repo, and runs Quickstart, triggers `/swarm-governance`, or triggers a manifest-not-found error.
5. **Expected / actual:** Expected: global `agy-squad` commands, self-contained repo-agnostic Quickstart, and generic `/path/to/your-repo` examples. Actual (pre-fix): checkout-only `node bin/agy-squad.mjs`, `self-diagnosis-manifest.json` in Quickstart, and `/home/paragon-ux/Antigravity/Agy-Squad` at `bundling-and-wire-format.md#L69`.
6. **Impact:** Guaranteed runtime failure on the first Quickstart command and `/swarm` bundling turns in external repos.
7. **Required remediation:** Replace `node bin/agy-squad.mjs` with `agy-squad` across skills, references, `mcp/dispatch.mjs#L304`, `README.md`, and `docs/*`; replace Quickstart with repo-agnostic `agy-squad plan --mode swarm --scope src --role "Implementer" --role "Reviewer" "Audit authentication flow"`; sanitize `bundling-and-wire-format.md#L69` to `"/path/to/your-repo"`.
8. **Acceptance evidence:** Regression assertions in `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, and `tests/test-run.mjs` verifying zero `/home/paragon-ux` paths, zero `node bin/agy-squad.mjs` in portable skills, and updated `formatNotFoundError`.
9. **Root cause / related IDs:** Maintainer source-checkout CLI invocation left hardcoded after adding global `agy-squad` shims; related to `UX-SQ-001` and `UX-SQ-005`.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): updated all 4 skills, references, `mcp/dispatch.mjs#L304`, `README.md`, and all `docs/*.md`, and added automated assertions in `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, and `tests/test-run.mjs`.

#### `UX-SQ-004`: Relative `../../../docs/...` links in installed plugin skills break lexically on POSIX and completely on Windows copy-fallback | P1 | Closed

1. **Title, priority, status:** Relative `../../../docs/...` links in installed plugin skills break lexically on POSIX and completely on Windows copy-fallback, P1, Closed.
2. **Contract provenance:** `scripts/install-register.mjs` claims plugin docs and links are verified and ready after `agy-squad setup` on Linux, macOS, and Windows.
3. **Source evidence:** `.agents/skills/{swarm-governance,pr-review,full-review,self-diagnosis}/SKILL.md`, `.agents/skills/swarm-governance/references/{intake-and-planning,ecosystem-and-modifiers}.md`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs`.
4. **Trigger:** Antigravity loads an installed skill via `~/.gemini/config/plugins/agy-squad/skills/<skill>/SKILL.md` (depth 2) or copies skills on Windows copy-fallback.
5. **Expected / actual:** Expected: all links in installed `SKILL.md` and `references/` resolve validly at any depth and under copy-fallback. Actual (pre-fix): `../../../docs/...` links escaped to `~/.gemini/config/plugins/docs/...` (`ENOENT`).
6. **Impact:** Agents wasted turns reading nonexistent paths when following skill doc references.
7. **Required remediation:** Replace cross-root `../../../docs/...` and `../../../../docs/...` links with canonical hosted Zensical URLs (`https://paragon-ux.github.io/Agy-Squad/<page>/`) and update `diagnose.mjs` to validate hosted doc URLs and `#anchor` slugs against `docs/` while rejecting non-portable cross-root relative docs links.
8. **Acceptance evidence:** `diagnose.mjs --markdown` reports 0 broken links across all 4 skills, `tests/test-run.mjs` confirms cross-root `../../../docs/` rejection and hosted `#anchor` checks, and `tests/test-lifecycle-installer.mjs` (`forceCopyFallback: true`) confirms zero `../../../docs/` links in copied skills.
9. **Root cause / related IDs:** Directory-depth mismatch between checkout `.agents/skills/<name>/` (depth 3) and installed plugin `skills/<name>/` (depth 2).
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): migrated all cross-root skill doc links to hosted Zensical URLs, added hosted URL + anchor validation and cross-root link rejection in `diagnose.mjs`, and added regression tests in `tests/test-run.mjs` and `tests/test-lifecycle-installer.mjs`.

#### `UX-SQ-005`: Missing `PATH` onboarding and zero companion check during `agy-squad setup` causes Day-1 `command not found` and standalone `INTEGRITY VIOLATION` | P1 | Closed

1. **Title, priority, status:** Missing `PATH` onboarding and zero companion check during `agy-squad setup` causes Day-1 `command not found` and standalone `INTEGRITY VIOLATION`, P1, Closed.
2. **Contract provenance:** `README.md` and `docs/getting-started.md` present `npx --package=agy-squad agy-squad setup` followed by `agy-squad status` as a working Day-1 onboarding flow, and missing companion tools are non-fatal for standalone usage.
3. **Source evidence:** `scripts/install-register.mjs` (`isDirOnPath`, `formatPathGuidanceLines`, `runInstall`, `printStatus`), `README.md`, `docs/getting-started.md`.
4. **Trigger:** A developer installs `Agy-Squad` via `npx` where `~/.gemini/antigravity/bin` is not on `PATH` and/or `Agy-Context-Saver` is not yet installed.
5. **Expected / actual:** Expected: `setup` and `status` warn with copy-paste OS-specific `PATH` instructions + `npx` fallback when absent, and `setup` runs `detectCompanionDependencies()` emitting `[NEXT STEP]` guidance for `agy-context setup` or standalone `--no-integrity` / `--allow-unaudited`. Actual (pre-fix): `runInstall()` skipped companion detection and never checked `PATH`.
6. **Impact:** Immediate Day-1 `command not found` and standalone `INTEGRITY VIOLATION` wall for new users.
7. **Required remediation:** Add `isDirOnPath()` + `formatPathGuidanceLines()` checks in `runInstall()` and `printStatus()`, invoke `detectCompanionDependencies()` in `runInstall()` with `[NEXT STEP]` guidance, and document `PATH` + standalone opt-out in `README.md` and `docs/getting-started.md`.
8. **Acceptance evidence:** Added `tests/test-lifecycle-installer.mjs` assertions covering off-PATH/on-PATH `setup` and `status`, cross-platform `isDirOnPath()` (POSIX & Windows), and `[NEXT STEP]` companion notice on clean profiles.
9. **Root cause / related IDs:** Companion detection skipped in `runInstall()` and `PATH` omitted from installer/docs; mirrors `UX-ACS-003`.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): implemented `PATH` and companion onboarding in `scripts/install-register.mjs`, updated `README.md` and `docs/getting-started.md`, and verified in `tests/test-lifecycle-installer.mjs`.

#### `UX-SQ-006`: Cross-plugin rule contradiction: compiled worker/lead/auditor briefs direct workspace file reads via `rtk read`, violating `Agy-Context-Saver` v2.0.4 | P1 | Closed

1. **Title, priority, status:** Cross-plugin rule contradiction: compiled worker/lead/auditor briefs direct workspace file reads via `rtk read`, violating `Agy-Context-Saver` v2.0.4, P1, Closed.
2. **Contract provenance:** `Agy-Context-Saver/rules/AGENTS.md` mandates using `rtk grep`/`rtk find` + bounded `read_file` slices for editable workspace files, reserving `rtk read` strictly for step spillovers and completed task logs.
3. **Source evidence:** `mcp/briefs.mjs`, `docs/getting-started.md`, `docs/concepts.md`, `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json`, `.agents/skills/self-diagnosis/resources/comparative-research-manifest.json`.
4. **Trigger:** Any user runs both `Agy-Squad` and `Agy-Context-Saver` v2.0.4 together and compiles a `/swarm` or `subagent` cohort.
5. **Expected / actual:** Expected: compiled briefs instruct `rtk grep`/`rtk find` + bounded `<= 150`-line `read_file` slices for workspace source files and reserve `rtk read` strictly for step spillovers/task logs. Actual (pre-fix): every compiled brief directed workspace inspection via `'rtk read'/'rtk grep'`.
6. **Impact:** Conflicting instructions in spawned workers and inaccurate line targeting on edits/citations.
7. **Required remediation:** Update `mcp/briefs.mjs`, `docs/getting-started.md`, `docs/concepts.md`, and manifests while keeping all template byte budgets below `diagnose.mjs` ceilings.
8. **Acceptance evidence:** Updated assertions in `tests/test-dispatch.mjs` and `tests/test-planner.mjs`; verified `diagnose.mjs --markdown` template byte budgets (`1,142 B`–`1,310 B` specialist <= `1,800 B`; `1,701 B`–`2,139 B` lead/auditor <= `3,300 B`).
9. **Root cause / related IDs:** `mcp/briefs.mjs` prompt strings predated `Agy-Context-Saver` v2.0.4's Tier 2 vs Tier 3 `rtk read` boundary.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): aligned `mcp/briefs.mjs`, `docs/getting-started.md`, `docs/concepts.md`, `self-diagnosis-manifest.json`, and `comparative-research-manifest.json`; verified in `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, and `diagnose.mjs`.

#### `UX-SQ-007`: External repositories do not gitignore `scratch/`, contradicting `README.md#L97` and risking accidental commits | P2 | Closed

1. **Title, priority, status:** External repositories do not gitignore `scratch/`, contradicting `README.md#L97` and risking accidental commits, P2, Closed.
2. **Contract provenance:** `README.md` described `scratch/agy-squad/` artifacts as "(gitignored)", while external repositories do not list `scratch/` in `.gitignore` by default.
3. **Source evidence:** `README.md`, `docs/getting-started.md`, `.agents/skills/swarm-governance/SKILL.md`.
4. **Trigger:** A developer runs an `Agy-Squad` `/swarm` cohort inside an unrelated repo without `scratch/` in `.gitignore`.
5. **Expected / actual:** Expected: onboarding docs and `swarm-governance` explicitly instruct external users to add `scratch/` to `.gitignore` or `.git/info/exclude` (or pass `--report-root <ignored-dir>`). Actual (pre-fix): implied automatic gitignoring with no callout.
6. **Impact:** Risk of accidental commits of `scratch/agy-squad/` reports and bundles into external PRs.
7. **Required remediation:** Add concise `scratch/` gitignore guidance to `README.md`, `docs/getting-started.md`, and `swarm-governance/SKILL.md`, and qualify the `README.md` benchmark table note.
8. **Acceptance evidence:** Source reconciliation across all three files plus passing `diagnose.mjs --markdown` (`swarm-governance/SKILL.md` 8,047 B <= 8,192 B).
9. **Root cause / related IDs:** `Agy-Squad` repo's own `.gitignore` assumed to exist in external repos; related to `UX-SQ-002`.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): added `scratch/` ignore / `--report-root` callouts in `README.md`, `docs/getting-started.md`, and `.agents/skills/swarm-governance/SKILL.md`, and qualified `README.md` benchmark note.

#### `UX-SQ-008`: Maintainer-only `self-diagnosis` skill lacks external-repo gating in frontmatter and crashes outside an `Agy-Squad` checkout | P2 | Closed

1. **Title, priority, status:** Maintainer-only `self-diagnosis` skill lacks external-repo gating in frontmatter and crashes outside an `Agy-Squad` checkout, P2, Closed.
2. **Contract provenance:** Globally installed skills should never misfire in unrelated repositories or crash with unhandled errors when invoked outside their intended target workspace.
3. **Source evidence:** `.agents/skills/self-diagnosis/SKILL.md`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs`.
4. **Trigger:** An external developer in `my-react-app/` invokes `/self-diagnosis` or runs `diagnose.mjs` from an unrelated directory.
5. **Expected / actual:** Expected: `self-diagnosis/SKILL.md` frontmatter and opening paragraph clearly gate it as `[Agy-Squad maintainers only: run inside an Agy-Squad source checkout]`, and `diagnose.mjs` exits cleanly with code 1 and a friendly message when `package.json` is not `name: "agy-squad"`. Actual (pre-fix): generic frontmatter description and no upfront checkout guard.
6. **Impact:** Confusing activation or errors when invoked outside an `Agy-Squad` checkout.
7. **Required remediation:** Gate `self-diagnosis/SKILL.md` frontmatter and opening paragraph, and add `assertAgySquadWorkspace()` in `diagnose.mjs` checking `package.json` `name === "agy-squad"` (preserving `DEP-001` unpacked tarball compatibility and the 4-skill installer contract).
8. **Acceptance evidence:** Added `tests/test-run.mjs` tests verifying clean code 1 exit without stack traces from empty dirs and `my-react-app/`, `--help` exit 0 from any cwd, and passing `DEP-001` + `diagnose.mjs --markdown`.
9. **Root cause / related IDs:** Maintainer repo-audit tool packaged inside global plugin `skills/` without external-workspace guards; related to `UX-SQ-001` and `UX-SQ-003`.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): updated `.agents/skills/self-diagnosis/SKILL.md`, added `assertAgySquadWorkspace()` in `.agents/skills/self-diagnosis/scripts/diagnose.mjs`, and locked with regression tests in `tests/test-run.mjs`.

#### `UX-SQ-009`: `plugin.json` description and `suggestedPrompts` front-load internal jargon and include a Day-1 unrunnable prompt #3 | P2 | Closed

1. **Title, priority, status:** `plugin.json` description and `suggestedPrompts` front-load internal jargon and include a Day-1 unrunnable prompt #3, P2, Closed.
2. **Contract provenance:** `plugin.json` is the primary first-60-seconds storefront card in Antigravity's Plugin UI; `suggestedPrompts` must work immediately on Day 1 in any user's repository.
3. **Source evidence:** `plugin.json#L5`, `plugin.json#L20-L24`, `README.md`.
4. **Trigger:** A new developer discovers `Agy-Squad` in Antigravity's Plugin UI and clicks suggested prompt #3 before running a cohort.
5. **Expected / actual:** Expected: plain-English description and 3 Day-1 runnable `suggestedPrompts`, plus a concise "What it does in your repo" opener in `README.md`. Actual (pre-fix): jargon-heavy description ("Pointer-Over-Wire governance") and unrunnable Day-1 bundle verification prompt.
6. **Impact:** High cognitive friction in the first 60 seconds and a broken one-click prompt out of the box.
7. **Required remediation:** Rewrite `plugin.json` description and `suggestedPrompts` in crisp plain English and add a 2-sentence "What it does in your repo" opener near the top of `README.md`.
8. **Acceptance evidence:** Verified with `agy plugin validate --strict --json`, `npm run preflight`, and `tests/test-run.mjs`.
9. **Root cause / related IDs:** Storefront metadata drafted using internal design vocabulary rather than external user tasks.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): updated `plugin.json` and `README.md`, verified with `agy plugin validate --strict --json` (0 errors) and `tests/test-run.mjs`.

#### `UX-SQ-010`: `agy-squad --help` prints 347-character and 390-character lines and omits `--help`/`--version` | P2 | Closed

1. **Title, priority, status:** `agy-squad --help` prints 347-character and 390-character lines and omits `--help`/`--version`, P2, Closed.
2. **Contract provenance:** `bin/agy-squad.mjs` supports `--help`, `-h`, `--version`, and `-v` and is the primary CLI reference for terminal users.
3. **Source evidence:** `bin/agy-squad.mjs`.
4. **Trigger:** A developer runs `agy-squad --help` or `agy-squad` in a standard 80-to-120 column terminal.
5. **Expected / actual:** Expected: grouped sections (`Lifecycle Commands`, `Planning Commands`, `Verification & Bundling Commands`, `Global Options`) with every line `<= 100` chars, listing `--help | -h | --version | -v` and `agy-squad <command> --help`. Actual (pre-fix): 347-char and 390-char lines omitting `--help`/`--version`.
6. **Impact:** Poor first-impression CLI ergonomics in standard developer terminals.
7. **Required remediation:** Reformat top-level `usage` in `bin/agy-squad.mjs` into clean grouped sections with `<= 100`-char lines.
8. **Acceptance evidence:** Added `tests/test-run.mjs` assertions checking all grouped headings, `--version`, `finalize`, and max line length `<= 100` chars.
9. **Root cause / related IDs:** Every flag for `plan` and `bundle-init` crammed onto single top-level usage lines; paired with `UX-SQ-013`.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): reformatted `usage` in `bin/agy-squad.mjs` and verified in `tests/test-run.mjs`.

#### `UX-SQ-011`: Author-specific third-party skills (`antislop`, `permissioned-github`) presented as default references inside `swarm-governance` | P2 | Closed

1. **Title, priority, status:** Author-specific third-party skills (`antislop`, `permissioned-github`) presented as default references inside `swarm-governance`, P2, Closed.
2. **Contract provenance:** Shipped global skills should stay self-contained and not confuse external users by assuming optional author-installed third-party skills exist.
3. **Source evidence:** `.agents/skills/swarm-governance/SKILL.md`, `.agents/skills/swarm-governance/references/ecosystem-and-modifiers.md`.
4. **Trigger:** An external developer or agent reads `swarm-governance/SKILL.md` or `ecosystem-and-modifiers.md` without `antislop` or `permissioned-github` installed.
5. **Expected / actual:** Expected: top-level `SKILL.md` omits third-party skills and Section 5 of `ecosystem-and-modifiers.md` clearly scopes them as optional compatibility only when installed. Actual (pre-fix): front-loaded in `SKILL.md#L11` with imperative phrasing in `ecosystem-and-modifiers.md`.
6. **Impact:** Confusing references to unbundled third-party skills for external developers.
7. **Required remediation:** Remove `antislop` and `permissioned-github` from `swarm-governance/SKILL.md#L11` and retitle Section 5 of `ecosystem-and-modifiers.md` with conditional "If installed..." phrasing.
8. **Acceptance evidence:** Verified in `tests/test-run.mjs` and `diagnose.mjs --markdown`.
9. **Root cause / related IDs:** Author environment utility skills documented inline alongside core Antigravity modifiers.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): cleaned `.agents/skills/swarm-governance/SKILL.md` and retitled Section 5 of `.agents/skills/swarm-governance/references/ecosystem-and-modifiers.md`; verified in `tests/test-run.mjs`.

#### `UX-SQ-012`: `docs/getting-started.md` omits Uninstall/Rollback, Desktop IDE reload guidance, and `Agy-Context-Saver` v2.0.4 recommendation | P2 | Closed

1. **Title, priority, status:** `docs/getting-started.md` omits Uninstall/Rollback, Desktop IDE reload guidance, and `Agy-Context-Saver` v2.0.4 recommendation, P2, Closed.
2. **Contract provenance:** `docs/getting-started.md` is the primary hosted onboarding guide; users need install -> reload -> verify -> uninstall lifecycle coverage and accurate companion version guidance.
3. **Source evidence:** `docs/getting-started.md`, `README.md`, `scripts/install-register.mjs`.
4. **Trigger:** A developer installs `Agy-Squad` while Desktop IDE is open, looks for uninstall/rollback commands, or checks recommended companion versions.
5. **Expected / actual:** Expected: IDE reload note in `setup` and `docs/getting-started.md`, dedicated `Uninstall & Rollback` section in `docs/getting-started.md`, and `>= 2.0.1 (2.0.4+ recommended)` companion version prose. Actual (pre-fix): all three omitted.
6. **Impact:** Open IDE users missed MCP reload step and could not find uninstall commands in Getting Started.
7. **Required remediation:** Add IDE reload `Next steps:` in `scripts/install-register.mjs` and `docs/getting-started.md`, add `Uninstall & Rollback` section to `docs/getting-started.md`, and update companion prose in `README.md` and `docs/getting-started.md` while keeping `MIN_AGY_CONTEXT_VERSION = "2.0.1"`.
8. **Acceptance evidence:** Verified IDE reload `Next steps:` in `tests/test-lifecycle-installer.mjs`, plus source reconciliation of `docs/getting-started.md` and `README.md`.
9. **Root cause / related IDs:** Getting Started guide focused on setup/troubleshooting without full lifecycle symmetry.
10. **Closure:** Closed in Session 2 (`fix/ux-day-one-blockers`): updated `scripts/install-register.mjs`, `docs/getting-started.md`, `docs/index.md`, `docs/concepts.md`, and `README.md`; verified in `tests/test-lifecycle-installer.mjs`.

### 5.2 P3 actionable advisory table

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UX-SQ-013` | Session 2 | SCRIPT | Closed | `bin/agy-squad.mjs` | `agy-squad <subcommand> --help` printed full top-level usage instead of focused subcommand flags and examples. | Added `SUBCOMMAND_HELP` map covering all 17 subcommand names (`setup`, `install`, `status`, `uninstall`, `restore-backups`, `plan`, `dispatch`, `collect`, `bundle-init`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`, `verdict`) with Usage, Options, and Examples while preserving conflicting-flags rejection. | Verified across all 17 subcommands + conflicting flags in `tests/test-run.mjs`. |
| `UX-SQ-014` | Session 2 | SCRIPT | Closed | `scripts/install-register.mjs` | When `agy-squad status` reported `NOT INSTALLED` or `PARTIAL INSTALLATION`, it printed no actionable setup command hint. | Added 1-line `Next step: run 'npx --package=agy-squad agy-squad setup' (or 'agy-squad setup') to install/repair.` in `printStatus()` for `NOT INSTALLED` / `PARTIAL INSTALLATION` (non-JSON mode only). | Verified human `NOT INSTALLED` + `PARTIAL INSTALLATION` hints and pure `--json` output in `tests/test-lifecycle-installer.mjs`. |
| `UX-SQ-015` | Session 2 | RUN | Closed | `bin/agy-squad.mjs`, `mcp/planner.mjs`, `README.md`, `docs/tools.md`, `optimization-and-review-rubric.md` | Running the 10-verb verification pipeline manually created heavy cognitive load for operators and docs. | Added `agy-squad finalize <record.json> [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--replace] [--predecessor <sha256>] [--prune [--keep-reports]]` running `inspect -> bundle -> verify (+ optional prune)` returning `{ inspected, bundled, verified, pruned }` JSON; surfaced in `verificationPipeline`, `README.md`, `docs/tools.md`, skills, and `optimization-and-review-rubric.md`. | Verified audited, `--allow-unaudited`, `--prune`, `--keep-reports`, fail-closed handoff/verdict/flag errors, and `verificationPipeline` in `tests/test-handoffs.mjs`, `tests/test-planner.mjs`, and `tests/test-run.mjs`. |

---

## 6. Cross-Plugin Interactions & Verification Plan

### 6.1 Cross-plugin summary (`Agy-Squad` + `Agy-Context-Saver`)

- **Standalone `Agy-Squad`:** Once `UX-SQ-005` lands, `agy-squad setup` explicitly informs users when `agy-context` or `rtk` is absent and documents `--no-integrity` / `--allow-unaudited` for standalone cohorts so users are never blindsided by fail-closed `INTEGRITY VIOLATION` errors.
- **Paired with `Agy-Context-Saver` v2.0.4:**
  1. `UX-SQ-006` eliminates the direct instruction conflict on `rtk read` vs bounded `read_file` slices for editable workspace code.
  2. `UX-SQ-005` aligns `PATH` onboarding and reload guidance with `Agy-Context-Saver` (`UX-ACS-003` and `UX-ACS-006`).
  3. `UX-SQ-003` ensures `agy-squad` commands issued by coordinators inside external repos use the global `agy-squad` CLI shim rather than nonexistent `node bin/agy-squad.mjs`.

### 6.2 Verification plan for PR #10 (stacked on PR #9)

1. Branch off `feat/v0.1.3-remediation` (`8760909dabbb9ec8c3d655918293329d51e6f3f2`) and implement fixes for all 15 actionable findings (`UX-SQ-001` through `UX-SQ-015`).
2. Add targeted automated regression tests across `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, `tests/test-run.mjs`, `tests/test-lifecycle-installer.mjs`, and `tests/verify-package.mjs`.
3. Run full release verification pipeline:
   - `npm run preflight`
   - `node scripts/install-register.mjs --check`
   - `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown`
   - `npm test` (all 10 test suites passing)
   - `npm run verify:package`
   - `zensical build` (when available)
4. Re-verify every finding against the updated commits and update `docs/reviews/UX-day-one-blockers/ux-day-one-review-r1.md` before opening PR #10 targeting `feat/v0.1.3-remediation`.

---

## 7. Overall disposition and finding closure table

### 7.1 Overall disposition

- **Coverage:** Complete across all material user-facing categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`); `DB` Not applicable; physical multi-OS native `agy` GUI parity tracked in Section 8 (`UX-SQ-017`) alongside deferred brand artwork (`UX-SQ-016`).
- **Blocking findings:** None (all 15 actionable findings `UX-SQ-001` through `UX-SQ-015` are Closed and verified in Session 2).
- **Disposition:** Approve (PR #10 `fix/ux-day-one-blockers` stacked on PR #9 `feat/v0.1.3-remediation` is ready to merge).
- **Reason:** All P0, P1, P2, and P3 actionable launch UX findings have been remediated with automated regression coverage across all 10 test suites, `release-preflight.mjs`, `verify:package`, `diagnose.mjs` (0 findings, 0 broken links), and `agy plugin validate --strict --json` (0 errors).

### 7.2 Finding closure table (`1 ID = 1 Row`)

| ID | Category | Priority | Status | Summary | Fix Commit / Evidence |
| --- | --- | --- | --- | --- | --- |
| `UX-SQ-001` | SKILL | P0 | Closed | `pr-review` and `full-review` generalized to active repository (`<owner/repo>`) with Agy-Squad checks scoped | Session 2 PR #10: `pr-review/SKILL.md`, `full-review/SKILL.md`, `pr-review-standard.md`, `report-template.md`, `evidence-intake.md`, `tests/test-run.mjs` |
| `UX-SQ-002` | SKILL | P0 | Closed | `pr-review` and `full-review` make `docs/reviews/<slug>.md` writes opt-in (default chat/artifact) | Session 2 PR #10: `pr-review/SKILL.md`, `full-review/SKILL.md`, `report-template.md`, `pr-review-standard.md` |
| `UX-SQ-003` | SKILL | P0 | Closed | Replaced checkout-only `node bin/agy-squad.mjs`, repo-only Quickstart manifest, and `/home/paragon-ux` path | Session 2 PR #10: skills, `mcp/dispatch.mjs#L304`, `README.md`, `docs/*.md`, `tests/test-{dispatch,planner,run}.mjs` |
| `UX-SQ-004` | SKILL | P1 | Closed | Replaced cross-root `../../../docs/...` links with hosted Zensical URLs + `diagnose.mjs` anchor checks | Session 2 PR #10: `.agents/skills/*`, `diagnose.mjs`, `tests/test-run.mjs`, `tests/test-lifecycle-installer.mjs` |
| `UX-SQ-005` | SCRIPT | P1 | Closed | Added `PATH` warning + `npx` fallback and `detectCompanionDependencies()` `[NEXT STEP]` notice in `setup`/`status` | Session 2 PR #10: `scripts/install-register.mjs`, `README.md`, `docs/getting-started.md`, `tests/test-lifecycle-installer.mjs` |
| `UX-SQ-006` | SVC | P1 | Closed | Aligned worker/lead/auditor briefs and docs to `rtk grep`/`find` + bounded `<= 150`-line `read_file` slices | Session 2 PR #10: `mcp/briefs.mjs`, `docs/{getting-started,concepts}.md`, manifests, `tests/test-{dispatch,planner}.mjs` |
| `UX-SQ-007` | DOC | P2 | Closed | Added `scratch/` `.gitignore` / `.git/info/exclude` / `--report-root` guidance across onboarding docs and skill | Session 2 PR #10: `README.md`, `docs/getting-started.md`, `swarm-governance/SKILL.md` |
| `UX-SQ-008` | SKILL | P2 | Closed | Gated `self-diagnosis/SKILL.md` as maintainer-only and added `package.json` guard in `diagnose.mjs` | Session 2 PR #10: `self-diagnosis/SKILL.md`, `diagnose.mjs`, `tests/test-run.mjs` |
| `UX-SQ-009` | DEP | P2 | Closed | Rewrote `plugin.json` description & Day-1 `suggestedPrompts` in plain English + added `README.md` opener | Session 2 PR #10: `plugin.json`, `README.md`, `tests/test-run.mjs`, `agy plugin validate --strict` |
| `UX-SQ-010` | SCRIPT | P2 | Closed | Reformatted `agy-squad --help` into grouped `<= 100`-char sections listing `--help`/`--version` | Session 2 PR #10: `bin/agy-squad.mjs`, `tests/test-run.mjs` |
| `UX-SQ-011` | SKILL | P2 | Closed | Removed `antislop` and `permissioned-github` from `swarm-governance/SKILL.md` and scoped Section 5 as optional | Session 2 PR #10: `swarm-governance/SKILL.md`, `ecosystem-and-modifiers.md`, `tests/test-run.mjs` |
| `UX-SQ-012` | DOC | P2 | Closed | Added IDE reload guidance, `Uninstall & Rollback` section, and `Agy-Context-Saver >= 2.0.1 (2.0.4+ recommended)` | Session 2 PR #10: `scripts/install-register.mjs`, `docs/getting-started.md`, `README.md`, `tests/test-lifecycle-installer.mjs` |
| `UX-SQ-013` | SCRIPT | P3 | Closed | Added `SUBCOMMAND_HELP` focused usage, options, and examples for all subcommands | Session 2 PR #10: `bin/agy-squad.mjs`, `tests/test-run.mjs` |
| `UX-SQ-014` | SCRIPT | P3 | Closed | Added 1-line `Next step:` setup hint on `NOT INSTALLED` / `PARTIAL INSTALLATION` (non-JSON mode) | Session 2 PR #10: `scripts/install-register.mjs`, `tests/test-lifecycle-installer.mjs` |
| `UX-SQ-015` | RUN | P3 | Closed | Added `agy-squad finalize` shorthand (`inspect -> bundle -> verify [+ prune]`) and surfaced in planner/docs | Session 2 PR #10: `bin/agy-squad.mjs`, `mcp/planner.mjs`, `README.md`, `docs/tools.md`, `optimization-and-review-rubric.md`, `tests/test-handoffs.mjs` |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UX-SQ-016` | Session 1 | DEP | Deferred / Won't Fix | `plugin.json#L1-L25` | `plugin.json` omits a `"logo"` property and `assets/logo.svg` artwork (renders generic plugin icon). | Deferred pending explicit human/brand design approval; per visual-asset governance (`antislop` R-23 / `L49`), agents must not fabricate unapproved SVG logos autonomously. | Source-derived inspection of `plugin.json#L1-L25` |
| `UX-SQ-017` | Session 1 | TEST | Deferred / Won't Fix | `docs/getting-started.md#L3` | Physical macOS and Windows native `agy` Desktop IDE and CLI live interactive runs remain unverified (Node.js CI parity covers Linux, macOS, and Windows). | Deferred on physical multi-OS hardware/GUI execution access (`L46`); already honestly disclosed in `docs/getting-started.md#L3` and tracked as a post-launch native-host verification gate. | Source-derived inspection of `docs/getting-started.md#L3` and `docs/getting-started.md#L9` |
