# Platform-Fit Scorecard Template (`20-platform-fit-scorecard.md`)

Coordinator synthesis template for `scratch/platform-fit/<YYYY-MM-DD>-<short-sha>/20-platform-fit-scorecard.md`. Reconcile all 3 specialist reports (`10-*`, `11-*`, `12-*`), run one `agy-context transcript health --id <s1,s2,s3> --json` call (when `agy-context` is installed) to populate `Meta-Audit Footprint` accurately, deduplicate overlapping surfaces without merging distinct atomic IDs, and enforce Gate 1 (Empirical Leverage) and Gate 2 (Invariant Parity) fail-closed before publishing.

```markdown
# Agy-Squad Platform-Fit & Native-Differentiation Scorecard

## 1. Run Metadata & Meta-Audit Footprint

| Field | Value |
| --- | --- |
| Repository / Branch / Commit | `Agy-Squad` / `<branch>` / `<sha>` (Dirty: `<yes|no>`) |
| Run Date (UTC) | `<ISO-8601>` |
| Platform Baseline | `00-platform-baseline.md` (`LIVE` \| `PARTIAL` \| `DEGRADED (offline)`) |
| Telemetry Extract | `01-telemetry-extract.md` (`MEASURED (health + outline)` \| `MEASURED (health-only)` \| `LOCAL_PROBES_ONLY`) |
| Specialists Executed | 3 flat `invoke_subagent` (`TypeName: "self"`, `Model: "inherit"`, `Workspace: "inherit"`, `[agy-transcript-access: self-only]`, no `/swarm`) |
| Meta-Audit Footprint | Coordinator `<turns>` turns; Specialists `<total-turns>` turns / `<tool-calls>` tool calls / `<KB>` KB via `agy-context transcript health --id <s1,s2,s3> --json` (or `n/a (agy-context absent)`) |

## 2. Executive Strategic Verdict & 5-Axis Scorecard

- **Overall Strategic Call:** `Optimal Differentiated Alternative` | `Strong Core: Targeted Friction Fixes` | `Architectural Realignment Needed`
- **Executive Summary (3-5 sentences):** Plain-English verdict on where `Agy-Squad` clearly outperforms vanilla Antigravity, where platform alignment or workflow friction drags ROI, and which top 1-3 changes unlock the largest measurable gain.

| Axis | Rating (`Strong` / `Mixed` / `Drag`) | Empirical Evidence (Standard URL, Telemetry, or Probe) |
| --- | --- | --- |
| 1. Native Differentiation | `<rating>` | `<evidence>` |
| 2. Platform Alignment | `<rating>` | `<evidence>` |
| 3. E2E Determinism | `<rating>` | `<evidence>` |
| 4. Operator & User Ergonomics | `<rating>` | `<evidence>` |
| 5. Quota & Context ROI | `<rating>` | `<evidence>` |

## 3. Capability Alignment Matrix

| Agy-Squad Surface | Native Antigravity Counterpart | Verdict | Evidence & Parity Summary |
| --- | --- | --- | --- |
| `<MCP / CLI / Skill / Protocol>` | `<native primitive or None>` | `<1 of 5 verdicts>` | `<file:line + baseline URL + parity>` |

## 4. Ranked Actionable Findings (Passing Both Gates)

Ordered strictly by empirical leverage (quota, wall-clock time, or failure-mode reduction). Every row has passed Gate 1 (Empirical Leverage) and Gate 2 (Invariant Parity).

| Rank | ID | Surface (`file:line`) | Verdict | Anchor (Standard / Baseline Metric) | Invariant Parity | Before -> After Acceptance Metric |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `<ID>` | `<path:line>` | `<Align / Consolidate / Harden>` | `<URL or measured baseline>` | `5/5 Preserved/Strengthened` | `<verifiable delta>` |

## 5. Human Product Tradeoffs (Maintainer Decision Queue)

Items routed here either because Gate 2 flagged a weakened/unproven invariant or because the decision changes product scope or execution defaults.

| ID | Surface | Trigger (Weakened Invariant / Product Choice) | Option A (Current / Safer) | Option B (Alternative) | Measured Impact |
| --- | --- | --- | --- | --- | --- |
| `<ID>` | `<path>` | `<invariant or tradeoff>` | `<behavior + cost>` | `<behavior + risk>` | `<turns / bytes / guarantee>` |

## 6. Handoff to `/self-diagnosis` & `/day-one-review`

After implementing approved items from Sections 4-5:
1. Verify each accepted `Before -> After` metric in unit tests and `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --json`.
2. Run `/self-diagnosis` (12-worker layered regression) to confirm internal protocol compliance and live telemetry deltas against `01-telemetry-extract.md`.
3. Run `/day-one-review` before release to confirm external consumer install, packaging boundaries, and 4-tier ship readiness.
```
