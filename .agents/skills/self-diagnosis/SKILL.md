---
name: self-diagnosis
description: >-
  [Agy-Squad maintainers only: run inside an Agy-Squad source checkout; pairs
  with swarm-governance on /swarm] Audit and optimize Agy-Squad itself (never
  unrelated repos) via diagnose.mjs, squad_planner, and Standard v1.5.0.
---

# Agy-Squad Self-Diagnosis & Optimization Skill

**[Agy-Squad maintainers only: run inside an Agy-Squad source checkout.]** Audit and optimize `Agy-Squad` and its skills ([`pr-review`](../pr-review/SKILL.md), [`full-review`](../full-review/SKILL.md), [`day-one-review`](../day-one-review/SKILL.md), [`swarm-governance`](../swarm-governance/SKILL.md)).

Guides: [rubric](./references/optimization-and-review-rubric.md) | [execution & cleanup](./references/execution-and-teardown.md)

## Invariants

1. **Read-Only Maintainer Check:** [`diagnose.mjs`](./scripts/diagnose.mjs) spawns zero agents and checks skills, links, retired-symbol/em-dash/SVG hygiene, and brief/MCP byte budgets inside an `Agy-Squad` checkout.
2. **Self-Contained Briefs:** State exact paths, constraints, and deliverables with no phantom symbols.
3. **Durable Ledger First:** Record every finding `1 ID = 1 Row` in `docs/reviews/<slug>.md` per [Standard v1.5.0](../pr-review/references/pr-review-standard.md) before editing code or cleaning scratch trees.
4. **Verified Cleanup:** Prune verified specialist reports via `agy-squad finalize <record.json> --prune [--keep-reports]` (or `agy-squad verify <bundle> --prune --expected-sha256 <sha256>`); remove finished `scratch/agy-squad/` trees only after ledger transcription and re-verification.
5. **Same-Cohort Re-Verify & Closure:** Wake the active cohort (`post_message` / `send_message`) to verify fixes in place; pass [`swarm-governance` Section 5](../swarm-governance/SKILL.md#5-runtime-closure-checklist-pre-handoff-gate).
6. **Empirical Trace:** Trace `invariant -> contract -> implementation -> verification`, record measured before/after deltas, and pass `npm test`.

## Workflow

1. **Check:** Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--json]` from repo root.
2. **Plan & Run:** For multi-agent audits, run [`swarm-governance`](../swarm-governance/SKILL.md#workflow) Step 0 for missing `/swarm` settings, then plan [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) via `agy-squad plan` (`layered` by default unless `--topology flat`) or `agy-squad dispatch` (subagent fallback).
3. **Bundle & Ledger:** Bundle per squad ([commands](./references/execution-and-teardown.md#multi-squad-bundling-and-cleanup)), update the durable ledger, re-verify fixes in place, and close cleanly.
4. **Verify:** Check [rubric thresholds](./references/optimization-and-review-rubric.md#2-optimization-budgets), confirm deltas, and run `npm test`.
