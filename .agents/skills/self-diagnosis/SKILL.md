---
name: self-diagnosis
description: >-
  [Task Spec: Agy-Squad self-audit & optimization; pair with swarm-governance on
  /swarm] Use when the user asks to self-diagnose, troubleshoot, audit, or
  optimize Agy-Squad or its workspace skills (.agents/skills/). Uses
  diagnose.mjs, squad_planner (or dispatch_squad for invoke_subagent), the
  bin/agy-squad.mjs Pointer-Over-Wire pipeline, and the Agy-Squad PR Review
  Standard v1.4.0.
---

# Agy-Squad Self-Diagnosis & Optimization Skill

Self-diagnose, audit, and optimize `Agy-Squad` and its workspace skills (including [`pr-review`](../pr-review/SKILL.md), [`full-review`](../full-review/SKILL.md), and [`swarm-governance`](../swarm-governance/SKILL.md)). This skill is a **Task Spec** for repository and harness self-audits; when run on `/swarm` or multi-agent teams, compose it with [`swarm-governance`](../swarm-governance/SKILL.md) (which owns `/swarm` launch, `open_board`, `swarm_wait`, pointer receipts, and closure).

It dogfoods `Agy-Squad`'s `/swarm` planner (`mcp/planner.mjs` via `squad_planner` / `node bin/agy-squad.mjs plan`), `invoke_subagent` compiler (`mcp/dispatch.mjs` via `dispatch_squad` / `node bin/agy-squad.mjs dispatch`), Pointer-Over-Wire CLI (`node bin/agy-squad.mjs`), and [Agy-Squad PR Review Standard v1.4.0](../pr-review/references/pr-review-standard.md). Consult [Optimization & Review Rubric](./references/optimization-and-review-rubric.md) for budgets, [Execution & Teardown Reference](./references/execution-and-teardown.md) for uncondensed multi-squad and `--teardown` edge cases, and [Core workflows](../../../docs/core-workflows.md) for the 3-scope retention contract.

---

## Invariants

1. **Zero-Subagent Local Profiler (`L7`):** [`diagnose.mjs`](./scripts/diagnose.mjs) launches zero agents; pass `--allow-active-cohort` while `scratch/agy-squad/squad-*` cohorts are active.
2. **Self-Contained Instruction Standard:** Never use unanchored abbreviations or unexpanded section codes in briefs; state exact paths, constraints, and deliverable formats explicitly.
3. **Non-Negotiable Pre-Remediation & Pre-Teardown Gate (`docs/reviews/`):** Before editing code or running `--teardown`, record every distinct defect/proposal `1-to-1` (`1 ID = 1 Row`, zero umbrella compression or silent drops) in `docs/reviews/<target-review-slug>.md` per [pr-review-standard.md](../pr-review/references/pr-review-standard.md) (Section 1 Session Provenance, Section 9 Cohort Provenance & Wave Finding Ledger, Section 8 residuals/deferred/closed items, plain-text readability rules without decorative backticks on numbers or English statuses).
4. **Three-Scope Teardown Isolation (`Scope 2` vs `Scope 3`, `L41`):** `Scope 2` (`bin/agy-squad.mjs prune [--keep-reports]`) manages loose specialist reports under verified SHA-256 bundles; `Scope 3` (`diagnose.mjs --teardown ... --ledger <slug>.md`) refuses deletion until `lead/report.sources.json` verifies and the target ledger has `mtime >= bundle mtime` (unless `--force` is passed). See [Scope 3 refusal & partial cleanup rules](./references/execution-and-teardown.md#pre-teardown-refusal-conditions-and-partial-cleanup).
5. **Same-Cohort Re-Verification & Runtime Closure:** Keep existing `/swarm` workers (`swarm_wait` / `post_message`) or `invoke_subagent` children (`send_message`) alive to re-verify remediation fixes in place; spawn fresh cohorts only for independent new audits. Kill workers only after `0` open blockers remain, ledger rows close, and teardown finishes, then complete the 4-check closure gate (`manage_subagents`, `manage_task`, `swarm status` including `monitor`, child OS processes; see [Roles & skill workflows](../../../docs/roles-and-workflows.md#self-diagnosis)).
6. **Empirical Measurement & Architecture Trace:** Verify `design thesis / invariant (L1-L7, L21, L29-L31, L40-L50) -> public contract -> implementation -> verification` before altering runtime or skill code, record exact UTF-8 byte deltas, token estimates, and timings from `diagnose.mjs`, and confirm `npm test` passes after final edits.

---

## Workflow

### Step 0: Pre-Flight Intake Interview (Neutral Alignment Gate)
Ask once before compiling manifests or launching workers whenever any choice below is unspecified (skip questions already answered; defer `/swarm` launch, `open_board`, and `swarm_wait` rules to [`swarm-governance`](../swarm-governance/SKILL.md#step-0-pre-flight-intake-ask-when-unspecified)):
1. **Execution Mode, Topology & Isolation (neutral, no default bias):**
   - `/swarm` via `squad_planner` (`diagnose.mjs --print-plan [--topology flat|layered | --flat]`): **Flat Specialist Swarm** (6 read-only specialists -> coordinator) or **Layered Squad Swarm** (3 leads -> 6 specialists), plus `workspaceIsolation` (`inherit` for read-only audits vs `share`/`branch` for writers) and model (coordinator default unless user specifies otherwise).
   - `invoke_subagent` fallback via `diagnose.mjs --print-dispatch <target>` (`all_l1`, `all_specialists`, or one squad; MCP `dispatch_squad` accepts `all_l1`, `<squadId>`, or `integrity_auditor[:<target>]`, whereas `all_specialists` is `diagnose.mjs` only).
   - **Local Profiler Only:** run `diagnose.mjs` locally with zero agents launched.
2. **Retention & Teardown (`Scope 2` vs `Scope 3`):** Keep loose reports via `prune --keep-reports` or prune after SHA-256 bundling (`Scope 2`); run `--teardown` after updating `docs/reviews/<target-review-slug>.md` or defer cleanup across active waves (`Scope 3`).
3. **Integrity Audit Gate:** Independent Integrity Auditor enabled (`audit-<id>` on `/swarm` or `integrity_auditor[:<target>]` slot) enforcing `Integrity Verdict: CLEAN` before acceptance, vs working-squad synthesis only (`--allow-unaudited`).

---

### Step 1: Run the Automated Profiler (`L7`-Safe)
Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--ledger docs/reviews/<slug>.md] --markdown`:
1. **Skill & Doc Health (`SKILL`, `DOC`):** Validates frontmatter, entry budgets (`<= 10,240 B` / `<= 250` lines for `SKILL.md`; warns above `12,288 B` / `300` lines; `<= 70%` entry share when `> 8 KB`), relative links, `zensical.toml` `nav` & `docs/assets/*.svg`, closure checklists, and `v1.4.0` ledgers (`1 ID = 1 Row`, no retired symbol drift).
2. **Planner, Dispatch & Pointer-Over-Wire Canary (`RUN`, `SVC`, `MCP`):** Compiles [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) for both tools, checks disjoint write scopes (skipping `readOnly: true`), and tests `fingerprint -> inspect -> bundle -> verify -> integrity -> prune` in temp storage.
3. **Byte & Token Telemetry (`SKILL`, `RUN`):** Reports brief sizes, UTF-8/token overhead, and specialist timing regressions across `dispatch_squad`, `squad_planner`, handoff bundling, and MCP stdio checks.
4. **Workspace Hygiene (`SVC`):** Detects orphaned `scratch/agy-squad/squad-*` cohorts against `--allow-active-cohort` and `--ledger`.

---

### Step 2: Execute Cohort, Verify Bundles & Tear Down
Plan cohorts per [Planning & Dispatch Commands](./references/execution-and-teardown.md#planning-and-dispatch-commands) (working squads in [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json): `skill_and_pr_review_audit`, `runtime_and_contract_diagnosis`, and `token_and_execution_optimization`; omit `squadId` on `/swarm` to compile all three, and follow [`swarm-governance`](../swarm-governance/SKILL.md#stage-1-plan-launch--park) for launch and UI lifecycle):

1. **Bundle per Squad (`Scope 2`):** Assemble `<bundle-record.json>` from `--print-plan` `bundleRecordTemplates` plus `fingerprint` digests, run `digest` before `audit-*` signs `CLEAN`, and run `verdict`, `verdict --integrity`, `inspect`, `bundle`, `verify`, and `prune [--keep-reports]` for every working squad per [Multi-Squad Bundling & Prune](./references/execution-and-teardown.md#multi-squad-bundling-and-scope-2-prune).
2. **Transcribe Ledger (`docs/reviews/`):** Record every distinct defect and proposal `1-to-1` (`1 ID = 1 Row`) into `docs/reviews/<target-review-slug>.md` before editing code or running teardown.
3. **Atomic Teardown (`L41`, `Scope 3`), Remediation & Closure:** After the target ledger has `mtime >= bundle mtime`, run `diagnose.mjs --teardown` per [Scope 3 Atomic Teardown](./references/execution-and-teardown.md#scope-3-atomic-teardown-and-failure-modes), re-verify remediation fixes with the **same** specialists/workers, kill agents (`swarm{action: "kill"}` / `manage_subagents`), and complete the 4-check closure gate.

---

### Step 3: Triage & Verify Optimizations with `pr-review`
Activate [`pr-review`](../pr-review/SKILL.md) with rubric thresholds from Sections 2–3 of [Optimization & Review Rubric](./references/optimization-and-review-rubric.md), trace invariants first, and prove exact before/after metrics and `npm test` pass after final edits.
