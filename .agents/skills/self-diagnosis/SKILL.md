---
name: self-diagnosis
description: >-
  [Agy-Squad maintainers only: run inside an Agy-Squad source checkout; pairs
  with swarm-governance on /swarm] Use ONLY inside an Agy-Squad source
  repository checkout when auditing or optimizing Agy-Squad itself (do not
  invoke in unrelated user repositories). Uses diagnose.mjs, squad_planner (or
  dispatch_squad for invoke_subagent), the agy-squad Pointer-Over-Wire CLI
  pipeline, and the Agy-Squad PR Review Standard v1.5.0.
---

# Agy-Squad Self-Diagnosis & Optimization Skill

**[Agy-Squad maintainers only: run inside an Agy-Squad source checkout.]** Self-diagnose, audit, and optimize `Agy-Squad` and its workspace skills ([`pr-review`](../pr-review/SKILL.md), [`full-review`](../full-review/SKILL.md), [`day-one-review`](../day-one-review/SKILL.md), [`swarm-governance`](../swarm-governance/SKILL.md)). Pair this **Task Spec** with `swarm-governance` on `/swarm`; see [Optimization & Review Rubric](./references/optimization-and-review-rubric.md), [Execution & Teardown Reference](./references/execution-and-teardown.md), [Self-diagnosis guide](https://paragon-ux.github.io/Agy-Squad/skills/self-diagnosis/), and [Roles & skill workflows](https://paragon-ux.github.io/Agy-Squad/roles-and-workflows/).

---

## Invariants

1. **Zero-Subagent Profiler:** [`diagnose.mjs`](./scripts/diagnose.mjs) launches zero agents and enforces an upfront `package.json` (`name: "agy-squad"`) checkout check; pass `--allow-active-cohort` while `scratch/agy-squad/squad-*` is active.
2. **Self-Contained Briefs:** Never emit unanchored acronyms or phantom symbols; state exact paths, constraints, and deliverables.
3. **Pre-Remediation & Pre-Teardown Gate (`docs/reviews/`):** Record every finding `1-to-1` (`1 ID = 1 Row`, no umbrella compression or plain-number backtick clutter) in `docs/reviews/<target-review-slug>.md` per [PR Review Standard v1.5.0](../pr-review/references/pr-review-standard.md) before editing code or running `--teardown`.
4. **Scope 2 vs. Scope 3 Deterministic Scratch Teardown:** `Scope 2` (`agy-squad finalize --prune [--keep-reports]`, `agy-squad prune [--keep-reports]`, or `verify --prune`) unlinks verified loose specialist reports; `Scope 3` (`diagnose.mjs --teardown ... --ledger docs/reviews/<slug>.md`) removes cohort trees only after bundle verification and updated ledger checks (`--force` overrides).
5. **Same-Cohort Re-Verification & Closure:** Keep `/swarm` workers (`post_message` / `swarm_wait`) or subagents (`send_message`) alive to re-verify fixes in place (post `[done] <summary>` with no `@` per `swarm-governance` before pausing for user direction so `monitor`'s `*/3` cron goes dormant); kill after `0` blockers remain and teardown finishes (or immediately if the user explicitly requests `swarm{action: "kill"}`). Complete the 4-check closure gate (`swarm status` including `monitor`, `manage_subagents` when exposed in toolset, `manage_task`, child OS processes).
6. **Empirical Trace:** Trace `invariant -> contract -> implementation -> verification`, record exact measured byte/timing deltas from `diagnose.mjs`, and pass `npm test`.

---

## Workflow

### Step 0: Pre-Flight Intake
For `/swarm` topology (`Flat` vs `Layered`, neutral no-bias default), `workspaceIsolation`, `Scope 2/3` retention, and coordinator-default model questions, delegate to [`swarm-governance`](../swarm-governance/SKILL.md#step-0-pre-flight-intake-ask-when-unspecified); ask once only for unspecified self-diagnosis choices:
- **Execution mode:** `/swarm` (`diagnose.mjs --print-plan [--topology flat|layered | --flat]`), `invoke_subagent` fallback (`diagnose.mjs --print-dispatch [all_l1|all_specialists|<id>]`), or **Local Profiler Only** (zero agents).
- **Integrity Gate:** Flat `audit-<id>` (`CLEAN` required before acceptance) vs `--allow-unaudited`.

### Step 1: Automated Profiler (Zero-Subagent)
Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--ledger docs/reviews/<slug>.md] [--allow-active-cohort] [--skip-mcp-spawn] --markdown` from the `Agy-Squad` repo root to audit skill budgets/links/closure checks, `zensical.toml` & SVGs, `v1.5.0` ledger schema, compiled `/swarm` + `subagent` templates, scope overlaps, and canary pipeline timings in isolated temp directories.

### Step 2: Cohort Execution, Bundling & Teardown
1. **Plan & Launch:** Compile [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) via `--print-plan` (`skill_and_pr_review_audit`, `runtime_and_contract_diagnosis`, `token_and_execution_optimization`) and run `/swarm` per [`swarm-governance`](../swarm-governance/SKILL.md#stage-1-plan-launch--park).
2. **Scope 2 Bundle & Verify:** Per squad, run `agy-squad collect` (if isolated), `verdict`, `bundle-init --digest` (or `fingerprint` + `digest`), `verdict --integrity`, and `finalize <record.json> [--prune [--keep-reports]]` ([multi-squad commands](./references/execution-and-teardown.md#multi-squad-bundling-and-scope-2-prune)).
3. **Ledger & Scope 3 Teardown:** Transcribe `1 ID = 1 Row` into `docs/reviews/<slug>.md`, run `--teardown` per [Scope 3 rules](./references/execution-and-teardown.md#scope-3-atomic-teardown-and-failure-modes), re-verify fixes with the same cohort, kill workers, and pass the 4-check closure gate.

### Step 3: Triage & Verify
Apply `pr-review` with Section 2–3 rubric thresholds, verify exact before/after metrics, and run `npm test`.
