---
name: platform-fit
description: >-
  [Agy-Squad maintainers only: run inside an Agy-Squad source checkout; flat
  invoke_subagent only, no /swarm] Strategic E2E, native-differentiation, and
  quota-ROI audit comparing Agy-Squad against live Google Antigravity standards
  and measured run telemetry in scratch/platform-fit/.
---

# Agy-Squad Platform-Fit & Native-Differentiation Audit

**[Agy-Squad maintainers only: run inside an Agy-Squad source checkout.]** Evaluate whether `Agy-Squad` is a differentiated, strictly better alternative to vanilla Google Antigravity before spending quota on a 12-worker [`self-diagnosis`](../self-diagnosis/SKILL.md) run or a pre-release [`day-one-review`](../day-one-review/SKILL.md).

Guides: [pre-flight snapshot](./references/preflight-snapshot.md) | [specialist rubric & gates](./references/specialist-rubric.md) | [scorecard template](./references/scorecard-template.md)

## Role Boundaries

1. **`/platform-fit` (run first, low quota):** Strategic E2E workflow, Google Antigravity alignment, and empirical quota-ROI audit. Never edits tracked repo files.
2. **[`/self-diagnosis`](../self-diagnosis/SKILL.md) (after design/code changes):** Internal protocol, byte-budget, link, and 12-worker regression verification.
3. **[`/day-one-review`](../day-one-review/SKILL.md) (pre-release):** Cold external consumer install, packaging, and 4-tier ship-readiness gate.

## Invariants

1. **Flat Isolated `invoke_subagent` Only (No `/swarm`):** Launch 3 strictly disjoint read-only specialists in one parallel turn via `invoke_subagent` (`TypeName: "self"`, `Workspace: "inherit"`). Never open a `/swarm` board, spawn layered leads, or add a `monitor`.
2. **Pre-Flight Snapshot First:** Before launching specialists, the coordinator builds both pinned inputs under gitignored `scratch/platform-fit/<YYYY-MM-DD>-<short-sha>/`: `00-platform-baseline.md` (via `/antigravity-guide` live `.md` mirrors from `https://antigravity.google/llms.txt`) and `01-telemetry-extract.md` (via one `agy-context transcript` pass when prior runs exist).
3. **Transcript Anti-Anchoring:** Prepend `[agy-transcript-access: self-only]` on line 1 of every specialist `Prompt` when `Agy-Context-Saver` is installed so specialists stay isolated from prior sessions and peers while reading only the pinned snapshot and assigned repo scope.
4. **Standards-Backed 5-Verdict Taxonomy (No "Delete" Category):** Every finding uses exactly one atomic ID (`FIT-NNN`, `FLOW-NNN`, `ROI-NNN`) and one of 5 verdicts: `Differentiated (Retain)`, `Align to Native Primitive`, `Consolidate / Automate Friction`, `Harden Determinism`, or `Human Product Tradeoff`. Never emit a `Delete` or `Remove` verdict category.
5. **Two Mandatory Gates:** Every non-retain finding must pass both the **Empirical Leverage Gate** (documented Antigravity standard or measured baseline cost plus a concrete `Before -> After` acceptance metric) and the **Invariant Parity Gate** (proves all 5 core invariants stay preserved or strengthened; any weakened or unproven invariant routes automatically to `Human Product Tradeoff`).
6. **Clean Closure:** Keep all run artifacts under gitignored `scratch/platform-fit/<run-slug>/`, leave tracked files untouched, and verify `manage_subagents(Action='list')` and `manage_task(Action='list')` are empty before handoff.

## Workflow

1. **Pin Run & Pre-Flight Snapshot:** Confirm checkout (`package.json` `name === "agy-squad"`), pin branch/`HEAD`/dirty state, create `scratch/platform-fit/<YYYY-MM-DD>-<short-sha>/`, and write `00-platform-baseline.md` and `01-telemetry-extract.md` per [preflight-snapshot.md](./references/preflight-snapshot.md).
2. **Parallel 3-Specialist Fan-Out:** Launch the 3 disjoint specialists (`Platform Alignment & Differentiation`, `E2E Workflow, Friction & Determinism`, `Empirical Quota & Efficiency Profiler`) in parallel via `invoke_subagent` per [specialist-rubric.md](./references/specialist-rubric.md) (`<= 8` findings each) and yield via Reactive Wakeup.
3. **Gate Enforcement & Scorecard Synthesis:** Read `10-spec-platform-alignment.md`, `11-spec-e2e-workflow.md`, and `12-spec-quota-efficiency.md`, enforce both mandatory gates (downgrading any invariant-weakening proposal to `Human Product Tradeoff`), and write `20-platform-fit-scorecard.md` per [scorecard-template.md](./references/scorecard-template.md).
4. **Deliver & Close:** Lead the reply with the Executive Strategic Verdict, ranked actionable findings, and maintainer tradeoff queue, link `20-platform-fit-scorecard.md`, and confirm clean subagent/task/git closure.
