# PR Review: PR #1 (`rebuild/wsl-dispatch` -> `main`)

## 1. Review metadata and evidence limits

- **Repository:** `paragon-ux/Agy-Squad` (`https://github.com/paragon-ux/Agy-Squad`)
- **PR URL:** https://github.com/paragon-ux/Agy-Squad/pull/1
- **Review Date:** `2026-11-08`
- **Reviewer:** Antigravity (Standard v1.1.0)
- **Standard Version:** `1.1.0` ([`.agents/skills/pr-review/references/pr-review-standard.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.agents/skills/pr-review/references/pr-review-standard.md))
- **Base SHA:** `ee10ebc255f0d52dc93b51d7cf8198bb069c4532` (`main`)
- **Head SHA:** `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7` (`rebuild/wsl-dispatch`)
- **GitHub Generated Merge Commit (`refs/pull/1/merge`):** `e5a651eb403af3b4f89fe293f5ce555fe0997ce0`
- **Cited CI Runs:**
  - **Run [`42467742983`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467742983) (`CI` workflow, `pull_request`):** Executed against GitHub's generated merge commit `e5a651eb403af3b4f89fe293f5ce555fe0997ce0` (merging head `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7` into base `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`). Matrix jobs `Node 22 / ubuntu-latest` (15s) and `Node 24 / ubuntu-latest` (15s) ran `npm test` and `npm pack --dry-run --json` — **Success**.
  - **Run [`42467742975`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467742975) (`Documentation` workflow, `pull_request`):** Executed against GitHub's generated merge commit `e5a651eb403af3b4f89fe293f5ce555fe0997ce0`. Job `build` (8s) ran `zensical build` on Python 3.11 — **Success** (`deploy` skipped on PR).
  - **Run [`42467700982`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467700982) (`CI` workflow, `push`):** Executed directly against PR head commit `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7`. Matrix jobs `Node 22 / ubuntu-latest` (16s) and `Node 24 / ubuntu-latest` (13s) — **Success**.
  - **Run [`42467700892`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467700892) (`Documentation` workflow, `push`):** Executed directly against PR head commit `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7`. Job `build` (12s) ran `zensical build` — **Success**.
- **Evidence Available and Examined:**
  - **Repository sources:** Base commit `ee10ebc255f0d52dc93b51d7cf8198bb069c4532`, head commit `6d6ad31a9054a41ca5563b05dfff02ecdcf724d7` (all 26 changed files), and unchanged ` .gitignore` and `LICENSE`.
  - **Historical design records:** Base `docs/plans/LEDGER.md` (`ee10ebc`) and deleted `docs/plans/docker-sandbox-plan.md` (`ee10ebc`).
  - **External local artifacts examined read-only:** Supervised trial workspace `/home/paragon-ux/Antigravity/artifacts/wsl-swarm-trial` (`scratch/agy-squad/squad-pow_trial/lead.md` at `3,162` bytes, `specialist-1.md` at `1,746` bytes, `specialist-2.md` at `1,668` bytes) and sibling suites `/home/paragon-ux/Antigravity/workspace/orchestration-suite.mjs`, `antigravity-swarm-orchestration-suite/package.json`, and `antigravity-orchestration-suite/package.json`.
  - **Local execution:** Full `npm test` suite executed locally on WSL2 (`node v22.19.0`, `python3`), plus targeted local reproduction probes for `MCP-001`, `MCP-003`, `RUN-001`, `RUN-002`, `SVC-001`, and `SVC-002`.
  - **CI logs:** Inspected GitHub Actions runs `42467742983`, `42467742975`, `42467700982`, and `42467700892`.
- **Evidence Unavailable / Exclusions:**
  - No prior PR review report existed prior to this review.
  - Per invariant `L7` (*"Automated tests launch zero real subagents"*), no live Antigravity subagents were spawned during this review.

---

## 2. File-to-category inventory and coverage matrix

### Changed and Examined File Inventory (`ee10ebc255f0d52dc93b51d7cf8198bb069c4532..6d6ad31a9054a41ca5563b05dfff02ecdcf724d7`)

| File Path | Status | Primary Category | Cross-Referenced Categories | Coverage |
| --- | --- | --- | --- | --- |
| [`docs/plans/LEDGER.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md) | Modified (`+18 / -108`) | `ARCH` | `DOC`, `SVC` | Complete |
| `docs/plans/docker-sandbox-plan.md` | Deleted (`-299`) | `ARCH` | `DOC` | Complete |
| [`docs/plans/wsl-cli-verification.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/wsl-cli-verification.md) | Added (`+53`) | `ARCH` | `DOC`, `TEST` | Complete |
| [`README.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/README.md) | Modified (`+79 / -18`) | `DOC` | `SCRIPT`, `DEP` | Complete |
| [`docs/index.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/index.md) | Modified (`+5 / -36`) | `DOC` | `ARCH` | Complete |
| [`docs/stopping-agents.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/stopping-agents.md) | Modified (`+7 / -62`) | `DOC` | `ARCH`, `SVC` | Complete |
| [`docs/tools.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md) | Modified (`+56 / -93`) | `DOC` | `ARCH`, `MCP`, `RUN`, `SVC` | Complete |
| [`mcp/briefs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/briefs.mjs) | Modified (`+68 / -166`) | `SKILL` | `RUN`, `SVC` | Complete |
| [`.agents/skills/pr-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.agents/skills/pr-review/SKILL.md) | Added (`+122`) | `SKILL` | `DOC` | Complete |
| [`.agents/skills/pr-review/references/pr-review-standard.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.agents/skills/pr-review/references/pr-review-standard.md) | Added (`+178`) | `SKILL` | `DOC` | Complete |
| [`mcp/index.js`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js) | Modified (`+38 / -62`) | `MCP` | `RUN`, `SVC` | Complete |
| [`mcp/dispatch.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs) | Modified (`+107 / -115`) | `RUN` | `MCP`, `SVC` | Complete |
| [`mcp/run-state.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/run-state.mjs) | Added (`+61`) | `SVC` | `RUN` | Complete |
| [`mcp/handoffs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs) | Added (`+228`) | `SVC` | `RUN`, `SCRIPT` | Complete |
| [`bin/agy-squad.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs) | Added (`+189`) | `SCRIPT` | `SKILL`, `SVC`, `DEP` | Complete |
| [`bin/terminal.py`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/terminal.py) | Added (`+102`) | `SCRIPT` | `SVC`, `DEP` | Complete |
| `tests/legacy/test-security-canary-re-trial.mjs` | Deleted (`-256`) | `TEST` | `ARCH` | Complete |
| `tests/test-briefs.mjs` | Deleted (`-127`) | `TEST` | `SKILL`, `MCP` | Complete |
| [`tests/test-dispatch.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-dispatch.mjs) | Modified (`+72 / -71`) | `TEST` | `RUN` | Complete |
| [`tests/test-handoffs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-handoffs.mjs) | Added (`+105`) | `TEST` | `SVC` | Complete |
| [`tests/test-run.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs) | Added (`+149`) | `TEST` | `SVC`, `SCRIPT` | Complete |
| [`tests/test-server.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-server.mjs) | Modified (`+22 / -5`) | `TEST` | `MCP` | Complete |
| [`.github/workflows/ci.yml`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.github/workflows/ci.yml) | Added (`+50`) | `TEST` | `DEP` | Complete |
| [`.github/workflows/docs.yml`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.github/workflows/docs.yml) | Modified (`+22 / -1`) | `TEST` | `DEP`, `DOC` | Complete |
| [`package.json`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/package.json) | Modified (`+5 / -4`) | `DEP` | `SCRIPT`, `TEST` | Complete |
| [`zensical.toml`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/zensical.toml) | Modified (`+2 / -2`) | `DEP` | `DOC` | Complete |
| [`.gitignore`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.gitignore) | Unchanged dependency | `DEP` | `SVC` | Complete |

### Category Coverage Matrix

| ID | Category | Coverage | P1 | P2 | P3 | Verification Gaps | Verdict |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| `ARCH` | Architecture and contracts | Complete | 0 | 1 (`ARCH-001`) | 0 | 1 (`ARCH-GAP-001`) | Changes required |
| `DOC` | Documentation and change records | Complete | 0 | 1 (`DOC-001`) | 1 (`DOC-002`) | 0 | Changes required |
| `SKILL` | Skills and agent instructions | Complete | 0 | 1 (`SKILL-001`) | 0 | 0 | Changes required |
| `MCP` | MCP schemas and public API | Complete | 0 | 3 (`MCP-001`, `MCP-002`, `MCP-003`) | 0 | 0 | Changes required |
| `RUN` | Core runtime, parsing, and validation | Complete | 1 (`RUN-001`) | 1 (`RUN-002`) | 0 | 0 | Changes required |
| `SVC` | Services, orchestration, and audit semantics | Complete | 1 (`SVC-001`) | 1 (`SVC-002`) | 0 | 1 (`SVC-GAP-001`) | Changes required |
| `DB` | Database, migrations, replay, and concurrency | Not applicable | 0 | 0 | 0 | 0 | Not applicable (no database/migrations) |
| `SCRIPT` | Scripts, evaluation, and developer tooling | Complete | 0 | 1 (`SCRIPT-001`) | 0 | 1 (`SCRIPT-GAP-001`) | Changes required |
| `TEST` | Tests and CI | Complete | 0 | 1 (`TEST-001`) | 0 | 0 | Changes required |
| `DEP` | Dependencies, packaging, and configuration | Complete | 0 | 1 (`DEP-001`) | 0 | 0 | Changes required |

---

## 3. Architecture-to-implementation trace

| Design Thesis / Invariant | Current Architecture Decision | Public Contract | Implementation | Verification |
| --- | --- | --- | --- | --- |
| **`L1`, `L2`, `L6`, `L21`, `L40`:** Host-enforced boundaries, structured permissions, no regex security perimeter, transcript isolation, no credentials in agent commands. | Supersede Docker Desktop per-agent containers (`L8`, `L9`, `L11`, `L18`–`L24`, `L35`–`L39`) with Antigravity CLI `--sandbox`, profile tool lists, and `--settings` permission rules on WSL2 ([`docs/plans/LEDGER.md:7-16`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md#L7-L16)). | [`docs/plans/wsl-cli-verification.md:11-18`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/wsl-cli-verification.md#L11-L18) and [`README.md:28-30`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/README.md#L28-L30). | [`makeProfile`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L43-L53) and [`runSession`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L119-L127) generate `--sandbox`, `allowNonWorkspaceAccess: false`, `permissions.allow`, and `permissions.deny`. | [`tests/test-run.mjs:111-136`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L111-L136) verifies generated flags/settings against a fake CLI; [`wsl-cli-verification.md:22-31`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/wsl-cli-verification.md#L22-L31) records loopback fixture checks. **Defects:** `ARCH-001`, `SKILL-001`. |
| **`L3`, `L5`, `L7`:** Native stop controls remain unblocked; stopping work cleans up commands; automated tests start zero real subagents. | Rely on native `/agents` panel and `manage_subagents`; delete Docker panic plan; enforce 10-minute default operator evidence checkpoint ([`docs/stopping-agents.md:1-7`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/stopping-agents.md#L1-L7)). | [`docs/stopping-agents.md:1-7`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/stopping-agents.md#L1-L7) and [`docs/tools.md:50`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L50). | [`superviseCohort`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/briefs.mjs#L2-L8), [`managedCohort`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/briefs.mjs#L9-L13), and [`initialPrompt`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L36). | [`tests/test-dispatch.mjs:38-39`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-dispatch.mjs#L38-L39); all 4 test files spawn zero subagents. |
| **`L31`:** Separate Context-Saver and Squad; expose staged payload compilation through a single public MCP tool `dispatch_squad`. | Retire `subagent_brief` MCP tool; `dispatch_squad` returns raw `{ Subagents }` JSON (`all_l1` for Stage 1 leads, `<squadId>` for Stage 2 specialists) ([`docs/plans/LEDGER.md:17`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md#L17)). | [`docs/tools.md:1-44`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L1-L44) and `TOOLS` in [`mcp/index.js:19-43`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L19-L43). | [`handleRequest`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L45-L80), [`handleDispatchSquad`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L77-L135), [`buildSubagentSpec`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/briefs.mjs#L14-L74). | [`tests/test-dispatch.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-dispatch.mjs) and [`tests/test-server.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-server.mjs). **Defects:** `MCP-001`, `MCP-002`, `RUN-001`, `RUN-002`. |
| **Pointer-Over-Wire & Independent Verification:** Single-line handoff (`<= 500` UTF-8 bytes) with report slot locator; parent independently verifies claims and input hashes before bundling/pruning. | Add `mcp/handoffs.mjs` for `fingerprint`, `inspect`, `bundle`, `verify`, and `prune` over `scratch/agy-squad/squad-<id>/(lead\|specialist-N)/report.md`. | [`docs/tools.md:45-62`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L45-L62). | [`mcp/handoffs.mjs:1-228`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs#L1-L228). | [`tests/test-handoffs.mjs:1-105`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-handoffs.mjs#L1-L105). **Defect:** `SVC-001` (`publish` throws `EEXIST` on bundle update). |
| **Managed CLI Runs (`L4`):** No shared mutable runtime state in `os.tmpdir()`; isolated per-run workspace staging (`scratch/agy-squad/run-<uuid>/plan-<hash>/`) and session-scoped MCP discovery. | Add `bin/agy-squad.mjs`, `bin/terminal.py`, and `mcp/run-state.mjs` with `AGY_SQUAD_RUN_DIR`, `AGY_SQUAD_SESSION`, and `.mcp-ready` handshake. | [`README.md:16-31`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/README.md#L16-L31) and [`docs/tools.md:12-19`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L12-L19). | [`mcp/run-state.mjs:1-61`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/run-state.mjs#L1-L61), [`bin/agy-squad.mjs:55-149`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L55-L149), [`bin/terminal.py:15-99`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/terminal.py#L15-L99), [`mcp/index.js:16-18`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L16-L18). | [`tests/test-run.mjs:34-146`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L34-L146). **Defects:** `ARCH-001`, `MCP-003`, `SVC-002`, `SCRIPT-001`, `TEST-001`. |

---

## 4. Category reviews

### 4.1 `ARCH` — Architecture and contracts

1. **Scope:** [`docs/plans/LEDGER.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md), deleted `docs/plans/docker-sandbox-plan.md` (`ee10ebc`), [`docs/plans/wsl-cli-verification.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/wsl-cli-verification.md); cross-referenced with [`docs/tools.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md), [`bin/agy-squad.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs), and [`mcp/briefs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/briefs.mjs).
2. **Coverage:** Complete. All architectural ledger transitions from `ee10ebc` to `6d6ad31` and their contract boundaries were inspected.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**

#### `ARCH-001` — Managed-run workspace inheritance and shared write permission leave staged `manifest.json` and sibling report slots unprotected at the host permission layer
- **Title, priority, status:** Managed-run workspace inheritance (`Workspace: "inherit"`) and run-wide write grant (`write_file(${run.directory})`) rely on prompt guidance rather than host-enforced protection for staged `manifest.json` and sibling slots; **P2**; **Open**.
- **Contract provenance:** Ledger invariant `L1, L2` ([`docs/plans/LEDGER.md:7`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md#L7): *"Use host-enforced boundaries and structured permissions. Treat a brief's file scope as guidance."*) vs. [`docs/tools.md:16`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L16) (*"Agents share the selected workspace through `Workspace: \"inherit\"`. File ownership for concurrent work belongs in the assignments."*).
- **Source evidence:** [`mcp/briefs.mjs:45-47`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/briefs.mjs#L45-L47) (`buildSubagentSpec`), [`bin/agy-squad.mjs:122-125`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L122-L125) (`runSession`), and [`docs/plans/LEDGER.md:7`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md#L7).
- **Trigger:** Launching a managed run (`agy-squad run --launch ...`) with multiple specialists or leads sharing the workspace (`Workspace: "inherit"`) and granted `write_file(${run.directory})`.
- **Expected / actual:**
  - *Expected (from `L1, L2`):* Host-enforced boundaries prevent subagents from overwriting a pre-staged `manifest.json` inside `run.directory`, and `LEDGER.md` explicitly records the architectural boundary between workspace-level host confinement (`allowNonWorkspaceAccess: false`) and intra-workspace receipt/hash verification (`mcp/handoffs.mjs`).
  - *Actual (source inspection):* [`bin/agy-squad.mjs:123-124`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L123-L124) grants `write_file(${run.directory})` across the entire run directory without denying writes to a pre-staged `manifest.json` (`${run.directory}/plan-<hash>/manifest.json`).
- **Impact:** Any agent in a `--launch` session has host permission to overwrite the staged `manifest.json`, which causes subsequent Stage 2 `dispatch_squad` calls to abort with `"The prepared manifest changed"`.
- **Required remediation:**
  1. Add `write_file(${path.join(workspace, dispatch.manifestPath)})` to `settings.permissions.deny` in [`bin/agy-squad.mjs:124`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L124) when `dispatch` is pre-staged.
  2. Explicitly note in [`docs/plans/LEDGER.md:7`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md#L7) that under `Workspace: "inherit"`, host enforcement bounds the workspace and registration files while intra-workspace file scope and report integrity are verified via `mcp/handoffs.mjs` hashes and receipts.
- **Acceptance evidence:** Regression assertion in `tests/test-run.mjs` verifying `settings.permissions.deny` includes the staged manifest path when `--manifest` is supplied, plus updated `docs/plans/LEDGER.md`.
- **Root cause / related IDs:** Architectural shift from per-agent Docker volume subpaths (`L35` in `ee10ebc`) to shared-workspace WSL CLI execution (`Workspace: "inherit"`).
- **Closure:** Open.

5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - *Tests inspected:* [`tests/test-run.mjs:62-68`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L62-L68), [`tests/test-handoffs.mjs:68-86`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-handoffs.mjs#L68-L86).
   - *Tests executed:* `npm test` (passed locally and in CI runs `42467742983` and `42467700982`).
   - *CI evidence inspected:* Runs `42467742983` and `42467700982`.
   - *Verification gaps:* **Gap `ARCH-GAP-001`:** The live supervised trial recorded in [`docs/plans/wsl-cli-verification.md:43-52`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/wsl-cli-verification.md#L43-L52) (2026-11-07) ran under the earlier flat-file slot contract (`scratch/agy-squad/squad-pow_trial/lead.md`, `specialist-1.md`, `specialist-2.md`). The new nested slot layout (`lead/report.md`, `specialist-N/report.md`) and `bin/agy-squad.mjs` launcher have only been exercised with loopback/fake CLI fixtures.
7. **Verdict:** **Changes required** (`ARCH-001`).

---

### 4.2 `DOC` — Documentation and change records

1. **Scope:** [`README.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/README.md), [`docs/index.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/index.md), [`docs/stopping-agents.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/stopping-agents.md), [`docs/tools.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md); cross-referenced with [`docs/plans/LEDGER.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md) and [`docs/plans/wsl-cli-verification.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/wsl-cli-verification.md).
2. **Coverage:** Complete. All documentation files and their cross-references to `bin/`, `mcp/`, and sibling benchmark suites were inspected.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**

#### `DOC-001` — `docs/plans/LEDGER.md` silently drops ledger IDs `L10`, `L12`, `L17`, and `L30` despite claiming ID stability with `Agy-Context-Saver`
- **Title, priority, status:** Active decision ledger omits `L10`, `L12`, `L17`, and `L30` without recording their retirement or active status; **P2**; **Open**.
- **Contract provenance:** [`docs/plans/LEDGER.md:3`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md#L3) (*"This ledger records the active Agy-Squad decisions. IDs shared with Agy-Context-Saver stay stable."*) and base commit [`ee10ebc:docs/plans/LEDGER.md`](https://github.com/paragon-ux/Agy-Squad/blob/ee10ebc255f0d52dc93b51d7cf8198bb069c4532/docs/plans/LEDGER.md).
- **Source evidence:** [`docs/plans/LEDGER.md:5-17`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md#L5-L17) vs. base `ee10ebc:docs/plans/LEDGER.md` lines 40–66 (`L10`, `L12`, `L17`, `L30`).
- **Trigger:** Inspecting `docs/plans/LEDGER.md` to trace `L30` (Zensical documentation site, still active via `zensical.toml` and `.github/workflows/docs.yml`), `L17` (main agent sandboxing scope — now changed to `--sandbox` by default in `bin/agy-squad.mjs:127`), or `L10`/`L12` (Windows jail/sandbox decisions superseded by WSL2).
- **Expected / actual:**
  - *Expected:* Every ledger ID previously defined in `ee10ebc:docs/plans/LEDGER.md` is either retained as active (such as `L30`) or explicitly listed in the superseded/retired rows (such as `L10`, `L12`, and the updated `L17` where `agy-squad run` now passes `--sandbox` to the main CLI session).
  - *Actual (source inspection):* `L10`, `L12`, `L17`, and `L30` were deleted without a row entry in [`docs/plans/LEDGER.md:5-17`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/LEDGER.md#L5-L17).
- **Impact:** Breaks ledger ID continuity and leaves the behavioral reversal of `L17` (main agent unconditional `--sandbox` on WSL) and active status of `L30` undocumented in the decision ledger.
- **Required remediation:** Restore `L30` (Active), include `L10` and `L12` in the superseded platform row (`L8–L12, L35, L36, L38`), and record the updated `L17` decision (main CLI session runs under `--sandbox` on WSL).
- **Acceptance evidence:** Source reconciliation in `docs/plans/LEDGER.md` confirming all IDs from `ee10ebc` are accounted for.
- **Root cause / related IDs:** Table compression when rewriting `docs/plans/LEDGER.md`.
- **Closure:** Open.

5. **P3 — low priority:**

#### `DOC-002` — `docs/tools.md` omits `manifest` argument from the top-level `dispatch_squad` argument table (Advisory)
- **Title, priority, status:** Top-level argument table in `docs/tools.md` lists only `squadId` and `manifestPath`, deferring `manifest` to prose in the next section; **P3 (Advisory)**; **Open**.
- **Contract provenance:** [`docs/tools.md:5-9`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L5-L9) vs. [`docs/tools.md:14`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L14) and [`mcp/index.js:29-38`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L29-L38).
- **Source evidence:** [`docs/tools.md:5-9`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L5-L9).
- **Trigger:** Reading the `dispatch_squad` argument table at the top of `docs/tools.md` when inspecting tool parameters.
- **Expected / actual:**
  - *Expected:* The argument table includes `manifest` (noting it is available in managed runs as an inline `{ squads }` object mutually exclusive with `manifestPath`).
  - *Actual (source inspection):* The table at [`docs/tools.md:5-9`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L5-L9) lists only `squadId` and `manifestPath`.
- **Impact:** Minor readability friction when cross-referencing the MCP schema against the reference table.
- **Required remediation:** Add a `manifest` row to the argument table in [`docs/tools.md:5-9`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L5-L9).
- **Acceptance evidence:** Source reconciliation in `docs/tools.md` and passing `zensical build`.
- **Root cause / related IDs:** Related to `MCP-002`.
- **Closure:** Open.

6. **Verification:**
   - *Tests inspected:* External verification against `/home/paragon-ux/Antigravity/artifacts/wsl-swarm-trial` and `/home/paragon-ux/Antigravity/workspace/orchestration-suite.mjs`.
   - *Tests executed:* Verified exact byte counts in `/home/paragon-ux/Antigravity/artifacts/wsl-swarm-trial/scratch/agy-squad/squad-pow_trial/` (`specialist-1.md`: `1,746` bytes; `specialist-2.md`: `1,668` bytes; `lead.md`: `3,162` bytes), matching [`docs/plans/wsl-cli-verification.md:47-51`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/plans/wsl-cli-verification.md#L47-L51).
   - *CI evidence inspected:* GitHub Actions runs [`42467742975`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467742975) (`pull_request`) and [`42467700892`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467700892) (`push`) both executed `zensical build` and passed.
   - *Verification gaps:* None.
7. **Verdict:** **Changes required** (`DOC-001`, `DOC-002`).

---

### 4.3 `SKILL` — Skills and agent instructions

1. **Scope:** [`mcp/briefs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/briefs.mjs), [`bin/agy-squad.mjs:22-53`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L22-L53) (`initialPrompt` and `makeProfile`), and [`.agents/skills/pr-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.agents/skills/pr-review/SKILL.md).
2. **Coverage:** Complete. Inspected all generated agent profiles, system prompts, lead/specialist brief templates, and the repository PR review skill.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**

#### `SKILL-001` — `makeProfile` in `bin/agy-squad.mjs` declares only legacy tool names (`view_file`, `write_to_file`, `replace_file_content`, `command_status`) while `runSession` configures permission rules for `read_file` and `write_file`
- **Title, priority, status:** Generated agent profile in `bin/agy-squad.mjs` omits current Antigravity CLI native tool names (`read_file`, `write_file`, `edit_file`, `manage_task`); **P2**; **Open**.
- **Contract provenance:** Required `SKILL` review question (*"Are referenced APIs, enums, fields, commands, and guarantees real and current? Do instructions guide correct implementation and review?"*) and internal consistency with [`bin/agy-squad.mjs:123-125`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L123-L125).
- **Source evidence:** [`bin/agy-squad.mjs:48-50`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L48-L50) (`makeProfile`) vs. [`bin/agy-squad.mjs:123-124`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L123-L124) (`settings.permissions`) and `/home/paragon-ux/Antigravity/workspace/orchestration-suite.mjs` lines 62–67.
- **Trigger:** Running `agy-squad run` (with or without `--launch`) on an Antigravity CLI build whose native tool registry exposes `read_file`, `write_file`, `edit_file`, and `manage_task` rather than only legacy `view_file`, `write_to_file`, `replace_file_content`, and `command_status`.
- **Expected / actual:**
  - *Expected:* `makeProfile` in [`bin/agy-squad.mjs:48-50`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L48-L50) includes current Antigravity native tool names (`read_file` in both modes; `write_file`, `edit_file`, `manage_task` in `--launch` mode) alongside legacy aliases, matching `settings.permissions.allow` and `orchestration-suite.mjs`.
  - *Actual (source inspection):* [`makeProfile`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L48-L50) omits `read_file`, `write_file`, `edit_file`, and `manage_task`.
- **Impact:** Strips `read_file`, `write_file`, `edit_file`, and `manage_task` from the generated session agent profile even though `settings.permissions.allow` explicitly grants `read_file(${workspace})` and `write_file(${run.directory})`.
- **Required remediation:** Add `read_file` to the base tool list of [`makeProfile`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L48) and add `write_file`, `edit_file`, and `manage_task` to the `launch` tool list at [`bin/agy-squad.mjs:49-50`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L49-L50). Update `tests/test-run.mjs` line 117 to assert that neither `write_to_file` nor `write_file`/`edit_file` is present in preview mode.
- **Acceptance evidence:** Updated assertions in `tests/test-run.mjs` verifying both legacy and current tool names across preview and `--launch` profiles.
- **Root cause / related IDs:** Drift between the profile generator in `orchestration-suite.mjs` and `makeProfile` in `bin/agy-squad.mjs`.
- **Closure:** Open.

5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - *Tests inspected:* [`tests/test-dispatch.mjs:34-67`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-dispatch.mjs#L34-L67), [`tests/test-run.mjs:42-53`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L42-L53).
   - *Tests executed:* `npm test` (passed locally and in CI).
   - *CI evidence inspected:* Runs `42467742983` and `42467700982`.
   - *Verification gaps:* None.
7. **Verdict:** **Changes required** (`SKILL-001`).

---

### 4.4 `MCP` — MCP schemas and public API

1. **Scope:** [`mcp/index.js`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js); cross-referenced with [`mcp/dispatch.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs), [`docs/tools.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md), and [`tests/test-server.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-server.mjs).
2. **Coverage:** Complete. Inspected JSON-RPC 2.0 request/notification handling, payload size guards, tool discovery schemas (`TOOLS`), and readiness signaling.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**

#### `MCP-001` — `handleRequest` crashes on `null` JSON payloads, silently swallows non-object JSON values and method-less objects as notifications, and checks UTF-16 length instead of UTF-8 byte length for the 10 MB ceiling
- **Title, priority, status:** JSON-RPC boundary in `mcp/index.js` mishandles non-object requests (`null`, arrays, primitives, objects without `method`) and measures `MAX_STDIO_PAYLOAD_BYTES` in UTF-16 code units; **P2**; **Open**.
- **Contract provenance:** JSON-RPC 2.0 specification (§4 / §5.1: `-32600 Invalid Request` when the JSON sent is not a valid Request object; `-32700 Parse error` only when invalid JSON is received) and `MAX_STDIO_PAYLOAD_BYTES` contract in [`mcp/index.js:83-95`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L83-L95).
- **Source evidence:** [`mcp/index.js:45-50`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L45-L50) (`handleRequest`) and [`mcp/index.js:88-112`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L88-L112) (`rl.on("line", ...)`).
- **Trigger:**
  1. Calling exported `handleRequest(null)` in-process or sending `"null\n"` over stdio.
  2. Sending `"123\n"`, `"[]\n"`, or `'{"jsonrpc":"2.0"}\n'` over stdio.
  3. Sending a line with `4,000,000` 3-byte UTF-8 characters (`line.length === 4,000,000 < 10,485,760`, but `Buffer.byteLength(line, "utf8") === 12,000,000 > 10,485,760`).
- **Expected / actual:**
  - *Expected:* Non-object payloads (`null`, primitives, arrays) and objects lacking a string `method` return JSON-RPC error `-32600` (`Invalid Request`); only `JSON.parse` syntax failures return `-32700` (`Parse error`); `MAX_STDIO_PAYLOAD_BYTES` checks `Buffer.byteLength(line, "utf8")`.
  - *Actual (local execution & source inspection):*
    - Executed `await handleRequest(null)` -> threw unhandled `TypeError: Cannot destructure property 'id' of 'request' as it is null`; over stdio, this `TypeError` is caught at line 106 and reported as `-32700 Parse error`.
    - Executed `await handleRequest(123)` and `await handleRequest({})` -> both returned `null` because `id === undefined` at line 49 treats them as valid notifications.
    - Line 88 checks `if (line.length > MAX_STDIO_PAYLOAD_BYTES)` (UTF-16 code units) rather than UTF-8 byte length.
- **Impact:** Misclassifies runtime exceptions and invalid request shapes as `-32700 Parse error` or silent notifications, and permits multi-byte UTF-8 lines up to ~30 MB past the 10 MB byte limit.
- **Required remediation:**
  1. In [`handleRequest`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L45), validate `if (!request || typeof request !== "object" || Array.isArray(request) || typeof request.method !== "string")` and return `{ jsonrpc: "2.0", id: request?.id ?? null, error: { code: -32600, message: "Invalid Request" } }`.
  2. Separate the `JSON.parse(line)` `try/catch` (`-32700`) from `handleRequest` execution errors (`-32603`).
  3. Replace `line.length > MAX_STDIO_PAYLOAD_BYTES` at [`mcp/index.js:88`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L88) with `Buffer.byteLength(line, "utf8") > MAX_STDIO_PAYLOAD_BYTES`.
- **Acceptance evidence:** Unit and stdio tests in `tests/test-server.mjs` asserting `-32600` for `null`, `[]`, `123`, and `{ "jsonrpc": "2.0", "id": 1 }`, and `-32700` for malformed JSON.
- **Root cause / related IDs:** Conflating `JSON.parse` and `handleRequest` inside a single `try` block and checking `id === undefined` before validating the request object shape.
- **Closure:** Open.

#### `MCP-002` — `dispatch_squad` discovery `inputSchema` diverges from runtime structural constraints in `mcp/dispatch.mjs` and `mcp/briefs.mjs`
- **Title, priority, status:** `TOOLS[0].inputSchema` in `mcp/index.js` omits representable constraints enforced by `handleDispatchSquad` (`minLength`/`pattern` on strings, `minProperties: 1` and squad/agent properties on `manifest.squads`); **P2**; **Open**.
- **Contract provenance:** Standard Section 3 (`MCP`: *"Do discovery schemas, runtime acceptance, errors, defaults, nullability, bounds, and documented responses agree?"*) and Section 6 (*"Enforce representable structural constraints; retain service checks for cross-field and business rules."*).
- **Source evidence:** [`mcp/index.js:24-42`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L24-L42) (`TOOLS[0].inputSchema`) vs. [`mcp/dispatch.mjs:40-44`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L40-L44), [`mcp/dispatch.mjs:84-92`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L84-L92), and [`mcp/briefs.mjs:25-30`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/briefs.mjs#L25-L30).
- **Trigger:**
  1. Passing `{ squadId: "", manifest: { squads: {} } }` satisfies `inputSchema` but fails at [`mcp/dispatch.mjs:41`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L41) and [`mcp/dispatch.mjs:84`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L84).
  2. In managed mode (`AGY_SQUAD_RUN_DIR` set), `manifest.properties.squads.additionalProperties` is `{ type: "object" }` with no `minProperties: 1` and no schema for `lead`, `specialists`, `children`, `objective`, or `scopeFiles` (which were previously declared in `ee10ebc:mcp/index.js` lines 8–33).
- **Expected / actual:**
  - *Expected:* `inputSchema` encodes representable structural bounds: `minLength: 1` on `squadId` and `manifestPath`, `minProperties: 1` on `manifest.properties.squads`, and agent item schemas requiring `objective` (non-empty string) and `scopeFiles` (non-empty string array).
  - *Actual (source inspection):* [`mcp/index.js:24-42`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L24-L42) declares bare `{ type: "string" }` for `squadId` and `manifestPath` and `{ type: "object", additionalProperties: { type: "object" } }` for `manifest.properties.squads`.
- **Impact:** Models relying on `tools/list` schema discovery in managed runs lack structural guidance for inline `manifest` objects.
- **Required remediation:** Add `minLength: 1` to `squadId` and `manifestPath`, and add `minProperties: 1` and squad/agent property schemas (`lead`, `specialists`, `children` with `objective` and `scopeFiles`) to `manifest.properties.squads` in [`mcp/index.js:26-42`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L26-L42).
- **Acceptance evidence:** Schema validation tests in `tests/test-server.mjs` checking `inputSchema` in both default and `AGY_SQUAD_RUN_DIR` modes.
- **Root cause / related IDs:** Removal of `SPEC_PROPERTIES` and `CHILDREN_SCHEMA` from `mcp/index.js` when retiring `subagent_brief`.
- **Closure:** Open.

#### `MCP-003` — Managed-run readiness signal in `mcp/index.js` does not fall back to `process.cwd()` or canonicalize `AGY_SQUAD_WORKSPACE` with `fs.realpathSync`
- **Title, priority, status:** `publish(process.env.AGY_SQUAD_WORKSPACE, ...)` in `mcp/index.js` fails when `AGY_SQUAD_WORKSPACE` is unset or contains a symlink segment; **P2**; **Open**.
- **Contract provenance:** [`docs/tools.md:10`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L10) (*"The server uses `AGY_SQUAD_WORKSPACE` from its launch environment or its working directory."*) and [`mcp/dispatch.mjs:77-93`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L77-L93) (`workspace = process.env.AGY_SQUAD_WORKSPACE || process.cwd()`, `const root = fs.realpathSync(workspace)`).
- **Source evidence:** [`mcp/index.js:99-105`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L99-L105) vs. [`mcp/handoffs.mjs:52-62`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs#L52-L62) (`workspacePath`).
- **Trigger:** Starting `mcp/index.js` with `AGY_SQUAD_RUN_DIR` and `AGY_SQUAD_SESSION` set while `AGY_SQUAD_WORKSPACE` is unset (relying on `process.cwd()`) or set to a path containing a symlink, then sending `tools/list`.
- **Expected / actual:**
  - *Expected:* `mcp/index.js` resolves the workspace root identically to `handleDispatchSquad`: `fs.realpathSync(process.env.AGY_SQUAD_WORKSPACE || process.cwd())`, and publishes `${managedRun}/.mcp-ready`.
  - *Actual (local execution):* Executed `mcp/index.js` over stdio with `AGY_SQUAD_RUN_DIR` and `AGY_SQUAD_SESSION` set in `cwd` without `AGY_SQUAD_WORKSPACE`. Sending `tools/list` failed to write `.mcp-ready` and emitted on stderr: `Agy-Squad readiness signal failed: The "path" argument must be of type string. Received undefined`.
- **Impact:** If `mcp/index.js` is launched in a managed run without `AGY_SQUAD_WORKSPACE` or with a non-canonical workspace path, `.mcp-ready` is never written and `bin/terminal.py` times out after 15 seconds.
- **Required remediation:** Change [`mcp/index.js:101`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L101) to resolve `const root = fs.realpathSync(process.env.AGY_SQUAD_WORKSPACE || process.cwd()); publish(root, `${managedRun}/.mcp-ready`, Buffer.from("ready\n"));`.
- **Acceptance evidence:** Subprocess test in `tests/test-server.mjs` verifying `.mcp-ready` creation on `tools/list` when `AGY_SQUAD_RUN_DIR` and `AGY_SQUAD_SESSION` match.
- **Root cause / related IDs:** Related to `TEST-001` (managed-run code path in `mcp/index.js` had no subprocess test).
- **Closure:** Open.

5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - *Tests inspected:* [`tests/test-server.mjs:1-69`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-server.mjs#L1-L69).
   - *Tests executed:* `node tests/test-server.mjs` and local execution probes for `MCP-001` and `MCP-003`.
   - *CI evidence inspected:* Runs `42467742983` and `42467700982`.
   - *Verification gaps:* None beyond `TEST-001`.
7. **Verdict:** **Changes required** (`MCP-001`, `MCP-002`, `MCP-003`).

---

### 4.5 `RUN` — Core runtime, parsing, and validation

1. **Scope:** [`mcp/dispatch.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs); cross-referenced with [`mcp/briefs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/briefs.mjs) and [`mcp/run-state.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/run-state.mjs).
2. **Coverage:** Complete. Inspected manifest discovery, symlink/descriptor validation, squad/lead/specialist parsing, stage gating, and error reporting.
3. **P1 — high priority:**

#### `RUN-001` — `manifestSquads` and `handleDispatchSquad` allow `"all_l1"` as a squad key in `manifest.squads`, causing Stage 2 lead self-recursion instead of specialist compilation
- **Title, priority, status:** Reserved Stage 1 selector `"all_l1"` is accepted as a squad key in `manifest.squads`, breaking Stage 2 specialist compilation; **P1**; **Open**.
- **Contract provenance:** [`docs/tools.md:7`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L7) (*"`squadId`: Required. Use `all_l1` for every squad lead or a squad ID for that squad's specialists."*) and [`docs/tools.md:47`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L47) (*"The main agent compiles the leads with `all_l1`. An authorized lead compiles its specialists using its squad ID and the same manifest."*).
- **Source evidence:** [`mcp/dispatch.mjs:39-45`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L39-L45) (`manifestSquads`) and [`mcp/dispatch.mjs:104-117`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L104-L117) (`handleDispatchSquad`).
- **Trigger:** Passing a manifest (on disk or inline in a managed run) containing `{ "squads": { "all_l1": { "lead": { "objective": "...", "scopeFiles": ["src"] }, "specialists": [{ "objective": "...", "scopeFiles": ["src/a.js"] }] } } }`.
- **Expected / actual:**
  - *Expected:* `manifestSquads` rejects `"all_l1"` as a reserved stage selector (e.g., `throw new Error("Squad ID 'all_l1' is reserved for lead compilation.")`) so every squad ID can be unambiguously compiled in Stage 2.
  - *Actual (local execution):* Executed `handleDispatchSquad({ squadId: "all_l1" }, tmp)` on a manifest with `squads.all_l1`. Stage 1 succeeded and generated a lead prompt instructing the lead to call `dispatch_squad` with `{"squadId":"all_l1","manifestPath":"swarm-manifest.json"}`. When the lead executes that call in Stage 2, `if (squadId === "all_l1")` at [`mcp/dispatch.mjs:104`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L104) matches Stage 1 again, returning the L1 lead payload instead of `squads.all_l1.specialists` (and in managed mode, failing with `Report slot is already occupied`).
- **Impact:** Complete failure of Stage 2 specialist compilation and recursive L1 lead re-dispatch whenever a caller or task-driven agent names a squad `"all_l1"` in `manifest.squads`.
- **Required remediation:** In [`manifestSquads`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L39-L45), check `if (Object.hasOwn(squads, "all_l1")) throw new Error("Squad ID 'all_l1' is reserved for lead compilation.");`.
- **Acceptance evidence:** Regression test in `tests/test-dispatch.mjs` asserting that `{ squads: { all_l1: ... } }` is rejected.
- **Root cause / related IDs:** In-band signaling of Stage 1 via `squadId: "all_l1"` without reserving `"all_l1"` in `manifestSquads`.
- **Closure:** Open.

4. **P2 — medium priority:**

#### `RUN-002` — Unmanaged `all_l1` compilation skips specialist validation, and `{ ...squad, ...lead }` leaks outer squad properties into `lead` specs
- **Title, priority, status:** `handleDispatchSquad` validates Stage 2 specialists during `all_l1` only in managed runs (`if (staged)`), and merges `{ ...squad, ...lead }` even when `squad.lead` is an explicit sub-object; **P2**; **Open**.
- **Contract provenance:** Required `RUN` review question (*"Are inputs untrusted, failures deterministic, matching exact, application sequential and atomic, and stage reporting accurate?"*) and [`docs/tools.md:43`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L43).
- **Source evidence:** [`mcp/dispatch.mjs:109-126`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L109-L126) (`handleDispatchSquad`) and [`mcp/briefs.mjs:22-40`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/briefs.mjs#L22-L40) (`buildSubagentSpec`).
- **Trigger:**
  1. Calling `handleDispatchSquad({ squadId: "all_l1" }, workspace)` (unmanaged mode, `run === undefined`) on a manifest where `squads.alpha` has a valid `lead` but `specialists: []` (empty array) or a specialist with an invalid `objective: ""` or `scopeFiles: [42]`.
  2. Defining a squad with top-level `"role": "Outer"` and nested `"lead": { "Role": "Inner", "objective": "...", "scopeFiles": ["src"] }`.
- **Expected / actual:**
  - *Expected:* `handleDispatchSquad({ squadId: "all_l1" })` validates all squads' specialists (`specialistAssignments(squads, id)` and `build(child)`) in both managed and unmanaged modes so a parent never launches Stage 1 leads against a manifest whose Stage 2 specialists cannot compile. When `squad.lead` is explicitly defined, `lead` properties take precedence without outer properties overriding inner aliases.
  - *Actual (local execution):* Executed `handleDispatchSquad({ squadId: "all_l1", manifestPath: "bad-spec.json" }, tmp)` with `specialists: []` in unmanaged mode -> returned `isError: undefined` (succeeded!), whereas Stage 2 `handleDispatchSquad({ squadId: "alpha", manifestPath: "bad-spec.json" }, tmp)` failed with `dispatch_squad: Squad 'alpha' must define children or specialists.`
- **Impact:** In manual/unmanaged runs, Stage 1 (`all_l1`) succeeds and spawns L1 lead subagents that are guaranteed to fail when they call `dispatch_squad` in Stage 2.
- **Required remediation:** Move `const children = squadId === "all_l1" ? assignments.flatMap(({ id }) => specialistAssignments(squads, id)) : []; for (const child of children) build(child);` outside `if (staged)` in [`mcp/dispatch.mjs:121-124`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/dispatch.mjs#L121-L124) so all manifests validate their full hierarchy on `all_l1` compilation, and use `spec: lead` instead of `{ ...squad, ...lead }` at line 113.
- **Acceptance evidence:** Regression test in `tests/test-dispatch.mjs` verifying that `dispatch({ squadId: "all_l1" })` in unmanaged mode rejects a manifest with valid `lead` and empty or invalid `specialists`.
- **Root cause / related IDs:** Specialist pre-validation was added inside the `if (staged)` block rather than the shared compilation path.
- **Closure:** Open.

5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - *Tests inspected:* [`tests/test-dispatch.mjs:1-91`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-dispatch.mjs#L1-L91), [`tests/test-run.mjs:34-72`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L34-L72).
   - *Tests executed:* `node tests/test-dispatch.mjs`, `node tests/test-run.mjs`, and local reproduction probes for `RUN-001` and `RUN-002`.
   - *CI evidence inspected:* Runs `42467742983` and `42467700982`.
   - *Verification gaps:* None.
7. **Verdict:** **Changes required** (`RUN-001`, `RUN-002`).

---

### 4.6 `SVC` — Services, orchestration, and audit semantics

1. **Scope:** [`mcp/handoffs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs) and [`mcp/run-state.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/run-state.mjs); cross-referenced with [`bin/agy-squad.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs) and [`docs/tools.md`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md).
2. **Coverage:** Complete. Inspected Pointer-Over-Wire receipt reconciliation, file fingerprinting, evidence bundling, bundle verification, loose-report pruning, and managed run-directory staging.
3. **P1 — high priority:**

#### `SVC-001` — `bundleReports` crashes with `EEXIST` when re-bundling after a synthesis, specialist report, or verified input is updated
- **Title, priority, status:** `publish` in `mcp/handoffs.mjs` uses hard-link creation (`fs.linkSync`) that throws `EEXIST` whenever `lead/report.sources.json` already exists with different bytes, preventing bundle updates after recheck; **P1**; **Open**.
- **Contract provenance:** [`docs/tools.md:50-51`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L50-L51) (*"After relevant writers finish or stop, the parent verifies material claims on the final inputs and records its own verdict and the versions or hashes checked. Recheck changed inputs."*) and [`docs/tools.md:61-62`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/docs/tools.md#L61-L62).
- **Source evidence:** [`mcp/handoffs.mjs:97-116`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs#L97-L116) (`publish`), [`mcp/handoffs.mjs:131-167`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs#L131-L167) (`bundleReports`), and [`mcp/handoffs.mjs:88-93`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs#L88-L93) (`verifyFiles`).
- **Trigger:**
  1. A lead runs `bundle <record.json>` to produce `scratch/agy-squad/squad-<id>/lead/report.sources.json`.
  2. During primary review or input recheck (`docs/tools.md` step 5), the lead updates its synthesis in `lead/report.md` (or re-fingerprints a changed input in `record.json`) and re-runs `bundle <record.json>`.
  3. Additionally, if `record.verifiedFiles` is passed as an array `["fixture.txt"]` instead of `{ "fixture.txt": "<sha256>" }`, `Object.keys(verifiedFiles)` in `verifyFiles` (`mcp/handoffs.mjs:89`) treats array index `"0"` as a filename.
- **Expected / actual:**
  - *Expected:* Re-running `bundleReports` before pruning atomically updates `lead/report.sources.json` (since all loose specialist reports are still present on disk and re-verified by `bundleReports`), and `verifyFiles` / `bundleReports` validates that `verifiedFiles` is a non-array plain object excluding `reportPath(squadId)` and `bundlePath(squadId)`.
  - *Actual (local execution):* Executed `bundleReports(tmp, record)` once, updated `lead/report.md`, and called `bundleReports(tmp, record)` a second time -> threw raw filesystem error `EEXIST: file already exists, link '.../lead/report.sources.json.<uuid>.tmp' -> '.../lead/report.sources.json'`.
- **Impact:** Any legitimate revision to `lead/report.md` or `verifiedFiles` after an initial `bundle` call permanently blocks `bundle` with an unhandled `EEXIST` link error.
- **Required remediation:**
  1. Allow [`bundleReports`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs#L164-L166) to atomically replace `bundlePath(squadId)` (e.g., via `fs.renameSync(temporary, destination)` after `O_NOFOLLOW` / regular-file verification) while keeping `publish` write-once for manifests and session registrations.
  2. In [`verifyFiles`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs#L88-L93), check `if (!verifiedFiles || typeof verifiedFiles !== "object" || Array.isArray(verifiedFiles))` and in [`bundleReports`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs#L153-L155) also forbid `reportPath(squadId)` and `bundlePath(squadId)` inside `verifiedFiles`.
- **Acceptance evidence:** Regression test in `tests/test-handoffs.mjs` covering `bundleReports` re-execution after updating `lead/report.md` and rejecting non-object `verifiedFiles` or `verifiedFiles` containing the synthesis/bundle path.
- **Root cause / related IDs:** Reusing write-once `publish` (designed for immutable staged manifests and session files) for `lead/report.sources.json`.
- **Closure:** Open.

4. **P2 — medium priority:**

#### `SVC-002` — `agy-squad run --manifest ... --squad ...` stages `plan-<hash>/manifest.json` and slot directories before session startup and leaves orphaned run directories when startup fails
- **Title, priority, status:** Preflight `handleDispatchSquad` call in `bin/agy-squad.mjs` populates `run.directory` before launching `python3`/`agy` and does not clean up unexecuted staged directories on startup failure; **P2**; **Open**.
- **Contract provenance:** [`README.md:30`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/README.md#L30) and [`tests/test-run.mjs:138-143`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L138-L143) (which expects a failed run with no evidence to remove `run.directory` and `scratch/agy-squad`).
- **Source evidence:** [`bin/agy-squad.mjs:109-113`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L109-L113) and [`bin/agy-squad.mjs:144-148`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L144-L148), plus [`mcp/run-state.mjs:46-58`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/run-state.mjs#L46-L58).
- **Trigger:** Running `agy-squad run --workspace <ws> --manifest plan.json --squad all_l1` when `python3` or `agy` is missing, `.mcp-ready` times out, or `agy` exits non-zero before any agent writes a report.
- **Expected / actual:**
  - *Expected:* If the CLI session fails (`exitCode !== 0`) and no evidence reports (`report.md`) were written under `run.directory`, pre-staged empty slot directories and `manifest.json` are cleaned up (matching the task-only failure test at [`tests/test-run.mjs:138-143`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L138-L143)).
  - *Actual (local execution):* Executed `agy-squad run --workspace ws --manifest plan.json --squad all_l1` with a fake `agy` exiting immediately with code `7`. `bin/agy-squad.mjs` exited with status `7` but printed `Run evidence: .../scratch/agy-squad/run-<uuid>` and left `scratch/agy-squad/run-<uuid>/plan-<hash>/...` on disk.
- **Impact:** Failed startups with `--manifest` accumulate empty `scratch/agy-squad/run-<uuid>` directories in the caller's workspace and misleadingly print `Run evidence: ...`.
- **Required remediation:** When `waitForSession` throws or returns a non-zero exit status and no `report.md` file exists inside `run.directory`, remove the pre-staged `plan-<hash>` directory tree before `removeEmpty(run.directory)`.
- **Acceptance evidence:** Regression test in `tests/test-run.mjs` running `launch(["--launch", "--manifest", "plan.json", "--squad", "all_l1"], 7)` and verifying cleanup when no reports were written.
- **Root cause / related IDs:** `tests/test-run.mjs` line 138 only tested exit code `7` without `--manifest`.
- **Closure:** Open.

5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - *Tests inspected:* [`tests/test-handoffs.mjs:1-105`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-handoffs.mjs#L1-L105), [`tests/test-run.mjs:34-72`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L34-L72).
   - *Tests executed:* `node tests/test-handoffs.mjs`, `node tests/test-run.mjs`, and local reproduction probes for `SVC-001` and `SVC-002`.
   - *CI evidence inspected:* Runs `42467742983` and `42467700982`.
   - *Verification gaps:* **Gap `SVC-GAP-001`:** Concurrent two-process execution of `publish` / `stagePlan` against the same `run` directory is tested sequentially in `tests/test-run.mjs`, not with synchronized concurrent processes.
7. **Verdict:** **Changes required** (`SVC-001`, `SVC-002`).

---

### 4.7 `DB` — Database, migrations, replay, and concurrency

1. **Scope:** None (Agy-Squad has no relational/embedded database, schema migrations, or SQL/ORM layer; filesystem state persistence and atomic file linking are scoped under `SVC`).
2. **Coverage:** Complete (verified absence of database dependencies or migration scripts across `package.json` and all repository files).
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:** None identified within reviewed scope.
5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - *Tests inspected:* None applicable.
   - *Tests executed:* None applicable.
   - *CI evidence inspected:* None applicable.
   - *Verification gaps:* None.
7. **Verdict:** **Not applicable** — Agy-Squad is a filesystem-staged Node.js MCP server and CLI wrapper with no database or schema migrations. Filesystem concurrency and durability (`publish`, `stagePlan`, `pruneReports`) are reviewed under `SVC`.

---

### 4.8 `SCRIPT` — Scripts, evaluation, and developer tooling

1. **Scope:** [`bin/agy-squad.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs) and [`bin/terminal.py`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/terminal.py); cross-referenced with [`mcp/handoffs.mjs:210-226`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs#L210-L226) CLI entry point.
2. **Coverage:** Complete. Inspected argument parsing, PTY fork/exec, signal forwarding, window resize handling, TUI readiness detection, and teardown.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**

#### `SCRIPT-001` — `bin/terminal.py` forwards user `stdin` bytes to the PTY before the initial prompt is submitted, allowing keystrokes during the 15s discovery window to corrupt `/mcp` discovery or prompt submission
- **Title, priority, status:** `bin/terminal.py` copies `stdin` to `master` before `submitted` is `True`; **P2**; **Open**.
- **Contract provenance:** Required `SCRIPT` review question (*"Do scripts fail on unexpected results? Are exceptions scenario-specific?"*) and [`bin/terminal.py:1`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/terminal.py#L1) (*"Pass through the native TUI and submit its initial prompt after MCP discovery."*).
- **Source evidence:** [`bin/terminal.py:51`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/terminal.py#L51) and [`bin/terminal.py:66-86`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/terminal.py#L66-L86).
- **Trigger:** A user presses Enter, Escape, or any key in the terminal during the startup window while `bin/terminal.py` is waiting for `? for shortcuts`, opening `/mcp`, waiting for `.mcp-ready`, or waiting out the `0.15s` panel-close delay (`ready_at = now + 0.15`).
- **Expected / actual:**
  - *Expected:* `bin/terminal.py` withholds forwarding `stdin` to `master` until `submitted` is `True` (so buffered or accidental keystrokes during the automated `/mcp\r` -> `\x1b` -> bracketed-paste sequence cannot close or alter the `/mcp` modal early or corrupt the pasted prompt).
  - *Actual (source inspection):* [`bin/terminal.py:51`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/terminal.py#L51) polls `select.select([master, stdin], ...)` from the very first loop iteration and writes `stdin` bytes directly to `master` at line 70 before `submitted` is `True`.
- **Impact:** Any keystroke buffered in the terminal while `agy` starts up interleaves with `/mcp\r`, `\x1b`, or `\x1b[200~...\x1b[201~\r`, causing MCP discovery to fail or the initial prompt to be malformed.
- **Required remediation:** Poll `[master, stdin] if submitted else [master]` in [`bin/terminal.py:51`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/terminal.py#L51) so user `stdin` remains buffered by the kernel until the automated handshake and initial prompt submission complete.
- **Acceptance evidence:** A test in `tests/test-run.mjs` verifying that `/mcp` discovery and the bracketed-paste initial prompt complete before buffered user `stdin` is forwarded.
- **Root cause / related IDs:** Unconditional inclusion of `stdin` in `select.select` prior to `submitted = True`.
- **Closure:** Open.

5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - *Tests inspected:* [`tests/test-run.mjs:77-146`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L77-L146).
   - *Tests executed:* `node tests/test-run.mjs` (passed locally and in CI).
   - *CI evidence inspected:* Runs `42467742983` and `42467700982`.
   - *Verification gaps:* **Gap `SCRIPT-GAP-001`:** The CLI entry point at [`mcp/handoffs.mjs:210-226`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/handoffs.mjs#L210-L226) (`node mcp/handoffs.mjs fingerprint|inspect|bundle|verify|prune ...`) is tested via imported functions in `tests/test-handoffs.mjs`, not via CLI subprocess invocation.
7. **Verdict:** **Changes required** (`SCRIPT-001`).

---

### 4.9 `TEST` — Tests and CI

1. **Scope:** [`tests/test-dispatch.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-dispatch.mjs), [`tests/test-handoffs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-handoffs.mjs), [`tests/test-run.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs), [`tests/test-server.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-server.mjs), deleted `tests/test-briefs.mjs` (`ee10ebc`), deleted `tests/legacy/test-security-canary-re-trial.mjs` (`ee10ebc`), [`.github/workflows/ci.yml`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.github/workflows/ci.yml), and [`.github/workflows/docs.yml`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.github/workflows/docs.yml).
2. **Coverage:** Complete. Inspected all test files, assertions, deleted test files, and GitHub Actions workflow definitions and CI runs.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**

#### `TEST-001` — Managed-run MCP server behavior in `mcp/index.js` (`AGY_SQUAD_RUN_DIR`, `AGY_SQUAD_SESSION` gating, inline `manifest` schema, and `.mcp-ready` signaling) has zero subprocess test coverage
- **Title, priority, status:** `tests/test-server.mjs` and `tests/test-run.mjs` never exercise `mcp/index.js` in managed-run mode (`AGY_SQUAD_RUN_DIR`); **P2**; **Open**.
- **Contract provenance:** Required `TEST` review question (*"Do tests prove the guarantees, including adversarial cases? What ran, where, against which revision and database, and what remains unverified?"*) and Standard Section 6 (*"External MCP: distinguish an in-process adapter call from a real stdio subprocess."*).
- **Source evidence:** [`mcp/index.js:16-43`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L16-L43), [`mcp/index.js:67-77`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L67-L77), [`mcp/index.js:99-105`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/mcp/index.js#L99-L105), [`tests/test-server.mjs:9-68`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-server.mjs#L9-L68), and [`tests/test-run.mjs:81-100`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L81-L100).
- **Trigger:**
  1. In [`tests/test-run.mjs:94`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L94), the fake `agy` script writes `.mcp-ready` directly (`fs.writeFileSync(ready, "ready\\n")`) instead of spawning the registered `mcp/index.js` server and sending `tools/list`.
  2. In [`tests/test-server.mjs:10`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-server.mjs#L10), `mcp/index.js` is spawned only once with default environment variables (`AGY_SQUAD_RUN_DIR` unset).
- **Expected / actual:**
  - *Expected:* `tests/test-server.mjs` (and/or `tests/test-run.mjs`) spawns `mcp/index.js` as a real stdio subprocess with `AGY_SQUAD_RUN_DIR` set and verifies:
    1. When `AGY_SQUAD_SESSION === AGY_SQUAD_RUN_DIR`, `tools/list` exposes `manifest` in `inputSchema`, writes `${AGY_SQUAD_RUN_DIR}/.mcp-ready`, and `tools/call` accepts inline `manifest`.
    2. When `AGY_SQUAD_SESSION` is unset or mismatched (simulating a neighboring CLI session), `tools/list` returns `[]` (`mcp/index.js:68`), does not write `.mcp-ready`, and `tools/call` rejects `dispatch_squad` with `-32601` (`mcp/index.js:73-74`).
  - *Actual (source inspection & local execution):* Neither case is tested anywhere in `tests/`, which hid `MCP-003`.
- **Impact:** The session-isolation security boundary (`activeRun` in `mcp/index.js:18`) and `.mcp-ready` handshake in `mcp/index.js:99-105` are untested over stdio.
- **Required remediation:** Add stdio subprocess tests in [`tests/test-server.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-server.mjs) for `AGY_SQUAD_RUN_DIR` with matching `AGY_SQUAD_SESSION` and mismatched `AGY_SQUAD_SESSION`, and have the fake `agy` in [`tests/test-run.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L88-L95) exercise the registered MCP server to produce `.mcp-ready`.
- **Acceptance evidence:** Passing `npm test` with the new managed-run stdio tests in `tests/test-server.mjs` and `tests/test-run.mjs`.
- **Root cause / related IDs:** Related to `MCP-003`.
- **Closure:** Open.

5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - *Tests inspected:* [`tests/test-dispatch.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-dispatch.mjs), [`tests/test-handoffs.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-handoffs.mjs), [`tests/test-run.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs), [`tests/test-server.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-server.mjs).
   - *Tests executed:* `npm test` executed locally on WSL2 (`node v22.19.0`) and in CI across Node 22 & 24 (`ubuntu-latest`).
   - *CI evidence inspected:* GitHub Actions runs [`42467742983`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467742983), [`42467742975`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467742975), [`42467700982`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467700982), and [`42467700892`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467700892) — all passed.
   - *Verification gaps:* None.
7. **Verdict:** **Changes required** (`TEST-001`).

---

### 4.10 `DEP` — Dependencies, packaging, and configuration

1. **Scope:** [`package.json`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/package.json), [`zensical.toml`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/zensical.toml), and unchanged [`.gitignore`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.gitignore).
2. **Coverage:** Complete. Inspected package metadata, entry points, runtime engine requirements, and `.gitignore` rules.
3. **P1 — high priority:** None identified within reviewed scope.
4. **P2 — medium priority:**

#### `DEP-001` — `.gitignore` does not ignore temporary `.agents/plugins/agy-squad-*` and `.agents/agents/agy-squad-*.md` session registrations left behind after an unclean kill (`SIGKILL`) or altered registration
- **Title, priority, status:** `.gitignore` ignores `scratch/` but not `.agents/plugins/agy-squad-*` or `.agents/agents/agy-squad-*.md` created by `bin/agy-squad.mjs`; **P2**; **Open**.
- **Contract provenance:** Required `DEP` review question (*"Are installation paths, lockfiles, supported versions, configuration names, and startup assumptions coherent?"*) and [`bin/agy-squad.mjs:102-106,141`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L102-L106).
- **Source evidence:** [`.gitignore:1-6`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.gitignore#L1-L6) and [`bin/agy-squad.mjs:93-106`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/bin/agy-squad.mjs#L93-L106).
- **Trigger:** Running `node bin/agy-squad.mjs run ...` with `--workspace` pointing to `Agy-Squad` (or inspecting a workspace while a session is active or after `SIGKILL` prevents the `finally` block in `bin/agy-squad.mjs:135` from running).
- **Expected / actual:**
  - *Expected:* `.gitignore` excludes ephemeral session registration paths (`.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md`) while keeping committed skills (`.agents/skills/`) tracked.
  - *Actual (source inspection):* [`.gitignore:1-6`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.gitignore#L1-L6) lists only `node_modules/`, `site/`, `scratch/`, `*.log`, `*.tgz`, and `.DS_Store`.
- **Impact:** An active or `SIGKILL`-interrupted `agy-squad run` session leaves untracked `.agents/plugins/agy-squad-*` and `.agents/agents/agy-squad-*.md` files in `git status` that can be accidentally committed.
- **Required remediation:** Add `.agents/plugins/agy-squad-*/` and `.agents/agents/agy-squad-*.md` to [`.gitignore`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/.gitignore).
- **Acceptance evidence:** `git check-ignore` verification on `.agents/plugins/agy-squad-123/plugin.json` and `.agents/agents/agy-squad-123.md` while confirming `.agents/skills/pr-review/SKILL.md` is not ignored.
- **Root cause / related IDs:** `bin/agy-squad.mjs` added temporary `.agents/` session artifacts in `rebuild/wsl-dispatch` without updating `.gitignore`.
- **Closure:** Open.

5. **P3 — low priority:** None identified within reviewed scope.
6. **Verification:**
   - *Tests inspected:* [`tests/test-run.mjs:143-145`](https://github.com/paragon-ux/Agy-Squad/blob/6d6ad31a9054a41ca5563b05dfff02ecdcf724d7/tests/test-run.mjs#L143-L145).
   - *Tests executed:* `npm test` (passed locally and in CI).
   - *CI evidence inspected:* Runs `42467742983` and `42467700982` (`npm pack --dry-run --json` passed).
   - *Verification gaps:* None.
7. **Verdict:** **Changes required** (`DEP-001`).

---

## 5. Cross-category root causes and rationale for remediation order

### Cross-Category Root Causes
1. **In-band stage selector and split validation between managed and unmanaged dispatch (`RUN-001`, `RUN-002`, `MCP-002`):** `mcp/dispatch.mjs` uses the string `"all_l1"` in `squadId` to select Stage 1 without reserving `"all_l1"` in `manifestSquads`, and only runs Stage 2 specialist pre-validation inside `if (staged)` instead of across all `all_l1` calls.
2. **Untested managed-run MCP subprocess boundary (`MCP-001`, `MCP-003`, `TEST-001`):** Because `tests/test-run.mjs` bypassed spawning `mcp/index.js` by having its fake `agy` binary write `.mcp-ready` directly, the managed-run code path in `mcp/index.js` (`activeRun`, conditional `manifest` schema, and `publish(process.env.AGY_SQUAD_WORKSPACE, ...)`) was never executed in `npm test`.
3. **Write-once `publish` helper reused for revisable evidence bundles (`SVC-001`, `ARCH-001`):** `publish` in `mcp/handoffs.mjs` uses `fs.linkSync` and throws `EEXIST` when target contents change, which works for immutable session files but breaks `bundleReports` when a lead updates its synthesis or re-verifies changed inputs.
4. **Preflight staging before session startup and premature `stdin` forwarding (`SVC-002`, `SCRIPT-001`, `DEP-001`, `SKILL-001`):** `bin/agy-squad.mjs` and `bin/terminal.py` perform filesystem mutations and `stdin` polling before the CLI session is established and ready.

### Recommended Remediation Order
1. **Fix P1 runtime and bundling blockers first (`RUN-001`, `SVC-001`):**
   - Forbid `"all_l1"` as a squad key in `manifestSquads` (`mcp/dispatch.mjs`).
   - Allow `bundleReports` (`mcp/handoffs.mjs`) to atomically update `lead/report.sources.json` when loose specialist reports remain intact, and validate `verifiedFiles` shape and exclusions.
2. **Fix P2 MCP server and dispatch consistency (`MCP-001`, `MCP-002`, `MCP-003`, `RUN-002`):**
   - Harden `handleRequest` and UTF-8 byte-length checking in `mcp/index.js`, resolve `fs.realpathSync(process.env.AGY_SQUAD_WORKSPACE || process.cwd())` when publishing `.mcp-ready`, tighten `TOOLS[0].inputSchema`, and run specialist validation on all `all_l1` calls in `mcp/dispatch.mjs`.
3. **Fix P2 CLI launcher, profile, and PTY bridge issues (`SKILL-001`, `SVC-002`, `SCRIPT-001`, `ARCH-001`, `DEP-001`):**
   - Add current native tool names (`read_file`, `write_file`, `edit_file`, `manage_task`) to `makeProfile` in `bin/agy-squad.mjs`, protect staged `manifest.json` from modification, clean up unpopulated preflight run directories on startup failure, gate `stdin` forwarding in `bin/terminal.py` on `submitted`, and update `.gitignore`.
4. **Close test and documentation findings (`TEST-001`, `DOC-001`, `DOC-002`):**
   - Add managed-run stdio subprocess tests in `tests/test-server.mjs` and `tests/test-run.mjs`, and reconcile `docs/plans/LEDGER.md` and `docs/tools.md`.

---

## 6. Verification record and remaining gaps

### Executed Verification Summary

| Verification Type | Command / Target | Result | Scope Proven |
| --- | --- | --- | --- |
| Automated unit & integration suite (local) | `npm test` (`test-dispatch.mjs`, `test-handoffs.mjs`, `test-run.mjs`, `test-server.mjs`) | Passed (`0` exit code) | Unmanaged/managed `handleDispatchSquad` in-process, `handoffs.mjs` in-process, `agy-squad.mjs` with fake `agy` PTY, and unmanaged `mcp/index.js` over stdio. |
| GitHub Actions CI (`pull_request` merge commit `e5a651eb`) | Runs [`42467742983`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467742983) (`CI`) & [`42467742975`](https://github.com/paragon-ux/Agy-Squad/actions/runs/42467742975) (`Documentation`) | Passed (`0` failing, `6` successful checks across PR + push) | Node 22 & 24 `npm test` + `npm pack --dry-run` on `ubuntu-latest`, and `zensical build` on Python 3.11. |
| Targeted reproduction probe (`MCP-001`, `RUN-001`, `RUN-002`, `SVC-001`) | `node --input-type=module -e ...` against `mcp/index.js`, `mcp/dispatch.mjs`, `mcp/handoffs.mjs` | Reproduced all 4 defects | Confirmed `handleRequest(null)` throws `TypeError`, `handleRequest(123)` returns `null`, `squads.all_l1` causes recursive Stage 2 lead instruction, unmanaged `all_l1` skips specialist validation, and second `bundleReports` throws `EEXIST`. |
| Targeted reproduction probe (`MCP-003`, `SVC-002`) | `node --input-type=module -e ...` spawning `mcp/index.js` and `bin/agy-squad.mjs` | Reproduced both defects | Confirmed `.mcp-ready` fails when `AGY_SQUAD_WORKSPACE` is unset, and `agy-squad run --manifest plan.json --squad all_l1` leaves `scratch/agy-squad/run-<uuid>` on disk when `agy` exits `7`. |
| External trial & benchmark artifact verification | Read-only check of `/home/paragon-ux/Antigravity/artifacts/wsl-swarm-trial` and `/home/paragon-ux/Antigravity/workspace/orchestration-suite.mjs` | Verified exact byte counts and script names | Confirmed 2026-11-07 trial report sizes (`1,746`, `1,668`, `3,162` bytes) and suite `package.json` scripts. |

### Remaining Verification Gaps (Non-Defect)

| Gap ID | Category | Description | Required Proof to Close |
| --- | --- | --- | --- |
| `ARCH-GAP-001` | `ARCH` | The 2026-11-07 supervised live trial used the earlier flat slot layout (`lead.md`, `specialist-1.md`, `specialist-2.md`); the new nested slot layout (`lead/report.md`, `specialist-N/report.md`) and `bin/agy-squad.mjs` launcher have only been exercised with loopback/fake CLI fixtures. | Supervised user-run WSL trial using `bin/agy-squad.mjs` and the nested `report.md` slot layout. |
| `SVC-GAP-001` | `SVC` | Concurrent multi-process `stagePlan` / `publish` calls against the same managed run directory have not been stress-tested with synchronized child processes. | Two-process synchronized test in `tests/test-run.mjs`. |
| `SCRIPT-GAP-001` | `SCRIPT` | The CLI entry point of `mcp/handoffs.mjs` (`fingerprint`, `inspect`, `bundle`, `verify`, `prune`) is tested only via imported functions, not via CLI subprocess invocation. | Subprocess CLI test in `tests/test-handoffs.mjs`. |

---

## 7. Overall disposition and finding closure table

- **Review Coverage:** **Complete** across all 9 applicable categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`; `DB` is `Not applicable`).
- **Merge Disposition:** **Request changes** (`2` P1 blocking findings, `10` P2 actionable findings, `1` P3 advisory finding).

### Finding Closure Table

| ID | Category | Priority | Title | Status | Closure Evidence Required |
| --- | --- | --- | --- | --- | --- |
| `RUN-001` | `RUN` | **P1** | `manifestSquads` allows reserved `"all_l1"` as a squad key, causing Stage 2 lead self-recursion | Open | Reject `"all_l1"` in `manifestSquads` + regression test in `tests/test-dispatch.mjs` |
| `SVC-001` | `SVC` | **P1** | `bundleReports` crashes with `EEXIST` when re-bundling after synthesis or input update, and `verifyFiles` accepts non-object `verifiedFiles` | Open | Allow bundle update when loose reports are intact + validate `verifiedFiles` + test in `tests/test-handoffs.mjs` |
| `ARCH-001` | `ARCH` | **P2** | Managed-run `Workspace: "inherit"` and `write_file(run.directory)` do not protect staged `manifest.json` or document cooperative sibling slot boundaries in `LEDGER.md` | Open | Protect staged `manifest.json` (`deny` / read-only mode) + update `docs/plans/LEDGER.md` + test in `tests/test-run.mjs` |
| `DOC-001` | `DOC` | **P2** | `docs/plans/LEDGER.md` silently drops `L10`, `L12`, `L17`, and `L30` | Open | Reconcile missing ledger IDs in `docs/plans/LEDGER.md` |
| `SKILL-001` | `SKILL` | **P2** | `makeProfile` in `bin/agy-squad.mjs` omits current native tool names (`read_file`, `write_file`, `edit_file`, `manage_task`) | Open | Add current native tool names in `makeProfile` + update `tests/test-run.mjs` |
| `MCP-001` | `MCP` | **P2** | `handleRequest` crashes on `null`, swallows non-object/method-less requests as notifications, and checks UTF-16 length instead of UTF-8 byte length | Open | Validate JSON-RPC request shape (`-32600`) + `Buffer.byteLength` check + tests in `tests/test-server.mjs` |
| `MCP-002` | `MCP` | **P2** | `dispatch_squad` `inputSchema` omits representable runtime constraints (`minLength`, `minProperties`, agent schema) | Open | Tighten `TOOLS[0].inputSchema` in `mcp/index.js` + schema assertions in `tests/test-server.mjs` |
| `MCP-003` | `MCP` | **P2** | Managed-run `.mcp-ready` signal in `mcp/index.js` fails when `AGY_SQUAD_WORKSPACE` is unset or a symlink | Open | Use `fs.realpathSync(process.env.AGY_SQUAD_WORKSPACE \|\| process.cwd())` in `mcp/index.js` + test in `tests/test-server.mjs` |
| `RUN-002` | `RUN` | **P2** | Unmanaged `all_l1` compilation skips Stage 2 specialist validation, and `{ ...squad, ...lead }` leaks outer properties | Open | Validate specialists on all `all_l1` calls in `mcp/dispatch.mjs` + test in `tests/test-dispatch.mjs` |
| `SVC-002` | `SVC` | **P2** | `agy-squad run --manifest ...` leaves orphaned `scratch/agy-squad/run-<uuid>` directories when session startup fails | Open | Clean up unpopulated preflight run directories on startup failure in `bin/agy-squad.mjs` + test in `tests/test-run.mjs` |
| `SCRIPT-001` | `SCRIPT` | **P2** | `bin/terminal.py` forwards user `stdin` bytes to the PTY before initial prompt submission | Open | Gate `stdin` selection on `submitted` in `bin/terminal.py` + test in `tests/test-run.mjs` |
| `TEST-001` | `TEST` | **P2** | Managed-run `mcp/index.js` (`AGY_SQUAD_RUN_DIR`, `AGY_SQUAD_SESSION`, `.mcp-ready`) has zero subprocess test coverage | Open | Add managed-run stdio tests in `tests/test-server.mjs` and `tests/test-run.mjs` |
| `DEP-001` | `DEP` | **P2** | `.gitignore` does not ignore temporary `.agents/plugins/agy-squad-*` and `.agents/agents/agy-squad-*.md` files | Open | Add patterns to `.gitignore` |
| `DOC-002` | `DOC` | **P3** | `docs/tools.md` top-level argument table omits `manifest` (Advisory) | Open | Add `manifest` row to argument table in `docs/tools.md` |
