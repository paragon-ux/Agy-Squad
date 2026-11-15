# Reconciled PR #5 Review: Agy-Squad (`198356a` + Post-Remediation)

Content Verdict: PASS

> Unified, non-fixture source and contract reconciliation of PR #5 (`paragon-ux/Agy-Squad#5`, `1fde6054..198356a1` + working-tree Stage 2–3 remediation) integrating `Devin` (`Devin-Review-Bugs-and-Flags.md`), `Sol` (`Sol-Full-Review-PR-5.md`), prior PR #5 ledgers, and direct verification against shipped repository files and CLI commands. Preserves the pre-remediation `198356a` FAIL baseline in Session 11 and records Stage 2–3 closure (`pr5_cycle1` + `pr5_cycle2`) while keeping the Phase 2 native `/swarm` pivot and PTY launcher retirement (`L17`, `L42`, `L43`).

---

## 1. Review Metadata, Session Provenance, and Evidence Limits

| Field | Value |
| --- | --- |
| Repository & PR | paragon-ux/Agy-Squad [#5](https://github.com/paragon-ux/Agy-Squad/pull/5) (`feat/phase2-swarm-planner` to `main`) |
| Governing Standard | Agy-Squad PR Review Standard v1.4.0 ([pr-review-standard.md](https://github.com/paragon-ux/Agy-Squad/blob/198356a1bc23538497b371120cfc9c0e0595c802/.agents/skills/pr-review/references/pr-review-standard.md)) |
| Base Branch / SHA | `main` at `1fde6054af13b47680fcced40974fa5abb97d9d8` (`1fde605`) |
| Reviewed Head SHA | `feat/phase2-swarm-planner` at `198356a1bc23538497b371120cfc9c0e0595c802` (`198356a`; 9 commits, 57 files changed, +5,474/-2,410) + Stage 2–3 working-tree remediation |
| CI Revision Status | GitHub Actions CI run `43530890418` (`Node 22 / ubuntu-latest` and `Node 24 / ubuntu-latest`: SUCCESS on merge commit `125e46f`); Documentation run `43530890407` (`build`: SUCCESS, `deploy`: SKIPPED) |
| Date / Reviewer | 2026-11-14 / Reconciliation Review + Stage 2–3 Remediation & Native `/swarm` Reverification |
| Reconciled Verdict | Pre-remediation `198356a`: Request changes (`Content Verdict: FAIL`, 4 P1 + 31 P2 + 25 P3 open). Post-remediation working tree: **Approve (`Content Verdict: PASS`)** — 0 open P0/P1/P2 findings (`RES-DIR-04` and `S1-SVC-01` also closed; 3 external/host boundaries retained as `Residual (Open)` in Section 8). |

### Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| 1–4 (Prior PR #5) | `23e2d977-d17c-4355-bf0d-02c35eeffaa6` / `69506793-2b07-43f0-ae50-6e7aa009232d` | none | 2026-11-13 | `1fde605..44e6df4` | `pr-review` v1.3.0 (recorded in [pr5-phase2-swarm-planner-review.md](pr5-phase2-swarm-planner-review.md) and [pr5-independent-review.md](pr5-independent-review.md)) |
| 5–8 (Prior PR #5) | `72686908-b468-479a-ad86-db9b9cacf078` | 4 | 2026-11-13 | `44e6df4` + 47-file delta -> committed as `198356a` | `pr-review`, `self-diagnosis`, `full-review`, `swarm-governance` (recorded in [pr5-layered-swarm-review.md](pr5-layered-swarm-review.md) and [pr5-full-review-direction.md](pr5-full-review-direction.md)) |
| 9 (`Sol`) | `01a1d80c-2177-7913-a18a-72d6354dd010` | none | 2026-11-13 | `1fde605..198356a` (clean head archive) | `full-review` single-reviewer audit (Windows / Ubuntu CI logs + CLI/MCP subprocess probes) |
| 10 (`Devin`) | External static PR review | none | 2026-11-13 | `1fde605..198356a` (`Devin-Review-Bugs-and-Flags.md`) | Automated bug & flag diff review (3 bugs, 2 flags) |
| 11 (Reconciliation) | `72686908-b468-479a-ad86-db9b9cacf078` | 8 | 2026-11-14 | `1fde605..198356a` + [pr5-reconciled-review.md](pr5-reconciled-review.md) (no fixture suites relied upon) | Non-fixture direct source & contract reconciliation of `Devin` + `Sol` |
| 12 (Remediation + Cycles 1–2) | `72686908-b468-479a-ad86-db9b9cacf078` | 11 | 2026-11-14 | `198356a` + Stage 2 code/doc/skill/test fixes + native `/swarm` `pr5_cycle1` & `pr5_cycle2` | Native `/swarm` flat reverification (`pr5_cycle1` findings fixed; `pr5_cycle2` PASS + `audit-pr5-cycle2` CLEAN) |

### Evidence Available & Limits

- **Directly inspected at `198356a`:** Full source of `mcp/index.js`, `mcp/briefs.mjs`, `mcp/dispatch.mjs`, `mcp/handoffs.mjs`, `mcp/planner.mjs`, `mcp/verdicts.mjs`, `bin/agy-squad.mjs`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs`, `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json`, `.agents/skills/pr-review/SKILL.md`, `.agents/skills/pr-review/references/pr-review-standard.md`, `.agents/skills/swarm-governance/SKILL.md`, `package.json`, `.github/workflows/docs.yml`, `README.md`, `docs/core-workflows.md`, `docs/tools.md`, `docs/concepts.md`, `docs/index.md`, `docs/roles-and-workflows.md`, `docs/plans/native-enforcement-ledger.md`, `docs/assets/architecture-overview.svg`, `tests/verify-package.mjs`, `tests/test-server.mjs`, `tests/test-comparative-dossier.mjs`, and prior `docs/reviews/pr5-*.md` ledgers.
- **Directly executed without synthetic fixtures:** Live `gh pr view 5` metadata and CI rollup, `git diff --shortstat 1fde605..198356a` (57 files), `sha256sum docs/reviews/pr5-layered-swarm-review.md` (`1b4bd451bc39b83bdfcf7ac92b95726d373f31c1c1ef264bb41c668ea751413f`), `node bin/agy-squad.mjs plan` and `diagnose.mjs --print-plan --topology flat` against the real shipped `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json`, and `node bin/agy-squad.mjs plan --mode subagent --model flash --report-root custom/review`. In addition, Sol's Linux Docker reverification (`Node 24.22.3`, `npm 11.19.1`, clean `198356a` Git archive + 53-file packed tarball) independently reproduced `SVC-001`–`SVC-004`, `SVC-009`, `RUN-014`, `RUN-007`–`RUN-008`, `SCRIPT-002`, `DEP-001` (`diagnose.mjs` exiting `1` from the packed tarball due to six missing `tests/*.mjs` files), and turned `MCP-004` into an observed Linux stdio truncation failure (`529,906` bytes valid JSON when waiting vs `182,720` bytes invalid JSON with exit `0` when closing stdin immediately).
- **Evidence limits:** Live Desktop IDE / Antigravity host hook propagation, live `/swarm` worker MCP non-attachment, model readback across native workers, and `S1`–`S8` host enforcement spikes (`docs/plans/native-enforcement-ledger.md`) remain unverified at `198356a` on the host runtime; Windows symlink behavior falls outside the declared Linux/WSL2 support boundary.

---

## 2. Architecture-Before-Runtime Trace & Devin/Sol Reconciliation

### Architecture-Before-Runtime Trace

- **Design thesis (`L17`, `L41`–`L43`):** Native Antigravity owns agent launch, `/swarm` board supervision, worktree isolation, and worker stopping; `Agy-Squad` owns offline stage compilation (`squad_planner`, `dispatch_squad`), Pointer-Over-Wire receipt validation, strict two-plane verdicts (`Content Verdict` separate from `Integrity Verdict`), SHA-256 evidence bundling/pruning, and ledger-gated `/self-diagnosis` teardown.
- **Where `198356a` diverges from thesis:** Offline compilation works on happy-path camelCase single-auditor manifests, and the shipped fixture tests pass in CI (`43530890418`), creating false green confidence. Reading the shipped code and running real manifests (`self-diagnosis-manifest.json`) without fixtures exposes breaking mismatches between what `planner.mjs` / `diagnose.mjs` emits and what `handoffs.mjs` / `dispatch.mjs` / `teardownSelfDiagnosisDirs()` / `docs/` enforce.

### Cross-Report Reconciliation Matrix (`Devin` <-> `Sol` <-> `198356a`)

| Source Report Item | Canonical Reconciled ID(s) | Priority & Source Verification at `198356a` | Reconciliation Notes |
| --- | --- | --- | --- |
| `Devin Bug 1` (`diagnose.mjs:500-515, 530-560`: unexported audit findings lost on teardown) | `SVC-009` | P2 Open (Verified in source) | Exact duplicate of `Sol SVC-009`: `cohortMarkdowns` reads synthesis and specialist reports only, while `auditAbsDir` is queued in `validatedDirs` and deleted (`handoffs.mjs:408-413` preserves hash only). |
| `Devin Bug 2` (`mcp/briefs.mjs:130-145`, `mcp/dispatch.mjs:180-211`: `subagent` delegation loses planner overrides) | `RUN-014` | P2 Open (Verified on shipped manifest) | Unique to `Devin` (missed by `Sol`). Running `agy-squad plan --mode subagent --model flash --report-root custom/review` on `self-diagnosis-manifest.json` sets specialist `Model: "flash"` and `custom/review/...` slots while `lead.Subagent.Prompt` tells the lead to call `dispatch_squad({squadId, manifestPath})`, dropping both overrides. |
| `Devin Bug 3` (`mcp/planner.mjs:359-370, 399-409, 513-534`, `mcp/briefs.mjs:69-81`: PascalCase aliases rejected) | `RUN-007`, `RUN-008` | P2 Open, P2 Open (Verified in source) | `Devin` grouped two independently triggering paths into one bug; `Sol` split them cleanly per `1 ID = 1 Row`: `RUN-007` (`Model` collides with post-spread `model` on overrides/coercion) and `RUN-008` (custom auditor `Instructions` collides with post-spread `instructions`, and line 527 omits `rawAudit.Instructions`). |
| `Devin Flag 1` (`diagnose.mjs:570`: flat audit leaves teardown incomplete) | `SVC-002` | P1 Open (Verified on shipped CLI) | `Sol` caught the full destructive blast radius that `Devin` only flagged: running `diagnose.mjs --print-plan --topology flat` emits unscoped `squad-integrity_auditor`; `teardownSelfDiagnosisDirs()` deletes `squad-self_diagnosis` and its verified bundle at lines 558–562 before throwing on `squad-integrity_auditor` at lines 570–575. Elevated to P1 `SVC-002`. |
| `Devin Flag 2` (`mcp/planner.mjs:391`: `readOnly: true` absent from compiled brief) | `DOC-013` | P3 Open (Verified on shipped CLI) | Unique to `Devin` (missed by `Sol`). Confirmed `stripPlannerFields` strips `readOnly`/`ReadOnly` so no notice enters `swarmAdd.brief`; `README.md:22` and `docs/tools.md:23` define `readOnly` as overlap-check metadata only. Tracked as P3 doc/brief contract clarification (`DOC-013`), distinct from `ARCH-002` (writable leads) and `S1-SVC-01` (`readOnly: null`). |
| `Sol` additional findings (`SVC-001`, `SVC-003`, `SVC-004`, plus P2/P3 contract gaps) | `SVC-001`, `SVC-003`, `SVC-004`, `ARCH-001..003`, `DOC-001..012`, `SKILL-001..003`, `MCP-001..007`, `RUN-001..006`, `RUN-009..013`, `SVC-005..008`, `SCRIPT-001..006`, `RES-DIR-04`, `S1-SVC-01`, `TEST-001..003`, `DEP-001..002` | P1 (`3`), P2 (`28`), P3 (`25`) Verified in source | All sampled lines and contract mechanics verified directly against `198356a` source files without synthetic fixtures (for example, `mcp/index.js:178-199` confirms `MCP-003` `\r\n` split-chunk ceiling counting, and `mcp/planner.mjs:387` confirms `??` treats `readOnly: null` as `undefined`). |

---

## 3. Ten-Category Inventory and Verdicts

| Category | Scope (`57` PR #5 files + post-remediation working tree) | Coverage | P1 | P2 | P3 | Verification & Verdict |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `ARCH` | `docs/plans/LEDGER.md`, `wsl-cli-verification.md`, `native-enforcement-ledger.md`, topology and scope model | Partial | 0 | 3 | 0 | All 3 P2s closed in Stage 2 + Cycle 1; `PR5-ARCH-05` host boundary retained in Section 8. **No open blockers.** |
| `DOC` | `README.md`, `benchmarks/teamwork-vs-squad/README.md`, `docs/*.md`, 5 `docs/assets/*.svg`, comparative docs, 4 `docs/reviews/pr5-*.md` | Complete | 0 | 4 | 9 | All 4 P2s + 9 P3s closed (`DOC-002..004` finished post-Cycle-1; Zensical link fixed). **No open blockers.** |
| `SKILL` | `.agents/skills/{full-review,pr-review,self-diagnosis,swarm-governance}` specs, references, rubric, manifests | Partial | 0 | 2 | 1 | All 2 P2s + 1 P3 closed (including `zensical.toml` `v1.4.0`); live host worker MCP attachment tracked in Section 8 (`FR-EVID-SVC-01`). **No open blockers.** |
| `MCP` | `mcp/index.js` | Complete | 0 | 4 | 3 | All 4 P2s + 3 P3s closed and verified over live Linux POSIX pipes (`MCP-001..007`, >500 KB early-EOF drain). **No open blockers.** |
| `RUN` | `mcp/briefs.mjs`, `mcp/dispatch.mjs`, `mcp/planner.mjs`, `mcp/verdicts.mjs` | Complete | 0 | 11 | 4 | All 11 P2s + 4 P3s + `S1-SVC-01` closed and reverified in Cycle 1 (`tests/test-planner.mjs`, `tests/test-dispatch.mjs`, `tests/test-verdicts-and-pivot.mjs`). **No open blockers.** |
| `SVC` | `mcp/handoffs.mjs`, deleted `mcp/run-state.mjs`, self-diagnosis teardown lifecycle | Complete | 4 | 4 | 1 | All 4 P1s (`SVC-001`–`SVC-004`) + 4 P2s + 1 P3 closed and verified via live CLI `bundle`/`verify`/`prune` & `--teardown all`. **No open blockers.** |
| `DB` | None (filesystem JSON/Markdown persistence covered under `SVC` and `RUN`) | Complete | 0 | 0 | 0 | Inventory verified zero DB/SQL files. **Not applicable.** |
| `SCRIPT` | `bin/agy-squad.mjs`, deleted `bin/terminal.py`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Complete | 0 | 3 | 4 | All 3 P2s + 4 P3s + `RES-DIR-04` closed; `PR5-SCRIPT-02` tracked in Section 8. **No open blockers.** |
| `TEST` | `.github/workflows/ci.yml`, `tests/test-*.mjs`, `tests/verify-package.mjs` | Complete | 0 | 0 | 3 | All 3 P3s closed (`test-comparative-dossier.mjs`, `verify-package.mjs`, `test-server.mjs`, `test-run.mjs`). **No open blockers.** |
| `DEP` | `package.json`, `.github/workflows/docs.yml`, `zensical.toml` | Complete | 0 | 1 | 1 | `DEP-001` + `DEP-002` closed and verified via offline `npm pack` + `diagnose.mjs`. **No open blockers.** |

*(Counts reflect original `198356a` findings now resolved post-remediation.)*

---

## 4. Root-Cause Themes & Remediation Order

1. **Cohort Evidence & Audit Policy Cohesion (`SVC-001`, `SVC-003`, `SVC-005`, `SVC-008`, `RUN-014`):** `planner.mjs` emits multi-auditor plans, `subagent` lead delegation ignores planner overrides, and `handoffs.mjs` omits required-audit policy and reviewed-evidence generation from `report.sources.json`.
2. **Atomic Teardown & Verification/Unlink Binding (`SVC-002`, `SVC-004`, `SVC-006`, `SVC-009`):** `diagnose.mjs` and `pruneReports` validate paths piecemeal or exclude companion audit files before deleting working artifacts.
3. **Single Canonical Input & Casing Boundary (`ARCH-001`, `ARCH-002`, `RUN-001`–`RUN-013`, `S1-SVC-01`, `MCP-001`–`MCP-005`):** Squad IDs, `reportRoot`, PascalCase fields (`Model`, `Instructions`, `readOnly`), `scopeFiles`, JSON-RPC IDs, and UTF-8/BOM handling use divergent rules across modules.
4. **Docs, Standard Versioning, Ledger Gate, and Packaging Parity (`DOC-001`–`DOC-013`, `SKILL-001`–`SKILL-003`, `SCRIPT-001`–`SCRIPT-006`, `TEST-001`–`TEST-003`, `DEP-001`–`DEP-002`):** Close stale docs/digests/contradictory Section 6 vs Section 8 ledger statuses, bump the review standard version, fail `diagnose.mjs` on open blockers/contradictions, and align packed `files` with `self-diagnosis-manifest.json`.

---

## 5. Master Reconciled Findings (`1 ID = 1 Row / Record`)

### 5.1 P0

None identified within reviewed scope.

### 5.2 P1

#### `SVC-001` — Planned multiple integrity auditors: secondary `INTEGRITY VIOLATION` ignored | P1 | Closed
- **Contract provenance:** `L42` and `review-roles.md` make any `INTEGRITY VIOLATION` a hard acceptance block.
- **Source evidence:** `mcp/dispatch.mjs:83-89`, `mcp/planner.mjs:510-557`, `mcp/handoffs.mjs:396-414`.
- **Trigger:** Manifest `integrity_auditor` squad defines 2 or more specialists/children; specialist 1 writes `CLEAN` and specialist 2 writes `INTEGRITY VIOLATION`.
- **Expected vs. actual:** `bundleReports` should block acceptance or planner should forbid multi-auditor configurations. Planner emits all auditor slots (`specialist-1`, `specialist-2`), whereas `bundleReports` inspects only the first candidate (`specialist-1` or `lead`) and ignores the violation.
- **Impact:** Accepted proof bundles can ship cleanly despite an explicit integrity violation from a planned auditor.
- **Remediation:** Either verify every emitted auditor slot in `bundleReports` and `verifyBundle` (blocking on any non-CLEAN verdict) or reject `> 1` specialist under `integrity_auditor` at dispatch/plan time.
- **Acceptance evidence:** Plan/bundle/verify check demonstrating two auditors in either verdict order block on one `INTEGRITY VIOLATION`, or early validation error on multi-auditor manifests.
- **Root cause & related IDs:** Audit cardinality disagreement between planner (`dispatch.mjs`/`planner.mjs`) and bundler (`handoffs.mjs`).
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SVC-002` (Devin Flag 1) — Flat `/self-diagnosis` teardown deletes working evidence before rejecting unscoped auditor | P1 | Closed
- **Contract provenance:** `L41` and Scope 3 teardown require atomic ledger-gated cleanup of self-diagnosis artifacts.
- **Source evidence:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs:442-578`, `1592-1619`. Verified directly via `diagnose.mjs --print-plan --topology flat`.
- **Trigger:** Run `diagnose.mjs --print-plan --topology flat`, write/bundle/verify reports to the emitted unscoped slot `scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md`, record the digest in a valid ledger, and run `diagnose.mjs --teardown all`.
- **Expected vs. actual:** Both `squad-self_diagnosis` and `squad-integrity_auditor` preflight cleanly and are removed atomically (or both preserved on error). In reality, lines 445–562 push and delete `squad-self_diagnosis` (including its bundle), and lines 564–575 then throw `Refusing to tear down unbundled evidence in scratch/agy-squad/squad-integrity_auditor without bundle verification or --force`.
- **Impact:** Irreversibly destroys the working cohort directory and verified bundle needed to retry cleanup cleanly.
- **Remediation:** Validate every directory targeted for deletion (including unscoped `squad-integrity_auditor` tied to a verified bundle) before executing any `fs.rmSync` call.
- **Acceptance evidence:** Non-destructive preflight failure test preserving all files byte-for-byte, plus flat `--print-plan` -> `bundle` -> `--teardown all` end-to-end exit 0 removing both directories.
- **Root cause & related IDs:** Teardown validates only `integrity_auditor-${id}` inside the working loop while flat mode emits unscoped `integrity_auditor`. Reconciles `Sol SVC-002` + `Devin Flag 1`; related to `SVC-009`, `DOC-002`.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SVC-003` — `verify` drops the `requireIntegrityAudit` policy from `report.sources.json` | P1 | Closed
- **Contract provenance:** `docs/tools.md:73-75` and `L42` require audit verification for audited bundles and explicit `--allow-unaudited` opt-out (`bundleReports` defaults `requireIntegrityAudit = true`).
- **Source evidence:** `mcp/handoffs.mjs:354, 421-435, 480-492`.
- **Trigger:** Remove `integrityAudit` from `report.sources.json` (or present an unaudited bundle) and run unpinned `agy-squad verify <report.sources.json>`.
- **Expected vs. actual:** Verification should fail when a required audit is missing, and explicitly distinguish deliberate `--allow-unaudited` / legacy archives. Instead `verifyBundleInternal` enters the audit check only when `parsed.integrityAudit` is truthy (`pruneReports` still catches tampering only if caller passes pinned `acceptedHash`).
- **Impact:** Standalone `verify` silently reports exit 0 on an audited cohort whose `integrityAudit` block was stripped.
- **Remediation:** Persist schema version and `auditPolicy` (`required` vs `unaudited-explicit`) in `report.sources.json` and enforce it inside `verifyBundleInternal`.
- **Acceptance evidence:** Versioned bundle missing `integrityAudit` under required policy fails `verify`; explicit unaudited and supported legacy bundles report distinct policy status.
- **Root cause & related IDs:** Bundle JSON persists verdict outcome only, not the governing requirement flag.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SVC-004` — `pruneReports` unlinks loose reports by path after closing verified descriptors | P1 | Closed
- **Contract provenance:** `docs/tools.md:93-94` restricts pruning to exact verified reports (`pr5-layered-swarm-review.md:428` deferred `SVC-HANDOFF-NOREPORT-SPACE-AND-PRUNE`; unbundled here).
- **Source evidence:** `mcp/handoffs.mjs:504-545`.
- **Trigger:** Concurrent writer or retry replaces `specialist-N/report.md` after `verifyBundleInternal` closes its descriptor and before `fs.unlinkSync(path.join(root, report))` executes (or a mid-loop `unlinkSync` error occurs).
- **Expected vs. actual:** Only the verified file generation should be removed, with partial progress accurately surfaced on I/O failure. Current `pruneReports` unlinks whatever inode now occupies the path string, potentially deleting a newer unarchived report.
- **Impact:** Loss of replacement report bytes or unreported half-pruned cohort state under concurrent retries.
- **Remediation:** Check file identity (or cohort lock / `dirfd` + `ctime`/size/content match right before atomic removal) and include `removed`/`remaining` state in thrown cleanup errors.
- **Acceptance evidence:** Concurrent-replacement test preserving newer bytes and failing cleanup loudly without data loss.
- **Root cause & related IDs:** Descriptor checks protect reads while deletion uses uncoordinated path-based `unlinkSync`.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

### 5.3 P2

(Also carried under P2: `RES-DIR-04`, now closed in Section 8 `Closed (Post-Remediation)`.)

#### `ARCH-001` — Omitting `topology` forces `requireLead = true` on multi-squad manifests | P2 | Closed
- **Contract provenance:** `docs/tools.md:20-24` and `docs/concepts.md:44-46` promise neutral topology choice and optional leads.
- **Source evidence:** `mcp/planner.mjs:338-344` (`resolveSquadLead(squad, id, topology === "layered" || targetWorkingIds.length > 1)`).
- **Trigger:** Plan a two-squad leadless manifest with `topology` omitted vs `topology: "flat"`.
- **Expected vs. actual:** Neutral compilation or explicit topology-selection prompt; actual throws `Squad Lead requires an objective` when `topology` is omitted while `flat` succeeds.
- **Impact:** Multi-squad flat manifests unexpectedly fail unless `topology: "flat"` is manually supplied.
- **Remediation:** Derive lead presence per squad from manifest unless `topology: "layered"` explicitly mandates leads (or emit an explicit topology choice prompt).
- **Acceptance evidence:** Multi-squad leadless manifest succeeds identically when `topology` is omitted or `flat`, and rejects cleanly when `layered`.
- **Root cause & related IDs:** Squad count (`targetWorkingIds.length > 1`) conflated with layered topology enforcement.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `ARCH-002` — Writable squad leads omitted from `writableScopeEntries` overlap detection | P2 | Closed
- **Contract provenance:** `L43` and `docs/tools.md:23` require writable sibling overlap warnings when sharing a workspace.
- **Source evidence:** `mcp/planner.mjs:351-398, 566-572`.
- **Trigger:** Two working squads in `inherit` mode define overlapping writable `scopeFiles` on their `lead` objects while specialists are disjoint or `readOnly: true`.
- **Expected vs. actual:** Lead overlaps (lead/lead and lead/specialist on shared workspace) should surface in `scopeOverlaps` and `warnings`; actual emits `scopeOverlaps: []`.
- **Impact:** Shared-workspace leads editing the same files receive zero overlap warning.
- **Remediation:** Add non-readOnly leads (`leadReadOnly !== true` under shared workspace copy) to `writableScopeEntries`.
- **Acceptance evidence:** Plan checks covering lead/lead overlap, lead/specialist overlap, and `readOnly: true` lead exemption.
- **Root cause & related IDs:** Overlap tracking populated inside specialist loop only.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `ARCH-003` — Docs project native `StopHook` / `PostToolUse` enforcement by extrapolating SDK APIs onto S5 plan | P2 | Closed
- **Contract provenance:** `L3`/`L5` and `docs/plans/native-enforcement-ledger.md:47-59` distinguish Plane A (SDK) from Plane B (native `hooks.json`).
- **Source evidence:** `docs/roles-and-workflows.md:87-90`, `docs/plans/native-enforcement-ledger.md:81-100`.
- **Trigger:** Read `docs/roles-and-workflows.md:90` claiming SDK `StopHook` + `PostToolCallHook` graduate directly after `Spike S5` verifies `.agents/hooks.json`.
- **Expected vs. actual:** Native hooks and SDK hooks have distinct registration contracts and payload schemas; projecting SDK class names as native `hooks.json` graduation conflates Plane A and Plane B.
- **Impact:** Overstates deterministic native hook closure without native runtime test evidence.
- **Remediation:** Keep native `hooks.json` matcher/schema verification separate from Python SDK `StopHook`/`PostToolCallHook` capabilities in `docs/roles-and-workflows.md`.
- **Acceptance evidence:** Updated docs distinguishing native vs SDK enforcement paths and supervised live checks of all four closure gates before upgrading status.
- **Root cause & related IDs:** SDK API inspection (`V-07`) generalized across the native runtime boundary (`V-08`).
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `DOC-001` — `core-workflows.md` and `concepts.md` advertise `all_specialists` on `dispatch_squad` | P2 | Closed
- **Contract provenance:** Public MCP/CLI contract for `dispatch_squad` vs `diagnose.mjs --print-dispatch`.
- **Source evidence:** `docs/core-workflows.md:24, 31`, `docs/concepts.md:42`, vs `mcp/dispatch.mjs:213-225` and `.agents/skills/self-diagnosis/scripts/diagnose.mjs:1628-1639`.
- **Trigger:** Call `dispatch_squad` or `agy-squad dispatch` with `squadId: "all_specialists"`.
- **Expected vs. actual:** Docs promise `all_specialists` compiles all manifest specialists on `dispatch_squad`; `mcp/dispatch.mjs` throws `Unknown squadId 'all_specialists'`.
- **Impact:** Advertised flat subagent dispatch command fails immediately on real manifests.
- **Remediation:** Either point docs strictly to `diagnose.mjs --print-dispatch all_specialists` (matching `.agents/skills/self-diagnosis/SKILL.md:27`) or support `all_specialists` directly in `mcp/dispatch.mjs`.
- **Acceptance evidence:** Executed CLI check matching every documented `dispatch` invocation.
- **Root cause & related IDs:** `diagnose.mjs`-only convenience mode leaked into general `dispatch_squad` docs.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `DOC-002` — Single-squad audit docs specify `squad-integrity_auditor-<targetSquad>` when planner emits `squad-integrity_auditor` | P2 | Closed
- **Contract provenance:** `squad_planner` and `dispatch_squad` report slot assignment for single-squad manifests.
- **Source evidence:** `docs/tools.md:73-75`, `docs/core-workflows.md:42`, `.agents/skills/swarm-governance/SKILL.md:37`, vs `mcp/planner.mjs:508` and `mcp/dispatch.mjs:61-66`. Verified via `diagnose.mjs --print-plan --topology flat`.
- **Trigger:** Compile a single-squad manifest (`allWorkingIds.length === 1`) and follow docs to read/verdict `scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md`.
- **Expected vs. actual:** Docs match planner output; actual planner writes `scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md`, causing `ENOENT` on the documented path.
- **Impact:** Direct `verdict` commands and `diagnose.mjs` single-squad teardown (`SVC-002`) break.
- **Remediation:** Document `integrityAuditPlan[].reportSlot` canonically (explaining single- vs multi-squad slot naming) or unify both planners on scoped `integrity_auditor-<id>`.
- **Acceptance evidence:** Single- and multi-squad plan outputs match documented slot paths.
- **Root cause & related IDs:** Docs normalized on multi-squad slot convention; related to `SVC-002`.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `DOC-003` — `pr5-full-review-direction.md` Appendix A digest for `pr5-layered-swarm-review.md` is stale at `198356a` | P2 | Closed
- **Contract provenance:** `pr-review-standard.md` Section 1 commit/SHA provenance requirement.
- **Source evidence:** `docs/reviews/pr5-full-review-direction.md:309` (`02d5dc63...`) vs `git show 198356a:docs/reviews/pr5-layered-swarm-review.md | sha256sum` (`1b4bd451bc39b83bdfcf7ac92b95726d373f31c1c1ef264bb41c668ea751413f`).
- **Trigger:** Hash committed `docs/reviews/pr5-layered-swarm-review.md` at `198356a` and compare to `pr5-full-review-direction.md` Appendix A.
- **Expected vs. actual:** Appendix A matches committed bytes (other 12 hashes matched); `pr5-layered-swarm-review.md` was updated later in Stage 3 without refreshing Appendix A.
- **Impact:** Breaks hash-based attestation of `pr5-layered-swarm-review.md` at commit `198356a`.
- **Remediation:** Refresh stale digest or clearly pin which intermediate pre-Stage-3 revision produced `02d5dc63...` alongside current revision status.
- **Acceptance evidence:** Re-verified SHA-256 check across all cited repository artifacts in active review ledgers.
- **Root cause & related IDs:** Stage 3 edits updated `pr5-layered-swarm-review.md` after Stage 2 recorded Appendix A.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `DOC-004` — `pr5-full-review-direction.md` assigns conflicting canonical statuses to identical finding IDs | P2 | Closed
- **Contract provenance:** `pr-review-standard.md` Section 5 single canonical status per ID rule.
- **Source evidence:** `docs/reviews/pr5-full-review-direction.md:223-241` vs `284-294`.
- **Trigger:** Compare Section 6 and Section 8 in `pr5-full-review-direction.md`.
- **Expected vs. actual:** Each ID carries one unambiguous status; `FR-EVID-SVC-01`, `RES-DIR-01`, `RES-DIR-04`, `WT-DOC-03`, and `WT-DEP-01` appear as `Closed` in Section 6 while appearing as `Residual (Open)` or `Deferred / Won't Fix` in Section 8.
- **Impact:** Readers cannot determine the open/deferred set from the consolidated ledger, and `diagnose.mjs` fails to catch cross-section contradictions (`SCRIPT-001`).
- **Remediation:** Assign distinct IDs when closing a documentation sub-task vs tracking an open host residual, and keep each ID's status consistent across sections.
- **Acceptance evidence:** Zero IDs appear with conflicting statuses across any committed PR #5 ledger; verified by `SCRIPT-001` check.
- **Root cause & related IDs:** Overloaded single IDs for doc mitigation and underlying open limitation; masks `SCRIPT-001`.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SKILL-001` — `pr-review-standard.md` modified mandatory verification rules without bumping version `1.3.0` | P2 | Closed
- **Contract provenance:** `.agents/skills/pr-review/references/pr-review-standard.md:3-13` explicitly mandates a version bump and rationale for substantive contract changes.
- **Source evidence:** `git diff 1fde605..198356a -- .agents/skills/pr-review/references/pr-review-standard.md` (lines 80–131).
- **Trigger:** Inspect PR #5 changes to `pr-review-standard.md`: replaces `mcp/run-state.mjs` / `AGY_SQUAD_RUN_DIR` / `terminal.py` checks with `squad_planner`, `modelProvenance`, custom `reportRoot`, `integrityAudit`, and `agy-squad` CLI verification while keeping `Version: 1.3.0`.
- **Expected vs. actual:** Version bumps (e.g., `1.4.0`) with change summary; both base and head stay labeled `1.3.0`.
- **Impact:** Pre-PR-#5 and post-PR-#5 reviews both cite `1.3.0` despite different mandatory checks.
- **Remediation:** Bump standard version cleanly across `pr-review-standard.md`, skills, and `diagnose.mjs` (or record versioned revision rules cleanly).
- **Acceptance evidence:** Version token and change rationale updated uniformly across `pr-review`, `full-review`, `self-diagnosis`, and `diagnose.mjs`.
- **Root cause & related IDs:** Runtime Phase 2 migration updated standard text without incrementing standard version.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SKILL-002` — Integrity auditor briefs allow `/swarm` board chatter without enforcing an empirical trace floor | P2 | Closed
- **Contract provenance:** `review-roles.md:35-43` requires verifying executed tool traces before emitting `CLEAN`.
- **Source evidence:** `mcp/briefs.mjs:35, 126` and `mcp/planner.mjs:520-522`.
- **Trigger:** Spawn `/swarm` `audit-<id>` where workers lack `agy-context-saver` MCP tools (`FR-EVID-SVC-01`) and coordinator provides no trace extract covering a disputed command claim.
- **Expected vs. actual:** Auditor with insufficient execution evidence holds `CLEAN` or records `INTEGRITY VIOLATION` / incomplete coverage; briefs currently present `read_board and swarm{action:"status"}` and "coordinator-supplied transcript summaries" without requiring transcript/file re-execution proof before `CLEAN`.
- **Impact:** Risks rubber-stamping self-reported board summaries as `CLEAN`.
- **Remediation:** Clarify in `mcp/briefs.mjs` and `mcp/planner.mjs` which claims `read_board` verifies (handoffs, roster, model) vs requiring direct re-execution or coordinator transcript index for material command claims before emitting `CLEAN`.
- **Acceptance evidence:** Updated `superviseSwarmIntegrityCohort` and `alignmentLine` wording checked in `briefs.mjs` and `planner.mjs`.
- **Root cause & related IDs:** Worker MCP-absence workaround omitted an explicit evidence floor; relates to `FR-EVID-SVC-01`.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `MCP-001` — JSON-RPC `handleRequest` fails to reject invalid non-string, non-integer `id` values | P2 | Closed
- **Contract provenance:** JSON-RPC 2.0 / MCP 2024-11-05 Messages spec restricts request IDs to `string | number` (non-fractional, non-null) and excludes `boolean` / `object` / `array`.
- **Source evidence:** `mcp/index.js:64-79`.
- **Trigger:** Send `{"jsonrpc":"2.0","id":false,"method":"ping"}` or `id: null` / `id: {}` to `mcp/index.js`.
- **Expected vs. actual:** JSON-RPC `-32600` Invalid Request; `handleRequest` echoes `id: false` with a normal result because it only distinguishes `id === undefined` (notification).
- **Impact:** Non-compliant request IDs pass through to client correlation logic.
- **Remediation:** Reject any defined `id` that is not a string or finite safe integer (`Number.isInteger(id)`), returning `-32600` (`id: null`).
- **Acceptance evidence:** Stdio test asserting valid string/integer IDs, silent notifications (`id === undefined`), and `-32600` for boolean, null, float, and object IDs.
- **Root cause & related IDs:** Notification check conflated with ID-type validation.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `MCP-002` — `squad_planner` accepts `scopeFiles: null` via `?? ["."]` despite `array` schema | P2 | Closed
- **Contract provenance:** `mcp/index.js:48` advertises `scopeFiles` as `{ type: "array", minItems: 1 }`.
- **Source evidence:** `mcp/planner.mjs:158`.
- **Trigger:** Call `squad_planner` with `{ task: "...", scopeFiles: null }`.
- **Expected vs. actual:** Validation error rejecting non-array `null`; actual `scopeFiles ?? ["."]` silently broadens scope to workspace root `"."`.
- **Impact:** Null/malformed input silently expands worker scope across the whole repository.
- **Remediation:** Default `["."]` only when `scopeFiles === undefined`.
- **Acceptance evidence:** Direct planner/stdio checks confirming `undefined` defaults cleanly while `null` and `[]` fail validation.
- **Root cause & related IDs:** Nullish coalescing swallows explicit `null`.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `MCP-003` — Split-chunk `\r\n` frames hit false `-32600` byte-ceiling errors on `MAX_STDIO_PAYLOAD_BYTES` payloads | P2 | Closed
- **Contract provenance:** Stdio MCP transport framing boundary (`mcp/index.js:119-215`).
- **Source evidence:** `mcp/index.js:176-205`.
- **Trigger:** Stream a payload whose JSON length equals `MAX_STDIO_PAYLOAD_BYTES` followed by `\r` in chunk 1 and `\n` in chunk 2.
- **Expected vs. actual:** Complete payload within limit is accepted regardless of TCP/pipe chunk splits; line 178 checks `bufferedBytes + rest.length > MAX_STDIO_PAYLOAD_BYTES` before `\n` arrives, counting `\r` and dropping the frame (`droppingOversized = true`), whereas line 199 subtracts trailing `\r` only when `\n` is in the same chunk.
- **Impact:** Deterministic framing outcome depends on pipe chunk boundaries.
- **Remediation:** Apply uniform `\r`-stripping / line-byte accounting across chunked and single-chunk paths.
- **Acceptance evidence:** Stdio framing checks at limit-1, limit, and limit+1 for `\n`, whole `\r\n`, and chunk-split `\r` | `\n`.
- **Root cause & related IDs:** Divergent byte counting between pending-chunk buffer (line 178) and newline-terminated path (line 199).
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `MCP-004` — `mcp/index.js` calls `process.exit(0)` before asynchronous POSIX stdout writes flush | P2 | Closed
- **Contract provenance:** Node.js POSIX stream I/O contract (writes to pipes may buffer asynchronously when backpressured).
- **Source evidence:** `mcp/index.js:154-167, 217-236`.
- **Trigger:** Send a large `squad_planner` request over POSIX stdio, close stdin immediately while the response is still draining, and exit in `processingChain.finally(() => process.exit(0))`.
- **Expected vs. actual:** Complete JSON-RPC newline-delimited response delivered before process exit; in Linux Docker reverification at `198356a`, waiting for the response yielded `529,906` bytes of valid JSON whereas closing stdin after sending the same request truncated output to `182,720` bytes of invalid JSON and exited `0`.
- **Impact:** Observed Linux truncation of large JSON responses over POSIX stdio pipes with false-zero exit status.
- **Remediation:** Track backpressure / flush stdout (`write` returning `false` -> await `'drain'`, or `stdout.end()` and exit on `'finish'`) before calling `process.exit(0)`.
- **Acceptance evidence:** Slow-reader POSIX stdio subprocess test requiring the complete framed JSON-RPC response before exit `0` after early stdin EOF.
- **Root cause & related IDs:** Request resolution treated as equivalent to stdout flush completion.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification (reproduced on Linux).).

#### `RUN-001` — Planner accepts squad IDs (`backend api`) that `verdicts.mjs` `parseTargetSquad` rejects | P2 | Closed
- **Contract provenance:** Planner, handoff slots, and verdict parser must share one squad-ID domain.
- **Source evidence:** `mcp/dispatch.mjs:41-50`, `mcp/handoffs.mjs:44`, vs `mcp/verdicts.mjs:149`.
- **Trigger:** Manifest defines squad `backend api`; `planner` encodes `squad-backend%20api` and emits `Target Squad: backend api`; `bundle` runs `parseTargetSquad`.
- **Expected vs. actual:** Consistent ID domain end-to-end; `parseTargetSquad` matches `[A-Za-z0-9_.-]+` only and throws `Malformed Target Squad line` during `bundle`.
- **Impact:** Valid-looking planned squads fail at bundling when default integrity audit runs.
- **Remediation:** Enforce a single squad-ID regex across `manifestSquads` and `parseTargetSquad` (or update `parseTargetSquad` to decode/support accepted IDs safely).
- **Acceptance evidence:** Identical allowed/rejected squad-ID set across planner, dispatch, bundle, and `verdict`.
- **Root cause & related IDs:** Uncoordinated validation between URL-encoded paths (`handoffs.mjs`) and identifier regex (`verdicts.mjs`).
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `RUN-002` — `reportRoot` allows control characters (`\n`, `\0`) that corrupt receipts or filesystem paths | P2 | Closed
- **Contract provenance:** `docs/tools.md:20, 66-70` promises valid workspace-relative slots and single-line Pointer-Over-Wire receipts.
- **Source evidence:** `mcp/handoffs.mjs:8-31` (`isValidRelativePrefix`).
- **Trigger:** Pass `reportRoot: "custom\nbad"` or `"custom\u0000bad"` to `squad_planner`.
- **Expected vs. actual:** Rejected at intake alongside `\`, `/`, and `..`; `isValidRelativePrefix` permits ASCII control characters, emitting un-reconcilable multiline receipts or invalid OS paths.
- **Impact:** Accepted plans fail during receipt inspection or filesystem writes.
- **Remediation:** Reject control characters (`[\x00-\x1f\x7f\u2028\u2029]`) in `isValidRelativePrefix` and `reportPath`.
- **Acceptance evidence:** Boundary checks accepting valid relative paths with spaces and rejecting control characters, UNC paths, absolute paths, and traversal.
- **Root cause & related IDs:** Path-prefix validator checks separators and dot segments only.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `RUN-003` — UTF-8 BOM in specialist report passes `bundle` and fails `verify` | P2 | Closed
- **Contract provenance:** Bundled evidence must immediately pass `verify` byte-for-byte.
- **Source evidence:** `mcp/handoffs.mjs:140-152, 417-420, 504-513`.
- **Trigger:** Specialist writes UTF-8 Markdown starting with a `\uFEFF` BOM; run `bundle` then `verify`.
- **Expected vs. actual:** Round-trip verification succeeds (or BOM is explicitly rejected at bundle time); `TextDecoder("utf-8")` strips BOM from `markdown` while `sha256(bytes)` hashes raw bytes WITH BOM, so `verifyBundleInternal` re-encodes `report.markdown` without BOM and fails SHA comparison (`Archived or loose report changed`).
- **Impact:** Valid BOM-prefixed UTF-8 reports produce broken bundles that cannot be verified or pruned.
- **Remediation:** Preserve BOM via `TextDecoder("utf-8", { ignoreBOM: true, fatal: true })` (or reject BOM cleanly at admission before archiving).
- **Acceptance evidence:** Round-trip `bundle` -> `verify` checks for UTF-8 with BOM, without BOM, LF, CRLF, and non-ASCII bytes.
- **Root cause & related IDs:** Mismatched hashing (pre-BOM-strip) vs re-serialization (post-BOM-strip).
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `RUN-004` — Prototype-reserved squad key `__proto__` silently drops its `bundleRecordTemplates` entry | P2 | Closed
- **Contract provenance:** `squad_planner` emits one `bundleRecordTemplates[id]` entry per planned working squad.
- **Source evidence:** `mcp/planner.mjs:333, 492-501`.
- **Trigger:** Manifest defines a squad whose ID is `__proto__` (Linux verification confirmed `__proto__` lost its serialized template entry, while `toString` retained its own entry).
- **Expected vs. actual:** Rejected at manifest validation; plain `{}` property assignment for `__proto__` mutates the object prototype rather than defining an own enumerable property, causing `JSON.stringify` to omit the template entry.
- **Impact:** Planner output silently loses a squad's bundle template when `__proto__` is used and invites prototype-key edge bugs across `Object.prototype` names.
- **Remediation:** Reject `__proto__`, `constructor`, and `prototype` in `manifestSquads` (and use `Object.create(null)` for keyed accumulators).
- **Acceptance evidence:** Checks confirming invalid reserved keys fail early and every planned squad has an own template key.
- **Root cause & related IDs:** Unfiltered `__proto__` / prototype keys stored in plain `{}` dictionary.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification (narrowed to `__proto__`).).

#### `RUN-005` — `reportPath` 500-byte check omits `/swarm` `@mention` prefix and observation headroom | P2 | Closed
- **Contract provenance:** `mcp/briefs.mjs:158` requires `/swarm` workers to prepend `@coordinator` or `@<lead>` within `500` UTF-8 bytes; `mcp/handoffs.mjs:50` enforces `< 500` bytes.
- **Source evidence:** `mcp/handoffs.mjs:50-51` vs `mcp/briefs.mjs:157-159`.
- **Trigger:** Supply a long valid custom `reportRoot` whose `READY ${relative} — ` length is e.g. `493` bytes (`< 500`).
- **Expected vs. actual:** Planner reserves headroom for the `@mention` + non-empty observation so the worker can always send a compliant receipt; `493` bytes leaves 6 bytes, making `@coordinator READY ...` (`> 500` B) impossible to post without failing `reconcileHandoffs`.
- **Impact:** Workers can finish successfully yet be unable to emit a valid Pointer-Over-Wire board post.
- **Remediation:** Account for max `@<24-char-mention> ` prefix (plus minimum observation) inside `reportPath` / planner headroom checks.
- **Acceptance evidence:** Max-length root + long squad ID + `@mention` + observation verified end-to-end under 500 UTF-8 bytes.
- **Root cause & related IDs:** Prefix budget ignores `@mention` prefix required by `/swarm` brief.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `RUN-006` — Working lead with `"Integrity Auditor"` title receives Integrity Auditor verdict policy instead of working synthesis brief | P2 | Closed
- **Contract provenance:** `L42` strictly separates working content authority (`PASS`/`FAIL`/`BLOCKED`) from audit authority (`CLEAN`/`INTEGRITY VIOLATION`).
- **Source evidence:** `mcp/briefs.mjs:118-122, 148-150`.
- **Trigger:** Compile a working squad whose lead (or specialist) `role` matches `/integrity.*auditor/i`.
- **Expected vs. actual:** Working squad role authority comes from stage (`isAuditCohort`), not display text; `briefs.mjs:121` flips `isIntegrityAuditor = true` via regex on `role`, instructing the working lead to emit `Integrity Verdict: CLEAN` instead of `Content Verdict: PASS`, which guarantees `bundleReports` rejects `lead/report.md`.
- **Impact:** Free-form role title silently corrupts protocol role assignment.
- **Remediation:** Pass `isIntegrityAuditor` explicitly from `dispatch.mjs`/`planner.mjs` instead of guessing from `/integrity.*auditor/i` on `role`.
- **Acceptance evidence:** Working lead titled "Integrity Auditor Review" receives working synthesis instructions; explicit custom auditor with custom title receives audit instructions.
- **Root cause & related IDs:** Free-text role substring used as authority discriminator.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `RUN-007` (Devin Bug 3, part 1) — Planner top-level `model` override or `subagent` coercion crashes on PascalCase `Model` manifests | P2 | Closed
- **Contract provenance:** `docs/tools.md:53` guarantees camelCase and PascalCase alias support across agent specs.
- **Source evidence:** `mcp/planner.mjs:366-369, 405-408, 523-528` and `mcp/briefs.mjs:69-81`.
- **Trigger:** Manifest defines PascalCase `Model: "pro"` on a lead, specialist, or custom auditor, and caller passes top-level `model: "flash"` (or `executionMode: "subagent"`, coercing non-alias `Model` to `"inherit"`).
- **Expected vs. actual:** Planner validates original input alias conflicts, then applies resolved `model`; spreading `...raw` keeps `Model: "pro"` alongside injected `model: "flash"`, causing `buildSubagentSpec` to throw `has conflicting model and Model fields`.
- **Impact:** Valid PascalCase manifests fail whenever planner overrides or coerces models.
- **Remediation:** Validate input alias conflicts once, canonicalize fields (removing PascalCase keys after reading), and apply planner overrides cleanly.
- **Acceptance evidence:** Planner passes for PascalCase `Model` leads, specialists, and auditors under both model override and subagent coercion.
- **Root cause & related IDs:** Post-spread lowercase override leaves PascalCase sibling key intact before `buildSubagentSpec` conflict check. Reconciles `Devin Bug 3` + `Sol RUN-007`; paired with `RUN-008`.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `RUN-008` (Devin Bug 3, part 2) — Custom `integrity_auditor` with PascalCase `Instructions` always fails in `planSquadCohort` | P2 | Closed
- **Contract provenance:** `docs/tools.md:53` and `mcp/dispatch.mjs:52-58` support PascalCase `Instructions` on custom auditors.
- **Source evidence:** `mcp/planner.mjs:523-528` and `mcp/briefs.mjs:69-81`.
- **Trigger:** Define custom `integrity_auditor` specialist using `Instructions: "..."` and compile via `squad_planner` / `agy-squad plan`.
- **Expected vs. actual:** Custom `Instructions` preserved plus `targetScopeNote` appended cleanly; line 527 reads only lowercase `rawAudit.instructions` (dropping `rawAudit.Instructions`) and injects lowercase `instructions` alongside retained `Instructions`, throwing `has conflicting instructions and Instructions fields`.
- **Impact:** Documented custom integrity auditors using PascalCase `Instructions` cannot compile in `squad_planner`.
- **Remediation:** Canonicalize `Instructions` -> `instructions` before appending `targetScopeNote` (and delete `Instructions`).
- **Acceptance evidence:** Custom auditor with `Instructions` retains custom text + target scope note cleanly in both `swarm` and `subagent` modes.
- **Root cause & related IDs:** `planner.mjs:527` ignored PascalCase `Instructions` handled by `dispatch.mjs:54`. Reconciles `Devin Bug 3` + `Sol RUN-008`.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `RUN-009` — Malformed custom `integrity_auditor` `specialists` falls back silently to synthesized default auditor | P2 | Closed
- **Contract provenance:** Custom `integrity_auditor` configuration (`mcp/dispatch.mjs:73-96`) must reject malformed shapes like working squads do (`173-176`).
- **Source evidence:** `mcp/dispatch.mjs:78-98`.
- **Trigger:** Manifest sets `integrity_auditor: { specialists: { invalid: true } }` (non-array) or `specialists: []` without a lead.
- **Expected vs. actual:** Explicit configuration error; line 83 skips custom return when `!Array.isArray(customSpecs) || customSpecs.length === 0` and falls through to lines 98–109, silently synthesizing a default auditor.
- **Impact:** Silently discards caller's custom audit spec on typos or wrong collection types.
- **Remediation:** Explicitly validate `customSpecs` when `specialists`/`children` is present (and reject empty or non-array collections).
- **Acceptance evidence:** Malformed `integrity_auditor` collections fail loudly while omitted `integrity_auditor` still synthesizes default.
- **Root cause & related IDs:** Validation branch only checks `Array.isArray(...) && length > 0` before falling through.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `RUN-010` — Retired Phase 1 `adversarial_review` manifest entry compiles as a working squad | P2 | Closed
- **Contract provenance:** Phase 2 (`docs/tools.md:11`) retired legacy `adversarial_*` review stages.
- **Source evidence:** `mcp/planner.mjs:279-280`, `mcp/dispatch.mjs:214-216`.
- **Trigger:** Pass a legacy Phase 1 manifest containing `squads.adversarial_review` (or `adversarial_flat` / `adversarial_l1`) into `squad_planner` or `dispatch_squad({ squadId: "all_l1" })`.
- **Expected vs. actual:** Explicit migration error (or clean exclusion); `isAuditKey` filters only `integrity_auditor*`, scheduling the retired adversarial review squad as a working squad with working content-verdict authority.
- **Impact:** Legacy manifests silently gain working-squad status instead of failing migration cleanly.
- **Remediation:** Explicitly reject reserved/retired `adversarial_review`, `adversarial_l1`, and `adversarial_flat` squad IDs with a Phase 2 migration hint.
- **Acceptance evidence:** Both `squad_planner` and `dispatch_squad` reject retired `adversarial_*` keys cleanly.
- **Root cause & related IDs:** Removal of Phase 1 adversarial branch removed its working-squad exclusion filter.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `RUN-014` (Devin Bug 2) — Manifest-backed `subagent` lead delegation instructs calling `dispatch_squad`, dropping planner `model` and `reportRoot` overrides | P2 | Closed
- **Contract provenance:** `squad_planner` (`docs/tools.md:20`) compiles full `subagent` payloads honoring caller `model` and custom `reportRoot`, paired with matching `bundleRecordTemplates`.
- **Source evidence:** `mcp/planner.mjs:326-329, 370-377`, `mcp/briefs.mjs:130-146`, `mcp/dispatch.mjs:180-211`. Verified directly by running `node bin/agy-squad.mjs plan --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json --squad skill_and_pr_review_audit --mode subagent --model flash --report-root custom/review`.
- **Trigger:** Plan a manifest-backed layered cohort with `executionMode: "subagent"` and `model: "flash"` and/or `reportRoot: "custom/review"`.
- **Expected vs. actual:** Lead instructions preserve effective planner `model` and `reportRoot` overrides (or omit `dispatch_squad` delegation when planner already compiled the specialist payloads). Actual `lead.Subagent.Prompt` injects `When authorized to delegate, call dispatch_squad with {"squadId":"skill_and_pr_review_audit","manifestPath":"..."}`, and `handleDispatchSquad` rejects any argument beyond `{ squadId, manifestPath }`, recompiling default models and `scratch/agy-squad/...` report slots that contradict `bundleRecordTemplates`.
- **Impact:** Any `subagent` lead following `dispatchCall` silently loses planner `model` overrides and writes reports to wrong slots outside `custom/review`.
- **Remediation:** Either pass planner overrides (`model`, `reportRoot`, `topology`) through an updated contract/brief instructions or instruct planner-launched `subagent` leads to consume the already compiled `workers[].specialists[].Subagent` payloads.
- **Acceptance evidence:** Live `agy-squad plan` check on manifest + `mode: "subagent"` + `model: "flash"` + `reportRoot: "custom/review"` verifying lead delegation instructions match compiled specialist payloads and bundle templates.
- **Root cause & related IDs:** `buildSubagentSpec` always generates raw `dispatch_squad` call strings whenever `manifestPath` is non-inline, ignoring planner-level overrides (`Devin Bug 2`, unique to Devin).
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SVC-005` — `integrityAudit` binds `CLEAN` to `squadId` without binding the reviewed evidence generation | P2 | Closed
- **Contract provenance:** `docs/roles-and-workflows.md:34-44` requires the integrity auditor to inspect final working reports and `verifiedFiles`.
- **Source evidence:** `mcp/handoffs.mjs:277-298, 391-430`, `mcp/verdicts.mjs:144-166`.
- **Trigger:** Re-run working squad `foo` producing changed `specialist-1/report.md` and `verifiedFiles` while keeping an older `Target Squad: foo` / `Integrity Verdict: CLEAN` file on disk, then run `bundle`.
- **Expected vs. actual:** Stale audit from prior evidence rejected until refreshed; `bundleReports` validates only `Target Squad: foo` and `CLEAN`, allowing stale audits to satisfy changed cohorts.
- **Impact:** Outdated `CLEAN` reports can authorize modified working outputs.
- **Remediation:** Record reviewed evidence digest (or synthesis + `verifiedFiles` + specialist-report root hash) inside the audit/bundle binding check so changed evidence invalidates prior audits.
- **Acceptance evidence:** Stale `CLEAN` against updated working evidence fails `bundle`; refreshed audit for same snapshot succeeds.
- **Root cause & related IDs:** Audit verification checks target squad label without tying to inspected artifact hashes.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SVC-006` — `diagnose.mjs --teardown all` blindly deletes every `self-diag-canary-*` folder by prefix | P2 | Closed
- **Contract provenance:** `L41` scopes cleanup strictly to finished verified artifacts without disturbing concurrent active runs.
- **Source evidence:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs:579-585, 1048-1056`.
- **Trigger:** Invoke `--teardown all` while another process holds an active `self-diag-canary-<uuid>` directory in the same `scratch/agy-squad` root.
- **Expected vs. actual:** Active canary owned by a live PID/lock survives; lines 579–585 delete every directory matching `self-diag-canary-*` unconditionally (even with zero `--force`).
- **Impact:** Can delete another concurrent profiler process's active canary mid-run.
- **Remediation:** Write an owner PID/lock metadata marker inside active canaries and only reap stale dead-PID canaries during `--teardown`.
- **Acceptance evidence:** Teardown test holding an active canary lock open and asserting it remains untouched while dead/stale canaries clean up.
- **Root cause & related IDs:** Directory-name prefix treated as terminal ownership state.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SVC-008` — `publish(..., replace = true)` overwrites prior bundles silently without predecessor digest check | P2 | Closed
- **Contract provenance:** Accepted bundle SHA-256 must not silently vanish under concurrent publication retries to identical `task_squad` slots.
- **Source evidence:** `mcp/planner.mjs:157-175`, `mcp/handoffs.mjs:223-254, 436-441`.
- **Trigger:** Two concurrent inline `task` cohorts use the same `task_squad` default ID and both execute `bundle` (same `report.sources.json` path).
- **Expected vs. actual:** Explicit conflict or distinct cohort/generation IDs; `bundleReports` sets `replace = true`, overwriting the earlier accepted bundle without checking an expected predecessor digest.
- **Impact:** Previously accepted digest ceases to resolve at its canonical path on concurrent `task_squad` runs.
- **Remediation:** Require an explicit replacement flag or predecessor hash check when overwriting an existing `.sources.json` with different bytes (or include distinct cohort slug option).
- **Acceptance evidence:** Identical retries remain idempotent; distinct conflicting writes fail unless explicit replacement/predecessor matches.
- **Root cause & related IDs:** Unconditional atomic rename (`replace = true`) used without optimistic concurrency check.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SVC-009` (Devin Bug 1) — `--teardown` ledger-completeness check omits integrity report IDs before deleting `auditAbsDir` | P2 | Closed
- **Contract provenance:** `.agents/skills/self-diagnosis/SKILL.md:69-72` guarantees every finding ID survives `--teardown` in the durable ledger.
- **Source evidence:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs:489-516, 530-562`, `mcp/handoffs.mjs:408-413`.
- **Trigger:** Scoped integrity auditor (`squad-integrity_auditor-<id>`) records an unexported finding/proposal ID absent from lead/specialist reports; run `diagnose.mjs --teardown`.
- **Expected vs. actual:** Teardown refuses deletion until the audit-only ID is recorded in `docs/reviews/<slug>.md`; `cohortMarkdowns` reads synthesis and specialist reports only, so teardown deletes `auditAbsDir` while `report.sources.json` keeps only the audit hash, losing the finding text forever.
- **Impact:** Permanent loss of integrity-auditor-only findings or optimization proposals during governed teardown.
- **Remediation:** Include `bundleJson.integrityAudit?.path` markdown in `cohortMarkdowns` before queueing `auditAbsDir` in `validatedDirs`.
- **Acceptance evidence:** Audit-only finding ID blocks `--teardown` until recorded in the target ledger, then cleans up cleanly.
- **Root cause & related IDs:** Deletion scope (`validatedDirs` includes `auditAbsDir`) exceeds finding-extraction scope (`cohortMarkdowns`). Reconciles `Devin Bug 1` + `Sol SVC-009`; related to `SVC-002`.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SCRIPT-001` — `validateTargetReviewLedger` passes structurally incomplete or internally contradictory ledgers | P2 | Closed
- **Contract provenance:** `pr-review-standard.md` requires mandatory category reviews, atomic findings, and consistent canonical statuses.
- **Source evidence:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs:263-424`. Verified on `pr5-full-review-direction.md` (`DOC-004` contradictions pass with exit 0).
- **Trigger:** Run `diagnose.mjs --ledger <file>` against a ledger missing category/findings sections or marking the same ID `Closed` in Section 6 and `Residual (Open)` in Section 8.
- **Expected vs. actual:** Schema violation (`DOC-LEDGER-SCHEMA`); `validateTargetReviewLedger` checks Section 1 session table, Section 8, optional Section 9, and any tables inside §§5–7 without verifying required sections exist or cross-checking status consistency across sections.
- **Impact:** Broken/contradictory review ledgers report `HEALTHY` and pass `--teardown` gates.
- **Remediation:** Enforce presence of mandatory §§1–8 sections and cross-section ID-status consistency inside `validateTargetReviewLedger`.
- **Acceptance evidence:** Both an incomplete ledger and a contradictory-status ledger fail with `DOC-LEDGER-SCHEMA` (`exit 1`).
- **Root cause & related IDs:** Partial Markdown table validation presented as Standard `v1.3.0` compliance; masks `DOC-004`.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `SCRIPT-002` — Declared `Open (Pre-Remediation)` P1/P2 findings in a ledger still yield `Status: HEALTHY` | P2 | Closed
- **Contract provenance:** `docs/core-workflows.md:100-105` describes `diagnose.mjs` health output as reflecting ledger contents alongside skill health.
- **Source evidence:** `.agents/skills/self-diagnosis/scripts/diagnose.mjs:320-331, 758-776, 1657-1664`.
- **Trigger:** Target a valid v1.3.0 ledger that explicitly records `Open (Pre-Remediation)` P1 or P2 findings.
- **Expected vs. actual:** Report surfaces open ledger blockers distinctly rather than summarizing the target ledger as `HEALTHY`; `validateTargetReviewLedger` extracts `openResiduals` from Section 8 only (`P3` advisory) and ignores open P1/P2 findings in §§5–7/9.
- **Impact:** `diagnose.mjs` can report `HEALTHY` (`exit 0`) on a PR with open P1 blockers.
- **Remediation:** Count declared open P1/P2 findings in `validateTargetReviewLedger` and expose explicit `ledgerDisposition` vs `profilerHealth` fields (or surface open P1/P2 blockers directly).
- **Acceptance evidence:** Check against a ledger containing an open P1 verifying blockers are explicitly surfaced rather than masked as `HEALTHY`.
- **Root cause & related IDs:** Diagnostic findings and ledger-recorded review findings are decoupled.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

#### `DEP-001` — Packaged `.tgz` excludes `tests/`, causing shipped `diagnose.mjs` to fail on `self-diagnosis-manifest.json` | P2 | Closed
- **Contract provenance:** `package.json:11-16` defines the shipped npm tarball, and `tests/verify-package.mjs:16-22` requires `diagnose.mjs` + `SKILL.md` in the tarball.
- **Source evidence:** `package.json:11-16`, `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json:80-89`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs:1121-1127`.
- **Trigger:** Pack tarball (`npm pack`), install/extract offline, and execute `node .agents/skills/self-diagnosis/scripts/diagnose.mjs`.
- **Expected vs. actual:** Packed `diagnose.mjs` passes cleanly (or clarifies a checkout-only boundary); manifest scopes 6 `tests/*.mjs` files omitted from `package.json` `"files"`, causing `diagnose.mjs` to fail (`CHANGES_REQUIRED`, exit 1, 6 `RUN-SCOPE-runtime_and_contract_diagnosis` P2 findings).
- **Impact:** Shipped self-diagnosis skill immediately fails its own diagnostic when run from the packed artifact.
- **Remediation:** Either handle optional repository-checkout scope paths gracefully when `.git`/`tests/` are absent (with explicit packaging contract notice) or narrow packaged manifest scopes to shipped files.
- **Acceptance evidence:** Extracted `npm pack` smoke run of `diagnose.mjs` matching the documented distribution contract.
- **Root cause & related IDs:** `verify-package.mjs` checks file presence without checking `self-diagnosis-manifest.json` runtime dependencies.
- **Closure:** Closed (Stage 2 remediation + Cycle 1 reverification.).

*(Carried P2 residual `RES-DIR-04` — default ledger mtime tie-breaker fixed in `diagnose.mjs` — is tracked as `Closed (Post-Remediation)` in Section 8.)*

### 5.4 P3

*(Also carried under P3: `S1-SVC-01` — `readOnly: null` strict boolean check in `mcp/planner.mjs` — tracked as `Closed (Post-Remediation)` in Section 8.)*

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DOC-005` | Reconciled PR #5 (`Sol`) | DOC | Closed | `docs/concepts.md:60-61`, `mcp/handoffs.mjs:417-434` | Concepts says `report.sources.json` records byte sizes; emitted JSON records SHA-256 digests and specialist Markdown text. | Align `docs/concepts.md` schema description with `bundleReports` JSON fields. | Verified in `mcp/handoffs.mjs:417-434` |
| `DOC-006` | Reconciled PR #5 (`Sol`) | DOC | Closed | `docs/concepts.md:60-61`, `mcp/handoffs.mjs:504-515` | Concepts states `verify` checks loose-file presence; `verify` permits missing loose reports so pruned bundles pass. | Document archived Markdown verification vs conditional checks on remaining loose files. | Verified in `mcp/handoffs.mjs:504-515` |
| `DOC-007` | Reconciled PR #5 (`Sol`) | DOC | Closed | `docs/index.md:28-34`, `docs/assets/architecture-overview.svg:39` | Overview text and SVG label `Scoped Briefs & Slots <= 500 B`; minimal compiled specialist brief is `1,545` B while receipts carry the `500` B limit. | Label `500` B as the receipt limit in both `docs/index.md` and `architecture-overview.svg`. | Verified in `architecture-overview.svg` & `diagnose.mjs` |
| `DOC-008` | Reconciled PR #5 (`Sol`) | DOC | Closed | `README.md:119`, `docs/benchmarks.md:75-86` | `README.md` positioning table attributes historical Phase 1 `20 ms` digest verification metric to the current CLI. | Attribute measurement explicitly to the dated Nov 8 benchmark run until re-measured on Phase 2. | Verified in `README.md:119` |
| `DOC-009` | Reconciled PR #5 (`Sol`) | DOC | Closed | `docs/plans/native-enforcement-ledger.md:35-43, 108-124` | SDK snippet uses unpinned `pip install google-antigravity` via maintainer-local path while citing `0.1.23`. | Pin `google-antigravity==0.1.23` cleanly with portable venv instructions. | Verified in `native-enforcement-ledger.md` |
| `DOC-010` | Reconciled PR #5 (`Sol`) | DOC | Closed | `docs/reviews/pr5-independent-review.md:24`, `docs/reviews/pr5-layered-swarm-review.md:16, 439` | Independent ledger describes `p1_leftovers` as flat while layered ledger records a lead and layered topology. | Reconcile `p1_leftovers` topology label from recorded cohort artifacts or mark unverified. | Verified cross-ledger contradiction |
| `DOC-011` | Reconciled PR #5 (`Sol`) | DOC | Closed | `docs/reviews/pr5-phase2-swarm-planner-review.md:19-20, 468` | Section 1 (`69506793...`) and Section 9 (`63469708...`) list different Session IDs without explaining their parent/child join. | Document coordinator vs cohort session relationship in `pr5-phase2-swarm-planner-review.md`. | Verified in `pr5-phase2-swarm-planner-review.md` |
| `DOC-012` | Reconciled PR #5 (`Sol`) | DOC | Closed | `docs/concepts.md:37`, `mcp/briefs.mjs:94-115` | Concepts states every specialist compiles with `TypeName: "self"`, whereas `buildSubagentSpec` permits custom non-disallowed `TypeName`. | Describe `"self"` as the default `TypeName` in `docs/concepts.md:37`. | Verified in `mcp/briefs.mjs:94-115` |
| `DOC-013` | Reconciled PR #5 (`Devin Flag 2`) | DOC | Closed | `mcp/planner.mjs:151-155, 391-398`, `README.md:22`, `docs/tools.md:23` | `readOnly: true` suppresses scope-overlap warnings during planning (`stripPlannerFields`), yet does not appear in compiled worker briefs (`swarmAdd.brief`). | State explicitly in `docs/tools.md` that `readOnly: true` is overlap-check metadata only (not a brief lock), or echo a read-only note in the brief. | Verified on live `diagnose.mjs --print-plan --topology flat` |
| `SKILL-003` | Reconciled PR #5 (`Sol`) | SKILL | Closed | `.agents/skills/swarm-governance/SKILL.md:50`, `mcp/handoffs.mjs:116` | Skill tells coordinator to strip leading `@mention` before recording `handoffs[].message`, losing raw post verification even though `handoffs.mjs:116` supports leading `@mention`. | Instruct coordinator to record the exact raw board post message verbatim. | Verified in `handoffs.mjs:116` |
| `MCP-005` | Reconciled PR #5 (`Sol`) | MCP | Closed | `mcp/index.js:213, 229` | `cleanBuf.toString("utf8")` decodes invalid UTF-8 with replacement chars (`U+FFFD`) rather than rejecting malformed wire UTF-8. | Use fatal `TextDecoder("utf-8", { fatal: true })` matching `handoffs.mjs` and return `-32700` while recovering next valid frame. | Verified in `mcp/index.js:213` |
| `MCP-006` | Reconciled PR #5 (`Sol`) | MCP | Closed | `mcp/index.js:112`, `tests/test-server.mjs:129-130` | Unknown `tools/call` tool name returns JSON-RPC `-32601` (`Method not found`) rather than MCP 2024-11-05 example `-32602`. | Align error code or document `-32601` mapping explicitly alongside `test-server.mjs`. | Verified in `mcp/index.js:112` |
| `MCP-007` | Reconciled PR #5 (`Sol`) | MCP | Closed | `mcp/briefs.mjs:95, 108`, `mcp/planner.mjs:72-106` | `dispatch_squad` passes arbitrary `model` strings directly into `Subagent.Model`, whereas `squad_planner` in `subagent` mode restricts to `SUBAGENT_MODEL_ALIASES`. | Reconcile `dispatch_squad` and `squad_planner` `subagent` model handling and host acceptance evidence. | Verified in `briefs.mjs` & `planner.mjs` |
| `RUN-011` | Reconciled PR #5 (`Sol`) | RUN | Closed | `mcp/verdicts.mjs:52, 146` | Parser comment/implementation supports unordered lists (`-`, `*`, `+`) and headings, while ordered lists (`1. Verdict: PASS`) fail. | Clarify supported Markdown prefix grammar (or support ordered-list prefixes consistently). | Verified in `mcp/verdicts.mjs:52` |
| `RUN-012` | Reconciled PR #5 (`Sol`) | RUN | Closed | `bin/agy-squad.mjs:206`, `mcp/handoffs.mjs:146-151, 264` | `agy-squad verdict` uses `readFile(...).toString("utf8")` (lossy) whereas `bundle`/`verify` uses fatal UTF-8 decoding. | Use shared `decodeUtf8` helper in `bin/agy-squad.mjs` `verdict` command. | Verified in `bin/agy-squad.mjs:206` |
| `RUN-013` | Reconciled PR #5 (`Sol`) | RUN | Closed | `mcp/planner.mjs:109-149` | Overlap detection compares lexical path prefixes only; symlinked or alias paths to the same file are outside comparison. | Resolve canonical workspace paths when present or label warnings explicitly as lexical. | Verified in `mcp/planner.mjs:109-149` |
| `SVC-007` | Reconciled PR #5 (`Sol`) | SVC | Closed | `mcp/planner.mjs:31-69, 334` | 24-char truncation keeps worker names unique within one `planSquadCohort` call, not across separate plans reusing one `/swarm` board. | Accept `occupiedWorkerNames` input or warn when distinct long squad IDs share a 24-char prefix on reused boards. | Verified in `mcp/planner.mjs:31-69` |
| `SCRIPT-003` | Reconciled PR #5 (`Sol`) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:1353` | Regex `/^Report slot: (\S+)$/m` fails when `AGY_SQUAD_SCRATCH_ROOT` contains a space, yielding `undefined` slot and wrong headroom. | Match `/^Report slot: (.+)$/m` so spaced custom scratch roots compute true UTF-8 headroom. | Verified in `diagnose.mjs:1353` |
| `SCRIPT-004` | Reconciled PR #5 (`Sol`) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:1062-1084` | `timings.dispatchCompileMs` sums `all_l1` plus 3 working squad calls (`4` calls total) against a single-call `< 25 ms` threshold. | Report per-call vs cohort totals cleanly in output and rubric. | Verified in `diagnose.mjs:1062-1084` |
| `SCRIPT-005` | Reconciled PR #5 (`Sol`) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:1086-1095` | Profiler records `timings.squadPlannerMs` without checking it against the rubric latency threshold. | Add threshold evaluation matching `dispatchCompileMs`. | Verified in `diagnose.mjs:1086-1095` |
| `SCRIPT-006` | Reconciled PR #5 (`Sol`) | SCRIPT | Closed | `.agents/skills/self-diagnosis/scripts/diagnose.mjs:1328-1346` | MCP response size check reads stdout byte length without parsing JSON-RPC or asserting `dispatch_squad` & `squad_planner` tool names. | Parse stdout JSON-RPC payload and assert expected tools before measuring size. | Verified in `diagnose.mjs:1328-1346` |
| `TEST-001` | Reconciled PR #5 (`Sol`) | TEST | Closed | `tests/test-server.mjs:158-199` | Test log claims `10MB stdio framing cap` while only exercising `AGY_MAX_STDIO_PAYLOAD_BYTES="2048"` override. | Rename test log accurately and add default `10 MiB` boundary assertion. | Verified in `tests/test-server.mjs:158-199` |
| `TEST-002` | Reconciled PR #5 (`Sol`) | TEST | Closed | `tests/test-comparative-dossier.mjs:456-533` | Reports empirical compliance while assertions check text patterns and referenced file presence without re-scoring benchmark values. | Label output as structural dossier coverage. | Verified in `test-comparative-dossier.mjs` |
| `TEST-003` | Reconciled PR #5 (`Sol`) | TEST | Closed | `tests/verify-package.mjs:42-76` | Allowlist matches any `bin/` or `mcp/` file, so reintroduced retired `bin/terminal.py` or `mcp/run-state.mjs` would still pass. | Add explicit denylist assertion for retired Phase 1 filenames in `verify-package.mjs`. | Verified in `tests/verify-package.mjs:42-76` |
| `DEP-002` | Reconciled PR #5 (`Sol`) | DEP | Closed | `.github/workflows/docs.yml:21-24` | Top-level workflow requests `pages: write` and `id-token: write` for all jobs, including untrusted PR builds. | Scope elevated `pages`/`id-token` permissions exclusively to the `deploy` job. | Verified in `.github/workflows/docs.yml:21-24` |

---

## 6. Overall Disposition & Rework Checklist

**PR Review Disposition (Post-Remediation Working Tree): Approve (`Content Verdict: PASS`).** All four baseline `198356a` P1 defects (`SVC-001`, `SVC-002`, `SVC-003`, `SVC-004`), all 31 P2 defects + `RES-DIR-04`, and all 25 P3 defects + `S1-SVC-01` were remediated in Stage 2, reverified across Cycle 1 (`pr5_cycle1`) + post-Cycle-1 doc/ledger/test fixes, and signed off in Cycle 2 (`pr5_cycle2`, Bundle SHA `61914bd9e0ac63ffb319d3e55f449f887aeafd7c3ad56a387ad58c71b565a6a5`, `audit-pr5-cycle2` `Integrity Verdict: CLEAN`).

---

## 7. Direction Decision (Reconciled PR #5 Acceptance)

- **Decision question:** Merge `198356a` as-is (`43530890418` CI green) vs. rework PR #5 in place before merging to `main`?
- **Recommendation (Executed):** Reworked PR #5 in place on `feat/phase2-swarm-planner`. Kept the native `/swarm` pivot, two-tool MCP surface (`squad_planner` + `dispatch_squad`), and Phase 1 PTY retirement (`L17`). Resolved the audit/bundle/teardown lifecycle (`SVC-001`–`SVC-004`, `SVC-009`), planner/subagent input contracts (`RUN-001`–`RUN-014`, `MCP-001`–`MCP-007`), docs/ledgers/standard version (`DOC-001`–`DOC-013`, `SKILL-001`–`SKILL-003`), `diagnose.mjs` gates (`SCRIPT-001`–`SCRIPT-006`, `RES-DIR-04`), and packaging parity (`DEP-001`–`DEP-002`).
- **Falsifiers (Verified):** Executed Cycle 2 flat `/swarm` verification (`pr5_cycle2` -> `audit-pr5-cycle2` -> `digest`/`bundle`/`verify`/`prune` -> clean teardown), `npm test` (`9/9`), `npm run verify:package` (`54` files), `diagnose.mjs --markdown` (`HEALTHY`, Standard `v1.4.0`), and `python3 -m zensical build` (zero line-14 or new warnings; `site/` cleaned), confirming zero open P1/P2 findings.

---

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PR5-ARCH-04` | Reconciled PR #5 | ARCH | Closed (By Design) | `docs/plans/LEDGER.md` (`L17`), deleted `bin/terminal.py` & `mcp/run-state.mjs` | Removal of per-run PTY tool profile enforcement upon launcher retirement | Confirmed retired in `LEDGER.md` and `198356a` packaging/imports. | Verified in `198356a` |
| `PR5-ARCH-05` | Reconciled PR #5 | ARCH | Residual (Open) | `mcp/handoffs.mjs`, `docs/plans/native-enforcement-ledger.md` (`NE-04`) | Handoff authorship and live claim truthfulness rely on coordinator-assembled records rather than host attestation | Retains open host boundary (`NE-04`) until Antigravity host attestation is verified. | Verified open in `mcp/handoffs.mjs` |
| `PR5-ARCH-06` | Reconciled PR #5 | ARCH | Deferred / Won't Fix | `docs/plans/LEDGER.md` (`L8-L12`, `L35-L38`) | Rebuild retired Docker per-agent sandbox containers | Superseded by native Antigravity SDK/hook enforcement path (`docs/plans/native-enforcement-ledger.md`). | Verified in `LEDGER.md` |
| `PR5-SCRIPT-02` | Reconciled PR #5 | SCRIPT | Residual (Open) | `.agents/skills/self-diagnosis/scripts/diagnose.mjs`, `native-enforcement-ledger.md` (`NE-08`) | Ledger validation checks local Markdown files without external reviewer identity attestation | Retains open host/trust boundary (`NE-08`); explicit ledger check remains local integrity only. | Verified in `diagnose.mjs` |
| `FR-EVID-SVC-01` | Reconciled PR #5 | SVC | Residual (Open) | Antigravity `/swarm` worker capability boundary | Historical worker capability observation: earlier `/swarm` workers lacked `agy-context-saver` MCP tools (`query_transcript` / `read_transcript`); live `198356a`+ Antigravity MCP attachment and hook propagation remain unverified | Preserved as historical host boundary until live `198356a`+ host MCP attachment and hook propagation (`NE-05`/`NE-10`) are verified. | Historical host observation; live unverified |
| `FR-EVID-SVC-02` | Reconciled PR #5 | SVC | Informational | `scratch/agy-squad/*` | Historical Session 5–7 proof bundles invalidate when cited source files change afterward | Expected tamper-evidence behavior of SHA-256 verification. | Verified in `mcp/handoffs.mjs:214` |
| `WT-SVC-01` | Reconciled PR #5 | SVC | Informational | `scratch/agy-squad/` | Prior retained Session 5–8 scratch artifacts absent from clean `198356a` commit/tree | Confirmed clean tracked files and absent `scratch/` on `198356a`. | Verified clean tree |
| `RES-DIR-01` | Reconciled PR #5 | SCRIPT | Deferred / Won't Fix | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Extend `--teardown all` to custom scratch subdirectories and metadata files | Kept separate from fixing the default flat-mode `SVC-002` crash; handled cleanly if scoped post-fix. | Verified in `diagnose.mjs` |
| `RES-DIR-04` | Reconciled PR #5 | SCRIPT | Closed (Post-Remediation) | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Default ledger pickup without `--ledger` used mtime tie-breaker selecting `pr5-phase2-swarm-planner-review.md` on equal checkout mtimes | Remediated in `diagnose.mjs`: added `pr5-reconciled-review.md` precedence + Standard v1.4.0 equal-mtime selection verified in `tests/test-run.mjs` (`DEP-001` & `RES-DIR-04`). | Closed in Cycle 1 |
| `S1-SVC-01` | Reconciled PR #5 | RUN | Closed (Post-Remediation) | `mcp/planner.mjs` | `spec?.readOnly ?? spec?.ReadOnly` silently coerced `readOnly: null` to `undefined`, bypassing boolean validation | Remediated in `mcp/planner.mjs`: preserves explicit `null` when checking `readOnly`/`ReadOnly` so non-boolean values fail validation. | Verified in Cycle 1 (`tests/test-planner.mjs`) |
| `WT-DOC-03` | Reconciled PR #5 | DOC | Deferred / Won't Fix | Historical comparative plans & `pr3` ledger | 44 pre-existing Zensical build warnings outside PR #5 scope | Verified identical 44 warnings at base and head (`43530890407`). | Verified in CI docs log |
| `WT-DEP-01` | Reconciled PR #5 | DEP | Deferred / Won't Fix | `package.json:22`, `docs/getting-started.md:14` | `"docs": "zensical serve"` expects `zensical` binary on `PATH`; `python3 -m zensical` fallback documented | Acceptable documented dependency fallback. | Verified in `package.json:22` |
| `DOC-LEDGER-RESIDUALS-OPEN` | Reconciled PR #5 | DOC | Informational | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Advisory `P3` emitted whenever Section 8 records `Residual (Open)` rows | Expected behavior while `PR5-ARCH-05`, `PR5-SCRIPT-02`, and `FR-EVID-SVC-01` remain tracked in Section 8. | Verified in `diagnose.mjs` |
| `SD-OPT-01` | Reconciled PR #5 | SKILL | Deferred / Won't Fix | `.agents/skills/{self-diagnosis,pr-review}/SKILL.md` | Optional further compression of skill markdown below current sizes | Already well under `10,240` B cap. | Deferred |
| `S5-BRIEFS-TEMPLATE` | Reconciled PR #5 | RUN | Deferred / Won't Fix | `mcp/briefs.mjs` | Optional minimal compression of `Specialist` / `Lead` templates | Optional token optimization post-remediation. | Deferred |
| `S5-TARGET-SCOPE-DEDUP` | Reconciled PR #5 | RUN | Deferred / Won't Fix | `mcp/planner.mjs` | Optional deduplication of `Target Squad` wording across auditor objective/instructions | Separate from fixing PascalCase `RUN-008`. | Deferred |
| `S5-SWARM-GOV-SHARE` | Reconciled PR #5 | SKILL | Deferred / Won't Fix | `.agents/skills/swarm-governance/SKILL.md` | Optional extraction of bundle schema prose | Already under size threshold. | Deferred |
| `SD-SCRIPT-03` | Reconciled PR #5 | SCRIPT | Deferred / Won't Fix | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Keep read-only specialist exemption while checking writable leads (covered separately under `ARCH-002`) | Specialist read-only exemption itself is by design. | Deferred |
| `SD-SCRIPT-04` | Reconciled PR #5 | SCRIPT | Deferred / Won't Fix | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Optional additional comparative prompt latency metrics | Optional post-PR-#5 instrumentation. | Deferred |
| `SD-PR-05` | Reconciled PR #5 | SKILL | Deferred / Won't Fix | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Optional lint rule for `open_board` formatting across skills | Optional linting enhancement. | Deferred |
| `FR-DEF-01` | Reconciled PR #5 | SCRIPT | Deferred / Won't Fix | `bin/agy-squad.mjs` | Optional combined `verify` + `prune` CLI subcommand | Optional post-remediation convenience. | Deferred |
| `FR-DEF-02` | Reconciled PR #5 | SVC | Deferred / Won't Fix | `mcp/handoffs.mjs` | Optional fast-path bundle caching | Correctness/predecessor checks (`SVC-008`) take precedence. | Deferred |
| `FR-DEF-03` | Reconciled PR #5 | RUN | Deferred / Won't Fix | `mcp/dispatch.mjs` | Optional manifest mtime caching | Optional optimization post-remediation. | Deferred |
| `FR-DEF-04` | Reconciled PR #5 | SCRIPT | Deferred / Won't Fix | `.agents/skills/self-diagnosis/scripts/diagnose.mjs` | Optional `--verify-stdio` CLI flag (distinct from `SCRIPT-006` JSON parsing inside existing probe) | Optional CLI flag exposure. | Deferred |

---

## 9. `/self-diagnosis` Cohort & Bundle Ledger

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| `pr5_cycle1` | `72686908-b468-479a-ad86-db9b9cacf078` | Native flat `/swarm` PR #5 Stage 3 Cycle 1 reverification | `pr5-cycle1-mcp-cli-rever`, `pr5-cycle1-diag-pkg-reve`, `pr5-cycle1-docs-skills-r`, `pr5-cycle1-test-suite-au`, `monitor-8` | N/A (Cycle 1 review-fix wave: fixed 5 partial doc/ledger/config items + 4 test tightenings before Cycle 2) | Superseded by `pr5_cycle2` (`61914bd9e0ac63ffb319d3e55f449f887aeafd7c3ad56a387ad58c71b565a6a5`) | Cleaned prior to Cycle 2 |
| `pr5_cycle2` | `72686908-b468-479a-ad86-db9b9cacf078` | Native flat `/swarm` PR #5 Stage 3 Cycle 2 PASS verification | `pr5-cycle2-mcp-cli-cycle`, `pr5-cycle2-diag-pkg-cycl`, `pr5-cycle2-docs-ledgers`, `pr5-cycle2-tests-suite-c`, `audit-pr5-cycle2`, `monitor-8` | N/A (re-verify post-fix working tree) | `61914bd9e0ac63ffb319d3e55f449f887aeafd7c3ad56a387ad58c71b565a6a5` (`Content Verdict: PASS`, Evidence Digest `470a0296f294ed11072329808f7010acd0bf7ed82faac451004e5cfbc5cd7daf`, `audit-pr5-cycle2` SHA `8109ef22a56ab89f011fd2ef13977e2002578694816970dea8643b9b67409b9d` `Integrity Verdict: CLEAN`) | Verified, pruned & torn down |

None (0 wave findings) — Cycle 1 partial findings fell strictly under existing reconciled IDs (`DOC-002`–`DOC-004`, `SKILL-001`, `ARCH-003`, `TEST-002`–`TEST-003`, `SCRIPT-001`/`SCRIPT-003`), and Cycle 2 confirmed `PASS` / `CLEAN` across all scopes.
