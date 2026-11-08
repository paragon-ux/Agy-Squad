# Agy-Squad PR Review Report (Follow-Up Re-Review — R2)

## 1. Review Metadata and Evidence Limits

- **Repository:** `/home/paragon-ux/Antigravity/Agy-Squad` (`paragon-ux/Agy-Squad` — `https://github.com/paragon-ux/Agy-Squad`)
- **PR URL:** `https://github.com/paragon-ux/Agy-Squad/pull/1` (`rebuild/wsl-dispatch` -> `main`)
- **Previous Reviews Retained:**
  - **R1 Review:** [rebuild-wsl-dispatch-review.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/reviews/rebuild-wsl-dispatch-review.md) (`https://github.com/paragon-ux/Agy-Squad/pull/1#issuecomment-6719916015`, reviewed head `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7`, verdict: *Request changes* with `2` P1, `10` P2, `1` P3 findings and `2` verification gaps).
  - **External Devin Review Artifacts Reconciled & Remediated in R2:**
    - [devin-agy-squad-bugs-and-flags.md](file:///home/paragon-ux/Antigravity/artifacts/devin-agy-squad-bugs-and-flags.md) (`3` bug-catcher findings: `RUN-003`, `SVC-003`, `RUN-004` + `2` verification flags: `SCRIPT-GAP-002`, `TEST-GAP-001`).
    - [devin-agy-squad-issue-ledger.md](file:///home/paragon-ux/Antigravity/artifacts/devin-agy-squad-issue-ledger.md) (merge-readiness ledger combining the `3` bug-catcher findings, `2` verification flags, `L1` prompt-vs-host boundary design note, and the `13` R1 findings + `2` R1 verification gaps).
- **Review Date:** `2026-11-08`
- **Reviewer:** Antigravity (Agy-Squad PR Review Skill)
- **Standard Version:** `1.1.0` ([pr-review-standard.md](file:///home/paragon-ux/Antigravity/Agy-Squad/.agents/skills/pr-review/references/pr-review-standard.md))
- **Base Ref / SHA:** `main` — `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`
- **Previous Head SHA (R1):** `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7` (plus R1 review report commit `e1fdb0004d56e2efda5be5919d07105136ee6080`)
- **R2 First Remediation Commit SHA:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688` (`fix: remediate PR #1 review findings across dispatch, handoffs, MCP server, launcher, and docs`)
- **R2 Branch Commit SHA + Working-Tree Remediation Delta:** `45a66d1ee720194c1b5416003ae819dcbed886ff` plus working-tree remediation for `RUN-003`, `RUN-004`, `SVC-003`, and `TEST-GAP-001` across `mcp/briefs.mjs`, `mcp/handoffs.mjs`, `mcp/index.js`, `docs/tools.md`, `docs/plans/wsl-cli-verification.md`, `tests/test-dispatch.mjs`, `tests/test-handoffs.mjs`, and `tests/test-server.mjs`.
- **GitHub Generated PR Merge Commit SHA (at `281c04a`):** `d718d7d219ce7c8682553ef6f88037c837c58ba7` (merge of `281c04ab2cb342f4e9ed754a1e08dae7673bb688` into `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`)
- **Merge Base SHA:** `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`
- **Commit History Examined (`ee10ebc255f0d52dc93b51d7cf8198bb069c4532..45a66d1ee720194c1b5416003ae819dcbed886ff` + working-tree delta):**
  1. `cf6e9599974eb1527cb9f8f182d3895ebaa3e5e2` — `Rebuild Agy-Squad around native WSL subagent compilation`
  2. `d1389ba5c255966a75abfaad7579a03b25a3d7db` — `Prepare layered dispatch manifests and isolated report slots`
  3. `b7e9ca0b0276eb3c4e244780d0b44e6514b801e5` — `Add native WSL launcher and run-local dispatch staging`
  4. `4e67bb2120a18a43197ac2784846b8de1121417e` — `Wait for MCP readiness before submitting initial run prompt`
  5. `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7` — `ci: add test and docs workflows and pr-review skill` (R1 head)
  6. `e1fdb0004d56e2efda5be5919d07105136ee6080` — `docs(review): add PR #1 review report for rebuild/wsl-dispatch (ee10ebc..6d6ad31)`
  7. `281c04ab2cb342f4e9ed754a1e08dae7673bb688` — `fix: remediate PR #1 review findings across dispatch, handoffs, MCP server, launcher, and docs`
  8. `45a66d1ee720194c1b5416003ae819dcbed886ff` + R2 working-tree remediation — closes `RUN-003`, `RUN-004`, `SVC-003`, and `TEST-GAP-001`.
- **CI Runs Examined at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`:**
  - **CI Workflow (`pull_request`):** Run [`42468601060`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468601060) — executed against GitHub merge commit `d718d7d219ce7c8682553ef6f88037c837c58ba7` (`headSha: 281c04ab2cb342f4e9ed754a1e08dae7673bb688`). Passed `npm test` and `npm pack --dry-run --json` on `ubuntu-latest` across Node 22 (`15s`) and Node 24 (`13s`).
  - **CI Workflow (`push`):** Run [`42468598397`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468598397) — executed directly against branch head `281c04ab2cb342f4e9ed754a1e08dae7673bb688`. Passed `npm test` and `npm pack --dry-run --json` on `ubuntu-latest` across Node 22 (`14s`) and Node 24 (`12s`).
  - **Documentation Workflow (`pull_request`):** Run [`42468601065`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468601065) — executed against merge commit `d718d7d219ce7c8682553ef6f88037c837c58ba7`. Passed `zensical build` (`11s`); `deploy` job skipped cleanly (`if: github.event_name != 'pull_request' && needs.build.outputs.has_pages == 'true'`).
  - **Documentation Workflow (`push`):** Run [`42468598360`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468598360) — executed against branch head `281c04ab2cb342f4e9ed754a1e08dae7673bb688`. Passed `zensical build` (`8s`); `deploy` job skipped cleanly because GitHub Pages is not enabled on the repository (`has_pages == false`).
- **Evidence Actually Available and Examined:**
  - Full repository sources at base `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`, R1 head `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7`, `281c04ab2cb342f4e9ed754a1e08dae7673bb688`, and the R2 working tree.
  - Historical design paper and contracts in git history (`docs/plans/2026-04-06-agy-squad-architecture-and-benchmark-design.md`, `docs/plans/LEDGER.md` at `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`).
  - External Devin review artifacts at `/home/paragon-ux/Antigravity/artifacts/devin-agy-squad-issue-ledger.md` and `/home/paragon-ux/Antigravity/artifacts/devin-agy-squad-bugs-and-flags.md`.
  - Sibling benchmark repository `/home/paragon-ux/Antigravity/workspace/antigravity-swarm-orchestration-suite` (read-only cross-reference).
  - Local execution on WSL Linux (`node v22.19.0`, `python3 3.12.3`) of `npm test`, `npm pack --dry-run --json`, pre-fix reproduction probes for `RUN-003`, `RUN-004`, and `SVC-003`, and post-fix verification.
  - Operator-authorized 1-specialist live subagent trial (`squadId: "live_pow_r2"`, child conversation [`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`](conversation://1e211e57-a046-4b5a-8fdf-46a2dcd8a083)) exercising `handleDispatchSquad` -> `invoke_subagent` -> Reactive Wakeup `READY` receipt (`272` UTF-8 bytes) -> `node mcp/handoffs.mjs` (`fingerprint`, `inspect`, `bundle`, `verify`, `prune`).
- **Scope and Exclusions:**
  - Full re-review of all 29 changed files in `ee10ebc255f0d52dc93b51d7cf8198bb069c4532..HEAD`, all 13 R1 findings + 2 R1 verification gaps, and all findings/flags from `devin-agy-squad-issue-ledger.md` and `devin-agy-squad-bugs-and-flags.md`.
  - Per decision `L7` ([docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L11)), automated `npm test` suites launch zero real subagents; exactly one live subagent (`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`) was launched under explicit operator authorization to verify the revised Pointer-Over-Wire slot hierarchy, `<= 500` byte receipt grammar, and `mcp/handoffs.mjs` lifecycle (`TEST-GAP-001` closed for single-specialist lifecycle). Interactive `agy` TUI startup via `bin/terminal.py` remains tracked as non-blocking verification gap `SCRIPT-GAP-002`.

---

## 2. File-to-Category Inventory and Coverage Matrix

### Changed-File Inventory (`ee10ebc255f0d52dc93b51d7cf8198bb069c4532..HEAD`)

| Path | R1 Delta (`ee10ebc..6d6ad31`) | R2 Remediation Delta (`e1fdb00..HEAD`) | Primary Category | Cross-Referenced Categories | Review Status |
| --- | --- | --- | --- | --- | --- |
| `docs/plans/LEDGER.md` | Modified (`+16/-94`) | Modified (`+5/-3`) | `ARCH` | `DOC`, `SVC`, `RUN` | Reviewed & Rechecked |
| `docs/plans/docker-sandbox-plan.md` | Deleted (`-299`) | Unchanged | `ARCH` | `DOC` | Reviewed |
| `docs/plans/wsl-cli-verification.md` | Added (`+45`) | Modified (`+2/-0`) | `DOC` | `ARCH`, `TEST`, `SCRIPT` | Reviewed & Rechecked |
| `README.md` | Modified (`+49/-35`) | Unchanged | `DOC` | `ARCH`, `DEP`, `TEST` | Reviewed |
| `docs/index.md` | Modified (`+3/-36`) | Unchanged | `DOC` | `DEP` | Reviewed |
| `docs/tools.md` | Modified (`+39/-76`) | Modified (`+4/-3`) | `DOC` | `MCP`, `RUN`, `SVC` | Reviewed & Rechecked |
| `docs/stopping-agents.md` | Modified (`+6/-57`) | Unchanged | `DOC` | `SVC`, `SCRIPT` | Reviewed |
| `docs/architecture.md` | Deleted (`-103`) | Unchanged | `DOC` | `ARCH` | Reviewed |
| `docs/configuration.md` | Deleted (`-112`) | Unchanged | `DOC` | `DEP`, `MCP` | Reviewed |
| `docs/getting-started.md` | Deleted (`-127`) | Unchanged | `DOC` | `DEP` | Reviewed |
| `docs/troubleshooting.md` | Deleted (`-83`) | Unchanged | `DOC` | `DOC` | Reviewed |
| `docs/reviews/rebuild-wsl-dispatch-review.md` | Added in `e1fdb00` (`+552`) | Unchanged | `DOC` | `SKILL` | Retained R1 Review Record |
| `docs/reviews/rebuild-wsl-dispatch-review-r2.md` | Added in `45a66d1` | Updated in R2 | `DOC` | `SKILL` | Active R2 Follow-Up Review Record |
| `skills/agy-squad/SKILL.md` | Deleted (`-215`) | Unchanged | `SKILL` | `ARCH`, `MCP` | Reviewed |
| `.agents/skills/pr-review/SKILL.md` | Added (`+96`) | Unchanged | `SKILL` | `DOC` | Reviewed |
| `.agents/skills/pr-review/references/pr-review-standard.md` | Added (`+152`) | Unchanged | `SKILL` | `ARCH`, `DOC` | Reviewed |
| `mcp/index.js` | Modified (`+55/-111`) | Modified (`+53/-11`) | `MCP` | `RUN`, `SVC` | Reviewed & Rechecked |
| `mcp/dispatch.mjs` | Modified (`+102/-137`) | Modified (`+6/-3`) | `RUN` | `MCP`, `SVC`, `ARCH` | Reviewed & Rechecked |
| `mcp/briefs.mjs` | Modified (`+49/-179`) | Modified (`+6/-3`) | `RUN` | `SKILL`, `DOC`, `MCP`, `ARCH` | Reviewed & Rechecked |
| `mcp/handoffs.mjs` | Added (`+230`) | Modified (`+34/-11`) | `SVC` | `RUN`, `ARCH`, `SCRIPT` | Reviewed & Rechecked |
| `mcp/run-state.mjs` | Added (`+61`) | Unchanged | `SVC` | `RUN`, `DB` | Reviewed |
| `bin/agy-squad.mjs` | Added (`+189`) | Modified (`+24/-5`) | `SVC` | `SKILL`, `DEP`, `SCRIPT`, `ARCH` | Reviewed & Rechecked |
| `bin/terminal.py` | Added (`+102`) | Modified (`+1/-1`) | `SCRIPT` | `SVC`, `RUN`, `TEST` | Reviewed & Rechecked |
| `tests/legacy/test-security-canary-re-trial.mjs` | Deleted (`-256`) | Unchanged | `TEST` | `ARCH` | Reviewed |
| `tests/test-briefs.mjs` | Deleted (`-127`) | Unchanged | `TEST` | `RUN` | Reviewed |
| `tests/test-dispatch.mjs` | Modified (`+66/-92`) | Modified (`+18/-2`) | `TEST` | `RUN`, `MCP` | Reviewed & Rechecked |
| `tests/test-handoffs.mjs` | Added (`+105`) | Modified (`+27/-0`) | `TEST` | `SVC`, `RUN`, `SCRIPT` | Reviewed & Rechecked |
| `tests/test-run.mjs` | Added (`+147`) | Modified (`+40/-5`) | `TEST` | `SVC`, `SCRIPT`, `SKILL` | Reviewed & Rechecked |
| `tests/test-server.mjs` | Modified (`+25/-45`) | Modified (`+46/-2`) | `TEST` | `MCP`, `RUN` | Reviewed & Rechecked |
| `.github/workflows/ci.yml` | Added (`+48`) | Unchanged | `TEST` | `DEP` | Reviewed |
| `.github/workflows/docs.yml` | Modified (`+18/-4`) | Unchanged | `DEP` | `DOC`, `TEST` | Reviewed |
| `package.json` | Modified (`+4/-5`) | Unchanged | `DEP` | `TEST`, `SCRIPT` | Reviewed |
| `zensical.toml` | Modified (`+1/-3`) | Unchanged | `DEP` | `DOC` | Reviewed |
| `.gitignore` | Unchanged in R1 | Modified (`+2/-0`) | `DEP` | `SVC` | Reviewed & Rechecked |

### Unchanged Repository Files Examined

| Path | Purpose | Categories Informed |
| --- | --- | --- |
| `LICENSE` | ISC license metadata | `DEP` |

### Category Coverage Matrix

| Category ID | Category Name | Coverage Status | Open P1 | Open P2 | Open P3 | Closed in R2 | Open Verification Gaps | Category Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ARCH` | Architecture and contracts | `Complete` | `0` | `0` | `0` | `1` (`ARCH-001`) | `0` | **No findings within reviewed scope** |
| `DOC` | Documentation and change records | `Complete` | `0` | `0` | `0` | `2` (`DOC-001`, `DOC-002`) | `0` | **No findings within reviewed scope** |
| `SKILL` | Skills and agent instructions | `Complete` | `0` | `0` | `0` | `1` (`SKILL-001`) | `0` | **No findings within reviewed scope** |
| `MCP` | MCP schemas and public API | `Complete` | `0` | `0` | `0` | `3` (`MCP-001`, `MCP-002`, `MCP-003`) | `0` | **No findings within reviewed scope** |
| `RUN` | Core runtime, parsing, and validation | `Complete` | `0` | `0` | `0` | `4` (`RUN-001`, `RUN-002`, `RUN-003`, `RUN-004`) | `0` | **No findings within reviewed scope** |
| `SVC` | Services, orchestration, and audit semantics | `Complete` | `0` | `0` | `0` | `3` (`SVC-001`, `SVC-002`, `SVC-003`) | `0` (`SVC-GAP-001` closed) | **No findings within reviewed scope** |
| `DB` | Database, migrations, replay, and concurrency | `Complete` | `0` | `0` | `0` | `0` | `0` | **Not applicable** |
| `SCRIPT` | Scripts, evaluation, and developer tooling | `Complete` | `0` | `0` | `0` | `1` (`SCRIPT-001`) | `1` (`SCRIPT-GAP-002`; `SCRIPT-GAP-001` closed) | **No findings within reviewed scope** |
| `TEST` | Tests and CI | `Complete` | `0` | `0` | `0` | `1` (`TEST-001`) | `0` (`TEST-GAP-001` closed for 1-specialist live flow; cross-refs `SCRIPT-GAP-002`) | **No findings within reviewed scope** |
| `DEP` | Dependencies, packaging, and configuration | `Complete` | `0` | `0` | `0` | `1` (`DEP-001`) | `0` | **No findings within reviewed scope** |

---

## 3. Architecture-to-Implementation Trace

All four architectural trace chains from R1 ([rebuild-wsl-dispatch-review.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/reviews/rebuild-wsl-dispatch-review.md#L114-L162)) and the external Devin review artifacts were re-verified after applying the R2 remediations:

1. **Trace 1 — Native Subagent Compilation & Preset Capabilities (`L3, L5`, `L6`, `L18, L19`, `L31`):**
   - `manifestSquads` ([mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L43-L52)) rejects `"all_l1"` as a user squad key (`RUN-001` **Closed**), and `handleDispatchSquad` ([mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L106-L129)) isolates `squad.lead` from top-level squad fields and validates all specialist specs during every `all_l1` call (`RUN-002` **Closed**).
   - `buildSubagentSpec` ([mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L35-L50)) now defaults all compiled assignments to `TypeName: "self"` (`TypeName: spec.typeName ?? spec.TypeName ?? "self"`), explicitly rejects read-only `TypeName === "research"` (`RUN-003` **Closed**), and unconditionally requires `payload.Workspace === "inherit"` across both unmanaged and managed runs (`RUN-004` **Closed**).

2. **Trace 2 — Pointer-Over-Wire Receipts, Independent Synthesis Verification, and Report Cleanup (`L1, L2`, `L8–L12`, `L30`):**
   - `LEDGER.md` ([docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L7-L20)) records active decisions for `L1, L2`, `L8–L12`, `L17`, and `L30` (`DOC-001` **Closed**).
   - `verifyFiles`, `publish`, `readSynthesis`, `bundleReports`, and `verifyBundle` ([mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L98-L215)) reject array/non-object `verifiedFiles`, forbid `lead/report.md` and `lead/report.sources.json` inside `verifiedFiles`, atomically replace `lead/report.sources.json` via `fs.renameSync` when `lead/report.md` is updated (`SVC-001` **Closed**), and verify via `readSynthesis` ([mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L144-L158)) that `lead/report.md` is valid UTF-8 Markdown recording an unambiguous `PASS` verdict with no `FAIL` or `BLOCKED` verdicts before bundling or verifying/pruning (`SVC-003` **Closed**).

3. **Trace 3 — Workspace Containment, Permission Boundaries, and Staged Plan Immutability (`L1, L2`, `L17`, `L21, L40`):**
   - `runSession` ([bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L136-L143)) adds `write_file(${path.join(workspace, dispatch.manifestPath)})` to `settings.permissions.deny` whenever `dispatch` is pre-staged, and `docs/plans/LEDGER.md` ([docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L7)) documents that host permissions confine workspace access and protect session registrations/staged manifests while intra-workspace scope and report slots are verified via receipts and SHA-256 hashes (`ARCH-001` **Closed**).

4. **Trace 4 — Native WSL Launcher, Per-Run Isolation, and Readiness Gate (`L7`, `L17`, `bin/agy-squad.mjs`, `bin/terminal.py`, `mcp/index.js`):**
   - `makeProfile` ([bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L49-L52)) includes `read_file`, `write_file`, `edit_file`, and `manage_task` (`SKILL-001` **Closed**); `runSession` ([bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L89-L96), [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L162-L166)) cleans up unconsumed pre-staged `plan-<hash>` directories on non-zero exit when no `report.md` exists (`SVC-002` **Closed**); and `bin/terminal.py` ([bin/terminal.py](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/terminal.py#L51)) holds operator `stdin` until `submitted` is `True` (`SCRIPT-001` **Closed**).
   - End-to-end live verification of the revised `squad-<id>/(lead|specialist-1)/report.md` slots, `<= 500` UTF-8 byte `READY` receipt (`272` bytes), and `mcp/handoffs.mjs` (`fingerprint`, `inspect`, `bundle`, `verify`, `prune`) passed on November 8, 2026 via live subagent [`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`](conversation://1e211e57-a046-4b5a-8fdf-46a2dcd8a083) (`TEST-GAP-001` closed for single-specialist lifecycle; recorded in [docs/plans/wsl-cli-verification.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/wsl-cli-verification.md#L47)).

---

## 4. Category Sections

### 4.1 `ARCH` — Architecture and Contracts

1. **Scope:** Primary: [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L1-L21), deleted `docs/plans/docker-sandbox-plan.md`. Cross-referenced: [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L120-L145), [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L35-L50), [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L144-L199).
2. **Coverage:** `Complete` — all architectural ledger rows (`L1`–`L40`) and boundary enforcement points in `bin/agy-squad.mjs`, `mcp/briefs.mjs`, and `mcp/handoffs.mjs` were reviewed.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope (`0` open; `1` closed in R2: `ARCH-001`).
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - **Tests inspected & executed:** [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L168-L170) (verifies `write_file` deny rule on pre-staged `manifest.json`).
   - **CI evidence inspected:** GitHub Actions runs `42468601060` (`pull_request`) and `42468598397` (`push`).
   - **Missing proof / verification gaps:** None in `ARCH`.
7. **Verdict:** **No findings within reviewed scope**

#### Closed Findings Rechecked in R2 (`ARCH`)

- **`ARCH-001` (P2 — Closed):** *`L1, L2` host-enforced boundary ledger claim vs. shared `Workspace: "inherit"` and writable pre-staged `manifest.json` under `run.directory`.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L136-L143) adds `...(dispatch ? [\`write_file(\${path.join(workspace, dispatch.manifestPath)})\`] : [])` to `settings.permissions.deny`. [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L7) explicitly records the WSL architectural boundary: host permissions confine access to the workspace and protect session registrations and staged manifests, while intra-workspace file scope and sibling report slots are verified through receipts and SHA-256 hashes (`mcp/handoffs.mjs`). Verified by [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L168-L170) in local `npm test` and CI runs `42468601060` and `42468598397`.
  - **Reviewer recheck:** Confirmed that `--launch --manifest plan.json` emits the exact `write_file(<workspace>/<run>/plan-<hash>/manifest.json)` deny rule in `--settings` JSON and that `docs/plans/LEDGER.md` explicitly records the prompt-vs-host boundary limitation noted in [devin-agy-squad-issue-ledger.md](file:///home/paragon-ux/Antigravity/artifacts/devin-agy-squad-issue-ledger.md#L77-L78,L117-L118).
  - **Residual limitations:** Inline manifests staged dynamically during a session (`--launch` without `--manifest`) remain protected by the runtime write-once SHA-256 content-hash check in `stagePlan` ([mcp/run-state.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/run-state.mjs#L42-L54)), and `mcp/handoffs.mjs` (`inspect`, `bundle`, `verify`, `prune`) is invoked explicitly rather than wired as an automatic post-run gate in `bin/agy-squad.mjs`.

---

### 4.2 `DOC` — Documentation and Change Records

1. **Scope:** Primary: [README.md](file:///home/paragon-ux/Antigravity/Agy-Squad/README.md#L1-L87), [docs/index.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/index.md#L1-L5), [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L1-L63), [docs/stopping-agents.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/stopping-agents.md#L1-L7), [docs/plans/wsl-cli-verification.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/wsl-cli-verification.md#L1-L47), deleted legacy docs (`docs/architecture.md`, `docs/configuration.md`, `docs/getting-started.md`, `docs/troubleshooting.md`). Cross-referenced: [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L1-L21), [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L35-L50).
2. **Coverage:** `Complete` — all active and deleted documentation files, ledger cross-references, and Zensical build outputs were reviewed.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope (`0` open; `1` closed in R2: `DOC-001`).
5. **P3 — low priority:** None identified within reviewed scope (`0` open; `1` closed in R2: `DOC-002`).
6. **Verification:**
   - **Tests inspected & executed:** `zensical build --clean` verified in GitHub Actions Documentation runs [`42468601065`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468601065) and [`42468598360`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468598360); source reconciliation of [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L17,L44,L62) and [docs/plans/wsl-cli-verification.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/wsl-cli-verification.md#L47).
   - **Missing proof / verification gaps:** None in `DOC`.
7. **Verdict:** **No findings within reviewed scope**

#### Closed Findings Rechecked in R2 (`DOC`)

- **`DOC-001` (P2 — Closed):** *`docs/plans/LEDGER.md` silently drops `L10`, `L12`, `L17`, and `L30` from `ee10ebc`.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L13-L19) restores `L10` and `L12` into the superseded platform row (`L8–L12, L35, L36, L38`: Windows native-jail, Windows 24H2 terminal-sandbox, and Docker workspace/per-agent container designs retired), adds active row `L17` (running the managed CLI session under `--sandbox` on WSL via `bin/agy-squad.mjs` with write/launch tools omitted during payload review), and restores active row `L30` (publishing documentation as a Zensical site via `zensical.toml` and `.github/workflows/docs.yml`).
  - **Reviewer recheck:** Compared [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L1-L21) against `ee10ebc:docs/plans/LEDGER.md` and confirmed every ledger ID from `ee10ebc` is accounted for (`L1`–`L12`, `L16`–`L24`, `L28`–`L31`, `L35`–`L40`).
  - **Residual limitations:** None.
- **`DOC-002` (P3 Advisory — Closed):** *`docs/tools.md` top-level `dispatch_squad` argument table omits the managed-run `manifest` parameter.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L9) adds the `manifest` parameter row (`Managed runs only. An inline object with a squads map; mutually exclusive with manifestPath.`).
  - **Reviewer recheck:** Confirmed table accuracy against `TOOLS[0].inputSchema` in [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L43-L64).
  - **Residual limitations:** None.

---

### 4.3 `SKILL` — Skills and Agent Instructions

1. **Scope:** Primary: [.agents/skills/pr-review/SKILL.md](file:///home/paragon-ux/Antigravity/Agy-Squad/.agents/skills/pr-review/SKILL.md#L1-L96), [.agents/skills/pr-review/references/pr-review-standard.md](file:///home/paragon-ux/Antigravity/Agy-Squad/.agents/skills/pr-review/references/pr-review-standard.md#L1-L152), deleted `skills/agy-squad/SKILL.md`. Cross-referenced: `makeProfile` in [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L42-L58), prompt templates in [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L1-L79).
2. **Coverage:** `Complete` — reviewed all skill definitions, generated session agent profile tool lists, and compiled subagent prompt instructions.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope (`0` open; `1` closed in R2: `SKILL-001`).
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - **Tests inspected & executed:** [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L144-L153) (verifies `read_file`, `write_file`, `edit_file`, and `manage_task` in `makeProfile`).
   - **CI evidence inspected:** GitHub Actions runs `42468601060` and `42468598397`.
   - **Missing proof / verification gaps:** None in `SKILL`.
7. **Verdict:** **No findings within reviewed scope**

#### Closed Findings Rechecked in R2 (`SKILL`)

- **`SKILL-001` (P2 — Closed):** *Generated session agent profile (`makeProfile`) allowlists only legacy IDE tool names (`view_file`, `write_to_file`, `replace_file_content`, `command_status`) and omits current WSL CLI tool names (`read_file`, `write_file`, `edit_file`, `manage_task`).*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L49-L52) includes `read_file` in the base profile tools and `write_file`, `edit_file`, and `manage_task` in `--launch` profile tools while preserving the legacy aliases. Verified by [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L144-L153).
  - **Reviewer recheck:** Confirmed that preview runs still exclude `write_file`, `edit_file`, `write_to_file`, `run_command`, and `invoke_subagent`, while `--launch` runs include both current and legacy tool names.
  - **Residual limitations:** None.

---

### 4.4 `MCP` — MCP Schemas and Public API

1. **Scope:** Primary: [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L1-L178). Cross-referenced: [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L1-L113), [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L1-L63), [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L35-L50).
2. **Coverage:** `Complete` — reviewed JSON-RPC 2.0 framing, error codes, byte limits, session gating, `.mcp-ready` publication, and `TOOLS[0].inputSchema` (including `agentSchema.properties.workspace.enum = ["inherit"]`).
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope (`0` open; `3` closed in R2: `MCP-001`, `MCP-002`, `MCP-003`).
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - **Tests inspected & executed:** [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L1-L113) in local `npm test` and CI runs `42468601060` and `42468598397`.
   - **Missing proof / verification gaps:** None in `MCP`.
7. **Verdict:** **No findings within reviewed scope**

#### Closed Findings Rechecked in R2 (`MCP`)

- **`MCP-001` (P2 — Closed):** *`mcp/index.js` mishandles non-object JSON payloads, mislabels runtime exceptions as `-32700 Parse error`, and checks UTF-16 code units instead of UTF-8 bytes.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L71-L75) validates request shape (`!request || typeof request !== "object" || Array.isArray(request) || typeof request.method !== "string" || !request.method.trim()`) and returns `-32600 Invalid Request`. [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L118-L155) checks `Buffer.byteLength(line, "utf8") > MAX_STDIO_PAYLOAD_BYTES`, separates `JSON.parse` (`-32700`) from `handleRequest` (`-32603`), and preserves `parsed.id`. Verified by [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L66-L69).
  - **Reviewer recheck:** Verified all JSON-RPC 2.0 error codes (`-32700`, `-32600`, `-32601`, `-32603`) and byte-length guards in `mcp/index.js`.
  - **Residual limitations:** None.
- **`MCP-002` (P2 — Closed):** *`dispatch_squad` `inputSchema` omits `minLength: 1` on `squadId` and `manifestPath` and omits `minProperties: 1` / agent item schemas on `manifest`.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688` + R2 working-tree update (`workspace: { type: "string", enum: ["inherit"] }`)
  - **Evidence at that revision:** [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L19-L68) defines `agentSchema` (requiring `objective` and `scopeFiles` with `minLength: 1` / `minItems: 1` and `workspace` with `enum: ["inherit"]`) and sets `minLength: 1` on `squadId` and `manifestPath` and `minProperties: 1` on `manifest.properties.squads`. Verified by [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L55-L56) and [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L83-L86).
  - **Reviewer recheck:** Confirmed schema alignment between `mcp/index.js`, `mcp/dispatch.mjs`, and `mcp/briefs.mjs`.
  - **Residual limitations:** Cross-field exclusivity (`manifest` XOR `manifestPath` in managed runs) remains enforced in `handleDispatchSquad` because Antigravity's tool schema validator restricts top-level combinators (`oneOf`/`anyOf`).
- **`MCP-003` (P2 — Closed):** *`.mcp-ready` publication in `mcp/index.js` fails when `AGY_SQUAD_WORKSPACE` is unset or a symlinked path.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L143-L144) resolves `const root = fs.realpathSync(process.env.AGY_SQUAD_WORKSPACE || process.cwd());` before calling `publish(root, ...)`. Verified by [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L74-L86), which spawns `mcp/index.js` without `AGY_SQUAD_WORKSPACE` in `env` and verifies `.mcp-ready` is written.
  - **Reviewer recheck:** Confirmed `publish(root, ...)` succeeds when `AGY_SQUAD_WORKSPACE` is omitted or symlinked.
  - **Residual limitations:** None.

---

### 4.5 `RUN` — Core Runtime, Parsing, and Validation

1. **Scope:** Primary: [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L1-L140), [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L1-L79). Cross-referenced: [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L19-L32), [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L160-L168), [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L17-L63), [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L1-L108).
2. **Coverage:** `Complete` — reviewed manifest loading, symlink/fd containment, squad/lead/specialist validation, native payload compilation, default `TypeName` selection, and `Workspace` validation across managed and unmanaged modes.
3. **P1 — high priority:** None identified within reviewed scope (`0` open; `3` closed in R2: `RUN-001`, `RUN-003`, `RUN-004`).
4. **P2 — medium priority:** None identified within reviewed scope (`0` open; `1` closed in R2: `RUN-002`).
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - **Tests inspected & executed:** [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L1-L108) executed locally (`node v22.19.0`) and in CI runs `42468601060` and `42468598397`; operator-authorized live subagent [`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`](conversation://1e211e57-a046-4b5a-8fdf-46a2dcd8a083) compiled without `typeName` or `workspace`, launched with `TypeName: "self"` and `Workspace: "inherit"`, and wrote `scratch/agy-squad/squad-live_pow_r2/specialist-1/report.md` (`4,897` bytes).
   - **Missing proof / verification gaps:** None in `RUN`.
7. **Verdict:** **No findings within reviewed scope**

#### Closed Findings Rechecked in R2 (`RUN`)

- **`RUN-001` (P1 — Closed):** *`manifestSquads` allows reserved `"all_l1"` as a squad key, making its specialists unreachable and colliding with `all_l1` lead compilation.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L48-L50) checks `if (Object.hasOwn(squads, "all_l1")) throw new Error("Squad ID 'all_l1' is reserved for lead compilation.");`. Verified by [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L85-L88).
  - **Reviewer recheck:** Confirmed that both file-backed (`readManifest`) and inline (`manifestSquads`) manifests reject `squads.all_l1` before any compilation or staging occurs.
  - **Residual limitations:** None.
- **`RUN-002` (P2 — Closed):** *`all_l1` lead compilation leaks top-level squad properties into `squad.lead` via `{ ...squad, ...lead }` and skips specialist validation in unmanaged mode.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L117) returns `{ spec: lead, id }` when `squad.lead` is present, and [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L125-L126) validates `children` (`specialistAssignments` + `build(child)`) unconditionally on all `all_l1` calls. Verified by [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L81-L84).
  - **Reviewer recheck:** Confirmed that unmanaged `all_l1` calls reject squads with empty/missing `specialists` or invalid specialist specs before returning leads, and top-level squad fields no longer bleed into `squad.lead`.
  - **Residual limitations:** None.
- **`RUN-003` (P1 — Closed):** *Default specialists in unmanaged mode receive read-only `TypeName: "research"` while their compiled brief requires writing a Markdown report to `scratch/agy-squad/squad-<id>/specialist-<N>/report.md`.*
  - **Title, priority, status:** `RUN-003` — Default specialists in unmanaged mode receive read-only `TypeName: "research"` while their compiled brief requires writing `report.md` | Priority: **P1** | Status: **Closed**
  - **Contract provenance:** Pointer-Over-Wire contract in [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L17,L44) and Antigravity's native subagent preset contract (`research` runs in a read-only sandbox without `write_file`, `edit_file`, or `run_command`). Reconciled from [devin-agy-squad-bugs-and-flags.md](file:///home/paragon-ux/Antigravity/artifacts/devin-agy-squad-bugs-and-flags.md#L1-L15) and [devin-agy-squad-issue-ledger.md](file:///home/paragon-ux/Antigravity/artifacts/devin-agy-squad-issue-ledger.md#L43).
  - **Source evidence:** `buildSubagentSpec` in [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L35-L47), [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L17,L44), and [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L42-L46,L88-L91).
  - **Trigger:** Call `dispatch_squad({ squadId: "alpha", manifestPath: "swarm-manifest.json" })` in unmanaged mode where a specialist entry omits `typeName` or explicitly sets `typeName: "research"`.
  - **Expected / actual (pre-fix):** Expected all report-writing assignments to default to writable `TypeName: "self"` and reject `"research"`. Pre-fix `mcp/briefs.mjs:36` evaluated `isLead || reportRoot ? "self" : "research"`, returning `TypeName: "research"` for unmanaged specialists without `typeName`.
  - **Impact:** Default unmanaged specialists could not write `report.md` under real Antigravity tool permissions.
  - **Required remediation:** Default `TypeName` to `"self"` for all compiled assignments (`TypeName: spec.typeName ?? spec.TypeName ?? "self"`), reject `payload.TypeName === "research"`, and update `docs/tools.md` and `tests/test-dispatch.mjs`.
  - **Acceptance evidence:** [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L42-L46,L88-L91) asserts default `TypeName: "self"` on unmanaged specialists and rejection of `typeName: "research"`, plus live subagent [`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`](conversation://1e211e57-a046-4b5a-8fdf-46a2dcd8a083) wrote `scratch/agy-squad/squad-live_pow_r2/specialist-1/report.md` (`4,897` bytes) with the default `TypeName: "self"`.
  - **Root cause / related IDs:** Incomplete parity between managed and unmanaged paths in `mcp/briefs.mjs`. Related to `RUN-004`.
  - **Closure:** Remediated in R2 working tree ([mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L36,L45-L47), [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L17,L44), [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L42-L46,L88-L91)); verified by `npm test` and live subagent `1e211e57-a046-4b5a-8fdf-46a2dcd8a083`. Residual limitations: None.
- **`RUN-004` (P1 — Closed):** *`buildSubagentSpec` permits `Workspace !== "inherit"` (such as `workspace: "branch"`) in unmanaged mode, causing specialists to write reports into isolated workspaces unreachable from the parent's shared report slot.*
  - **Title, priority, status:** `RUN-004` — Unmanaged assignments allow non-`"inherit"` `Workspace` (`"branch"`, `"share"`) while assigning shared workspace report slots | Priority: **P1** | Status: **Closed**
  - **Contract provenance:** Shared-workspace Pointer-Over-Wire invariant in `superviseCohort` ([mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L5)), unmanaged specialist prompt ([mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L69)), and `inspectHandoffs` ([mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L160-L168)). Reconciled from [devin-agy-squad-bugs-and-flags.md](file:///home/paragon-ux/Antigravity/artifacts/devin-agy-squad-bugs-and-flags.md#L33-L47).
  - **Source evidence:** `buildSubagentSpec` in [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L39-L50), `agentSchema` in [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L29), [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L44), [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L92-L95), and [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L85).
  - **Trigger:** Compile an unmanaged manifest containing an agent with `workspace: "branch"`.
  - **Expected / actual (pre-fix):** Expected `buildSubagentSpec` to reject `payload.Workspace !== "inherit"` in both unmanaged and managed modes. Pre-fix `mcp/briefs.mjs:45` checked `if (reportRoot && payload.Workspace !== "inherit")`, allowing `"branch"` in unmanaged mode.
  - **Impact:** Unmanaged `workspace: "branch"` assignments stranded written reports in isolated branch workspaces unreachable by the parent.
  - **Required remediation:** Remove the `reportRoot &&` condition in [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L48-L50) so `if (payload.Workspace !== "inherit")` rejects non-`"inherit"` workspaces unconditionally, and restrict `agentSchema.properties.workspace` to `enum: ["inherit"]` in [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L29).
  - **Acceptance evidence:** Verified by [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L92-L95) (`rejects(..., /Workspace 'inherit'/)`) and [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L85) (`enum: ["inherit"]`).
  - **Root cause / related IDs:** Incomplete parity between managed and unmanaged paths in `mcp/briefs.mjs`. Related to `RUN-003`.
  - **Closure:** Remediated in R2 working tree ([mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L48-L50), [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L29), [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L44)); verified by `npm test`. Residual limitations: None.

---

### 4.6 `SVC` — Services, Orchestration, and Audit Semantics

1. **Scope:** Primary: [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L1-L253), [mcp/run-state.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/run-state.mjs#L1-L61), [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L1-L208). Cross-referenced: [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L66-L72), [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L60-L63), [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L1-L132), [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L1-L182).
2. **Coverage:** `Complete` — reviewed receipt parsing, sender/slot reconciliation, file fingerprinting, synthesis verdict validation, bundle creation/verification, loose-report pruning, run-state staging, and launcher teardown.
3. **P1 — high priority:** None identified within reviewed scope (`0` open; `2` closed in R2: `SVC-001`, `SVC-003`).
4. **P2 — medium priority:** None identified within reviewed scope (`0` open; `1` closed in R2: `SVC-002`).
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - **Tests inspected & executed:** [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L1-L132) and [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L1-L182) in local `npm test`; end-to-end live execution of `node mcp/handoffs.mjs` (`fingerprint`, `inspect`, `bundle`, `verify`, `prune`) on squad `live_pow_r2` after live subagent [`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`](conversation://1e211e57-a046-4b5a-8fdf-46a2dcd8a083) returned `READY`.
   - **Missing proof / verification gaps:** None (`SVC-GAP-001` from R1 was closed in `281c04ab2cb342f4e9ed754a1e08dae7673bb688` by the two-process concurrent `stagePlan` test in [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L76-L95)).
7. **Verdict:** **No findings within reviewed scope**

#### Closed Findings Rechecked in R2 (`SVC`)

- **`SVC-001` (P1 — Closed):** *`bundleReports` fails permanently with `EEXIST` if `lead/report.md` is updated after an initial bundle, and `verifyFiles` accepts array `verifiedFiles` or `lead/report.md` inside `verifiedFiles`.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L99-L102) rejects non-object or array `verifiedFiles`; [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L178-L181) forbids `reportPath(squadId)` and `bundlePath(squadId)` inside `verifiedFiles`; [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L113-L137) and [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L190) pass `replace = true` in `bundleReports` so `publish` atomically replaces `lead/report.sources.json` via `fs.renameSync(temporary, destination)` when bundle contents change while keeping `replace = false` for `stagePlan` (`manifest.json`). Verified by [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L91-L95).
  - **Reviewer recheck:** Confirmed that updating `lead/report.md` and re-running `bundleReports` atomically updates `lead/report.sources.json` and returns the new SHA-256 digest, while `stagePlan` still rejects mutated `manifest.json` files.
  - **Residual limitations:** None.
- **`SVC-002` (P2 — Closed):** *Pre-staged `plan-<hash>/manifest.json` prevents `removeEmpty(run.directory)` from cleaning up `scratch/agy-squad/run-<id>` when `--manifest` sessions fail before running any agents.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L89-L96) defines `hasEvidence(directory)` and [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L162-L164) removes the pre-staged `plan-<hash>` directory on non-zero session exit when no `report.md` evidence exists in `run.directory`, allowing `removeEmpty(run.directory)` to remove the empty run directory. Verified by [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L171-L175).
  - **Reviewer recheck:** Confirmed that a failed `--launch --manifest plan.json --squad all_l1` session with exit status `7` and no `report.md` files removes `scratch/agy-squad/run-<id>` completely, whereas successful runs (`status === 0`) or runs with `report.md` evidence preserve the run directory.
  - **Residual limitations:** None.
- **`SVC-003` (P1 — Closed):** *`bundleReports` and `verifyBundle` trust `record.verdict === "PASS"` without verifying that `lead/report.md` records an unambiguous `PASS` synthesis verdict.*
  - **Title, priority, status:** `SVC-003` — `bundleReports` and `verifyBundle` validate `lead/report.md` synthesis verdict via `readSynthesis` | Priority: **P1** | Status: **Closed**
  - **Contract provenance:** Decision `L1, L2` ([docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L7)), lead synthesis contract in [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L66,L72), and bundle/cleanup gate in [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L62-L63). Reconciled from [devin-agy-squad-bugs-and-flags.md](file:///home/paragon-ux/Antigravity/artifacts/devin-agy-squad-bugs-and-flags.md#L17-L31) and [devin-agy-squad-issue-ledger.md](file:///home/paragon-ux/Antigravity/artifacts/devin-agy-squad-issue-ledger.md#L44,L78).
  - **Source evidence:** `readSynthesis` ([mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L144-L158)), `bundleReports` ([mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L170-L192)), `verifyBundle` ([mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L194-L215)), [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L62), and [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L79-L99).
  - **Trigger:** Pass `record.verdict = "PASS"` to `bundleReports` (or call `verifyBundle` / `pruneReports`) when `lead/report.md` contains `FAIL`, `BLOCKED`, conflicting verdicts, or no verdict token.
  - **Expected / actual (pre-fix):** Expected `bundleReports` and `verifyBundle` to reject any synthesis report that does not record an unambiguous `PASS` verdict. Pre-fix `mcp/handoffs.mjs` checked only `record.verdict !== "PASS"` and hashed `readEvidence(root, synthesisSlot)` without checking the synthesis verdict.
  - **Impact:** Failed or blocked cohorts could be bundled and have their loose specialist reports deleted by `pruneReports`.
  - **Required remediation:** Add `readSynthesis(root, report)` in [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L144-L158) and call it in both `bundleReports` and `verifyBundle` to enforce valid UTF-8 Markdown, an explicit line-anchored `PASS` verdict, and the absence of `FAIL` or `BLOCKED` verdicts.
  - **Acceptance evidence:** [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L79-L99) verifies that `bundleReports`, `verifyBundle`, and `pruneReports` throw `/unambiguous PASS verdict/` when `lead/report.md` states `FAIL`, `BLOCKED`, both `PASS` and `FAIL`, or no verdict token, and that no bundle is written or pruned. Also verified live on squad `live_pow_r2` (`bundle` -> `verify` -> `prune`).
  - **Root cause / related IDs:** `bundleReports` relied on `record.verdict` without inspecting `lead/report.md`. Related to `SVC-001` and `ARCH-001`.
  - **Closure:** Remediated in R2 working tree ([mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L144-L204), [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L62), [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L79-L99)); verified by `npm test` and live subagent `1e211e57-a046-4b5a-8fdf-46a2dcd8a083`. Residual limitations: Note that the sibling benchmark repository `/home/paragon-ux/Antigravity/workspace/antigravity-swarm-orchestration-suite` stages its own copy at `.benchmark-bin/agy-squad-handoffs.mjs` via `npm run setup:profiles`.

---

### 4.7 `DB` — Database, Migrations, Replay, and Concurrency

1. **Scope:** No SQL database, ORM, or schema migration files exist in `Agy-Squad`. File-backed state persistence (`mcp/run-state.mjs` and `mcp/handoffs.mjs`) was examined and cross-referenced under `SVC`.
2. **Coverage:** `Complete` — verified that the repository contains zero database or migration components.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope.
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:** File-system atomic write (`publish`) and two-process concurrency (`stagePlan`) verified under `SVC` ([tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L76-L95)).
7. **Verdict:** **Not applicable** (no database or migration layer in `Agy-Squad`; file-backed run-state and bundle concurrency are reviewed under `SVC`).

---

### 4.8 `SCRIPT` — Scripts, Evaluation, and Developer Tooling

1. **Scope:** Primary: [bin/terminal.py](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/terminal.py#L1-L102). Cross-referenced: CLI entrypoint in [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L235-L251), [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L1-L208), [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L1-L182), [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L126-L129).
2. **Coverage:** `Complete` — reviewed PTY bridge startup, readiness detection, signal forwarding, `stdin` gating, and CLI helper argument handling.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope (`0` open; `1` closed in R2: `SCRIPT-001`).
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - **Tests inspected & executed:** [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L1-L182) (exercises `bin/terminal.py` with a fake `agy` script) and [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L126-L129) + live trial `live_pow_r2` (exercises `node mcp/handoffs.mjs` `fingerprint`, `inspect`, `bundle`, `verify`, `prune` as subprocesses, closing `SCRIPT-GAP-001`).
   - **Missing proof / verification gaps:**
     - **`SCRIPT-GAP-002` (Open Non-Blocking Verification Gap):** *Native launcher startup screen-scraping readiness check in `bin/terminal.py` is tested against the fake `agy` PTY fixture rather than the interactive `agy` TUI.* In [bin/terminal.py](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/terminal.py#L63-L65), the PTY bridge detects CLI prompt readiness by checking `prompt_open = agent in header and b"? for shortcuts" in header` in the last 4,096 bytes of terminal output before sending `/mcp\r` ([bin/terminal.py](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/terminal.py#L80-L83)). Per decision `L7`, automated tests in `tests/test-run.mjs` use a synthetic fake `agy` executable rather than launching an interactive `agy` session.
7. **Verdict:** **No findings within reviewed scope**

#### Closed Findings Rechecked in R2 (`SCRIPT`)

- **`SCRIPT-001` (P2 — Closed):** *`bin/terminal.py` forwards operator `stdin` to the child PTY before `/mcp` readiness and initial prompt submission complete.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [bin/terminal.py](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/terminal.py#L51) changes the `select.select` read list from `[master, stdin]` to `[master, stdin] if submitted else [master]`.
  - **Reviewer recheck:** Confirmed that `stdin` is not polled or written to `master` until `submitted` becomes `True` (or until `prompt` is empty, where `submitted = not bool(prompt)` starts as `True`).
  - **Residual limitations:** Interactive `agy` TUI banner screen-scraping remains tracked as non-blocking verification gap `SCRIPT-GAP-002`.

---

### 4.9 `TEST` — Tests and CI

1. **Scope:** Primary: [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L1-L108), [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L1-L132), [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L1-L182), [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L1-L113), [.github/workflows/ci.yml](file:///home/paragon-ux/Antigravity/Agy-Squad/.github/workflows/ci.yml#L1-L48), deleted `tests/test-briefs.mjs` and `tests/legacy/test-security-canary-re-trial.mjs`. Cross-referenced: [docs/plans/wsl-cli-verification.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/wsl-cli-verification.md#L35-L47).
2. **Coverage:** `Complete` — inspected and executed all assertions across all four test suites and verified the revised Pointer-Over-Wire protocol in an operator-authorized live subagent test (`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`).
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope (`0` open; `1` closed in R2: `TEST-001`).
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - **Tests inspected & executed:** `npm test` executed locally (`node v22.19.0`, `python3 3.12.3`) and in CI runs [`42468601060`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468601060) and [`42468598397`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468598397) across Node 22 and Node 24; operator-authorized 1-specialist live subagent test (`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`) executed and recorded in [docs/plans/wsl-cli-verification.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/wsl-cli-verification.md#L47) (`TEST-GAP-001` closed for single-specialist revised report slots, `<= 500` byte `READY` receipt, and `mcp/handoffs.mjs` lifecycle).
   - **Missing proof / verification gaps:** Cross-references `SCRIPT-GAP-002` (interactive `bin/terminal.py` startup banner check).
7. **Verdict:** **No findings within reviewed scope**

#### Closed Findings Rechecked in R2 (`TEST`)

- **`TEST-001` (P2 — Closed):** *`tests/test-server.mjs` does not test managed-run session gating (`AGY_SQUAD_RUN_DIR` / `AGY_SQUAD_SESSION`), inline `manifest` schema exposure, `.mcp-ready` publication, or malformed JSON-RPC requests.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L55-L104) asserts `minLength: 1` on `squadId` and `manifestPath`, tests malformed JSON-RPC requests (`null`, `123`, `[]`, missing `method` -> `-32600`), spawns `mcp/index.js` in an active managed run (`AGY_SQUAD_RUN_DIR === AGY_SQUAD_SESSION`) to verify `manifest` schema exposure (`minProperties: 1`, `workspace.enum: ["inherit"]`) and `.mcp-ready` file creation, and spawns `mcp/index.js` with a mismatched `AGY_SQUAD_SESSION` to verify `tools/list` returns `[]` and `tools/call` returns `-32601`.
  - **Reviewer recheck:** Executed `npm test` locally and on GitHub Actions CI runs `42468601060` and `42468598397` across Node 22 and Node 24; all 4 test files pass.
  - **Residual limitations:** None.

---

### 4.10 `DEP` — Dependencies, Packaging, and Configuration

1. **Scope:** Primary: [.gitignore](file:///home/paragon-ux/Antigravity/Agy-Squad/.gitignore#L1-L8), [package.json](file:///home/paragon-ux/Antigravity/Agy-Squad/package.json#L1-L30), [zensical.toml](file:///home/paragon-ux/Antigravity/Agy-Squad/zensical.toml#L1-L89), [.github/workflows/docs.yml](file:///home/paragon-ux/Antigravity/Agy-Squad/.github/workflows/docs.yml#L1-L75). Unchanged dependency examined: [LICENSE](file:///home/paragon-ux/Antigravity/Agy-Squad/LICENSE).
2. **Coverage:** `Complete` — reviewed package entrypoints, `files` whitelist, Node/Python engine assumptions, `.gitignore` rules, and Zensical workflow configuration.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope (`0` open; `1` closed in R2: `DEP-001`).
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - **Tests inspected & executed:** `npm pack --dry-run --json` executed locally and in CI runs `42468601060` and `42468598397`; `git check-ignore` verified on transient `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md` paths.
   - **Missing proof / verification gaps:** None in `DEP`.
7. **Verdict:** **No findings within reviewed scope**

#### Closed Findings Rechecked in R2 (`DEP`)

- **`DEP-001` (P2 — Closed):** *`.gitignore` omits transient `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md` files created in the workspace during active runs.*
  - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
  - **Evidence at that revision:** [.gitignore](file:///home/paragon-ux/Antigravity/Agy-Squad/.gitignore#L4-L5) adds `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md`.
  - **Reviewer recheck:** Confirmed that `git check-ignore` matches transient `agy-squad-*` plugin and profile paths while leaving `.agents/skills/pr-review/` tracked.
  - **Residual limitations:** None.

---

## 5. Cross-Category Root Causes and Rationale for Remediation Order

All six root-cause clusters across R1 and the external Devin review (`16` total findings: `5` P1, `10` P2, `1` P3) have been remediated and verified:

1. **Cluster 1 — Unmanaged vs. Managed Compilation Parity in `mcp/briefs.mjs` (`RUN-003`, `RUN-004`):** `buildSubagentSpec` now defaults all report-writing assignments to `TypeName: "self"`, rejects read-only `TypeName === "research"`, and enforces `Workspace === "inherit"` across both unmanaged and managed modes (matched by `workspace.enum: ["inherit"]` in `mcp/index.js`).
2. **Cluster 2 — Synthesis Verdict Reconciliation & Atomic Bundle Lifecycle in `mcp/handoffs.mjs` (`SVC-001`, `SVC-003`):** `readSynthesis` verifies that `lead/report.md` is valid UTF-8 Markdown recording an unambiguous `PASS` verdict with no `FAIL` or `BLOCKED` verdicts before `bundleReports` or `verifyBundle` succeeds; `publish(..., true)` atomically replaces `lead/report.sources.json` via `fs.renameSync`; and `verifyFiles` / `bundleReports` reject non-object `verifiedFiles` and self-hashed reports.
3. **Cluster 3 — Stage & Schema Validation (`RUN-001`, `RUN-002`, `MCP-001`, `MCP-002`, `MCP-003`, `DOC-002`):** Reserved `"all_l1"` is rejected in `manifestSquads`, `squad.lead` no longer inherits top-level squad properties, `all_l1` validates specialist definitions in both unmanaged and managed runs, `mcp/index.js` enforces JSON-RPC 2.0 request shapes / UTF-8 byte limits / `inputSchema` constraints / `realpathSync` `.mcp-ready` resolution, and `docs/tools.md` documents `manifest`.
4. **Cluster 4 — Session Registration, Tool Naming, Staged Manifest Protection, and Teardown (`ARCH-001`, `SKILL-001`, `SVC-002`, `SCRIPT-001`, `DEP-001`):** `bin/agy-squad.mjs` denies `write_file` on pre-staged `manifest.json`, includes current WSL CLI tool names in `makeProfile`, removes unconsumed pre-staged `plan-<hash>` directories on failed runs without evidence, gates `stdin` forwarding in `bin/terminal.py` until `submitted` is true, and ignores `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md` in `.gitignore`.
5. **Cluster 5 — Documentation & Subprocess/Concurrency/Live Verification (`DOC-001`, `TEST-001`, `SVC-GAP-001`, `SCRIPT-GAP-001`, `TEST-GAP-001`):** `docs/plans/LEDGER.md` accounts for `L1, L2`, `L8–L12`, `L17`, and `L30`; `tests/` covers managed-run server gating, malformed JSON-RPC requests, concurrent two-process staging, and the `mcp/handoffs.mjs` CLI entrypoint; and live subagent `1e211e57-a046-4b5a-8fdf-46a2dcd8a083` verified the revised report slots, `<= 500` byte `READY` receipt, and `mcp/handoffs.mjs` lifecycle end to end.

---

## 6. Verification Record and Remaining Gaps

### Executed Checks

| Check / Command | Environment | Target Revision | Result | Notes |
| --- | --- | --- | --- | --- |
| `npm test` (`test-dispatch.mjs`, `test-handoffs.mjs`, `test-run.mjs`, `test-server.mjs`) | Local WSL Linux (`node v22.19.0`, `python3 3.12.3`) | `45a66d1` + R2 remediation delta | **PASS** (exit `0`) | Verifies all 16 closed findings (`RUN-001`–`RUN-004`, `SVC-001`–`SVC-003`, `MCP-001`–`MCP-003`, `ARCH-001`, `DOC-001`–`DOC-002`, `SKILL-001`, `SCRIPT-001`, `TEST-001`, `DEP-001`) plus `SVC-GAP-001` and `SCRIPT-GAP-001` |
| Operator-authorized 1-specialist live subagent trial (`squadId: "live_pow_r2"`, child [`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`](conversation://1e211e57-a046-4b5a-8fdf-46a2dcd8a083)) | Live Antigravity subagent on WSL2 (`/home/paragon-ux/Antigravity/Agy-Squad`) | `45a66d1` + R2 remediation delta | **PASS** | Compiled default specialist (`TypeName: "self"`, `Workspace: "inherit"`), launched via `invoke_subagent`, wrote `scratch/agy-squad/squad-live_pow_r2/specialist-1/report.md` (`4,897` bytes, SHA-256 `55ee7af4...`), received single-line `READY` message (`272` UTF-8 bytes) via Reactive Wakeup, and passed `node mcp/handoffs.mjs` `fingerprint`, `inspect`, `bundle` (`sha256: 9782972e...`), `verify`, and `prune` |
| `npm pack --dry-run --json` | Local WSL Linux (`node v22.19.0`) | `45a66d1` + R2 remediation delta | **PASS** (exit `0`) | Tarball `agy-squad-0.1.0.tgz` (`26` files, `78,154` bytes) builds cleanly |
| GitHub Actions `CI` (`pull_request` — Node 22 & 24) | `ubuntu-latest` (Run [`42468601060`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468601060)) | Merge commit `d718d7d219ce7c8682553ef6f88037c837c58ba7` (head `281c04ab2cb342f4e9ed754a1e08dae7673bb688`) | **PASS** (`15s` / `13s`) | Both Node 22 and Node 24 jobs passed `npm test` and `npm pack --dry-run --json` |
| GitHub Actions `CI` (`push` — Node 22 & 24) | `ubuntu-latest` (Run [`42468598397`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468598397)) | Head `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | **PASS** (`14s` / `12s`) | Both Node 22 and Node 24 jobs passed |
| GitHub Actions `Documentation` (`pull_request` & `push`) | `ubuntu-latest` (Runs [`42468601065`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468601065), [`42468598360`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468598360)) | Merge commit `d718d7d219ce7c8682553ef6f88037c837c58ba7` & head `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | **PASS** (`11s` / `8s`) | `zensical build` succeeded; `deploy` skipped cleanly (`has_pages == false`) |

### Verification Gaps Ledger

| Gap ID | Category | Description | Status | Resolution / Remaining Requirement |
| --- | --- | --- | --- | --- |
| `SVC-GAP-001` | `SVC` / `TEST` | Two-process concurrent race test on `stagePlan` / `publish` against identical manifest content hash | **Closed** (`281c04ab2cb342f4e9ed754a1e08dae7673bb688`) | Verified by two-subprocess `Promise.all` test in [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L76-L95) |
| `SCRIPT-GAP-001` | `SCRIPT` / `TEST` | Subprocess CLI test for `node mcp/handoffs.mjs` (`fingerprint`, `inspect`, `bundle`, `verify`, `prune`) | **Closed** (`281c04ab2cb342f4e9ed754a1e08dae7673bb688` + R2 live check) | Verified by `spawnSync` in [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L126-L129) and full 5-action CLI pipeline in live trial `live_pow_r2` |
| `TEST-GAP-001` | `TEST` / `DOC` | Live verification of revised `squad-<id>/(lead|specialist-N)/report.md` slots, `<= 500` UTF-8 byte `READY` receipt, and `mcp/handoffs.mjs` lifecycle | **Closed (1-specialist live check)** | Verified on November 8, 2026 via live subagent [`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`](conversation://1e211e57-a046-4b5a-8fdf-46a2dcd8a083) and recorded in [docs/plans/wsl-cli-verification.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/wsl-cli-verification.md#L47) |
| `SCRIPT-GAP-002` | `SCRIPT` / `TEST` | `bin/terminal.py:63-65` startup readiness screen-scraping (`agent in header and b"? for shortcuts" in header` + `.mcp-ready`) is tested against the fake `agy` PTY fixture in `tests/test-run.mjs` rather than an interactive `agy` TUI session | **Open (Non-blocking per `L7`)** | Automated tests cannot launch interactive `agy` sessions per `L7`; covered by the PTY bridge harness in `tests/test-run.mjs` |

---

## 7. Overall Disposition and Finding Closure Table

- **Review Coverage:** **Complete (`100%`)** across all 10 required categories (`9` active categories reviewed; `DB` verified `Not applicable`) and both external Devin review artifacts.
- **Merge Disposition:** **Approve**
  - **Rationale:** All `13` R1 findings (`2` P1, `10` P2, `1` P3), all `3` external Devin P1 bug-catcher findings (`RUN-003`, `RUN-004`, `SVC-003`), and `3` verification gaps (`SVC-GAP-001`, `SCRIPT-GAP-001`, `TEST-GAP-001`) have been remediated, verified via automated regression tests (`npm test`), and confirmed with an operator-authorized 1-specialist live subagent trial (`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`).

### Unified Finding Closure Ledger (`16` Findings — All Closed)

| Finding ID | Primary Category | Priority | Title | Status | Fix Revision | Verification & Closure Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `RUN-001` | `RUN` | **P1** | `manifestSquads` allows reserved `"all_l1"` as a squad key, making its specialists unreachable and colliding with `all_l1` lead compilation | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L48-L50); regression test in [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L85-L88); CI runs `42468601060`, `42468598397` |
| `SVC-001` | `SVC` | **P1** | `bundleReports` fails permanently with `EEXIST` if `lead/report.md` is updated after an initial bundle, and `verifyFiles` accepts array `verifiedFiles` or `lead/report.md` inside `verifiedFiles` | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L99-L192); regression tests in [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L77-L95); CI runs `42468601060`, `42468598397` |
| `RUN-003` | `RUN` | **P1** | Unmanaged specialists without `typeName` default to read-only `TypeName: "research"` (`mcp/briefs.mjs:36`) while their compiled brief requires writing `report.md` | **Closed** | R2 remediation delta (`mcp/briefs.mjs`, `docs/tools.md`, `tests/test-dispatch.mjs`) | [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L36,L45-L47); regression tests in [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L42-L46,L88-L91); live subagent [`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`](conversation://1e211e57-a046-4b5a-8fdf-46a2dcd8a083) wrote `4,897`-byte report |
| `RUN-004` | `RUN` | **P1** | `buildSubagentSpec` (`mcp/briefs.mjs:45-50`) allows `Workspace !== "inherit"` (e.g., `workspace: "branch"`) in unmanaged mode, stranding reports outside the shared workspace | **Closed** | R2 remediation delta (`mcp/briefs.mjs`, `mcp/index.js`, `docs/tools.md`, `tests/test-dispatch.mjs`, `tests/test-server.mjs`) | [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L48-L50), [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L29); regression tests in [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L92-L95) and [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L85) |
| `SVC-003` | `SVC` | **P1** | `bundleReports` and `verifyBundle` (`mcp/handoffs.mjs:144-215`) trust `record.verdict === "PASS"` without checking that `lead/report.md` records an unambiguous `PASS` synthesis verdict | **Closed** | R2 remediation delta (`mcp/handoffs.mjs`, `docs/tools.md`, `tests/test-handoffs.mjs`) | [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L144-L204); regression tests in [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L79-L99); live subagent trial `live_pow_r2` (`bundle` -> `verify` -> `prune`) |
| `ARCH-001` | `ARCH` | **P2** | `L1, L2` host-enforced boundary ledger claim vs. shared `Workspace: "inherit"` and writable pre-staged `manifest.json` under `run.directory` | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L136-L143), [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L7); regression test in [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L168-L170) |
| `DOC-001` | `DOC` | **P2** | `docs/plans/LEDGER.md` silently drops `L10`, `L12`, `L17`, and `L30` after deleting the legacy Docker plan | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L13-L19); verified by source inspection and CI runs `42468601065`, `42468598360` |
| `SKILL-001` | `SKILL` | **P2** | Generated session agent profile (`makeProfile`) allowlists only legacy IDE tool names and omits current WSL CLI tool names (`read_file`, `write_file`, `edit_file`, `manage_task`) | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L49-L52); regression tests in [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L144-L153) |
| `MCP-001` | `MCP` | **P2** | `mcp/index.js` mishandles non-object JSON payloads, mislabels runtime exceptions as `-32700 Parse error`, and checks UTF-16 code units instead of UTF-8 bytes | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L71-L75), [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L118-L155); regression tests in [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L66-L69) |
| `MCP-002` | `MCP` | **P2** | `dispatch_squad` `inputSchema` omits `minLength: 1` on `squadId` and `manifestPath` and omits `minProperties: 1` / agent item schemas on `manifest` | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` + R2 delta | [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L19-L68); regression tests in [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L55-L56,L83-L86) |
| `MCP-003` | `MCP` | **P2** | `.mcp-ready` publication in `mcp/index.js` fails when `AGY_SQUAD_WORKSPACE` is unset or a symlinked path | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L143-L144); regression test in [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L74-L86) |
| `RUN-002` | `RUN` | **P2** | `all_l1` lead compilation leaks top-level squad properties into `squad.lead` via `{ ...squad, ...lead }` and skips specialist validation in unmanaged mode | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L117-L126); regression test in [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L81-L84) |
| `SVC-002` | `SVC` | **P2** | Pre-staged `plan-<hash>/manifest.json` prevents `removeEmpty(run.directory)` from cleaning up `scratch/agy-squad/run-<id>` when `--manifest` sessions fail before running any agents | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L89-L96,L162-L164); regression test in [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L171-L175) |
| `SCRIPT-001` | `SCRIPT` | **P2** | `bin/terminal.py` forwards operator `stdin` to the child PTY before `/mcp` readiness and initial prompt submission complete | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [bin/terminal.py](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/terminal.py#L51); verified via PTY harness in `tests/test-run.mjs` |
| `TEST-001` | `TEST` | **P2** | `tests/test-server.mjs` does not test managed-run session gating, inline `manifest` schema exposure, `.mcp-ready` publication, or malformed JSON-RPC requests | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L55-L104); CI runs `42468601060`, `42468598397` |
| `DEP-001` | `DEP` | **P2** | `.gitignore` omits transient `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md` files created in the workspace during active runs | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [.gitignore](file:///home/paragon-ux/Antigravity/Agy-Squad/.gitignore#L4-L5) |
| `DOC-002` | `DOC` | **P3** (Advisory) | `docs/tools.md` top-level `dispatch_squad` argument table omits the managed-run `manifest` parameter | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L9) |

### Cross-Reference Reconciliation Table for Devin Artifacts (`devin-agy-squad-bugs-and-flags.md` & `devin-agy-squad-issue-ledger.md`)

| Source Artifact & Location | Devin Item Summary | Mapped Review ID | Category & Priority | Final Status |
| --- | --- | --- | --- | --- |
| `bugs-and-flags.md:1-15`, `issue-ledger.md:43` | Default specialists without `typeName` in unmanaged mode get read-only `research` preset (`mcp/briefs.mjs:36`) and cannot write `report.md` | `RUN-003` | `RUN` (**P1**) | **Closed** (`mcp/briefs.mjs:36,45-47`, `tests/test-dispatch.mjs`, live check `1e211e57-a046-4b5a-8fdf-46a2dcd8a083`) |
| `bugs-and-flags.md:17-31`, `issue-ledger.md:44,78` | `bundleReports` (`mcp/handoffs.mjs:154-176`) trusts `record.verdict === "PASS"` without reconciling `lead/report.md`, allowing failed cohorts to be bundled and pruned | `SVC-003` | `SVC` (**P1**) | **Closed** (`readSynthesis` in `mcp/handoffs.mjs:144-158`, `tests/test-handoffs.mjs`, live check `live_pow_r2`) |
| `bugs-and-flags.md:33-47` | Unmanaged agent with `workspace: "branch"` is permitted by `buildSubagentSpec` (`mcp/briefs.mjs:45-47`) while assigned a shared workspace report slot | `RUN-004` | `RUN` (**P1**) | **Closed** (`mcp/briefs.mjs:48-50`, `mcp/index.js:29`, `tests/test-dispatch.mjs`, `tests/test-server.mjs`) |
| `bugs-and-flags.md:49-52`, `issue-ledger.md:47,79,114` | `bin/terminal.py:63-65` startup screen-scraping (`? for shortcuts`) tested only against fake CLI | `SCRIPT-GAP-002` | `SCRIPT` / `TEST` (Verification Gap) | **Open (Non-blocking per `L7`)** |
| `bugs-and-flags.md:56-58`, `issue-ledger.md:47,80,114` | Recorded live trial (`docs/plans/wsl-cli-verification.md:37`) used the earlier handoff protocol, not the revised report slots and 500-byte messages | `TEST-GAP-001` | `TEST` / `DOC` (Verification Gap) | **Closed (1-specialist live check)** (`1e211e57-a046-4b5a-8fdf-46a2dcd8a083`, recorded in `docs/plans/wsl-cli-verification.md:47`) |
| `issue-ledger.md:46,89` | `all_l1` accepted as a squad name in `manifestSquads` | `RUN-001` | `RUN` (**P1**) | **Closed** (`281c04a`) |
| `issue-ledger.md:45,90-93` | Re-bundling throws `EEXIST` in `publish`, and `verifyFiles` accepts malformed `verifiedFiles` shapes / self-hashes | `SVC-001` | `SVC` (**P1**) | **Closed** (`281c04a`) |
| `issue-ledger.md:95-98` | `mcp/index.js` crashes on `handleRequest(null)`, treats missing `method` / non-object as notification, and checks UTF-16 length instead of `Buffer.byteLength` | `MCP-001` | `MCP` (**P2**) | **Closed** (`281c04a`) |
| `issue-ledger.md:99` | `.mcp-ready` fails when `AGY_SQUAD_WORKSPACE` is unset or a symlink | `MCP-003` | `MCP` (**P2**) | **Closed** (`281c04a`) |
| `issue-ledger.md:100` | `dispatch_squad` tool schema omits `minLength`, non-empty `squads`, and agent shape constraints | `MCP-002` | `MCP` (**P2**) | **Closed** (`281c04a` + R2 delta) |
| `issue-ledger.md:101-103` | Unmanaged `all_l1` skips specialist validation and `{ ...squad, ...lead }` leaks squad properties into lead brief | `RUN-002` | `RUN` (**P2**) | **Closed** (`281c04a`) |
| `issue-ledger.md:104` | `makeProfile` (`bin/agy-squad.mjs`) omits current WSL CLI tool names (`read_file`, `write_file`, `edit_file`, `manage_task`) | `SKILL-001` | `SKILL` (**P2**) | **Closed** (`281c04a`) |
| `issue-ledger.md:77,105,117-118` | Pre-staged `manifest.json` is writable in run directory + `L1` prompt-enforced vs host-enforced boundary limitation | `ARCH-001` | `ARCH` (**P2**) | **Closed** (`281c04a`) |
| `issue-ledger.md:106` | Leftover `scratch/agy-squad/run-<uuid>` directory when `--manifest` session fails before writing evidence | `SVC-002` | `SVC` (**P2**) | **Closed** (`281c04a`) |
| `issue-ledger.md:107` | `bin/terminal.py` forwards user keystrokes before initial prompt submission | `SCRIPT-001` | `SCRIPT` (**P2**) | **Closed** (`281c04a`) |
| `issue-ledger.md:108` | Managed-run paths in `mcp/index.js` (`AGY_SQUAD_RUN_DIR`, session gate, `.mcp-ready`) untested in `npm test` | `TEST-001` | `TEST` (**P2**) | **Closed** (`281c04a`) |
| `issue-ledger.md:109` | `.gitignore` omits `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md` | `DEP-001` | `DEP` (**P2**) | **Closed** (`281c04a`) |
| `issue-ledger.md:110` | `docs/plans/LEDGER.md` drops `L10`, `L12`, `L17`, and `L30` | `DOC-001` | `DOC` (**P2**) | **Closed** (`281c04a`) |
| `issue-ledger.md:111-112` | `docs/tools.md` argument table omits `manifest` | `DOC-002` | `DOC` (**P3** Advisory) | **Closed** (`281c04a`) |
| `issue-ledger.md:115` | Subprocess CLI test for `mcp/handoffs.mjs` | `SCRIPT-GAP-001` | `SCRIPT` / `TEST` (Verification Gap) | **Closed** (`281c04a` + R2 live check) |
| `issue-ledger.md:116` | Two-process concurrency test for `stagePlan` / `publish` | `SVC-GAP-001` | `SVC` / `TEST` (Verification Gap) | **Closed** (`281c04a`) |
