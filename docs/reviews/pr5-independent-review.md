# Independent Review: Agy-Squad PR #5 (Phase 2: Retire PTY launcher, add `squad_planner` for native `/swarm`)

> Independent of the PR's self-authored ledger ([`pr5-phase2-swarm-planner-review.md`](pr5-phase2-swarm-planner-review.md)). Written by a reviewer in a separate conversation. Standard: PR Review Standard v1.3.0 (reduced form, see evidence limits).

## 1. Review metadata, Session Provenance, and evidence limits

| Field | Value |
|---|---|
| Repo / PR | `paragon-ux/Agy-Squad` #5, `feat/phase2-swarm-planner` → `main` |
| Reviewed head | `43ea410` (initial findings); `0903c4e` (Session 2 remediation); Session 3 live verification & `24`-char fix on working tree after `1dd9720` |
| Base | `1fde605` |
| Size at review | 35 files, +2,345 / −1,756 |
| CI at review | Node 22 SUCCESS, Node 24 SUCCESS, build SUCCESS, deploy SKIPPED |
| Date | 2026-11-13 |

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
|---|---|---|---|---|---|
| 1 | `23e2d977-d17c-4355-bf0d-02c35eeffaa6` | none | 2026-11-13 | `1fde605..43ea410`, clean | Single-agent interactive review (Claude Sonnet 5.5) |
| 2 | `23e2d977-d17c-4355-bf0d-02c35eeffaa6` | 1 | 2026-11-13 | `43ea410..0903c4e` | Same reviewer remediated findings it raised; independently re-checked in Session 3. |
| 3 | `69506793-2b07-43f0-ae50-6e7aa009232d` | none | 2026-11-13 | `0903c4e..1dd9720` + `MAX_SWARM_NAME_LENGTH = 24` & doc/ledger fixes; clean `scratch/` after teardown | Separate reviewer/coordinator session: live MCP (`dispatch_squad`, `squad_planner` `--known-model`) + live native `/swarm` (`task_squad`: 2 workers + coordinator flat lead + `audit-task-squad` on `gemini-3.8-flash-high`) -> `bundle` / `verify` / `prune` + `diagnose.mjs` |

**Design decision accepted as given.** Retiring the custom launcher and its teardown in favor of native `/swarm` is a legitimate architecture choice. The launcher could not appear in the native Swarm UI (roster, @mention graph, per-agent trajectories), it was not integrated with native orchestration, and it was an apparatus to maintain. This review asks whether PR #5 carries the decision out and whether repository claims match the code.

**Evidence collected:** `npm test` (`8/8` suites exit 0), `node tests/verify-package.mjs --self-test` (exit 0), `npm pack --dry-run --json | node tests/verify-package.mjs` (`45 files`, exit 0), `diagnose.mjs --markdown` (`HEALTHY`), live stdio MCP `dispatch_squad` (`all_l1`) & `squad_planner` (`knownModels` + `workerName` identity), live `/swarm` cohort execution (`task_squad` + flat `audit-task-squad` -> `Integrity Verdict: CLEAN` -> offline `bundle` / `verify` SHA `193b63dce478dd3ad9a7720911cd7872c46f3bbb3cfc8600037c44f6f438b5a5` -> `prune`), SDK `v0.1.23` introspection (`CapabilitiesConfig.model_fields`, `BudgetConfig.model_fields`, `grep -rnI swarm`), doc greps, CI status, and assertion-level diff of `tests/test-run.mjs` against `origin/main`.

**Limits:**
- Live `/swarm` execution exercised a flat 2-worker + flat integrity auditor cohort (`task_squad`, pinned `gemini-3.8-flash-high`), not a multi-wave layered `all_l1` cohort (`all_l1` dispatch schema compiled via `dispatch_squad` and `--print-dispatch`).
- `PR5-ARCH-05` (unattested handoff authorship), `PR5-SCRIPT-02` (`diagnose.mjs` independent-ledger gate), and `PR5-ARCH-06` (SDK/hook spawn & default-deny enforcement) remain deferred to [`docs/plans/native-enforcement-ledger.md`](../plans/native-enforcement-ledger.md).
- Re-verification of PR #5 on `gemini-4-hydrogen-high` is tracked cleanly for the follow-up pass after updating the default swarm model.

## 2. File-to-category inventory (primary category)

| Category | Files |
|---|---|
| ARCH | `docs/plans/LEDGER.md`, `mcp/planner.mjs` (design), `bin/terminal.py`/`mcp/run-state.mjs` (deleted) |
| DOC | `README.md`, `docs/benchmarks.md`, `docs/core-workflows.md`, `docs/concepts.md`, `docs/getting-started.md`, `docs/tools.md`, `benchmarks/teamwork-vs-squad/README.md`, `docs/plans/comparative-harness-architecture*.md` |
| SKILL | `.agents/skills/swarm-governance/SKILL.md`, `pr-review/SKILL.md`, `self-diagnosis/SKILL.md` |
| MCP | `mcp/index.js`, `mcp/planner.mjs` (schema) |
| SCRIPT | `bin/agy-squad.mjs`, `.agents/skills/self-diagnosis/scripts/diagnose.mjs` |
| TEST | `tests/test-planner.mjs`, `tests/test-run.mjs`, `tests/test-dispatch.mjs`, `tests/test-handoffs.mjs` |
| RUN / SVC / DB / DEP | Not primarily changed; `DB`: not applicable (no database). `DEP`: `.github/workflows/ci.yml` dropped unused `setup-python`; no finding. |

## 3. Architecture-to-implementation trace

| Thesis | Decision | Contract | Implementation | Verification |
|---|---|---|---|---|
| Orchestration should be first-party | Retire `L17` launcher; planner emits swarm briefs (`L42`/`L43`) | `squad_planner`, `agy-squad plan` | `mcp/planner.mjs`, `bin/agy-squad.mjs` | `tests/test-planner.mjs`, `npm test` pass |
| Evidence integrity does not depend on model honesty | Hash-bound bundles, strict single-line verdicts | `bundle` / `verify` / `prune` / `verdict` | `mcp/handoffs.mjs`, `mcp/verdicts.mjs` | `tests/test-handoffs.mjs`, `tests/test-verdicts-and-pivot.mjs` |
| Docs match code | Update active docs for retirement | docs and skills | Remediated in `0903c4e` | grep sweep; `diagnose.mjs` (self-referential, see PR5-SCRIPT-01) |

## 4. Category findings

### ARCH
- **P1:** None identified within reviewed scope.
- **P2:** `PR5-ARCH-01` (Closed (Post-Remediation) for wording; attestation gap tracked as residual `PR5-ARCH-05`).
- **P3:** `PR5-ARCH-02`, `PR5-ARCH-03` (both Closed (Post-Remediation)); `PR5-ARCH-04` Closed (By Design).

### DOC
- **P1:** None identified within reviewed scope.
- **P2:** `PR5-DOC-01`, `PR5-DOC-02`, `PR5-DOC-04` (Closed (Post-Remediation)).
- **P3:** `PR5-DOC-03` (Closed (Post-Remediation)).

### SKILL
- **P1/P2:** None identified within reviewed scope.
- **P3:** `PR5-SKILL-01` (Closed (Post-Remediation)).

### MCP
- **P1/P2:** None identified within reviewed scope.
- **P3:** `PR5-MCP-01` (Closed (Post-Remediation)).

### SCRIPT
- **P1:** None identified within reviewed scope.
- **P2:** `PR5-SCRIPT-01` (Closed (Post-Remediation) for wording; gate itself tracked as residual `PR5-SCRIPT-02`).
- **P3:** None identified within reviewed scope.

### TEST
- **P1/P2:** None identified within reviewed scope.
- **P3:** `PR5-TEST-01` (Closed (Post-Remediation)).

### RUN, SVC, DB, DEP
Not assessed in depth. `DB`: not applicable.

## 5. Findings: P2 records

### PR5-DOC-01: Closed (Post-Remediation)
- **Contract provenance:** `L17` retired; `LEDGER.md` scope 1 rewritten to native `/swarm`.
- **Source evidence:** `docs/benchmarks.md:79` ("Managed CLI session scope … removes unchanged temporary plugin and agent profile registrations on exit"), `README.md:11` ("Automatic cleanup of temporary CLI session registrations"), `docs/core-workflows.md:88` header.
- **Trigger:** read active docs after the launcher removal.
- **Expected / actual:** docs should not claim code that no longer exists; they did.
- **Impact:** a reader would credit Agy-Squad with cleanup it no longer performs.
- **Required remediation:** remove or relabel the launcher-era scope.
- **Acceptance evidence:** grep for `Managed CLI session`, `temporary CLI session registrations` returns no active-doc hits.
- **Root cause / related IDs:** pivot updated "how to use" docs, not "why it is better" docs (DOC-02, DOC-03, DOC-04).
- **Closure:** `0903c4e` (`README.md`, `docs/benchmarks.md`). Residual: none.

### PR5-DOC-02: Closed (Post-Remediation)
- **Contract provenance:** benchmark honesty (PR Review Standard Step 6: completion and benchmark claims must be supported).
- **Source evidence:** `docs/benchmarks.md` headline run (6m15s, 3 agents, 64 steps); `benchmarks/teamwork-vs-squad/README.md` live-run step used `agy-squad run … --launch`.
- **Trigger:** the benchmark README shows the Nov 8 Arm 1 was launched with the retired launcher.
- **Expected / actual:** numbers should state the path that produced them; they presented as current.
- **Impact:** recorded numbers could be read as measuring the current `squad_planner` + `/swarm` path.
- **Required remediation:** label as Phase 1 evidence.
- **Acceptance evidence:** note added in `docs/benchmarks.md`; table row labeled "at the time of the run".
- **Root cause / related IDs:** DOC-01.
- **Closure:** `0903c4e`. Residual: no measurement of the current path exists.

### PR5-DOC-04: Closed (Post-Remediation)
- **Contract provenance:** public reproduction instructions.
- **Source evidence:** `benchmarks/teamwork-vs-squad/README.md` "Run a new live experiment" step 2 ran `node bin/agy-squad.mjs run … --squad all_l1 --launch`.
- **Trigger:** execute the documented command.
- **Expected / actual:** a working reproduction; actual: `'agy-squad run' was retired in Phase 2` error. `all_l1` is also not a squad in `manifest.json` (only `ab_audit`), so the instruction was already stale.
- **Impact:** the documented live-run procedure could not be followed.
- **Required remediation:** replace with the current equivalent.
- **Acceptance evidence:** `node bin/agy-squad.mjs plan --manifest benchmarks/teamwork-vs-squad/manifest.json --squad ab_audit --mode subagent` produces the two expected report slots.
- **Root cause / related IDs:** DOC-01.
- **Closure:** `0903c4e`. Residual: the new procedure is a new measurement, not a replication (stated in the doc).

### PR5-ARCH-01: Closed (Post-Remediation)
- **Contract provenance:** Pointer-Over-Wire and bundle contract (`L42`/`L43`).
- **Source evidence:** `mcp/handoffs.mjs:100–107` (`sender` is matched as a string key against `assignments[].conversationId`); `swarm-governance` SKILL "cryptographic proof layer".
- **Trigger:** read `reconcileHandoffs`.
- **Expected / actual:** a "proof bundle" should attest authorship; it attests file integrity of a coordinator-assembled record.
- **Impact:** over-claim; a coordinator error or a forged handoff line is not detected.
- **Required remediation:** reword claim; state what is and is not attested.
- **Acceptance evidence:** skill now says "file-integrity layer" and §4 states the attestation limit.
- **Root cause / related IDs:** natural-language trust in handoffs; `PR5-ARCH-05`.
- **Closure:** `0903c4e` (wording). The real fix (attested handoffs) is `PR5-ARCH-05`, Residual (Open).

### PR5-SCRIPT-01: Closed (Post-Remediation)
- **Contract provenance:** `diagnose.mjs` health contract.
- **Source evidence:** `diagnose.mjs` target ledger resolves to `docs/reviews/pr5-phase2-swarm-planner-review.md` (written inside the same PR with 0 findings in every category); this review found 4 P2s.
- **Trigger:** run `diagnose.mjs --markdown`.
- **Expected / actual:** independent signal; actual: self-attested.
- **Impact:** `HEALTHY` can be misread as independent verification.
- **Required remediation:** document the limit.
- **Acceptance evidence:** warning added in `docs/core-workflows.md`.
- **Root cause / related IDs:** `PR5-SCRIPT-02`.
- **Closure:** `0903c4e` (wording). The gate is unchanged: `PR5-SCRIPT-02`.

## 6. Findings: P3 records

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
|---|---|---|---|---|---|---|---|
| PR5-MCP-01 | 1→2 | MCP | Closed (Post-Remediation) | `mcp/planner.mjs` | `model: "bogus-model"` accepted silently in swarm mode | Planner reports `modelValidation.status = "unverified"`, a warning, and a `preflight` of `swarm{action:"models"}`. Optional `knownModels` (MCP) / `--known-model` (CLI) makes the planner reject pinned models outside the supplied list. No hardcoded model list (it would go stale: the model list changes by host and date). | `tests/test-planner.mjs` §9; `0903c4e`; no bundle |
| PR5-ARCH-02 | 1→2 | ARCH | Closed (Post-Remediation) | `mcp/planner.mjs` | Placeholder `<swarm-worker:NAME:conversationId>` vs board identity by member name | Swarm bundle templates now use the member name as `conversationId`; `provenanceScaffold.identity` and docs state it. Subagent mode keeps `<invoke_subagent:…>` placeholders. | `tests/test-planner.mjs` §10; `0903c4e` |
| PR5-ARCH-03 | 1→2 | ARCH | Closed (Post-Remediation) | `mcp/planner.mjs` | Layered plans add a squad lead above the swarm coordinator; cost unmeasured | Verified single-squad plans have no lead. Planner `notes` flag the layered case; skill documents it; flat is the default recommendation. Not measured: noted in the concurrency protocol as a metric. | `tests/test-planner.mjs` §11; `0903c4e` |
| PR5-SKILL-01 | 1→2 | SKILL | Closed (Post-Remediation) | `swarm-governance/SKILL.md` §3 | Pointer-Over-Wire on the shared board is only a convention | Skill and planner `notes` say detection is after the fact (`agy-squad inspect`), not prevention. | `tests/test-planner.mjs` §11; `0903c4e` |
| PR5-DOC-03 | 1→2 | DOC | Closed (Post-Remediation) | `docs/concepts.md:3`, `docs/plans/comparative-harness-architecture*.md` | "CLI launcher" wording; historical plans score a retired architecture | Wording fixed; "Historical (pre-Phase 2)" banner added to the three plan docs | grep sweep; `0903c4e` |
| PR5-TEST-01 | 1→2 | TEST | Closed (Post-Remediation) | `tests/test-run.mjs` | Assertions fell from ~128 to ~68; possible loss of non-launcher coverage | Assertion-level diff: removed assertions whose strings have no source left (`already occupied`, `prepared manifest changed`, run-`<uuid>` staging) were deleted with that code. Dispatch behaviors (`Squad Lead Patrol`, `Anti-cheating rule`, `requires an objective`, `Subagent Alignment Policy`, `adversarial_review` slots) remain covered in `tests/test-dispatch.mjs`. | string-based sample, not exhaustive; `0903c4e` |
| PR5-RUN-01 | 3 | RUN | Closed (Post-Remediation) | `mcp/planner.mjs#L31-L69,L501-L505` | Native `swarm{action:"add"}` rejects `name` values > 24 characters (`slugifyName` previously capped at 32) | Caught live during Session 3 planner->swarm spawn; lowered `MAX_SWARM_NAME_LENGTH = 24` and shortened auditor names (`audit-<id>`); updated `tests/test-planner.mjs` (`<= 24`) and re-ran live spawn + bundle verify. | `tests/test-planner.mjs` §6; `193b63dce478dd3ad9a7720911cd7872c46f3bbb3cfc8600037c44f6f438b5a5` |

## 7. Verification record and remaining gaps

- **Executed in Session 2 (`0903c4e`) and independently re-verified in Session 3 (`1dd9720` + live fixes):**
  - `npm test` (`8/8` suites passed, exit 0), `node tests/verify-package.mjs --self-test` (exit 0), `npm pack --dry-run --json | node tests/verify-package.mjs` (`45 files`, exit 0), `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown` (`Status: HEALTHY`).
  - Live stdio MCP `dispatch_squad` (`all_l1` -> `3` compiled Leads) and `squad_planner` (`knownModels` validation + `workerName` identity), plus live native `/swarm` round-trip (`task_squad`: `task-squad-code-verifier`, `task-squad-doc-verifier` -> coordinator flat synthesis `Content Verdict: PASS` -> flat `audit-task-squad` `Integrity Verdict: CLEAN` -> `inspect` -> `bundle` -> `verify` SHA `193b63dce478dd3ad9a7720911cd7872c46f3bbb3cfc8600037c44f6f438b5a5` -> `prune`).
  - Independent check of [`pr5-phase2-swarm-planner-review.md`](pr5-phase2-swarm-planner-review.md): confirmed all 25 findings closed cleanly on `279e30d` / `43ea410`, with Session 2/3 items closing the additional gaps found thereafter.
- **Note on package file count:** The original PR description cited `42 files` (`43` after `pr5-phase2-swarm-planner-review.md`, **`45 files`** after adding `pr5-independent-review.md` and `native-enforcement-ledger.md`).
- **Remaining scope:** `PR5-ARCH-05` and `PR5-SCRIPT-02` stay intentionally tracked as `Residual (Open)` below (pointing to [`native-enforcement-ledger.md`](../plans/native-enforcement-ledger.md) `NE-04` and `NE-08`, triggering the expected advisory `[P3] DOC-LEDGER-RESIDUALS-OPEN` in `diagnose.mjs`).

## 8. Post-Remediation Residuals & Deferred Dispositions

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
|---|---|---|---|---|---|---|---|
| PR5-ARCH-04 | 1 | ARCH | Closed (By Design) | launcher removal | Loss of per-run tool-profile control and automatic cleanup | Maintainer accepts it for first-party orchestration (native swarm UI, @mentions, orchestration). Isolated-child experiments remain possible via `invoke_subagent` / `dispatch_squad` (`executionMode: "subagent"`). | maintainer decision, 2026-11-13 |
| PR5-ARCH-05 | 1 | ARCH | Residual (Open) | `mcp/handoffs.mjs:100–107` | Handoff authorship is not attested: the record is hand-assembled from the board | Needs host- or SDK-level attestation (e.g. SDK hooks that record who posted what, or a signed board export). **Deferred to the separate native-enforcement ledger** ([`docs/plans/native-enforcement-ledger.md`](../plans/native-enforcement-ledger.md), row NE-04). Not a docs fix. | open |
| PR5-SCRIPT-02 | 1 | SCRIPT | Residual (Open) | `diagnose.mjs` target-ledger resolution | Health gate reads the PR's own ledger | Observed: adding this independent ledger changed `diagnose.mjs`'s target to it, because target selection is "newest by revision, then mtime", not "independent of the author". Proposal: require a ledger from a different conversation than the PR author, or pin the ledger to a commit the author did not write. Warning only for now; tracked as NE-08 in [`docs/plans/native-enforcement-ledger.md`](../plans/native-enforcement-ledger.md). | open |
| PR5-ARCH-06 | 1 | ARCH | Deferred / Won't Fix | `docs/plans/LEDGER.md` L8–L12, L35, L36, L38 | Suggestion (external review) that a host-enforced spawn gate and default-deny/isolated-container sandbox is the real differentiator, citing `docs/plans/docker-sandbox-plan.md` at `ee10ebc` | The cited Docker per-agent-container design is **retired** in this repo's ledger (superseded by the WSL decision). The enforcement idea itself is valid but must be re-founded on native mechanisms (SDK `deny/allow/ask_user` policies, `PreToolCallDecideHook`, Antigravity hooks). Track in the native-enforcement ledger ([`docs/plans/native-enforcement-ledger.md`](../plans/native-enforcement-ledger.md), rows NE-01, NE-02, NE-06). | open |

---

## 9. `/self-diagnosis` Cohort & Bundle Ledger

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| `task_squad` (Session 3 Live Join) | `69506793-2b07-43f0-ae50-6e7aa009232d` | Live `squad_planner` (`--known-model`) -> `/swarm` -> `audit-task-squad` -> `bundle`/`verify` | `task-squad-code-verifier`, `task-squad-doc-verifier`, `audit-task-squad` | N/A (caught `>24`-char live spawn rejection, fixed to `MAX_SWARM_NAME_LENGTH=24`) | `193b63dce478dd3ad9a7720911cd7872c46f3bbb3cfc8600037c44f6f438b5a5` (`Content Verdict: PASS`, `Integrity Verdict: CLEAN`) | Verified, pruned & torn down (`L41`) |

None (0 wave findings) — *(`PR5-RUN-01` 24-character swarm name cap captured in Section 6 & closed prior to live join verification).*
