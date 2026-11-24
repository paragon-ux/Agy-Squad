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
3. **Single-Pass Durable Ledger:** Finalize bundles without `--prune` first (`agy-squad finalize <record.json> --strict-citations`) so verified SHA-256 hashes are ready, then record every finding `1 ID = 1 Row` in `docs/reviews/<slug>.md` per [Standard v1.5.0](../pr-review/references/pr-review-standard.md) in one pass before pruning or editing code.
4. **Verified Cleanup:** After ledger transcription, prune verified specialist reports via `agy-squad prune <bundle.sources.json> <sha256>` (or `agy-squad verify <bundle> --prune --expected-sha256 <sha256> [--keep-reports]`) and remove finished `scratch/agy-squad/` trees.
5. **Same-Cohort Re-Verify & Closure:** Wake the active cohort (`post_message` / `send_message`) to verify fixes in place; pass [`swarm-governance` Section 5](../swarm-governance/SKILL.md#5-runtime-closure-checklist-pre-handoff-gate).
6. **Empirical Trace:** Trace `invariant -> contract -> implementation -> verification`, record measured before/after deltas, and pass `npm test` once (skip redundant closeout reruns on read-only runs when `git status` is clean on the tested `HEAD`).

## Workflow

1. **Fast Setup (1-2 turns to Step 0):** Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --json` and baseline `npm test` from repo root alongside `swarm{action: "models"}`; skip pre-reading reference docs or prior `docs/reviews/` ledgers before Step 0.
2. **Plan & Run:** Run [`swarm-governance`](../swarm-governance/SKILL.md#workflow) Step 0 for missing `/swarm` settings, then plan [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) via `agy-squad plan` (`layered` 12-worker cohort by default where leads park on `swarm_wait` and spot-check cited claims, unless `--topology flat`) or `agy-squad dispatch` (subagent fallback).
3. **Bundle, Single-Pass Ledger & Cleanup:** Per squad, run `bundle-init --from-scope --digest`, wake `audit-<id>`, run `verdict --integrity` + `finalize --strict-citations` (without `--prune`), write `docs/reviews/<slug>.md` once from verified `lead/report.md` outputs (open raw `specialist-N/report.md` only if `citations.uncarriedUrls` or raw detail is needed), then run `agy-squad prune <bundle> <sha256>` ([commands](./references/execution-and-teardown.md#multi-squad-bundling-and-cleanup)), re-verify any fixes in place, and close cleanly.
4. **Verify:** Check [rubric thresholds](./references/optimization-and-review-rubric.md#2-optimization-budgets), confirm deltas, and run `npm test` if files changed (skip duplicate rerun on clean read-only `HEAD`).
