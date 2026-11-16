# PR Remediation Review Ledger: `fix/p1-p2-remediation` (`Agy-Context-Saver` & `Agy-Squad`)

Content Verdict: PASS

> Governed native `/swarm` Wave 1 (`FAIL`) -> Wave 2 (`PASS`) -> Stage 2 flat Integrity-Audited (`CLEAN`) verification across `Agy-Context-Saver` (`0bcf98fce84b8a3fba8103be3f9da86e0a083285..6215df1e2e6cd6b60fc6292a266a6c83710e2ffd`, 21 files) and `Agy-Squad` (`e6120a059af4b5cc82a6a44536d11d70dc9bddcd..3ad5ba4086151bb2c248b5ae5c692ceb1f739314`, 34 files) against Agy-Squad PR Review Standard v1.4.0. Both cohorts passed Stage 2 Integrity Audit (`Integrity Verdict: CLEAN`) and cryptographic SHA-256 verification under `auditPolicy: "required"`.

---

## 1. Review Metadata, Session Provenance, and Evidence Limits

| Field | Value |
| --- | --- |
| Repositories & Branches | `paragon-ux/Agy-Context-Saver` (`fix/p1-p2-remediation`, `0bcf98fce84b8a3fba8103be3f9da86e0a083285..6215df1e2e6cd6b60fc6292a266a6c83710e2ffd`); `paragon-ux/Agy-Squad` (`fix/p1-p2-remediation`, `e6120a059af4b5cc82a6a44536d11d70dc9bddcd..3ad5ba4086151bb2c248b5ae5c692ceb1f739314`) |
| Governing Standard | Agy-Squad PR Review Standard v1.4.0 |
| Review Date & Topology | 2026-11-16 / Layered `/swarm` (`acs_fixes` + `sq_fixes`, `workspace: inherit`, `gemini-4-hydrogen-xhigh`, plus `monitor` on `claude-sonnet-5-5-medium`) + Stage 2 flat Integrity Auditors (`audit-acs-fixes`, `audit-sq-fixes` on `gemini-4-hydrogen-xhigh`) |
| Prior Baseline Ledger | [v0.1.1-review.md](v0.1.1-review.md) (`Agy-Squad` v0.1.1 baseline) |
| Final Disposition | Approve (`Content Verdict: PASS`; Integrity Audits: `CLEAN` on `acs_fixes` and `sq_fixes`) — 0 open P0/P1/P2 findings |

### Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| 1 | `9ae89941-d468-4ca2-be5f-611746cca490` | none | 2026-11-16 | `0bcf98f..547a307` (`Agy-Context-Saver`), `e6120a0..08a7515` (`Agy-Squad`), clean | Coordinator (`/pr-review` + `swarm-governance`), Wave 1 Layered `/swarm` (`FAIL` across both leads pending Wave 2 fixes) |
| 2 | `2dc33319-d156-4e72-af6b-a8e3876ed4cc` | `9ae89941-d468-4ca2-be5f-611746cca490` | 2026-11-16 | `0bcf98f..6215df1`, clean (`[agy-transcript-access: deny]`) | `acs-fixes-acs-hook-trans` (`specialist-1` for `acs_fixes`; Wave 1 `PARTIAL` -> Wave 2 `READY`) |
| 3 | `c37ae3e6-2840-45c6-989a-20ff02e135e4` | `9ae89941-d468-4ca2-be5f-611746cca490` | 2026-11-16 | `0bcf98f..6215df1`, clean (`[agy-transcript-access: deny]`) | `acs-fixes-acs-installer` (`specialist-2` for `acs_fixes`; Wave 1 `PARTIAL` -> Wave 2 `READY`) |
| 4 | `b33347e9-9a8a-46c1-ae7e-12438c651e7a` | `9ae89941-d468-4ca2-be5f-611746cca490` | 2026-11-16 | `0bcf98f..6215df1`, clean (`[agy-transcript-access: allow]`) | `acs-fixes-lead` (`acs_fixes` Lead; Wave 1 `FAIL` -> Wave 2 `Content Verdict: PASS`) |
| 5 | `944329de-68e0-43c2-9948-7a6a13f85ca8` | `9ae89941-d468-4ca2-be5f-611746cca490` | 2026-11-16 | `e6120a0..3ad5ba4`, clean (`[agy-transcript-access: deny]`) | `sq-fixes-sq-mcp-runtime` (`specialist-1` for `sq_fixes`; Wave 1 `READY` -> Wave 2 `READY`) |
| 6 | `3c77b36a-cf33-4a3d-af80-7f6d40056645` | `9ae89941-d468-4ca2-be5f-611746cca490` | 2026-11-16 | `e6120a0..3ad5ba4`, clean (`[agy-transcript-access: deny]`) | `sq-fixes-sq-skills-docs` (`specialist-2` for `sq_fixes`; Wave 1 `PARTIAL` -> Wave 2 `READY`) |
| 7 | `84fdaa04-fcc2-46a4-be91-271888c80e36` | `9ae89941-d468-4ca2-be5f-611746cca490` | 2026-11-16 | `e6120a0..3ad5ba4`, clean (`[agy-transcript-access: allow]`) | `sq-fixes-lead` (`sq_fixes` Lead; Wave 1 `FAIL` -> Wave 2 `Content Verdict: PASS`) |
| 8 | `795c2a58-73d4-48c2-9d38-039c1bc09b9a` | `9ae89941-d468-4ca2-be5f-611746cca490` | 2026-11-16 | `0bcf98f..6215df1`, clean (`[agy-transcript-access: allow]`) | `audit-acs-fixes` (Stage 2 flat Integrity Auditor; `Integrity Verdict: CLEAN`) |
| 9 | `74d2bb8c-fcbf-4783-b244-36ef4ce2c176` | `9ae89941-d468-4ca2-be5f-611746cca490` | 2026-11-16 | `e6120a0..3ad5ba4`, clean (`[agy-transcript-access: allow]`) | `audit-sq-fixes` (Stage 2 flat Integrity Auditor; `Integrity Verdict: CLEAN`) |

### Evidence Available & Limits

- **Directly inspected sources:** All 21 changed files across `Agy-Context-Saver` (`0bcf98f..6215df1`) and all 34 changed files across `Agy-Squad` (`e6120a0..3ad5ba4`) verified via `agy-squad fingerprint` and bounded slices.
- **Directly executed checks:** Full `npm test` (11/11 suites in `Agy-Context-Saver`; 10/10 suites including `test-comparative-dossier` [20/20], `verify-benchmark`, `verify-package --self-test` in `Agy-Squad`), `npm run preflight` and `npm run verify:package` (`33` files / `66` files pre-ledger) on both repos, `agy plugin validate` (`skills 1/rules 1/hooks 1` and `skills 4/mcpServers 1`), live `agy-context status` and `agy-squad status` (`HEALTHY & ACTIVE`), `diagnose.mjs --markdown` (`HEALTHY` / `CLEAN`), `zensical build` on both repos (`0.30s`–`1.07s` / `9.76s`), Spike `S5` disposable `.agents/hooks.json` probes (`agy` `1.5.9` CLI), and full Pointer-Over-Wire CLI `fingerprint` / `inspect` / `digest` / `verdict` / `bundle` / `verify` / `prune`.
- **Platform & CI limits:** Workstation runs WSL2 Linux without native `pwsh` or Windows `cmd.exe`. Accordingly, `Agy-Context-Saver/install.ps1` runtime execution and the `os.platform() === "win32"` `cmd.exe /d /c` branch of `Agy-Squad/tests/test-lifecycle-installer.mjs` remain statically verified (`Source-derived inference`) locally and await live validation in GitHub Actions `windows-latest` and `macos-latest` pull-request CI runs.

---

## 2. File-to-Category Inventory and Coverage Matrix

### `Agy-Context-Saver` Changed Files (`0bcf98fce84b8a3fba8103be3f9da86e0a083285..6215df1e2e6cd6b60fc6292a266a6c83710e2ffd`, 21 Files)

| File Path | Primary Category | Secondary Categories | Reviewed By | SHA-256 Fingerprint |
| --- | --- | --- | --- | --- |
| `Agy-Context-Saver/scripts/execution-guard-hook.mjs` | `RUN` | `ARCH`, `SVC` | `acs_fixes` | `b08a19522c57f36154a35d085309dd519cff88338c02786f56fc4ce34fcfc752` |
| `Agy-Context-Saver/lib/transcript-core.mjs` | `RUN` | `ARCH`, `SVC` | `acs_fixes` | `354c6ef9e62fb587c19f069ba14102e06d2e37d2d26961fe8118f70da32315fe` |
| `Agy-Context-Saver/bin/agy-context.mjs` | `RUN` | `SVC`, `DOC` | `acs_fixes` | `b85587e20d6c4ad3370d12c2f4a5f86518594e1c7dd641bc3f733f63b3ae0f17` |
| `Agy-Context-Saver/scripts/install-register.mjs` | `SCRIPT` | `DEP`, `SVC` | `acs_fixes` | `25ef923f5aee3b381fe0e9602327207775b32173b9ecf2b73463abfbaf1a872c` |
| `Agy-Context-Saver/scripts/provision-rtk.mjs` | `SCRIPT` | `TEST` | `acs_fixes` | `b165fb0687ee9dc8815ad4937bca6f4f275974fb7e8ee8848abbcca22a1e9108` |
| `Agy-Context-Saver/install.ps1` | `SCRIPT` | — | `acs_fixes` | `fe95cb9c367bcad9ac6dce123db03cc0bb703696bf19c558708b81b6e13a998d` |
| `Agy-Context-Saver/package.json` | `DEP` | `TEST`, `DOC` | `acs_fixes` | `a3dba344cdb75c04e4d95ccc4fc3bd28048e36589831c20fd2928c376e0b4e63` |
| `Agy-Context-Saver/docs/publishing.md` | `DOC` | `DEP` | `acs_fixes` | `8de531dc8b60fecf296d451df7ba66ac8219398b86d62a67bf12bb253a264ef6` |
| `Agy-Context-Saver/docs/roadmap.md` | `DOC` | — | `acs_fixes` | `5649526576e63aa9f66ff1252ad70fe9e16297f728c560f3350e5ac740b09f4c` |
| `Agy-Context-Saver/docs/tools.md` | `DOC` | `RUN` | `acs_fixes` | `517d8f43fb918ebcce50e99397e141ae4bf4101df92b8c1eb8aac0ef20ea13c7` |
| `Agy-Context-Saver/rules/AGENTS.md` | `SKILL` | `DOC` | `acs_fixes` | `cb09b4da04312ff359d248cd574a47d1fd4d973606cfddf32d94c843cd8b1469` |
| `Agy-Context-Saver/skills/context-governance/SKILL.md` | `SKILL` | `DOC` | `acs_fixes` | `d0317e0ef3ca30f6b658ca046af715a80ac4b9289eb9c8a8c59ea6d03ed69ed8` |
| `Agy-Context-Saver/tests/helpers/hermetic-fixture.mjs` | `TEST` | `SCRIPT` | `acs_fixes` | `3e11613d45f7730ad33aeee8df4dae6fc41189082d1c32cb118a15124a37ebf2` |
| `Agy-Context-Saver/tests/test-hook.mjs` | `TEST` | `RUN`, `ARCH` | `acs_fixes` | `dd2d2931e4a712d1bc60327323e4d2566c1f52474b0d870d355bf721ccb5c60f` |
| `Agy-Context-Saver/tests/test-transcript.mjs` | `TEST` | `RUN`, `ARCH` | `acs_fixes` | `3114bfccab833d6812fe9d9c3c5363b1bc5447abd97f643e584aea7b92718de2` |
| `Agy-Context-Saver/tests/test-installed-verification.mjs` | `TEST` | `SVC`, `SCRIPT` | `acs_fixes` | `e0388765fd3fc5c44cd8db391634a178e1f27810de57bf29ff748f73ce8dabd1` |
| `Agy-Context-Saver/tests/test-lifecycle-rollback.mjs` | `TEST` | `SCRIPT` | `acs_fixes` | `1e739717be2eb827aa1d5fc29120c32a7b8f51f4859c32e58c417c840ed49450` |
| `Agy-Context-Saver/tests/test-rtk-ledger-fresh-install.mjs` | `TEST` | `SCRIPT` | `acs_fixes` | `19514c694ac4095fa9d7772b8f5d83110c564c047919ce96a5c8bbfea7008d04` |
| `Agy-Context-Saver/tests/verify-package.mjs` | `TEST` | `DEP` | `acs_fixes` | `3b3a52ba7f17e620b228da3325670fcc68b3886685e1449f0d09d214b0a5579f` |
| `Agy-Context-Saver/.github/workflows/ci-matrix.yml` | `TEST` | `DEP` | `acs_fixes` | `e0d277f0579f76837721aac1edfad61e343c5d526f2e21f50ef7ed09a045d099` |
| `Agy-Context-Saver/.github/workflows/release-tag.yml` | `TEST` | `DEP` | `acs_fixes` | `0cc122abf61057dcace3dee82822f3eb3f48d98d189e894187c33223b656555f` |

### `Agy-Squad` Changed Files (`e6120a059af4b5cc82a6a44536d11d70dc9bddcd..3ad5ba4086151bb2c248b5ae5c692ceb1f739314`, 34 Files + This Ledger)

| File Path | Primary Category | Secondary Categories | Reviewed By | SHA-256 Fingerprint |
| --- | --- | --- | --- | --- |
| `Agy-Squad/mcp/index.js` | `MCP` | `RUN` | `sq_fixes` | `d24338ab2b84f4be0a7ac37a2d5d1b9da7a54a7c541fcc9d397f68fe282d4b14` |
| `Agy-Squad/mcp/dispatch.mjs` | `RUN` | `MCP`, `ARCH` | `sq_fixes` | `59df3d73278506af051f2b13b98eec048a74dcdff43ca22f1db55a9bc7055866` |
| `Agy-Squad/mcp/planner.mjs` | `RUN` | `MCP`, `ARCH` | `sq_fixes` | `a052a12429ce3d5da2e5236eb475a44f0c3cba62ae905a1106c5902326177f42` |
| `Agy-Squad/mcp/briefs.mjs` | `MCP` | `RUN`, `SVC` | `sq_fixes` | `f63a51034d4c745348459fca0a48808a2023163252131b8f7ddf01723feee06e` |
| `Agy-Squad/mcp/handoffs.mjs` | `ARCH` | `RUN`, `SVC` | `sq_fixes` | `833731ff33e103dce2a0e2e2955b5e28fa428fde04f2a4f42032dfadef7a725a` |
| `Agy-Squad/mcp/verdicts.mjs` | `RUN` | `ARCH` | `sq_fixes` | `98a51c84362b0e01df95ecf20b2d3f284d8cebdfcb3b11fdca20e8693b364b23` |
| `Agy-Squad/bin/agy-squad.mjs` | `SCRIPT` | `ARCH`, `DOC` | `sq_fixes` | `c3a08b06248d16ad642e0cd46f145d7ee05d7956828af836f1ab7fafa3625a33` |
| `Agy-Squad/scripts/install-register.mjs` | `DEP` | `SCRIPT`, `TEST` | `sq_fixes` | `8c4617fe5e8e25d449f3d545bce1e3bd2e735e6cd045a86fa84a01faa040eba6` |
| `Agy-Squad/plugin.json` | `DEP` | — | `sq_fixes` | `3295e1d70eb27b5abef7b1e8bacf5ec1d404b9ce8798cf8a5e522ce3e82916ce` |
| `Agy-Squad/.agents/skills/self-diagnosis/scripts/diagnose.mjs` | `SCRIPT` | `SKILL`, `DOC` | `sq_fixes` | `7b2c49cda51f78d6875118de2c25f27a928a1a31e12be3f5025b756e0a76f018` |
| `Agy-Squad/.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` | `SKILL` | `RUN` | `sq_fixes` | `928a6278dba607fc3e030268a174557f3ecff5b27f5866afeb17dea2eed2dfe9` |
| `Agy-Squad/.agents/skills/full-review/SKILL.md` | `SKILL` | `DOC` | `sq_fixes` | `240986375ec1020b0108108dc64349390ca2bd050a5a155ca8c7488ff91a7139` |
| `Agy-Squad/.agents/skills/full-review/references/evidence-intake.md` | `SKILL` | `DOC` | `sq_fixes` | `d6db7c2f3d85405b44a2d39895d0b54d78545dbf32db2020b6650e8e54c7552b` |
| `Agy-Squad/.agents/skills/full-review/references/review-roles.md` | `SKILL` | `DOC` | `sq_fixes` | `ba7ea90b7c4df98fe997df7cf6d14fdf3d085fcf55863d76e21de040f1ae2275` |
| `Agy-Squad/.agents/skills/swarm-governance/SKILL.md` | `SKILL` | `DOC` | `sq_fixes` | `510f9135621759947d0f8f1ab3ad4de4043e60b6a2f98378abec2ed738c6ddf3` |
| `Agy-Squad/.agents/skills/swarm-governance/references/intake-and-planning.md` | `SKILL` | `DOC` | `sq_fixes` | `f8594f296db8a78fd59cc0e0eeeb1e6a02e8917c9986f6dfd4cf3ca71e593ac5` |
| `Agy-Squad/docs/plans/native-enforcement-ledger.md` | `ARCH` | `DOC` | `sq_fixes` | `9de0541490d07eca5c461b597dad476b9e03eb49e3479e0ed58557553992ff1e` |
| `Agy-Squad/docs/roles-and-workflows.md` | `DOC` | `ARCH` | `sq_fixes` | `bcf1d43401367a87c4ba45d5d52ecc1ca5a1dd7c229d890af2fe731496adf4b3` |
| `Agy-Squad/docs/stopping-agents.md` | `ARCH` | `DOC` | `sq_fixes` | `64c65e2293b3449b3f4e329a9942cb303fceefb5dd32a486a2b30f9b002026ed` |
| `Agy-Squad/docs/tools.md` | `DOC` | `MCP`, `DEP` | `sq_fixes` | `029caf20502cb387d2c84fcea920cd14dab84ce410909493df09ece3844be064` |
| `Agy-Squad/docs/getting-started.md` | `DOC` | `DEP` | `sq_fixes` | `7fad061cfee486debf68f0c87c26dbf334388b36f68d82ea58ddbda55dd57cd0` |
| `Agy-Squad/docs/concepts.md` | `DOC` | — | `sq_fixes` | `8ba43424cbe2a92814341bef512ab61f7c34502ab76b9d23ba71b20cbfef2611` |
| `Agy-Squad/docs/core-workflows.md` | `DOC` | — | `sq_fixes` | `e3a93b0ec88d5025474181c4c8e5b9089debd81b82cc7467e8577d3083839b90` |
| `Agy-Squad/docs/benchmarks.md` | `DOC` | — | `sq_fixes` | `2127c6711660af1ae698f68712f6e8247e61d428340b6d73b086595450226198` |
| `Agy-Squad/docs/assets/architecture-overview.svg` | `DOC` | — | `sq_fixes` | `33a3a4dd2aed3738aabf1fa33b5c5a28f543db7ee26f3a7868361e863810e435` |
| `Agy-Squad/docs/assets/role-and-verdict-gate.svg` | `DOC` | — | `sq_fixes` | `d6839a9a2c48f623fd6599108d83e6ab48189eebe6e36a9dad67961ea319a475` |
| `Agy-Squad/tests/test-handoffs.mjs` | `TEST` | `ARCH`, `RUN` | `sq_fixes` | `a5c90e3d4e3361d4f4e02d4cc819ad727619a1f4f651e4bc202a14916fe75136` |
| `Agy-Squad/tests/test-lifecycle-installer.mjs` | `TEST` | `DEP`, `SCRIPT` | `sq_fixes` | `60b085b6343a5b9e2cf97ea4a6b95ae486e82234f2446d4f1d50aa2b5b937470` |
| `Agy-Squad/tests/test-planner.mjs` | `TEST` | `RUN` | `sq_fixes` | `13f3e4bb50a721b4f9faeaac7fe1651ba16afe72061664faf8015f7e73718edf` |
| `Agy-Squad/tests/test-run.mjs` | `TEST` | `SKILL`, `SCRIPT` | `sq_fixes` | `ac72ac3a05163fd39728938076ab7ba0a8a8048944c70df6b08e78c819d77c7f` |
| `Agy-Squad/tests/test-server.mjs` | `TEST` | `MCP` | `sq_fixes` | `f4f6b3a47bcf7c2e9c522de43a2027aca73a33aefca2dcc62ef353fdb0cb0ea9` |
| `Agy-Squad/tests/test-verdicts-and-pivot.mjs` | `TEST` | `RUN` | `sq_fixes` | `e2e34ba24c0df71776ebe70decabd4b98dd4a9944f8f503da80a53453598f531` |
| `Agy-Squad/.github/workflows/ci.yml` | `TEST` | `DEP` | `sq_fixes` | `e468d7800e69e60d911cfbd60001ab0c43f90412441d2327d8bbd68d03df0442` |
| `Agy-Squad/.github/workflows/release-tag.yml` | `TEST` | `DEP` | `sq_fixes` | `294cbcca2bbd01efda7d9468b05301b795dcd577ea5ad22b93402ce3d62ca885` |

### Category Coverage Matrix (All 10 Standard v1.4.0 Categories)

| Category | Coverage | Findings Tracked | Final Category Status |
| --- | --- | --- | --- |
| `ARCH` | Complete | `ACS-ARCH-001`, `ACS-ARCH-002`, `SQ-ARCH-001`, `SQ-ARCH-002` | All Closed; `SQ-ARCH-001-P3-2` Deferred in Section 8 |
| `DOC` | Complete | `ACS-DOC-001`, `ACS-DOC-002`, `SQ-DOC-001` | All Closed; `ACS-DOC-001-P3-1` & `SQ-DOC-001-P3-1` Deferred in Section 8 |
| `SKILL` | Complete | `ACS-SKILL-001`, `SQ-SKILL-001`..`004` | All Closed (`SQ-SKILL-001-P3-1` Closed Post-Remediation in Section 8) |
| `MCP` | Complete | `SQ-MCP-001`, `SQ-MCP-002` (`Agy-Context-Saver`: N/A) | All Closed (`SQ-MCP-001-W2` Closed Post-Remediation in Section 8) |
| `RUN` | Complete | `ACS-RUN-001`..`010`, `SQ-RUN-001`..`007` | All Closed; `ACS-RUN-002-P3-1`, `ACS-RUN-010-P3-1`, `SQ-RUN-001-P3-1` Deferred in Section 8 |
| `SVC` | Complete | `ACS-SVC-001` | Closed (`ACS-SVC-001-P3-1` & `SVC-LATENCY-HANDOFF` tracked in Section 8) |
| `DB` | Complete | None | Not applicable (`NO_DB_FILES` — filesystem JSON/Markdown state covered under `ARCH`/`RUN`/`SVC`) |
| `SCRIPT` | Complete | `ACS-SCRIPT-001`..`003`, `SQ-SCRIPT-001`..`002` | All Closed; `ACS-SCRIPT-001-P3-1`, `ACS-SCRIPT-002-P3-1`, `SQ-SCRIPT-001-P3-1` tracked in Section 8 |
| `TEST` | Complete | `ACS-TEST-001`, `SQ-TEST-001` | Closed on Linux (`SQ-TEST-001-W2` Closed Post-Remediation; Windows CI pending GitHub Actions) |
| `DEP` | Complete | `ACS-DEP-001`, `SQ-DEP-001`..`004` | All Closed (`SQ-DEP-004-W2` & `SQ-DEP-001-P3-1` Closed Post-Remediation; `ACS-DEP-001-P3-1` By Design) |

---

## 3. Architecture-Before-Runtime Trace

1. **Multi-Root Product Discovery & Concurrent Atomic Grants (`Agy-Context-Saver`):**
   - `getBrainDirs()`, `isContainedInAnyBrainDir()`, and `extractConvId()` (`lib/transcript-core.mjs:66-131`) span `~/.gemini/antigravity/brain`, `~/.gemini/antigravity-cli/brain`, and `~/.gemini/antigravity-ide/brain`. Single-use capability grants (`wx` `0o600` files in `<stateDir>/grants/`) are claimed atomically via `fs.renameSync()` and guard unset `GEMINI_CONVERSATION_ID` callers (`records.length === 1`), preventing parallel `/swarm` grant stealing.
2. **Restricted-Child Security Boundaries vs. Reviewer Tooling (`scripts/execution-guard-hook.mjs`):**
   - Shell/code mutation verb matching uses token boundaries and call parentheses (`3466-3476`), `isRestrictedLifecycleInvocation()` checks actual interpreter targets rather than file-path substrings (`2646-2683`), and session write tracking (`recordSessionWrittenFile` / `wasFileWrittenInSession`) lets restricted child `/swarm` reviewers run unmodified workspace test suites and `git diff` while still blocking session-mutated scripts, `/tmp`/`/scratch` code smuggling, and `install-register.mjs` execution.
3. **Failure/Partial Bundling & Plane B Spike S5 Reconciliation (`Agy-Squad`):**
   - `mcp/handoffs.mjs` supports explicit opt-in `--allow-non-passing` / `--allow-partial` archiving with upfront `NO_REPORT` loose-file rejection inside `computeEvidenceDigest` and `bundleReports` (`inspectReports(..., { rejectLooseOnNoReport: true })`). `docs/plans/native-enforcement-ledger.md` and `docs/roles-and-workflows.md` record `agy` `1.5.9` CLI Spike `S5` findings honestly (`Observed`) while keeping global `hooks.json` active for `/swarm` worker propagation.
4. **Canonical Plugin MCP Registration & Multi-Root Parity (`scripts/install-register.mjs`, `mcp/index.js`):**
   - `plugin.json` drops unsupported keys and `agy-squad setup` registers `agy-squad` solely inside `~/.gemini/config/plugins/agy-squad/mcp_config.json`, sweeping global `mcp_config.json` duplicates and stale `agy-squad*` schema dirs. `mcp/index.js` shares `defaultManifests` exported from `mcp/dispatch.mjs` and rejects ambiguous default manifests across multi-root IDE workspaces.

---

## 4. Category Summaries

- **`ARCH`:** Closed `ACS-ARCH-001..002` and `SQ-ARCH-001..002` across concurrency locks, multi-brain containment, `allowNonPassing`/`allowPartial` SHA-256 digests, and Spike S5 `agy 1.5.9` ledger reconciliation. One P3 advisory (`SQ-ARCH-001-P3-2`) deferred in Section 8.
- **`DOC`:** Closed `ACS-DOC-001..002` and `SQ-DOC-001`; synchronized `docs/publishing.md`, `docs/tools.md`, `docs/getting-started.md`, `docs/roles-and-workflows.md`, and SVG labels with passing `zensical build` on both repositories. Two P3 prose items deferred in Section 8.
- **`SKILL`:** Closed `ACS-SKILL-001` and `SQ-SKILL-001..004`; synchronized `skills/context-governance/SKILL.md`, removed contradictory `"never call read_file"` brief rules and `(?tab=graph)` URL query suffix, and verified `diagnose.mjs` (0 broken links) plus `agy plugin validate`.
- **`MCP`:** Closed `SQ-MCP-001..002`; unified `defaultManifests` and multi-root ambiguity handling between `mcp/dispatch.mjs` and `mcp/index.js`, and purged retired v1.x transcript MCP names.
- **`RUN`:** Closed `ACS-RUN-001..010` and `SQ-RUN-001..007`, including Wave 2 fixes for restricted-child false blocks, `self-only` positional `current --json`, `queryTranscript` `USER_INPUT` `lastTurns` anchoring, `isSwarmPollSchedule` 5-denial circuit breaker, and `resolveIntegrityAuditor` warning deduplication.
- **`SVC`:** Closed `ACS-SVC-001` (`env-cache.json` `60s` TTL + `status` non-zero exit code) with non-blocking P3 notes preserved in Section 8.
- **`DB`:** Not applicable (`NO_DB_FILES` in both repositories).
- **`SCRIPT`:** Closed `ACS-SCRIPT-001..003` and `SQ-SCRIPT-001..002`, confirming `~/.gitconfig` `mtime` invariance (`1794817674`), symlink-to-copy pruning, `diagnose.mjs` `DOC-MCP-DRIFT`, and `bin/agy-squad.mjs` `--allow-non-passing`/`--allow-partial` CLI flags.
- **`TEST`:** Closed `ACS-TEST-001` and `SQ-TEST-001` across all Linux test suites (11 suites in `Agy-Context-Saver`; 10 suites in `Agy-Squad`), `verify:package`, and CI workflow definitions; Windows runner execution remains scoped to GitHub Actions `windows-latest`.
- **`DEP`:** Closed `ACS-DEP-001` and `SQ-DEP-001..004`, including Wave 2 `formatWindowsCmdShim` `if errorlevel 1 goto :fallback` refactor outside parenthesized `cmd.exe` blocks and `agy-squad_*` schema detection.

---

## 5. Finding Summary (`1 ID = 1 Row`)

| ID | Category | Priority | Status | Source | Defect / Remediation Summary | Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- |
| `ACS-ARCH-001` | `ARCH` | P1 | Closed | `Agy-Context-Saver/lib/transcript-core.mjs:243-558` | Atomic `wx` grant files, atomic `renameSync` claims, session locks, and `records.length === 1` unset-env isolation. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-ARCH-002` | `ARCH` | P2 | Closed | `Agy-Context-Saver/lib/transcript-core.mjs:66-131` | Multi-product brain discovery across `antigravity`, `antigravity-cli`, and `antigravity-ide`. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-RUN-001` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:39-45` | Resolve relative paths against `payload.cwd` or `payload.workspacePath`. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-RUN-002` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:2605-2756` | Segment-parsed redirects (`2>/dev/null`), delimited shell/code verbs, `isRestrictedLifecycleInvocation`, session write tracking. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-RUN-003` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:1729-1823` | `16 KiB` chunked Step 0 scan up to `512 KiB` preserving lineage and directives. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-RUN-004` | `RUN` | P1 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:1855-1916` | Ancestor walk up to 8 hops preventing cross-swarm `@roster*` policy leaks. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-RUN-005` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:3808-3820` | Preserve `query current` search terms while rewriting positional `current` before trailing flags (`read current --json`). | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-RUN-006` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:250-254` | Permit writes under `swarm_view/` narrator state inside brain Safe Harbor. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-RUN-007` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:4142-4159` | Block swarm poll timers with `>= 5` `force_ask` circuit breaker, lazy `rg` lookup, health counting. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-RUN-008` | `RUN` | P2 | Closed | `Agy-Context-Saver/bin/agy-context.mjs:214,281` | Raise `tools`/`outline` defaults and `rangeSpan` ceiling to `500` with accurate truncation footers. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-RUN-009` | `RUN` | P2 | Closed | `Agy-Context-Saver/lib/transcript-core.mjs:1455-2121` | Parity `USER_INPUT` turn-anchoring (`lastTurns`) across `readTranscript` and `queryTranscript`. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-RUN-010` | `RUN` | P2 | Closed | `Agy-Context-Saver/bin/agy-context.mjs:143-150,441-444` | Strict positive-integer validation on `--ttl` and `transcript list --limit`. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-SVC-001` | `SVC` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:604-688` | Disk `env-cache.json` (`60s` TTL + binary mtime) and non-zero `agy-context status` exit code. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-SCRIPT-001` | `SCRIPT` | P2 | Closed | `Agy-Context-Saver/scripts/provision-rtk.mjs:237-241` | Route `GIT_CONFIG_GLOBAL` to isolated test profile keeping `~/.gitconfig` untouched. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-SCRIPT-002` | `SCRIPT` | P2 | Closed | `Agy-Context-Saver/install.ps1:37-79` | Use `Move-Item`, `%~nx1` dispatcher, and `runUninstall()` managed `node.cmd` cleanup. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-SCRIPT-003` | `SCRIPT` | P2 | Closed | `Agy-Context-Saver/scripts/install-register.mjs:508-535` | Replace symlinks/broken links cleanly before `fsPromises.cp` on copy fallback. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-DOC-001` | `DOC` | P2 | Closed | `Agy-Context-Saver/docs/tools.md:3-191` | Remove ungrounded benchmark numbers and align CLI flags/version/status order. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-DOC-002` | `DOC` | P2 | Closed | `Agy-Context-Saver/docs/publishing.md:15,32,65-69` | Sync npm `"files"` list (`docs`), exclusions, and `npm run verify:package` docs. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-SKILL-001` | `SKILL` | P2 | Closed | `Agy-Context-Saver/skills/context-governance/SKILL.md:15,34,71` | Sync `v2.0.1`, `swarm_view/` narrator safe harbor, and 3 brain roots with `AGENTS.md`. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-TEST-001` | `TEST` | P2 | Closed | `Agy-Context-Saver/tests/verify-package.mjs:1-112` | Package manifest boundary verification + CI matrix + Wave 2 regressions (11/11 suites). | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `ACS-DEP-001` | `DEP` | P2 | Closed | `Agy-Context-Saver/package.json:1-61` | Zero runtime deps, Node `>= 22`, `verify:package` script, and `agy plugin validate` clean. | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` |
| `SQ-ARCH-001` | `ARCH` | P2 | Closed | `mcp/handoffs.mjs:313-746` | Opt-in `allowNonPassing`/`allowPartial` archival with upfront `NO_REPORT` loose-file check. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-ARCH-002` | `ARCH` | P2 | Closed | `docs/plans/native-enforcement-ledger.md:36-130` | Spike `S5` (`agy 1.5.9` CLI) propagation evidence recorded honestly and synced with `roles-and-workflows.md`. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-DOC-001` | `DOC` | P2 | Closed | `docs/tools.md:15,98-122` | Updated docs, SVGs, plugin MCP layout, and opt-in bundle/digest flags (`zensical build` clean). | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-SKILL-001` | `SKILL` | P2 | Closed | `.agents/skills/full-review/SKILL.md:53` | Replaced retired MCP transcript tools and removed stale `(?tab=graph)` query string. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-SKILL-002` | `SKILL` | P3 | Closed | `.agents/skills/full-review/references/review-roles.md:78` | Labeled Phase 1 `query_transcript` call count explicitly as historical/retired. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-SKILL-003` | `SKILL` | P2 | Closed | `.agents/skills/swarm-governance/SKILL.md:22,39` | Enforced verbatim `open_board`, `swarm_monitor`, and zero `schedule` watchdog polling. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-SKILL-004` | `SKILL` | P2 | Closed | `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json:28-138` | Removed `"never call read_file"` contradiction across all 6 manifest briefs. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-MCP-001` | `MCP` | P2 | Closed | `mcp/index.js:5,17-89` | Shared `defaultManifests` with `dispatch.mjs` and rejected ambiguous multi-root default manifests. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-MCP-002` | `MCP` | P2 | Closed | `mcp/briefs.mjs:134-135` | Purged retired v1.x transcript MCP tool names from compiled briefs and provenance text. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-RUN-001` | `RUN` | P2 | Closed | `mcp/handoffs.mjs:253-258` | Validate `expectedPredecessorSha256` before identical-bytes short-circuit in `publish()`. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-RUN-002` | `RUN` | P2 | Closed | `mcp/verdicts.mjs:104-149` | Symmetrical conflict detection across verdict lines and non-historical tables. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-RUN-003` | `RUN` | P2 | Closed | `mcp/planner.mjs:36,65-88` | Reserve native `all`, `coordinator`, `narrator`, and `monitor` swarm roster slugs. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-RUN-004` | `RUN` | P2 | Closed | `mcp/handoffs.mjs:176-197` | Cross-platform symlink containment (`lstatSync`, `O_NOFOLLOW`, `realpathSync`). | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-RUN-005` | `RUN` | P2 | Closed | `mcp/handoffs.mjs:116` | Strip multiple leading `@mention` prefixes in Pointer-Over-Wire receipts. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-RUN-006` | `RUN` | P2 | Closed | `mcp/handoffs.mjs:74-84` | Derive single-segment custom roots cleanly while isolating strict `scratch/agy-squad`. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-RUN-007` | `RUN` | P2 | Closed | `mcp/planner.mjs:569-576,638` | Surface and deduplicate ignored `integrity_auditor` lead warnings across dispatch and planner. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-SCRIPT-001` | `SCRIPT` | P2 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:1187-1212` | Added `DOC-MCP-DRIFT` retired symbol scanner in active skills, docs, and `mcp/`. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-SCRIPT-002` | `SCRIPT` | P2 | Closed | `bin/agy-squad.mjs:31-32,221-266` | Exposed `--allow-non-passing`/`--allow-partial`, null/array guards, removed dead throw. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-TEST-001` | `TEST` | P2 | Closed | `tests/test-lifecycle-installer.mjs:134-165` | Added `agy-squad_*` schema check, `.cmd` batch assertions + `win32` `cmd.exe` test, CI triggers. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-DEP-001` | `DEP` | P2 | Closed | `scripts/install-register.mjs:8,141,243-256` | Canonical plugin `mcp_config.json`, dropped invalid `plugin.json` keys, swept global MCP duplicates. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-DEP-002` | `DEP` | P2 | Closed | `scripts/install-register.mjs:114,203,522` | Symlinked/copied `docs/` inside `~/.gemini/config/plugins/agy-squad` verified by `status`. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-DEP-003` | `DEP` | P2 | Closed | `scripts/install-register.mjs:157-180` | Default omitted `config.json` entry to `plugin.json` `disabled !== true`; exit 1 on `enabled: false`. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |
| `SQ-DEP-004` | `DEP` | P2 | Closed | `scripts/install-register.mjs:259-273,342-353` | Pruned stale files in copy fallback and moved Windows `.cmd` invocation outside `if (...)` block. | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` |

---

## 6. Verification Record and `/swarm` Cryptographic Bundle Provenance

### Final Command Verification Summary

| Check / Command | Working Directory | Exit Code | Observed Result |
| --- | --- | --- | --- |
| `npm test && npm run preflight && npm run verify:package` (`Agy-Context-Saver`) | `/home/paragon-ux/Antigravity/Agy-Context-Saver` | `0` | 11/11 Node suites passed (`~/.gitconfig` `mtime` invariant at `1794817674`), `Release preflight passed`, `Package boundary verified (33 files)` |
| `npm test && npm run preflight && npm run verify:package` (`Agy-Squad`) | `/home/paragon-ux/Antigravity/Agy-Squad` | `0` | 10/10 suites passed (`test-comparative-dossier` 20/20, `verify-benchmark`, `test-lifecycle-installer`), `Release preflight passed` |
| `zensical build --clean` (`Agy-Context-Saver` & `Agy-Squad`) | Both repos | `0` | `Agy-Context-Saver`: `No issues found` (`1.07s`); `Agy-Squad`: exited `0` (`9.76s`, 0 new warnings) |
| `agy plugin validate` (`Agy-Context-Saver` & `Agy-Squad`) | `/home/paragon-ux/Antigravity` | `0` | Both `Validation passed` (`skills 1/rules 1/hooks 1` and `skills 4/mcpServers 1` live) |
| `agy-context status` & `agy-squad status` | `/home/paragon-ux/Antigravity` | `0` | Both `Overall Status: HEALTHY & ACTIVE`; `~/.gemini/config/mcp_config.json` = `{"mcpServers": {}}` |
| `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` | `/home/paragon-ux/Antigravity/Agy-Squad` | `0` | `Status: HEALTHY` (`Profiler: HEALTHY`, `Ledger: CLEAN`, `PR Review Standard v1.4.0`, `0` findings) |

### Two-Plane `/swarm` Cryptographic Bundle Ledger

| Squad | Stage 1 & Stage 2 Conversation IDs | Evidence Digest (`agy-squad digest`) | Lead & Integrity Verdicts | Verified Bundle SHA-256 (`report.sources.json`) | Retain / Verify Status |
| --- | --- | --- | --- | --- | --- |
| `acs_fixes` | `acs-fixes-lead` (`b33347e9-9a8a-46c1-ae7e-12438c651e7a`), `acs-fixes-acs-hook-trans` (`2dc33319-d156-4e72-af6b-a8e3876ed4cc`), `acs-fixes-acs-installer` (`c37ae3e6-2840-45c6-989a-20ff02e135e4`), `audit-acs-fixes` (`795c2a58-73d4-48c2-9d38-039c1bc09b9a`) | `2167149808fa2a8665df90f0df02dd0430174509d284feeead7e559a7d4e336b` | `Content Verdict: PASS` / `Integrity Verdict: CLEAN` | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` | Archived & `verify` exit `0` (`retainReports: true`; `prune --keep-reports` exit `0`) |
| `sq_fixes` | `sq-fixes-lead` (`84fdaa04-fcc2-46a4-be91-271888c80e36`), `sq-fixes-sq-mcp-runtime` (`944329de-68e0-43c2-9948-7a6a13f85ca8`), `sq-fixes-sq-skills-docs` (`3c77b36a-cf33-4a3d-af80-7f6d40056645`), `audit-sq-fixes` (`74d2bb8c-fcbf-4783-b244-36ef4ce2c176`) | `420f5aab9677e314e2bce3094795fc41dac8f417db016544262340bfae9f1e65` | `Content Verdict: PASS` / `Integrity Verdict: CLEAN` | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` | Archived & `verify` exit `0` (`retainReports: true`; `prune --keep-reports` exit `0`) |

---

## 7. Overall Disposition and Closure Table (`1 ID = 1 Row`)

**Content Verdict: PASS** — All 21 `ACS-*` findings and 23 `SQ-*` findings across both `fix/p1-p2-remediation` branches are `Closed`, independently re-verified in Wave 2 (`Content Verdict: PASS`) and audited by flat Stage 2 Integrity Auditors (`Integrity Verdict: CLEAN`). Remaining non-blocking P3 advisories, Wave 2 post-remediation trace IDs, and Linux-host Windows CI verification notes are recorded in Section 8.

| ID | Category | Priority | Status | Closed Reference (`HEAD` & Bundle SHA) |
| --- | --- | --- | --- | --- |
| `ACS-ARCH-001` | `ARCH` | P1 | Closed | `Agy-Context-Saver/lib/transcript-core.mjs:243-558` (`a180af71...`) |
| `ACS-ARCH-002` | `ARCH` | P2 | Closed | `Agy-Context-Saver/lib/transcript-core.mjs:66-131` (`a180af71...`) |
| `ACS-RUN-001` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:39-45` (`a180af71...`) |
| `ACS-RUN-002` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:2605-2756` (`a180af71...`) |
| `ACS-RUN-003` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:1729-1823` (`a180af71...`) |
| `ACS-RUN-004` | `RUN` | P1 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:1855-1916` (`a180af71...`) |
| `ACS-RUN-005` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:3808-3820` (`a180af71...`) |
| `ACS-RUN-006` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:250-254` (`a180af71...`) |
| `ACS-RUN-007` | `RUN` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:4142-4159` (`a180af71...`) |
| `ACS-RUN-008` | `RUN` | P2 | Closed | `Agy-Context-Saver/bin/agy-context.mjs:214,281` (`a180af71...`) |
| `ACS-RUN-009` | `RUN` | P2 | Closed | `Agy-Context-Saver/lib/transcript-core.mjs:1455-2121` (`a180af71...`) |
| `ACS-RUN-010` | `RUN` | P2 | Closed | `Agy-Context-Saver/bin/agy-context.mjs:143-150,441-444` (`a180af71...`) |
| `ACS-SVC-001` | `SVC` | P2 | Closed | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:604-688` (`a180af71...`) |
| `ACS-SCRIPT-001` | `SCRIPT` | P2 | Closed | `Agy-Context-Saver/scripts/provision-rtk.mjs:237-241` (`a180af71...`) |
| `ACS-SCRIPT-002` | `SCRIPT` | P2 | Closed | `Agy-Context-Saver/install.ps1:37-79` (`a180af71...`) |
| `ACS-SCRIPT-003` | `SCRIPT` | P2 | Closed | `Agy-Context-Saver/scripts/install-register.mjs:508-535` (`a180af71...`) |
| `ACS-DOC-001` | `DOC` | P2 | Closed | `Agy-Context-Saver/docs/tools.md:3-191` (`a180af71...`) |
| `ACS-DOC-002` | `DOC` | P2 | Closed | `Agy-Context-Saver/docs/publishing.md:15,32,65-69` (`a180af71...`) |
| `ACS-SKILL-001` | `SKILL` | P2 | Closed | `Agy-Context-Saver/skills/context-governance/SKILL.md:15,34,71` (`a180af71...`) |
| `ACS-TEST-001` | `TEST` | P2 | Closed | `Agy-Context-Saver/tests/verify-package.mjs:1-112` (`a180af71...`) |
| `ACS-DEP-001` | `DEP` | P2 | Closed | `Agy-Context-Saver/package.json:1-61` (`a180af71...`) |
| `SQ-ARCH-001` | `ARCH` | P2 | Closed | `mcp/handoffs.mjs:313-746` (`76a8e925...`) |
| `SQ-ARCH-002` | `ARCH` | P2 | Closed | `docs/plans/native-enforcement-ledger.md:36-130` (`76a8e925...`) |
| `SQ-DOC-001` | `DOC` | P2 | Closed | `docs/tools.md:15,98-122` (`76a8e925...`) |
| `SQ-SKILL-001` | `SKILL` | P2 | Closed | `.agents/skills/full-review/SKILL.md:53` (`76a8e925...`) |
| `SQ-SKILL-002` | `SKILL` | P3 | Closed | `.agents/skills/full-review/references/review-roles.md:78` (`76a8e925...`) |
| `SQ-SKILL-003` | `SKILL` | P2 | Closed | `.agents/skills/swarm-governance/SKILL.md:22,39` (`76a8e925...`) |
| `SQ-SKILL-004` | `SKILL` | P2 | Closed | `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json:28-138` (`76a8e925...`) |
| `SQ-MCP-001` | `MCP` | P2 | Closed | `mcp/index.js:5,17-89` (`76a8e925...`) |
| `SQ-MCP-002` | `MCP` | P2 | Closed | `mcp/briefs.mjs:134-135` (`76a8e925...`) |
| `SQ-RUN-001` | `RUN` | P2 | Closed | `mcp/handoffs.mjs:253-258` (`76a8e925...`) |
| `SQ-RUN-002` | `RUN` | P2 | Closed | `mcp/verdicts.mjs:104-149` (`76a8e925...`) |
| `SQ-RUN-003` | `RUN` | P2 | Closed | `mcp/planner.mjs:36,65-88` (`76a8e925...`) |
| `SQ-RUN-004` | `RUN` | P2 | Closed | `mcp/handoffs.mjs:176-197` (`76a8e925...`) |
| `SQ-RUN-005` | `RUN` | P2 | Closed | `mcp/handoffs.mjs:116` (`76a8e925...`) |
| `SQ-RUN-006` | `RUN` | P2 | Closed | `mcp/handoffs.mjs:74-84` (`76a8e925...`) |
| `SQ-RUN-007` | `RUN` | P2 | Closed | `mcp/planner.mjs:569-576,638` (`76a8e925...`) |
| `SQ-SCRIPT-001` | `SCRIPT` | P2 | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:1187-1212` (`76a8e925...`) |
| `SQ-SCRIPT-002` | `SCRIPT` | P2 | Closed | `bin/agy-squad.mjs:31-32,221-266` (`76a8e925...`) |
| `SQ-TEST-001` | `TEST` | P2 | Closed | `tests/test-lifecycle-installer.mjs:134-165` (`76a8e925...`) |
| `SQ-DEP-001` | `DEP` | P2 | Closed | `scripts/install-register.mjs:8,141,243-256` (`76a8e925...`) |
| `SQ-DEP-002` | `DEP` | P2 | Closed | `scripts/install-register.mjs:114,203,522` (`76a8e925...`) |
| `SQ-DEP-003` | `DEP` | P2 | Closed | `scripts/install-register.mjs:157-180` (`76a8e925...`) |
| `SQ-DEP-004` | `DEP` | P2 | Closed | `scripts/install-register.mjs:259-273,342-353` (`76a8e925...`) |

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ACS-ARCH-002-W2` | Wave 1 -> 2 (`acs_fixes`) | ARCH | Closed (Post-Remediation) | `Agy-Context-Saver/lib/transcript-core.mjs:90-131` | Wave 1 `extractConvId` checked `getBrainDir()` only; failed `--file` in `antigravity-cli/brain` under `self-only`. | Updated `extractConvId` to iterate `getBrainDirs()` + all 3 brain roots cleanly. | `test-hook.mjs:1155-1182`, `test-transcript.mjs:640-667` (`a180af71...`) |
| `ACS-RUN-002-W2` | Wave 1 -> 2 (`acs_fixes`) | RUN | Closed (Post-Remediation) | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:2605-2756,3466-3510,3720-3750` | Wave 1 hook false-blocked restricted-child unmodified repo test runs and `git diff -- scripts/install-register.mjs`. | Fixed verb boundaries, `isRestrictedLifecycleInvocation`, and session write tracking. | Restricted-child specialists ran all 5 suites (`exit 0`, `a180af71...`) |
| `ACS-RUN-005-W2` | Wave 1 -> 2 (`acs_fixes`) | RUN | Closed (Post-Remediation) | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:3808-3820` | Wave 1 non-trailing positional `current` failed (`read current --json` under `self-only`). | Fixed lookahead regex replacing final positional `current` token cleanly. | `test-hook.mjs:1111-1120` (`a180af71...`) |
| `ACS-RUN-009-W2` | Wave 1 -> 2 (`acs_fixes`) | RUN | Closed (Post-Remediation) | `Agy-Context-Saver/lib/transcript-core.mjs:2015-2075,2115-2121` | Wave 1 `queryTranscript` anchored `lastTurns` on mixed `USER_INPUT`/`PLANNER_RESPONSE` and literal-skipped anchors. | Matched `readTranscript` `USER_INPUT` anchoring + literal prefilter turn-anchor bypass. | `test-transcript.mjs:595-614` (`a180af71...`) |
| `ACS-DOC-002-W2` | Wave 1 -> 2 (`acs_fixes`) | DOC | Closed (Post-Remediation) | `Agy-Context-Saver/docs/publishing.md:15,32,65-69` | Wave 1 `docs/publishing.md` omitted `"docs"` from `"files"` and cited manual `npm pack --dry-run`. | Added `"docs"` and `npm run verify:package` (`33` files); removed false `docs/` exclusion. | `zensical build` & source inspection (`a180af71...`) |
| `ACS-SKILL-001-W2` | Wave 1 -> 2 (`acs_fixes`) | SKILL | Closed (Post-Remediation) | `Agy-Context-Saver/skills/context-governance/SKILL.md:15,34,71` | Wave 1 `SKILL.md` lagged `rules/AGENTS.md` on version, `swarm_view/`, and 3 brain roots. | Synced `SKILL.md` to `v2.0.1`, `swarm_view/` Safe harbor, and all 3 brain roots. | `agy plugin validate` (`a180af71...`) |
| `ACS-ARCH-001-P3-1` | Wave 1 -> 2 (`acs_fixes`) | ARCH | Closed (Post-Remediation) | `Agy-Context-Saver/lib/transcript-core.mjs:376,462-463` | Wave 1 fallback claimed another caller's grant if `GEMINI_CONVERSATION_ID` was unset concurrently. | Guarded unset `envConvId` fallback with `records.length === 1`. | `test-transcript.mjs:669-695` (`a180af71...`) |
| `ACS-RUN-007-P3-1` | Wave 1 -> 2 (`acs_fixes`) | RUN | Closed (Post-Remediation) | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:4142-4159` | Wave 1 `isSwarmPollSchedule` lacked the 5-denial `force_ask` circuit breaker. | Added `session.denials >= 5` `force_ask` breaker + regression assertions. | `test-hook.mjs:1184-1195` (`a180af71...`) |
| `SQ-ARCH-002-W2` | Wave 1 -> 2 (`sq_fixes`) | ARCH | Closed (Post-Remediation) | `docs/plans/native-enforcement-ledger.md:36,45,55,130`, `docs/roles-and-workflows.md:87-90` | Wave 1 ledger/roles docs conflicted on Spike S5 verification status and IDE vs `agy` CLI scope. | Recorded `Observed (host CLI agy 1.5.9)` and reconciled `roles-and-workflows.md`. | Bounded read + zero broken anchors (`76a8e925...`) |
| `SQ-DOC-001-W2` | Wave 1 -> 2 (`sq_fixes`) | DOC | Closed (Post-Remediation) | `docs/tools.md:15,98-122`, `docs/getting-started.md:19` | Wave 1 docs referenced removed `plugin.json` keys, global MCP registration, and omitted opt-in bundle flags. | Documented plugin `mcp_config.json` auto-discovery and `--allow-non-passing`/`--allow-partial`. | `diagnose.mjs --markdown` 0 `DOC` findings (`76a8e925...`) |
| `SQ-MCP-001-W2` | Wave 1 -> 2 (`sq_fixes`) | MCP | Closed (Post-Remediation) | `mcp/index.js:5,75-87`, `mcp/dispatch.mjs:339` | Wave 1 `mcp/index.js` used stale `defaultCandidates` on omitted `manifestPath` multi-root resolution. | Shared `defaultManifests` and rejected `matching.length > 1` multi-root ambiguity. | `tests/test-server.mjs:490-546` (`76a8e925...`) |
| `SQ-RUN-007-W2` | Wave 1 -> 2 (`sq_fixes`) | RUN | Closed (Post-Remediation) | `mcp/planner.mjs:569-576,638` | Wave 1 `planSquadCohort` omitted `warnings` argument to `resolveIntegrityAuditor`. | Passed `auditWarnings` and deduplicated `warnings` in `planner.mjs`. | `tests/test-planner.mjs:669-684` (`76a8e925...`) |
| `SQ-DEP-004-W2` | Wave 1 -> 2 (`sq_fixes`) | DEP | Closed (Post-Remediation) | `scripts/install-register.mjs:259-273` | Wave 1 `formatWindowsCmdShim` evaluated `%errorlevel%` inside parenthesized `if (...)` block. | Switched to `if errorlevel 1 goto :fallback` outside any parenthesized block. | `test-lifecycle-installer.mjs:144-165` (`76a8e925...`) |
| `SQ-TEST-001-W2` | Wave 1 -> 2 (`sq_fixes`) | TEST | Closed (Post-Remediation) | `tests/test-lifecycle-installer.mjs:134-165` | Added structural `.cmd` negative guard, `agy-squad_*` dir detection, and `win32` `cmd.exe` exit-code check. | Linux structural/installer assertions green; native `cmd.exe` executes on `windows-latest` CI. | `test-lifecycle-installer.mjs` exit `0` (`76a8e925...`) |
| `SQ-TEST-001-CI-WIN` | PR #6 CI (`coordinator`) | TEST | Closed (Post-Remediation) | `tests/test-handoffs.mjs:480-496` | Initial `windows-latest` CI run (`43833926418`) failed `SVC-004` partial-prune test (`fs.chmodSync(dir, 0o555)` does not block unlink on NTFS). | Used `chmodSync(spec2FullPath, 0o444)` (`EPERM`) on `win32` and `chmodSync(spec2Dir, 0o555)` (`EACCES`) on POSIX with `0o666`/`0o755` restore in `finally`. | `test-handoffs.mjs` exit `0`; re-pushed for `windows-latest` CI |
| `SQ-ARCH-001-P3-1` | Wave 1 -> 2 (`sq_fixes`) | ARCH | Closed (Post-Remediation) | `mcp/handoffs.mjs:431,488-506,564` | Digest/bundle did not reject pre-existing loose files at `NO_REPORT` slots before `verifyBundle`. | Added `{ rejectLooseOnNoReport: true }` inside `computeEvidenceDigest` and `bundleReports`. | `tests/test-handoffs.mjs:576-586` (`76a8e925...`) |
| `SQ-SKILL-001-P3-1` | Wave 1 -> 2 (`sq_fixes`) | SKILL | Closed (Post-Remediation) | `.agents/skills/full-review/SKILL.md:53` | Referenced `open_board` with deprecated `(?tab=graph)` suffix. | Removed `(?tab=graph)` query string from `SKILL.md:53`. | `diagnose.mjs --markdown` exit `0` (`76a8e925...`) |
| `SQ-DEP-001-P3-1` | Wave 1 -> 2 (`sq_fixes`) | DEP | Closed (Post-Remediation) | `scripts/install-register.mjs:8,141` | Header docstring cited global `mcp_config.json`; `detectExistingInstallation` skipped `agy-squad_*` schema caches. | Updated header comment and added `entry.startsWith("agy-squad_")` check. | `test-lifecycle-installer.mjs:134-142` (`76a8e925...`) |
| `ACS-RUN-002-P3-1` | Wave 2 (`coordinator`) | RUN | Deferred / Won't Fix | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:2715-2745` | Passing a `/scratch/*.md` or `.sources.json` report that cites `.system_generated` as a trailing arg to `node bin/agy-squad.mjs verdict ...` trips `collectInspectableTexts` (`isTmpOrScratchFile` on `CODE_INTERPRETERS` trailing non-script data args). | Invoke `agy-squad` CLI shim directly now; restrict trailing non-script data-arg scanning when an executable `.mjs`/`.py` entrypoint already preceded it in next P3 pass. | Observed live during `verdict` runs (`a180af71...`) |
| `ACS-RUN-010-P3-1` | Wave 1 (`acs_fixes`) | RUN | Deferred / Won't Fix | `Agy-Context-Saver/lib/transcript-core.mjs:2004` | `read`/`query`/`outline` `--limit <= 0` falls back to `defaultMaxResults` rather than throwing like `list --limit`. | Non-blocking fallback; tighten in a minor follow-up if strict parity wanted. | Source verified (`a180af71...`) |
| `ACS-SVC-001-P3-1` | Wave 1 (`acs_fixes`) | SVC | Deferred / Won't Fix | `Agy-Context-Saver/scripts/execution-guard-hook.mjs:604-688`, `Agy-Context-Saver/scripts/install-register.mjs:861` | `env-cache.json` TTL/mtime invalidation lacks a dedicated unit test; direct `install-register.mjs --status` exits `0`. | Non-blocking; add unit test and parity exit code if direct script status is automated. | Live `agy-context status` exit `0` (`a180af71...`) |
| `ACS-DOC-001-P3-1` | Wave 2 (`acs_fixes`) | DOC | Deferred / Won't Fix | `Agy-Context-Saver/docs/tools.md:191`, `Agy-Context-Saver/docs/index.md:3,20` | Minor sample wording gloss (`OPEN (default - all sessions permitted)`), `v2.0.0` intro label, sibling Safe Harbor prose. | Cosmetic prose cleanup for next docs pass. | `zensical build` exit `0` (`a180af71...`) |
| `ACS-SCRIPT-001-P3-1` | Wave 1 (`acs_fixes`) | SCRIPT | Closed (By Design) | `Agy-Context-Saver/scripts/provision-rtk.mjs:238` | `!GIT_CONFIG_GLOBAL` guard honors an explicitly exported caller `GIT_CONFIG_GLOBAL`. | Intentional override precedence; host `~/.gitconfig` stays untouched cleanly. | `~/.gitconfig` `mtime` invariant `1794817674` (`a180af71...`) |
| `ACS-SCRIPT-002-P3-1` | Wave 1 (`acs_fixes`) | SCRIPT | Deferred / Won't Fix | `Agy-Context-Saver/install.ps1:74,78` | Windows runtime unverified on Linux (`pwsh` absent); `-Encoding ASCII` assumes ASCII profile paths. | Covered by `ci-matrix.yml` `windows-latest` PR run; consider UTF-8 without BOM later. | Static verified (`a180af71...`) |
| `ACS-DEP-001-P3-1` | Wave 1 (`acs_fixes`) | DEP | Closed (By Design) | `Agy-Context-Saver/package.json:46` | Wholesale `"docs"` entry includes `docs/plans/LEDGER.md` in 33-file npm tarball. | Accepted packaging boundary per `docs/publishing.md` sync. | `npm run verify:package` (`33 files`, `a180af71...`) |
| `SQ-ARCH-001-P3-2` | Wave 1/2 (`sq_fixes`) | ARCH | Deferred / Won't Fix | `mcp/handoffs.mjs:368-380` | `canonicalSnapshotDigest` hashes `[path, sha256]` without binding `report.status` (`READY` vs `PARTIAL`). | Non-blocking for schema v2 (`report.status` recorded per entry in bundle JSON); consider for v3. | Source verified (`76a8e925...`) |
| `SQ-DOC-001-P3-1` | Wave 2 (`sq_fixes`) | DOC | Deferred / Won't Fix | `docs/tools.md:121` | Minor capitalization typo `Allow Archiving/digesting` in `--allow-non-passing` description. | Cosmetic prose cleanup only. | Source verified (`76a8e925...`) |
| `SQ-RUN-001-P3-1` | Wave 1/2 (`sq_fixes`) | RUN | Deferred / Won't Fix | `mcp/handoffs.mjs:259-265` | Direct exported `publish(..., false, ..., expectedPredecessorSha256)` throws `EEXIST` when `replace=false`. | `bundleReports` passes `allowReplace = true`; non-blocking for CLI/MCP callers. | Source verified (`76a8e925...`) |
| `SQ-SCRIPT-001-P3-1` | Wave 1/2 (`sq_fixes`) | SCRIPT | Deferred / Won't Fix | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:878-900` | `findSkillDriftMatches` applies Markdown heuristics to `.mjs` files and skips `docs/plans/*.md`. | Low risk (`rg` verified 0 active drift); refine file-type filter in next maintenance pass. | Source verified (`76a8e925...`) |
| `SQ-TEST-001-P3-1` | Wave 2 (`sq_fixes`) | TEST | Deferred / Won't Fix | `tests/test-handoffs.mjs:531-620` | `pruneReports` on a `PARTIAL` + `NO_REPORT` bundle lacks an explicit assertion; `cmd.exe` awaits `windows-latest`. | Non-blocking (`NO_REPORT` loose-file check & `BLOCKED` verified; Windows CI pending). | Source verified (`76a8e925...`) |
| `SQ-DEP-003-P3-1` | Wave 1/2 (`sq_fixes`) | DEP | Deferred / Won't Fix | `scripts/install-register.mjs:180` | `detectExistingInstallation` treats malformed `config.json` as `DISABLED` while mutating commands fail closed. | Safe fail-closed mutation path preserved; non-blocking. | Source verified (`76a8e925...`) |
| `SQ-DEP-PLUGIN-LOGO` | Wave 1/2 (`sq_fixes`) | DEP | Informational | `plugin.json` (`agy plugin validate`) | `agy plugin validate` emits advisory `no logo` notice. | Non-blocking UI cosmetic advisory. | `agy plugin validate` exit `0` (`76a8e925...`) |

---

## 9. `/self-diagnosis` Cohort & Bundle Ledger

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| Wave 1 -> 2 (`acs_fixes`) | `9ae89941-d468-4ca2-be5f-611746cca490` | Layered `/swarm` (`acs_fixes`) + Flat `audit-acs-fixes` | `b33347e9-9a8a-46c1-ae7e-12438c651e7a`, `2dc33319-d156-4e72-af6b-a8e3876ed4cc`, `c37ae3e6-2840-45c6-989a-20ff02e135e4`, `795c2a58-73d4-48c2-9d38-039c1bc09b9a` | — (`Wave 1 FAIL -> Wave 2 PASS`) | `a180af71c4d3f8b8db8530f74935339a2ad43c762753ca1b3bdbe33aafbcc8ff` | Verified, `prune --keep-reports`, all swarm workers killed, scratch removed pre-PR push |
| Wave 1 -> 2 (`sq_fixes`) | `9ae89941-d468-4ca2-be5f-611746cca490` | Layered `/swarm` (`sq_fixes`) + Flat `audit-sq-fixes` | `84fdaa04-fcc2-46a4-be91-271888c80e36`, `944329de-68e0-43c2-9948-7a6a13f85ca8`, `3c77b36a-cf33-4a3d-af80-7f6d40056645`, `74d2bb8c-fcbf-4783-b244-36ef4ce2c176` | — (`Wave 1 FAIL -> Wave 2 PASS`) | `76a8e9253589007b14f35c5f05c62a4cddc66be666e8507658f599cc57ad8568` | Verified, `prune --keep-reports`, all swarm workers killed, scratch removed pre-PR push |

None (0 wave findings)
