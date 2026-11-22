---
name: self-diagnosis
description: >-
  [Agy-Squad maintainers only: run inside an Agy-Squad source checkout; pairs
  with swarm-governance on /swarm] Audit and optimize Agy-Squad itself inside
  an Agy-Squad checkout (never in unrelated repos) using diagnose.mjs,
  squad_planner, agy-squad bundling, and PR Review Standard v1.5.0.
---

# Agy-Squad Self-Diagnosis & Optimization Skill

**[Agy-Squad maintainers only: run inside an Agy-Squad source checkout.]** Audit and optimize `Agy-Squad` and its skills ([`pr-review`](../pr-review/SKILL.md), [`full-review`](../full-review/SKILL.md), [`day-one-review`](../day-one-review/SKILL.md), [`swarm-governance`](../swarm-governance/SKILL.md)).

Guides: [rubric](./references/optimization-and-review-rubric.md) | [execution & cleanup](./references/execution-and-teardown.md) | [Self-diagnosis guide](https://paragon-ux.github.io/Agy-Squad/skills/self-diagnosis/) | [Roles & workflows](https://paragon-ux.github.io/Agy-Squad/roles-and-workflows/)

## Invariants

1. **Read-Only Maintainer Check:** [`diagnose.mjs`](./scripts/diagnose.mjs) spawns zero agents and audits skills, links, retired-symbol/em-dash/SVG hygiene, and brief/MCP byte budgets inside an `Agy-Squad` checkout.
2. **Self-Contained Briefs:** State exact paths, constraints, and deliverables with no phantom symbols.
3. **Durable Ledger First:** Record every finding `1 ID = 1 Row` in `docs/reviews/<slug>.md` per [Standard v1.5.0](../pr-review/references/pr-review-standard.md) before editing code or cleaning scratch trees.
4. **Verified Cleanup:** Prune verified specialist reports via `agy-squad finalize <record.json> --prune [--keep-reports]` (or `agy-squad verify <bundle> --prune --expected-sha256 <sha256>`); remove finished `scratch/agy-squad/` trees only after ledger transcription and re-verification.
5. **Same-Cohort Re-Verify & Closure:** Wake the active cohort (`post_message` / `send_message`) to verify fixes in place; follow [`swarm-governance` Section 5](../swarm-governance/SKILL.md#5-runtime-closure-checklist-pre-handoff-gate) for `[done]`, immediate user `kill`, and 4-check closure.
6. **Empirical Trace:** Trace `invariant -> contract -> implementation -> verification`, record measured before/after deltas, and pass `npm test`.

## Workflow

1. **Check:** Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--json]` from repo root.
2. **Plan & Run:** For multi-agent audits, run [`swarm-governance`](../swarm-governance/SKILL.md#workflow) Step 0 `ask_question` for any unspecified `/swarm` settings, then plan [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) via `agy-squad plan` (manifests defining `lead` blocks compile `layered` unless `--topology flat` is explicitly passed) or `agy-squad dispatch` (`invoke_subagent` fallback).
3. **Bundle & Ledger:** Bundle per squad ([commands](./references/execution-and-teardown.md#multi-squad-bundling-and-cleanup)), transcribe findings into `docs/reviews/<slug>.md`, re-verify fixes in place, and close cleanly.
4. **Verify:** Check [rubric thresholds](./references/optimization-and-review-rubric.md#2-optimization-budgets), confirm exact deltas, and run `npm test`.
