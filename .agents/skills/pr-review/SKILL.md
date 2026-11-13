---
name: pr-review
description: >-
  [Task Spec — PR/branch diff & CI review; pair with swarm-governance on /swarm]
  Use this skill when the user asks to perform, update, or verify a pull request
  or branch review in Agy-Squad. Enforces the Agy-Squad PR Review Standard
  (v1.3.0) with commit-pinned and session-pinned metadata, architecture-before-runtime
  tracing, ten mandatory categories (ARCH, DOC, SKILL, MCP, RUN, SVC, DB,
  SCRIPT, TEST, DEP), 1-ID-per-row finding records, post-remediation residual
  tracking, and structured reports under docs/reviews/.
---

# Agy-Squad PR Review Skill (Standard v1.3.0)

Conduct pull request and branch diff/CI reviews in `Agy-Squad`. For broad non-diff evidence bundles, repo-wide triage, or Direction decisions, use `full-review`. To run multi-agent reviews on `/swarm`, pair this **Task Spec** with the `swarm-governance` **Execution Modifier** (`squad_planner` / `node bin/agy-squad.mjs plan`; `dispatch_squad` / `agy-squad dispatch` is `invoke_subagent` fallback only). Consult [references/pr-review-standard.md](./references/pr-review-standard.md), [Core workflows](../../../docs/core-workflows.md), and [Roles & skill workflows](../../../docs/roles-and-workflows.md#pr-review). Passing tests, polished docs, and prior approvals are inputs, not proof that implementation satisfies architecture.

---

## Workflow

### Step 0: Pre-Flight Intake (Neutral Topology, Evidence & Integrity Gate)
If the user did not specify topology or retention options, ask via `ask_question` (or multiple-choice prompt) without biasing Flat vs. Layered:
1. **Execution Topology (Ask if Unspecified):**
   - `Flat Cohort`: Specialists report directly to coordinator (`squad_planner` without per-squad leads; fewer coordination hops).
   - `Layered Cohort`: Category specialists + squad leads + coordinator (domain synthesis per squad; higher coordination cost).
   - `Single-Agent Audit`: Direct trace by one reviewer.
2. **Evidence Retention (`Scope 2` vs `Scope 3`):**
   - `Scope 2 — Swarm bundle prune`: Pass `--keep-reports` to `node bin/agy-squad.mjs prune` to retain loose specialist reports in `scratch/agy-squad/squad-<id>/`, or omit to delete loose specialist files after SHA-256 bundling.
   - `Scope 3 — Self-diagnosis teardown (L41)`: Delete completed `/self-diagnosis` directories (`diagnose.mjs --teardown`) once `docs/reviews/<slug>.md` is updated, or defer cleanup during active multi-wave triage.
3. **Integrity Gate & Swarm UI Link:** `Mandatory Flat Integrity Auditor Gate` (`audit-<id>` in `/swarm` or `integrity_auditor[:<id>]` in `invoke_subagent`; `adversarial_*` was retired in Phase 2). When launching `/swarm`, verify pinned models via `swarm{action: "status"}` and immediately end the launch turn with `open_board` (`[Open the Swarm UI](sidecar://swarm/swarm_board/)`) on its own line so the Swarm UI pill renders immediately (do not hide it behind `swarm_wait`).

### Step 1: Pin Review & Session Provenance
Record repository, target PR/branch/tree state, date, reviewer, standard version `1.3.0`, base/head SHAs, dirty delta, CI SHAs, and **Session Provenance** (`Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked`). List changed files and unchanged dependencies, available evidence (`docs/plans/LEDGER.md`, `docs/plans/wsl-cli-verification.md`, prior reviews, transcripts, CI logs), and explicit exclusions.

### Step 2: Trace Architecture Before Runtime
For every behavior change, trace:
`design thesis / invariant -> current architecture decision -> public contract -> implementation -> verification`

Distinguish `docs/plans/LEDGER.md` decisions: active WSL architecture (`L1–L7, L21, L29–L31, L40–L43`), retired/superseded records (`L17` PTY `agy-squad run` retired, `L16`, `L8–L12, L35, L36, L38`), and external shared allocations (`L13–L15, L25–L27, L32–L34`). Never rewrite contracts or docs to match defective code.

### Steps 3–4: Ten-Category Inventory & Records
Map every changed artifact to **one primary category** (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`) and cross-reference affected categories without double-counting (`"No findings"` is valid; finding quotas are banned; mark filesystem-only persistence under `RUN`/`SVC` and `DB` as `Not applicable`). Every category records all 7 items: **Scope**, **Coverage** (`Complete`, `Partial`, `Not reviewed`), **P1**, **P2**, **P3** (`None identified within reviewed scope` / `Not assessed`), **Verification**, and **Verdict** (`Changes required`, `No findings within reviewed scope`, `Incomplete`, `Not applicable`).

### Step 5: Format Findings & Readability (`1 ID = 1 Row`)
Assign one stable ID per independently remediable problem and one of the 6 canonical statuses (`Open (Pre-Remediation)`, `Closed`, `Residual (Open)`, `Closed (Post-Remediation)`, `Deferred / Won't Fix`, `Closed (By Design)`; `Informational` in Section 8 only). Zero compression or omission: `docs/reviews/<slug>.md` is the surviving durable ledger once `prune` / `--teardown` removes `scratch/`.
- **`P0` / `P1` / `P2`:** Concise 10-field records (title/priority/status, contract provenance, commit-pinned source evidence, trigger, expected/actual, impact, remediation, acceptance evidence, root cause/related IDs, closure).
- **`P3`:** Atomic 1-row-per-ID table (`ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA`).
- **Readability rule:** Reserve inline backticks strictly for identifiers, file paths, flags, and commands—never wrap plain numbers, English statuses, or multi-sentence quotes in inline backticks or fenced code blocks inside prose or table cells.

### Step 6: Evidence Rules & Agy-Squad Runtime Boundaries
Separate source inspection, attempted reproduction, local execution, and CI logs; inspect actual test assertions. Verify relevant boundaries:
1. **Schema & Stdio Framing:** `request.jsonrpc === "2.0"`, `tools/list` (`mcp/index.js`) vs `dispatch_squad` / `squad_planner`, positive integer `AGY_MAX_STDIO_PAYLOAD_BYTES`, and 10MB stdio cap.
2. **Workspace & Descriptor Containment:** workspace-internal symlink resolution + `O_NOFOLLOW`/`O_NONBLOCK` + `/proc/self/fd/${fd}` in `mcp/dispatch.mjs`; strict symlink rejection in `mcp/handoffs.mjs`.
3. **Worker Capability, Model Provenance & Input Guards:** disallowed built-in `TypeName`s (`research`, `browser`, `image-generator`), manifest agent `workspace === "inherit"` for `invoke_subagent` and `squad_planner` (`/swarm` copy isolation uses top-level `workspaceIsolation`), `modelProvenance` caveats vs `/swarm` pinning, `scopeFiles` path safety + writable overlap diagnostics, boolean `readOnly`, and camelCase/PascalCase conflict rejection.
4. **Pointer-Over-Wire & Bundling:** `<= 500` UTF-8 byte single-line `READY`/`PARTIAL`/`NO_REPORT` grammar, custom `reportRoot` containment, atomic `publish()`, strict single-line verdicts (`mcp/verdicts.mjs`), default `requireIntegrityAudit: true` binding, and `bundle`/`verify`/`prune` SHA-256 verification.
5. **External MCP & CLI:** real stdio subprocesses and `node bin/agy-squad.mjs` (`plan|dispatch|fingerprint|inspect|bundle|verify|prune|verdict`) vs in-process calls.

### Step 7: Verdict, Closure & Report Structure (`docs/reviews/`)
Request changes if blocking (`P1`/`P2`) findings remain; mark `Incomplete` if a material category is unreviewed; recommend `Approve` only when all material categories are covered, blocking findings are rechecked at the fixed revision, and verification has evidence. Write `docs/reviews/<review-slug>.md` using [references/pr-review-standard.md](./references/pr-review-standard.md) Sections 1–8 (plus Section 9 only when `/self-diagnosis` cohorts run; write `None (0 open residuals, 0 deferred items)` when Section 8 is empty).
