# Agy-Squad PR Review Report (Follow-Up Re-Review — R2)

## 1. Review Metadata and Evidence Limits

- **Repository:** `/home/paragon-ux/Antigravity/Agy-Squad` (`paragon-ux/Agy-Squad` — `https://github.com/paragon-ux/Agy-Squad`)
- **PR URL:** `https://github.com/paragon-ux/Agy-Squad/pull/1` (`rebuild/wsl-dispatch` -> `main`)
- **Previous Review Retained:** [rebuild-wsl-dispatch-review.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/reviews/rebuild-wsl-dispatch-review.md) (`https://github.com/paragon-ux/Agy-Squad/pull/1#issuecomment-6719916015`, reviewed head `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7`, verdict: *Request changes* with `2` P1, `10` P2, `1` P3 findings)
- **Review Date:** `2026-11-08`
- **Reviewer:** Antigravity (Agy-Squad PR Review Skill)
- **Standard Version:** `1.1.0` ([pr-review-standard.md](file:///home/paragon-ux/Antigravity/Agy-Squad/.agents/skills/pr-review/references/pr-review-standard.md))
- **Base Ref / SHA:** `main` — `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`
- **Previous Head SHA (R1):** `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7` (plus R1 review report commit `e1fdb0004d56e2efda5be5919d07105136ee6080`)
- **Current Head Ref / SHA (R2):** `rebuild/wsl-dispatch` — `281c04ab2cb342f4e9ed754a1e08dae7673bb688` (`fix: remediate PR #1 review findings across dispatch, handoffs, MCP server, launcher, and docs`)
- **GitHub Generated PR Merge Commit SHA:** `d718d7d219ce7c8682553ef6f88037c837c58ba7` (merge of `281c04ab2cb342f4e9ed754a1e08dae7673bb688` into `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`)
- **Merge Base SHA:** `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`
- **Commit History Examined (`ee10ebc255f0d52dc93b51d7cf8198bb069c4532..281c04ab2cb342f4e9ed754a1e08dae7673bb688`):**
  1. `cf6e9599974eb1527cb9f8f182d3895ebaa3e5e2` — `Rebuild Agy-Squad around native WSL subagent compilation`
  2. `d1389ba5c255966a75abfaad7579a03b25a3d7db` — `Prepare layered dispatch manifests and isolated report slots`
  3. `b7e9ca0b0276eb3c4e244780d0b44e6514b801e5` — `Add native WSL launcher and run-local dispatch staging`
  4. `4e67bb2120a18a43197ac2784846b8de1121417e` — `Wait for MCP readiness before submitting initial run prompt`
  5. `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7` — `ci: add test and docs workflows and pr-review skill` (R1 head)
  6. `e1fdb0004d56e2efda5be5919d07105136ee6080` — `docs(review): add PR #1 review report for rebuild/wsl-dispatch (ee10ebc..6d6ad31)`
  7. `281c04ab2cb342f4e9ed754a1e08dae7673bb688` — `fix: remediate PR #1 review findings across dispatch, handoffs, MCP server, launcher, and docs` (R2 head)
- **CI Runs Examined at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`:**
  - **CI Workflow (`pull_request`):** Run [`42468601060`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468601060) — executed against GitHub merge commit `d718d7d219ce7c8682553ef6f88037c837c58ba7` (`headSha: 281c04ab2cb342f4e9ed754a1e08dae7673bb688`). Passed `npm test` and `npm pack --dry-run --json` on `ubuntu-latest` across Node 22 (`15s`) and Node 24 (`13s`).
  - **CI Workflow (`push`):** Run [`42468598397`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468598397) — executed directly against branch head `281c04ab2cb342f4e9ed754a1e08dae7673bb688`. Passed `npm test` and `npm pack --dry-run --json` on `ubuntu-latest` across Node 22 (`14s`) and Node 24 (`12s`).
  - **Documentation Workflow (`pull_request`):** Run [`42468601065`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468601065) — executed against merge commit `d718d7d219ce7c8682553ef6f88037c837c58ba7`. Passed `zensical build` (`11s`); `deploy` job skipped cleanly (`if: github.event_name != 'pull_request' && needs.build.outputs.has_pages == 'true'`).
  - **Documentation Workflow (`push`):** Run [`42468598360`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468598360) — executed against branch head `281c04ab2cb342f4e9ed754a1e08dae7673bb688`. Passed `zensical build` (`8s`); `deploy` job skipped cleanly because GitHub Pages is not enabled on the repository (`has_pages == false`).
- **Evidence Actually Available and Examined:**
  - Full repository sources at base `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`, R1 head `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7`, and R2 head `281c04ab2cb342f4e9ed754a1e08dae7673bb688`.
  - Remediation delta `e1fdb0004d56e2efda5be5919d07105136ee6080..281c04ab2cb342f4e9ed754a1e08dae7673bb688` (`12` files changed, `211` insertions, `37` deletions).
  - Historical design paper and contracts in git history (`docs/plans/2026-04-06-agy-squad-architecture-and-benchmark-design.md`, `docs/plans/LEDGER.md` at `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`).
  - Sibling benchmark repository `/home/paragon-ux/Antigravity/workspace/antigravity-swarm-orchestration-suite` (read-only cross-reference).
  - Local execution on WSL Linux (`node v22.19.0`, `python3 3.12.3`) of `npm test` and `npm pack --dry-run --json` at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`, plus GitHub Actions CI runs `42468601060`, `42468601065`, `42468598397`, and `42468598360`.
- **Evidence Unavailable / Environment Limits:**
  - Live interactive `agy` binary execution with real model tokens (`L7` forbids starting subagents during tests; `tests/test-run.mjs` exercises the real `bin/terminal.py` PTY bridge and `bin/agy-squad.mjs` against a deterministic fake `agy` executable).
  - GitHub Pages deployment target (`has_pages == false` on `paragon-ux/Agy-Squad`).

---

## 2. File-to-Category Inventory and Coverage Matrix

### Changed-File Inventory (`ee10ebc255f0d52dc93b51d7cf8198bb069c4532..281c04ab2cb342f4e9ed754a1e08dae7673bb688` and R2 Delta `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7..281c04ab2cb342f4e9ed754a1e08dae7673bb688`)

| Path | Full PR Status (`ee10ebc..281c04a`) | R2 Delta (`6d6ad31..281c04a`) | Primary Category | Secondary / Cross-Referenced Categories | Review Status |
| --- | --- | --- | --- | --- | --- |
| `docs/plans/LEDGER.md` | Modified (`+30/-31`) | Modified (`+4/-2`) | `ARCH` | `DOC`, `SKILL`, `SVC` | Reviewed & Rechecked |
| `docs/plans/wsl-cli-verification.md` | Added (`+87`) | Unchanged | `ARCH` | `DOC`, `SKILL`, `RUN` | Reviewed |
| `docs/plans/2026-04-06-agy-squad-architecture-and-benchmark-design.md` | Deleted (`-588`) | Unchanged | `DOC` | `ARCH` | Reviewed |
| `docs/reviews/2026-04-06-architecture-benchmark-design-review.md` | Deleted (`-124`) | Unchanged | `DOC` | `ARCH` | Reviewed |
| `docs/reviews/rebuild-wsl-dispatch-review.md` | Added (`+1079`) | Added in `e1fdb00` | `DOC` | `ARCH`, `TEST` | Reviewed (Retained R1 Report) |
| `README.md` | Modified (`+79/-111`) | Unchanged | `DOC` | `ARCH`, `MCP`, `DEP` | Reviewed |
| `docs/index.md` | Modified (`+7/-43`) | Unchanged | `DOC` | `DEP` | Reviewed |
| `docs/tools.md` | Modified (`+73/-165`) | Modified (`+1/-0`) | `DOC` | `MCP`, `SVC` | Reviewed & Rechecked |
| `docs/stopping-agents.md` | Modified (`+8/-52`) | Unchanged | `DOC` | `SVC`, `SCRIPT` | Reviewed |
| `docs/architecture.md` | Deleted (`-103`) | Unchanged | `DOC` | `ARCH` | Reviewed |
| `docs/configuration.md` | Deleted (`-112`) | Unchanged | `DOC` | `DEP`, `MCP` | Reviewed |
| `docs/getting-started.md` | Deleted (`-127`) | Unchanged | `DOC` | `DEP` | Reviewed |
| `docs/troubleshooting.md` | Deleted (`-83`) | Unchanged | `DOC` | `DOC` | Reviewed |
| `skills/agy-squad/SKILL.md` | Deleted (`-215`) | Unchanged | `SKILL` | `ARCH`, `MCP` | Reviewed |
| `.agents/skills/pr-review/SKILL.md` | Added (`+178`) | Unchanged | `SKILL` | `DOC` | Reviewed |
| `.agents/skills/pr-review/references/pr-review-standard.md` | Added (`+225`) | Unchanged | `SKILL` | `ARCH`, `DOC` | Reviewed |
| `mcp/index.js` | Modified (`+99/-346`) | Modified (`+52/-10`) | `MCP` | `RUN`, `SVC` | Reviewed & Rechecked |
| `mcp/dispatch.mjs` | Added (`+142`) | Modified (`+6/-3`) | `RUN` | `MCP`, `SVC`, `ARCH` | Reviewed & Rechecked |
| `mcp/briefs.mjs` | Added (`+166`) | Unchanged | `RUN` | `SKILL`, `ARCH` | Reviewed |
| `mcp/handoffs.mjs` | Added (`+269`) | Modified (`+16/-9`) | `SVC` | `RUN`, `ARCH`, `SCRIPT` | Reviewed & Rechecked |
| `mcp/run-state.mjs` | Added (`+69`) | Unchanged | `SVC` | `RUN`, `DB` | Reviewed |
| `bin/agy-squad.mjs` | Modified (`+161/-493`) | Modified (`+24/-5`) | `SVC` | `SKILL`, `DEP`, `SCRIPT`, `ARCH` | Reviewed & Rechecked |
| `bin/terminal.py` | Added (`+99`) | Modified (`+1/-1`) | `SCRIPT` | `SVC`, `RUN` | Reviewed & Rechecked |
| `tests/test-dispatch.mjs` | Added (`+133`) | Modified (`+8/-0`) | `TEST` | `RUN`, `MCP` | Reviewed & Rechecked |
| `tests/test-handoffs.mjs` | Added (`+154`) | Modified (`+12/-0`) | `TEST` | `SVC`, `RUN` | Reviewed & Rechecked |
| `tests/test-run.mjs` | Added (`+183`) | Modified (`+40/-5`) | `TEST` | `SVC`, `SCRIPT`, `SKILL` | Reviewed & Rechecked |
| `tests/test-server.mjs` | Modified (`+64/-163`) | Modified (`+45/-2`) | `TEST` | `MCP`, `RUN` | Reviewed & Rechecked |
| `.github/workflows/ci.yml` | Added (`+35`) | Unchanged | `TEST` | `DEP` | Reviewed |
| `.github/workflows/docs.yml` | Modified (`+25/-7`) | Unchanged | `DEP` | `DOC`, `TEST` | Reviewed |
| `package.json` | Modified (`+12/-17`) | Unchanged | `DEP` | `TEST`, `SCRIPT` | Reviewed |
| `zensical.toml` | Modified (`+1/-5`) | Unchanged | `DEP` | `DOC` | Reviewed |
| `.gitignore` | Modified (`+3/-1`) | Modified (`+2/-0`) | `DEP` | `SVC` | Reviewed & Rechecked |

### Unchanged Repository Files Examined

| Path | Purpose | Categories Informed |
| --- | --- | --- |
| `LICENSE` | ISC license metadata | `DEP` |

### Category Coverage Matrix

| Category ID | Category Name | Coverage Status | Open P1 | Open P2 | Open P3 | Closed in R2 | Verification Gaps | Category Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ARCH` | Architecture and contracts | Reviewed (`100%`) | `0` | `0` | `0` | `1` (`ARCH-001`) | `0` | **Pass** |
| `DOC` | Documentation and change records | Reviewed (`100%`) | `0` | `0` | `0` | `2` (`DOC-001`, `DOC-002`) | `0` | **Pass** |
| `SKILL` | Skills and agent instructions | Reviewed (`100%`) | `0` | `0` | `0` | `1` (`SKILL-001`) | `0` | **Pass** |
| `MCP` | MCP schemas and public API | Reviewed (`100%`) | `0` | `0` | `0` | `3` (`MCP-001`, `MCP-002`, `MCP-003`) | `0` | **Pass** |
| `RUN` | Core runtime, parsing, and validation | Reviewed (`100%`) | `0` | `0` | `0` | `2` (`RUN-001`, `RUN-002`) | `0` | **Pass** |
| `SVC` | Services, orchestration, and audit semantics | Reviewed (`100%`) | `0` | `0` | `0` | `2` (`SVC-001`, `SVC-002`) | `0` (`SVC-GAP-001` closed) | **Pass** |
| `DB` | Database, migrations, replay, and concurrency | Reviewed (N/A for SQL; file-backed state reviewed under `SVC`) | `0` | `0` | `0` | `0` | `0` | **Pass (N/A)** |
| `SCRIPT` | Scripts, evaluation, and developer tooling | Reviewed (`100%`) | `0` | `0` | `0` | `1` (`SCRIPT-001`) | `0` (`SCRIPT-GAP-001` closed) | **Pass** |
| `TEST` | Tests and CI | Reviewed (`100%`) | `0` | `0` | `0` | `1` (`TEST-001`) | `0` | **Pass** |
| `DEP` | Dependencies, packaging, and configuration | Reviewed (`100%`) | `0` | `0` | `0` | `1` (`DEP-001`) | `0` | **Pass** |

---

## 3. Architecture-to-Implementation Trace

All four architectural trace chains from R1 ([rebuild-wsl-dispatch-review.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/reviews/rebuild-wsl-dispatch-review.md#L114-L162)) were re-verified against `281c04ab2cb342f4e9ed754a1e08dae7673bb688`:

1. **Trace 1 — Native Subagent Compilation (`L3, L5`, `L6`, `L18, L19`):**
   - `manifestSquads` ([mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L43-L52)) now rejects `"all_l1"` as a user squad key (`RUN-001` closed).
   - `handleDispatchSquad` ([mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L106-L129)) now uses `spec: lead` when `squad.lead` is an explicit sub-object and validates all specialist specs during every `all_l1` call before returning or staging (`RUN-002` closed).
2. **Trace 2 — Pointer-Over-Wire Receipts, Verification, and Optional Report Cleanup (`L8–L12`, `L17`, `L30`):**
   - `LEDGER.md` ([docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L7-L16)) explicitly records the active decisions for `L1, L2`, `L8–L12`, `L17`, and `L30` (`DOC-001` closed).
   - `verifyFiles`, `publish`, and `bundleReports` ([mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L99-L177)) now reject array/non-object `verifiedFiles`, reject `lead/report.md` and `lead/report.sources.json` inside `verifiedFiles`, and atomically replace `lead/report.sources.json` via `fs.renameSync` when `lead/report.md` is updated and re-bundled (`SVC-001` closed).
3. **Trace 3 — Workspace Containment, Permission Boundaries, and Staged Plan Immutability (`L1, L2`, `L20`):**
   - `runSession` ([bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L136-L143)) now adds `write_file(${path.join(workspace, dispatch.manifestPath)})` to `settings.permissions.deny` whenever `dispatch` is pre-staged (`ARCH-001` closed).
4. **Trace 4 — Native WSL Launcher, Per-Run Isolation, and Readiness Gate (`bin/agy-squad.mjs`, `bin/terminal.py`, `mcp/index.js`):**
   - `makeProfile` ([bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L49-L52)) includes `read_file`, `write_file`, `edit_file`, and `manage_task` alongside legacy tool aliases (`SKILL-001` closed).
   - `runSession` ([bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L89-L96), [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L162-L166)) cleans up unconsumed pre-staged `plan-<hash>` directories on non-zero exit when no `report.md` evidence was written (`SVC-002` closed).
   - `bin/terminal.py` ([bin/terminal.py](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/terminal.py#L51)) polls `[master]` only until `submitted` is `True`, preventing user keystrokes during `/mcp` readiness discovery from corrupting startup (`SCRIPT-001` closed).

---

## 4. Category Sections

### 4.1 `ARCH` — Architecture and Contracts

- **Coverage Statement:** Re-reviewed [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L1-L21) and [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L120-L145) at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`.
- **P1 Findings:** None (`0` open).
- **P2 Findings:** None (`0` open; `1` closed in R2: `ARCH-001`).
- **P3 Findings:** None (`0` open).
- **Closed Findings Rechecked in R2:**
  - **`ARCH-001` (P2 — Closed):** *`L1, L2` host-enforced boundary ledger claim vs. shared `Workspace: "inherit"` and writable pre-staged `manifest.json` under `run.directory`.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L136-L143) adds `...(dispatch ? [\`write_file(\${path.join(workspace, dispatch.manifestPath)})\`] : [])` to `settings.permissions.deny`. [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L8) documents that under WSL `Workspace: "inherit"`, host permissions confine access to the workspace and protect session registrations and staged manifests while intra-workspace file scope and sibling report slots are verified through receipts and SHA-256 hashes. Verified by [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L168-L170) in local `npm test` and CI runs `42468601060` and `42468598397`.
    - **Reviewer recheck:** Confirmed that `--launch --manifest plan.json` emits the exact `write_file(<workspace>/<run>/plan-<hash>/manifest.json)` deny rule in `--settings` JSON and `LEDGER.md` accurately states the enforcement boundary.
    - **Residual limitations:** Inline manifests staged dynamically during a session (`--launch` without `--manifest`) remain protected by the runtime SHA-256 content-hash check in `stagePlan` ([mcp/run-state.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/run-state.mjs#L42-L54)).
- **Verification Gaps:** None.
- **Category Verdict:** **Pass**

---

### 4.2 `DOC` — Documentation and Change Records

- **Coverage Statement:** Re-reviewed [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L1-L21) and [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L1-L82) at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`, plus `zensical build` in CI runs `42468601065` and `42468598360`.
- **P1 Findings:** None (`0` open).
- **P2 Findings:** None (`0` open; `1` closed in R2: `DOC-001`).
- **P3 Findings:** None (`0` open; `1` closed in R2: `DOC-002`).
- **Closed Findings Rechecked in R2:**
  - **`DOC-001` (P2 — Closed):** *`docs/plans/LEDGER.md` omits `L8–L12` and `L17` and leaves `L30` ambiguous after deleting the architecture paper.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L11-L16) adds active rows for `L8–L12` (Pointer-Over-Wire under `scratch/agy-squad/`, single-line `<= 500` UTF-8 byte `READY` / `PARTIAL` / `NO_REPORT` receipts, `mcp/handoffs.mjs` reconciliation) and `L17` (`squadId` and `manifestPath` with `manifest` in managed runs; `mode` and `spawnPacingMs` retired), and updates `L30` to distinguish loose-report retention in managed/failed/blocked runs from optional `bundle` / `verify` / `prune` cleanup in manually registered runs.
    - **Reviewer recheck:** Inspected `docs/plans/LEDGER.md` and verified `zensical build --clean` passes in CI (`42468601065`, `42468598360`).
    - **Residual limitations:** None.
  - **`DOC-002` (P3 Advisory — Closed):** *`docs/tools.md` top-level `dispatch_squad` argument table omits the managed-run `manifest` parameter.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L17) adds the `manifest` parameter row (`object`, `No`, managed-run inline plan mutually exclusive with `manifestPath`).
    - **Reviewer recheck:** Confirmed table accuracy against `TOOLS[0].inputSchema` in [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L43-L64).
    - **Residual limitations:** None.
- **Verification Gaps:** None.
- **Category Verdict:** **Pass**

---

### 4.3 `SKILL` — Skills and Agent Instructions

- **Coverage Statement:** Re-reviewed [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L42-L54), [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L1-L166), and `.agents/skills/pr-review/` at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`.
- **P1 Findings:** None (`0` open).
- **P2 Findings:** None (`0` open; `1` closed in R2: `SKILL-001`).
- **P3 Findings:** None (`0` open).
- **Closed Findings Rechecked in R2:**
  - **`SKILL-001` (P2 — Closed):** *Generated session agent profile (`makeProfile`) allowlists only legacy IDE tool names (`view_file`, `write_to_file`, `replace_file_content`, `command_status`) and omits current WSL CLI tool names (`read_file`, `write_file`, `edit_file`, `manage_task`).*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L49-L52) includes `read_file` in the base profile tools and `write_file`, `edit_file`, and `manage_task` in `--launch` profile tools while preserving the legacy aliases. Verified by [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L144-L153).
    - **Reviewer recheck:** Confirmed that preview runs still exclude `write_file`, `edit_file`, `write_to_file`, `run_command`, and `invoke_subagent`, while `--launch` runs include both current and legacy tool names.
    - **Residual limitations:** None.
- **Verification Gaps:** None.
- **Category Verdict:** **Pass**

---

### 4.4 `MCP` — MCP Schemas and Public API

- **Coverage Statement:** Re-reviewed [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L1-L159) and [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L1-L112) at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`.
- **P1 Findings:** None (`0` open).
- **P2 Findings:** None (`0` open; `3` closed in R2: `MCP-001`, `MCP-002`, `MCP-003`).
- **P3 Findings:** None (`0` open).
- **Closed Findings Rechecked in R2:**
  - **`MCP-001` (P2 — Closed):** *`mcp/index.js` mishandles non-object JSON payloads, mislabels runtime exceptions as `-32700 Parse error`, and checks UTF-16 code units instead of UTF-8 bytes.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L71-L75) validates request shape (`!request || typeof request !== "object" || Array.isArray(request) || typeof request.method !== "string" || !request.method.trim()`) and returns `-32600 Invalid Request`. [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L118-L155) checks `Buffer.byteLength(line, "utf8") > MAX_STDIO_PAYLOAD_BYTES`, separates `JSON.parse` (`-32700`) from `handleRequest` (`-32603`), and preserves `parsed.id`. Verified by [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L66-L69).
    - **Reviewer recheck:** Verified all JSON-RPC 2.0 error codes (`-32700`, `-32600`, `-32601`, `-32603`) and byte-length guards in `mcp/index.js`.
    - **Residual limitations:** None.
  - **`MCP-002` (P2 — Closed):** *`dispatch_squad` `inputSchema` omits `minLength: 1` on `squadId` and `manifestPath` and omits `minProperties: 1` / agent item schemas on `manifest`.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L19-L68) defines `agentSchema` (requiring `objective` and `scopeFiles` with `minLength: 1` / `minItems: 1`) and sets `minLength: 1` on `squadId` and `manifestPath` and `minProperties: 1` on `manifest.properties.squads`. Verified by [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L55-L56) and [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L83-L84).
    - **Reviewer recheck:** Confirmed schema alignment between `mcp/index.js`, `mcp/dispatch.mjs`, and `mcp/briefs.mjs`.
    - **Residual limitations:** Cross-field exclusivity (`manifest` XOR `manifestPath` in managed runs) remains enforced in `handleDispatchSquad` because Antigravity's tool schema validator restricts top-level combinators (`oneOf`/`anyOf`).
  - **`MCP-003` (P2 — Closed):** *`.mcp-ready` publication in `mcp/index.js` fails when `AGY_SQUAD_WORKSPACE` is unset or a symlinked path.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L143-L144) resolves `const root = fs.realpathSync(process.env.AGY_SQUAD_WORKSPACE || process.cwd());` before calling `publish(root, ...)`. Verified by [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L74-L85), which spawns `mcp/index.js` without `AGY_SQUAD_WORKSPACE` in `env` and verifies `.mcp-ready` is written.
    - **Reviewer recheck:** Confirmed `publish(root, ...)` succeeds when `AGY_SQUAD_WORKSPACE` is omitted or symlinked.
    - **Residual limitations:** None.
- **Verification Gaps:** None.
- **Category Verdict:** **Pass**

---

### 4.5 `RUN` — Core Runtime, Parsing, and Validation

- **Coverage Statement:** Re-reviewed [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L1-L142), [mcp/briefs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/briefs.mjs#L1-L166), and [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L1-L133) at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`.
- **P1 Findings:** None (`0` open; `1` closed in R2: `RUN-001`).
- **P2 Findings:** None (`0` open; `1` closed in R2: `RUN-002`).
- **P3 Findings:** None (`0` open).
- **Closed Findings Rechecked in R2:**
  - **`RUN-001` (P1 — Closed):** *`manifestSquads` allows reserved `"all_l1"` as a squad key, making its specialists unreachable and colliding with `all_l1` lead compilation.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L48-L50) checks `if (Object.hasOwn(squads, "all_l1")) throw new Error("Squad ID 'all_l1' is reserved for lead compilation.");`. Verified by [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L85-L88).
    - **Reviewer recheck:** Confirmed that both file-backed (`readManifest`) and inline (`manifestSquads`) manifests reject `squads.all_l1` before any compilation or staging occurs.
    - **Residual limitations:** None.
  - **`RUN-002` (P2 — Closed):** *`all_l1` lead compilation leaks top-level squad properties into `squad.lead` via `{ ...squad, ...lead }` and skips specialist validation in unmanaged mode.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L117) returns `{ spec: lead, id }` when `squad.lead` is present, and [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L125-L126) validates `children` (`specialistAssignments` + `build(child)`) unconditionally on all `all_l1` calls. Verified by [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L81-L84).
    - **Reviewer recheck:** Confirmed that unmanaged `all_l1` calls now reject squads with empty/missing `specialists` or invalid specialist specs before returning leads, and top-level squad fields no longer bleed into `squad.lead`.
    - **Residual limitations:** None.
- **Verification Gaps:** None.
- **Category Verdict:** **Pass**

---

### 4.6 `SVC` — Services, Orchestration, and Audit Semantics

- **Coverage Statement:** Re-reviewed [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L1-L269), [mcp/run-state.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/run-state.mjs#L1-L69), and [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L1-L185) at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`.
- **P1 Findings:** None (`0` open; `1` closed in R2: `SVC-001`).
- **P2 Findings:** None (`0` open; `1` closed in R2: `SVC-002`).
- **P3 Findings:** None (`0` open).
- **Closed Findings Rechecked in R2:**
  - **`SVC-001` (P1 — Closed):** *`bundleReports` fails permanently with `EEXIST` if `lead/report.md` is updated after an initial bundle, and `verifyFiles` accepts array `verifiedFiles` or `lead/report.md` inside `verifiedFiles`.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L99-L102) rejects non-object or array `verifiedFiles`; [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L162-L166) forbids `reportPath(squadId)` and `bundlePath(squadId)` inside `verifiedFiles`; [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L113-L137) and [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L175) pass `replace = true` in `bundleReports` so `publish` atomically replaces `lead/report.sources.json` via `fs.renameSync(temporary, destination)` when bundle contents change while keeping `replace = false` for `stagePlan` (`manifest.json`). Verified by [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L78-L84).
    - **Reviewer recheck:** Confirmed that updating `lead/report.md` and re-running `bundleReports` atomically updates `lead/report.sources.json` and returns the new SHA-256 digest, while `stagePlan` still rejects mutated `manifest.json` files.
    - **Residual limitations:** Note that the sibling repository `/home/paragon-ux/Antigravity/workspace/antigravity-swarm-orchestration-suite` stages its own copy at `.benchmark-bin/agy-squad-handoffs.mjs` via `npm run setup:profiles`; per `AGENTS.md` Layer 3 benchmark integrity rules, the sibling repository was not mutated during this PR review.
  - **`SVC-002` (P2 — Closed):** *Pre-staged `plan-<hash>/manifest.json` prevents `removeEmpty(run.directory)` from cleaning up `scratch/agy-squad/run-<id>` when `--manifest` sessions fail before running any agents.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L89-L96) defines `hasEvidence(directory)` and [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L162-L164) removes the pre-staged `plan-<hash>` directory on non-zero session exit when no `report.md` evidence exists in `run.directory`, allowing `removeEmpty(run.directory)` to remove the empty run directory. Verified by [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L172-L176).
    - **Reviewer recheck:** Confirmed that a failed `--launch --manifest plan.json --squad all_l1` session with exit status `7` and no `report.md` files removes `scratch/agy-squad/run-<id>` completely, whereas successful runs (`status === 0`) or runs with `report.md` evidence preserve the run directory.
    - **Residual limitations:** None.
- **Verification Gaps:** None (`SVC-GAP-001` closed by concurrent two-process `Promise.all([runChildDispatch("lexer"), runChildDispatch("emitter")])` test in [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L76-L95)).
- **Category Verdict:** **Pass**

---

### 4.7 `DB` — Database, Migrations, Replay, and Concurrency

- **Coverage Statement:** Confirmed that Agy-Squad uses no SQL/Postgres database or schema migrations; file-backed run-state and concurrent two-subprocess staging are covered and verified under `SVC` and `TEST`.
- **P1 Findings:** None (`0` open).
- **P2 Findings:** None (`0` open).
- **P3 Findings:** None (`0` open).
- **Verification Gaps:** None.
- **Category Verdict:** **Pass (N/A)**

---

### 4.8 `SCRIPT` — Scripts, Evaluation, and Developer Tooling

- **Coverage Statement:** Re-reviewed [bin/terminal.py](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/terminal.py#L1-L99) and the CLI entrypoint of [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L239-L265) at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`.
- **P1 Findings:** None (`0` open).
- **P2 Findings:** None (`0` open; `1` closed in R2: `SCRIPT-001`).
- **P3 Findings:** None (`0` open).
- **Closed Findings Rechecked in R2:**
  - **`SCRIPT-001` (P2 — Closed):** *`bin/terminal.py` forwards operator `stdin` to the child PTY before `/mcp` readiness and initial prompt submission complete.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [bin/terminal.py](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/terminal.py#L51) changes the `select.select` read list from `[master, stdin]` to `[master, stdin] if submitted else [master]`.
    - **Reviewer recheck:** Confirmed that `stdin` is not polled or written to `master` until `submitted` becomes `True` (or until `prompt` is empty, where `submitted = not bool(prompt)` starts as `True`).
    - **Residual limitations:** None.
- **Verification Gaps:** None (`SCRIPT-GAP-001` closed by subprocess CLI test of `mcp/handoffs.mjs verify` in [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L112-L114)).
- **Category Verdict:** **Pass**

---

### 4.9 `TEST` — Tests and CI

- **Coverage Statement:** Re-reviewed [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L1-L133), [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L1-L154), [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L1-L183), [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L1-L112), and [.github/workflows/ci.yml](file:///home/paragon-ux/Antigravity/Agy-Squad/.github/workflows/ci.yml#L1-L35) at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`.
- **P1 Findings:** None (`0` open).
- **P2 Findings:** None (`0` open; `1` closed in R2: `TEST-001`).
- **P3 Findings:** None (`0` open).
- **Closed Findings Rechecked in R2:**
  - **`TEST-001` (P2 — Closed):** *`tests/test-server.mjs` does not test managed-run session gating (`AGY_SQUAD_RUN_DIR` / `AGY_SQUAD_SESSION`), inline `manifest` schema exposure, `.mcp-ready` publication, or malformed JSON-RPC requests.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L55-L103) asserts `minLength: 1` on `squadId` and `manifestPath`, tests malformed JSON-RPC requests (`null`, `123`, `[]`, missing `method` -> `-32600`), spawns `mcp/index.js` in an active managed run (`AGY_SQUAD_RUN_DIR === AGY_SQUAD_SESSION`) to verify `manifest` schema exposure and `.mcp-ready` file creation, and spawns `mcp/index.js` with a mismatched `AGY_SQUAD_SESSION` to verify `tools/list` returns `[]` and `tools/call` returns `-32601`.
    - **Reviewer recheck:** Executed `npm test` locally and on GitHub Actions CI runs `42468601060` and `42468598397` across Node 22 and Node 24; all 4 test files pass.
    - **Residual limitations:** None.
- **Verification Gaps:** None.
- **Category Verdict:** **Pass**

---

### 4.10 `DEP` — Dependencies, Packaging, and Configuration

- **Coverage Statement:** Re-reviewed [.gitignore](file:///home/paragon-ux/Antigravity/Agy-Squad/.gitignore#L1-L8), [package.json](file:///home/paragon-ux/Antigravity/Agy-Squad/package.json#L1-L32), [zensical.toml](file:///home/paragon-ux/Antigravity/Agy-Squad/zensical.toml#L1-L78), and [.github/workflows/docs.yml](file:///home/paragon-ux/Antigravity/Agy-Squad/.github/workflows/docs.yml#L1-L65) at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`.
- **P1 Findings:** None (`0` open).
- **P2 Findings:** None (`0` open; `1` closed in R2: `DEP-001`).
- **P3 Findings:** None (`0` open).
- **Closed Findings Rechecked in R2:**
  - **`DEP-001` (P2 — Closed):** *`.gitignore` omits transient `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md` files created in the workspace during active runs.*
    - **Fix commit:** `281c04ab2cb342f4e9ed754a1e08dae7673bb688`
    - **Evidence at that revision:** [.gitignore](file:///home/paragon-ux/Antigravity/Agy-Squad/.gitignore#L4-L5) adds `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md`.
    - **Reviewer recheck:** Confirmed that `git check-ignore` matches transient `agy-squad-*` plugin and profile paths while leaving `.agents/skills/pr-review/` tracked.
    - **Residual limitations:** None.
- **Verification Gaps:** None.
- **Category Verdict:** **Pass**

---

## 5. Cross-Category Root Causes and Remediation Summary

All four root-cause clusters identified in R1 were resolved in commit `281c04ab2cb342f4e9ed754a1e08dae7673bb688`:
1. **Cluster 1 — Unmanaged vs. Managed Parity (`RUN-001`, `RUN-002`, `MCP-002`, `MCP-003`, `DOC-002`):** Reserved `"all_l1"` is rejected in `manifestSquads`, `squad.lead` no longer inherits top-level squad properties, `all_l1` validates specialist definitions in both unmanaged and managed runs, `inputSchema` enforces `minLength: 1` / `minProperties: 1` / `agentSchema`, `.mcp-ready` resolves `AGY_SQUAD_WORKSPACE || process.cwd()` via `fs.realpathSync`, and `docs/tools.md` documents `manifest`.
2. **Cluster 2 — Write-Once `publish()` vs. Iterative Bundle Lifecycle (`SVC-001`):** `publish()` supports atomic replacement (`replace = true`) via `fs.renameSync(temporary, destination)` for `bundleReports` while preserving write-once immutability (`replace = false`) for `stagePlan`, and `verifyFiles` / `bundleReports` reject non-object `verifiedFiles` and synthesis/bundle self-hashing.
3. **Cluster 3 — Session Registration, Tool Naming, Staged Manifest Protection, and Teardown (`ARCH-001`, `SKILL-001`, `SVC-002`, `SCRIPT-001`, `DEP-001`):** `bin/agy-squad.mjs` denies `write_file` on pre-staged `manifest.json`, includes current WSL CLI tool names in `makeProfile`, removes unconsumed pre-staged `plan-<hash>` directories on failed runs without evidence, gates `stdin` forwarding in `bin/terminal.py` until `submitted` is true, and ignores `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md` in `.gitignore`.
4. **Cluster 4 — Documentation & Test Coverage (`DOC-001`, `TEST-001`, `SVC-GAP-001`, `SCRIPT-GAP-001`):** `docs/plans/LEDGER.md` records `L1, L2`, `L8–L12`, `L17`, and `L30`, and `tests/` covers managed-run server gating, malformed JSON-RPC requests, concurrent two-process staging, and the `mcp/handoffs.mjs` CLI entrypoint.

---

## 6. Verification Record and Remaining Gaps

### Executed Checks at `281c04ab2cb342f4e9ed754a1e08dae7673bb688`

| Check / Command | Environment | Target Revision | Result | Notes |
| --- | --- | --- | --- | --- |
| `npm test` (`test-dispatch.mjs`, `test-handoffs.mjs`, `test-run.mjs`, `test-server.mjs`) | Local WSL Linux (`node v22.19.0`, `python3 3.12.3`) | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | **PASS** (exit `0`) | Includes all R2 regression tests, concurrent 2-subprocess `stagePlan` test, and `mcp/handoffs.mjs` CLI subprocess test |
| `npm pack --dry-run --json` | Local WSL Linux (`node v22.19.0`) | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | **PASS** (exit `0`) | Tarball `agy-squad-0.1.0.tgz` builds cleanly |
| GitHub Actions `CI` (`pull_request` — Node 22 & 24) | `ubuntu-latest` (Run [`42468601060`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468601060)) | Merge commit `d718d7d219ce7c8682553ef6f88037c837c58ba7` (head `281c04ab2cb342f4e9ed754a1e08dae7673bb688`) | **PASS** (`15s` / `13s`) | Both Node 22 and Node 24 jobs passed `npm test` and `npm pack --dry-run --json` |
| GitHub Actions `CI` (`push` — Node 22 & 24) | `ubuntu-latest` (Run [`42468598397`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468598397)) | Head `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | **PASS** (`14s` / `12s`) | Both Node 22 and Node 24 jobs passed |
| GitHub Actions `Documentation` (`pull_request` & `push`) | `ubuntu-latest` (Runs [`42468601065`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468601065), [`42468598360`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42468598360)) | Merge commit `d718d7d219ce7c8682553ef6f88037c837c58ba7` & head `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | **PASS** (`11s` / `8s`) | `zensical build` succeeded; `deploy` skipped cleanly (`has_pages == false`) |

### Remaining Verification Gaps

None. (`SVC-GAP-001` and `SCRIPT-GAP-001` from R1 are both closed and verified in `tests/test-run.mjs` and `tests/test-handoffs.mjs`.)

---

## 7. Overall Disposition and Finding Closure Table

- **Review Completeness:** **Complete** (all 10 required categories reviewed and rechecked against `281c04ab2cb342f4e9ed754a1e08dae7673bb688`).
- **Merge Disposition:** **Approve** — All `13` findings (`2` P1, `10` P2, `1` P3) and `2` verification gaps from the initial review ([rebuild-wsl-dispatch-review.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/reviews/rebuild-wsl-dispatch-review.md)) have been remediated in `281c04ab2cb342f4e9ed754a1e08dae7673bb688`, verified locally and across all GitHub Actions CI and Documentation checks on `281c04ab2cb342f4e9ed754a1e08dae7673bb688` (merge commit `d718d7d219ce7c8682553ef6f88037c837c58ba7`), and rechecked by the reviewer.

### Finding Closure Table

| Finding ID | Category | Priority | Title | Status | Fix Commit | Evidence & Recheck at `281c04ab2cb342f4e9ed754a1e08dae7673bb688` |
| --- | --- | --- | --- | --- | --- | --- |
| `RUN-001` | `RUN` | **P1** | `manifestSquads` allows reserved `"all_l1"` as a squad key, making its specialists unreachable and colliding with `all_l1` lead compilation | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L48-L50); regression test in [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L85-L88); CI runs `42468601060`, `42468598397` |
| `SVC-001` | `SVC` | **P1** | `bundleReports` fails permanently with `EEXIST` if `lead/report.md` is updated after an initial bundle, and `verifyFiles` accepts array `verifiedFiles` or `lead/report.md` inside `verifiedFiles` | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/handoffs.mjs#L99-L177); regression tests in [tests/test-handoffs.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-handoffs.mjs#L78-L84); CI runs `42468601060`, `42468598397` |
| `ARCH-001` | `ARCH` | **P2** | `L1, L2` host-enforced boundary ledger claim vs. shared `Workspace: "inherit"` and writable pre-staged `manifest.json` under `run.directory` | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L136-L143), [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L8); regression test in [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L168-L170) |
| `DOC-001` | `DOC` | **P2** | `docs/plans/LEDGER.md` omits `L8–L12` and `L17` and leaves `L30` ambiguous after deleting the architecture paper | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [docs/plans/LEDGER.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/plans/LEDGER.md#L11-L16); verified by source inspection and CI runs `42468601065`, `42468598360` |
| `SKILL-001` | `SKILL` | **P2** | Generated session agent profile (`makeProfile`) allowlists only legacy IDE tool names and omits current WSL CLI tool names (`read_file`, `write_file`, `edit_file`, `manage_task`) | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L49-L52); regression tests in [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L144-L153) |
| `MCP-001` | `MCP` | **P2** | `mcp/index.js` mishandles non-object JSON payloads, mislabels runtime exceptions as `-32700 Parse error`, and checks UTF-16 code units instead of UTF-8 bytes | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L71-L75), [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L118-L155); regression tests in [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L66-L69) |
| `MCP-002` | `MCP` | **P2** | `dispatch_squad` `inputSchema` omits `minLength: 1` on `squadId` and `manifestPath` and omits `minProperties: 1` / agent item schemas on `manifest` | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L19-L68); regression tests in [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L55-L56), [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L83-L84) |
| `MCP-003` | `MCP` | **P2** | `.mcp-ready` publication in `mcp/index.js` fails when `AGY_SQUAD_WORKSPACE` is unset or a symlinked path | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/index.js](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/index.js#L143-L144); regression test in [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L74-L85) |
| `RUN-002` | `RUN` | **P2** | `all_l1` lead compilation leaks top-level squad properties into `squad.lead` via `{ ...squad, ...lead }` and skips specialist validation in unmanaged mode | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [mcp/dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/mcp/dispatch.mjs#L117-L126); regression test in [tests/test-dispatch.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-dispatch.mjs#L81-L84) |
| `SVC-002` | `SVC` | **P2** | Pre-staged `plan-<hash>/manifest.json` prevents `removeEmpty(run.directory)` from cleaning up `scratch/agy-squad/run-<id>` when `--manifest` sessions fail before running any agents | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L89-L96), [bin/agy-squad.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs#L162-L164); regression test in [tests/test-run.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-run.mjs#L172-L176) |
| `SCRIPT-001` | `SCRIPT` | **P2** | `bin/terminal.py` forwards operator `stdin` to the child PTY before `/mcp` readiness and initial prompt submission complete | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [bin/terminal.py](file:///home/paragon-ux/Antigravity/Agy-Squad/bin/terminal.py#L51); verified via PTY harness in `tests/test-run.mjs` |
| `TEST-001` | `TEST` | **P2** | `tests/test-server.mjs` does not test managed-run session gating, inline `manifest` schema exposure, `.mcp-ready` publication, or malformed JSON-RPC requests | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [tests/test-server.mjs](file:///home/paragon-ux/Antigravity/Agy-Squad/tests/test-server.mjs#L55-L103); CI runs `42468601060`, `42468598397` |
| `DEP-001` | `DEP` | **P2** | `.gitignore` omits transient `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md` files created in the workspace during active runs | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [.gitignore](file:///home/paragon-ux/Antigravity/Agy-Squad/.gitignore#L4-L5) |
| `DOC-002` | `DOC` | **P3** (Advisory) | `docs/tools.md` top-level `dispatch_squad` argument table omits the managed-run `manifest` parameter | **Closed** | `281c04ab2cb342f4e9ed754a1e08dae7673bb688` | [docs/tools.md](file:///home/paragon-ux/Antigravity/Agy-Squad/docs/tools.md#L17) |
