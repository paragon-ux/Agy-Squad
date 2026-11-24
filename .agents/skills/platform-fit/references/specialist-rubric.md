# Specialist Rubric, Disjoint Scopes & Hard Gates (`platform-fit`)

Launch all 3 specialists in **one parallel turn** via `invoke_subagent` (`TypeName: "self"`, `Model: "inherit"`, `Workspace: "inherit"`). Never spawn a `/swarm` board, layered leads, or `monitor`.

## Shared Launch Contract (All 3 Specialists)

- **Line 1 when `Agy-Context-Saver` is installed:** `[agy-transcript-access: self-only]`
- **Read-only discipline:** Never edit tracked repo files or install/uninstall plugins. Write only to the assigned output file under `scratch/platform-fit/<run-slug>/`.
- **Finding cap:** At most **8 high-leverage findings** per specialist (`1 ID = 1 Row`). Exclude cosmetic typos, style nits, or unsupported essays.
- **Evidence requirement:** Every finding must cite `file:line`, executed command stdout/metrics, or an exact URL/heading from `00-platform-baseline.md`. Never fabricate numbers or extrapolate past `DEGRADED (offline)` / `LOCAL_PROBES_ONLY` boundaries.

## 1. Three Disjoint Specialist Briefs

| # | Role & Output File | Atomic ID Prefix | Disjoint Read Scope & Audit Lens |
| --- | --- | --- | --- |
| 1 | **Platform Alignment & Differentiation Specialist** (`10-spec-platform-alignment.md`) | `FIT-NNN` | **Read:** `00-platform-baseline.md`, `plugin.json`, `package.json`, `mcp/index.js`, `mcp/planner.mjs`, `mcp/dispatch.mjs`, `mcp/briefs.mjs`, `.agents/skills/*/SKILL.md`, `docs/concepts.md`. **Lens:** Compare every `Agy-Squad` surface against the pinned Native Capability Matrix. Distinguish genuine differentiation (cryptographic verification, disjoint write-scope planning, strict verdicts) from duplicated or conflicting wrappers around native Antigravity primitives (`swarm`, `invoke_subagent`, `run_workflow`, plugins, hooks, skills, permissions/sandbox). |
| 2 | **E2E Workflow, Friction & Determinism Specialist** (`11-spec-e2e-workflow.md`) | `FLOW-NNN` | **Read:** `00-platform-baseline.md`, `01-telemetry-extract.md`, `bin/agy-squad.mjs`, `mcp/handoffs.mjs`, `mcp/verdicts.mjs`, `scripts/install-register.mjs`, `.agents/skills/swarm-governance/**`, `.agents/skills/day-one-review/**`, `.agents/skills/self-diagnosis/**`. **Lens:** Trace `prompt -> setup -> intake -> plan -> launch -> execute -> collect/verify -> synthesize -> prune -> teardown`. Identify where isolated `invoke_subagent` fan-out or `run_workflow` beats a shared `/swarm` board (preventing cross-peer board reads and turn inflation), where manual coordinator glue or multi-pass ceremony hurts speed, and where soft prompt rules should become deterministic CLI/schema checks. |
| 3 | **Empirical Quota & Efficiency Profiler** (`12-spec-quota-efficiency.md`) | `ROI-NNN` | **Read:** `01-telemetry-extract.md`, `benchmarks/teamwork-vs-squad/`, and `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` only (do NOT full-read `mcp/*.mjs`, `mcp/index.js`, or `.agents/skills/*/SKILL.md` owned by Specialists 1 and 2; open targeted `file:line` slices only for flagged hotspots). **Lens:** Quantify E2E quota ROI vs. vanilla Antigravity baselines using `01-telemetry-extract.md` and fast read-only local probes (`node .agents/skills/self-diagnosis/scripts/diagnose.mjs --json`, `agy-squad plan`/CLI timing and payload byte checks, compiled brief bytes x worker count, coordinator turn and read amplification). Rank the highest-leverage turn/byte/latency wins and flag diminishing-returns ceremony. |

## 2. Standards-Backed 5-Verdict Taxonomy (No "Delete" Category)

Every finding row must assign exactly one verdict from the 5 allowed values below. **Never invent or emit a `Delete`, `Remove`, or `Deprecate` verdict category.**

| Verdict | When to Use |
| --- | --- |
| **`Differentiated (Retain)`** | Verified capability or invariant guarantee that vanilla Antigravity lacks, justified by empirical ROI or concrete safety/determinism proof. |
| **`Align to Native Primitive`** | Duplicates, wraps awkwardly, or conflicts with a documented Antigravity capability; must pass the **Invariant Parity Gate** with equal or stronger guarantees. |
| **`Consolidate / Automate Friction`** | Valid capability slowed by manual glue, multi-pass ceremony, redundant file reads, or avoidable turn/token overhead; must pass both mandatory gates. |
| **`Harden Determinism`** | Strategic objective currently relying on soft prompt compliance where structural enforcement (CLI/schema/isolated subagent/deterministic check) prevents recurring drift. |
| **`Human Product Tradeoff`** | Fails the Invariant Parity Gate, trades core security/audit guarantees for speed/quota, or hinges on a maintainer product-direction call (explicit Option A vs. Option B). |

## 3. Two Mandatory Gates

### Gate 1: Empirical Leverage Gate (Required for All Non-Retain Findings)

Reject any non-retain finding that lacks **both**:
1. **Standard or Measured Anchor:** Either an exact URL + heading from `00-platform-baseline.md` OR a measured baseline cost from `01-telemetry-extract.md` / an executed read-only probe (exact command + observed output).
2. **Verifiable `Before -> After` Acceptance Metric:** A concrete measurable delta (turns, CLI commands, UTF-8 bytes, wall-clock seconds, or deterministic failure mode prevented) that [`self-diagnosis`](../../self-diagnosis/SKILL.md) or unit tests can verify after remediation.

### Gate 2: Invariant Parity Gate (Required for `Align to Native Primitive` & `Consolidate / Automate Friction`)

Every proposal to consolidate, simplify, or delegate to a native Antigravity primitive must explicitly score all 5 core `Agy-Squad` invariants:

| Core Invariant | Rating (`Preserved` / `Strengthened` / `N/A` / `Weakened`) | Proof or Risk |
| --- | --- | --- |
| 1. Workspace & symlink containment (`O_NOFOLLOW`, root bounds) | `<rating>` | `<proof or gap>` |
| 2. SHA-256 evidence & proof-bundle verification | `<rating>` | `<proof or gap>` |
| 3. Strict content vs. integrity verdict separation | `<rating>` | `<proof or gap>` |
| 4. Bounded wire receipts & context isolation | `<rating>` | `<proof or gap>` |
| 5. Clean teardown (zero leaked workers, tasks, or scratch) | `<rating>` | `<proof or gap>` |

- **Fail-closed downgrade rule:** If **any** invariant is rated `Weakened` or lacks concrete proof, the finding **cannot** carry `Align to Native Primitive` or `Consolidate / Automate Friction`; it must route automatically to **`Human Product Tradeoff`**.

## 4. Specialist Report Structure (`10-*`, `11-*`, `12-*`)

Each specialist writes a compact Markdown report with:
1. **Scope & Probes Executed** (exact files read and read-only commands run with exit codes).
2. **Findings Table (`<= 8` rows, `1 ID = 1 Row`):** `ID | Surface (file:line) | Verdict | Standard / Measured Anchor | Invariant Parity | Before -> After Acceptance Metric`.
3. **Finding Cards (one concise card per ID):** Evidence, Gate 1 metric, Gate 2 5-invariant table (when applicable), and Option A vs. Option B (for `Human Product Tradeoff`).
