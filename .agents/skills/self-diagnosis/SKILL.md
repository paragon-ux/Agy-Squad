---
name: self-diagnosis
description: >-
  [Task Spec — Agy-Squad self-audit & optimization; pair with swarm-governance on
  /swarm] Use when the user asks to self-diagnose, troubleshoot, audit, or
  optimize Agy-Squad or its workspace skills (.agents/skills/). Uses
  diagnose.mjs, squad_planner (or dispatch_squad for invoke_subagent), the
  bin/agy-squad.mjs Pointer-Over-Wire pipeline, and the Agy-Squad PR Review
  Standard v1.3.0.
---

# Agy-Squad Self-Diagnosis & Optimization Skill

Self-diagnose, audit, and optimize `Agy-Squad` and its workspace skills (including [`pr-review`](../pr-review/SKILL.md), [`full-review`](../full-review/SKILL.md), and [`swarm-governance`](../swarm-governance/SKILL.md)). This skill is a **Task Spec** for repository and harness self-audits; when run on `/swarm` or multi-agent teams, compose it with `swarm-governance`.

It dogfoods `Agy-Squad`'s `/swarm` planner (`mcp/planner.mjs` via `squad_planner` / `node bin/agy-squad.mjs plan`), the `invoke_subagent` compiler (`mcp/dispatch.mjs` via `dispatch_squad` / `node bin/agy-squad.mjs dispatch`), the Pointer-Over-Wire CLI (`node bin/agy-squad.mjs`), and [Agy-Squad PR Review Standard v1.3.0](../pr-review/references/pr-review-standard.md). Consult [Optimization & Review Rubric](./references/optimization-and-review-rubric.md) for budgets and category triage, and [Core workflows](../../../docs/core-workflows.md) for the 3-scope evidence-retention and teardown contract.

---

## Workflow

### Step 0: Pre-Flight Intake Interview (Neutral Alignment Gate)

Ask once before compiling manifests or launching workers whenever any choice below is unspecified (skip questions already answered by user instruction or repo state):
1. **Execution Mode & Topology** (ask neutrally—no default bias between Flat and Layered):
   - `/swarm` via `squad_planner` (`diagnose.mjs --print-plan [--topology flat|layered | --flat]`): **Flat Specialist Swarm** (6 read-only specialists reporting directly to coordinator) or **Layered Squad Swarm** (3 leads coordinating 6 specialists), plus workspace isolation (`inherit` for read-only audits vs `share`/`branch` for writers).
   - `invoke_subagent` fallback via `diagnose.mjs --print-dispatch <target>` (`all_l1`, `all_specialists`, or one squad; note MCP `dispatch_squad` accepts `all_l1`, `<squadId>`, or `integrity_auditor[:<target>]`, whereas `all_specialists` is `diagnose.mjs` only).
   - **Local Profiler Only**: run `diagnose.mjs` locally with zero agents launched.
2. **Retention & Teardown Policy** (`Scope 2` vs `Scope 3`):
   - `Scope 2`: pass `--keep-reports` to `node bin/agy-squad.mjs prune <report.sources.json> <accepted-sha256>` to keep loose reports, or omit to prune them after SHA-256 bundling. `Scope 3`: run `diagnose.mjs --teardown` after updating `docs/reviews/<target-review-slug>.md`.
3. **Integrity Audit Gate:**
   - Independent Integrity Auditor enabled (`audit-<id>` on `/swarm` or flat `integrity_auditor[:<target>]` slot) enforcing `Integrity Verdict: CLEAN` before acceptance, vs working-squad synthesis only.
4. **Self-Contained Instruction Standard:**
   - Never use unanchored abbreviations or unexpanded section codes in briefs; state exact paths, constraints, and deliverable formats explicitly.

---

### Step 1: Run the Automated Profiler (`L7`-Safe)

Run [`diagnose.mjs`](./scripts/diagnose.mjs) from the repository root (launches zero agents; pass `--allow-active-cohort` while `scratch/agy-squad/squad-*` cohorts are active):

```bash
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/<slug>.md --markdown
```

The profiler checks four surfaces in one pass:
1. **Skill & Doc Health (`SKILL`, `DOC`):** Validates frontmatter, progressive-disclosure targets (`<= 10,240 B`, `<= 250` lines for `SKILL.md`; warns above `12,288 B` / `300` lines), relative links, `zensical.toml` `nav` & `docs/assets/*.svg` references, closure checklists, and target `docs/reviews/` `v1.3.0` ledgers (`1 ID = 1 Row`, no retired symbol drift).
2. **Planner, Dispatch & Pointer-Over-Wire Canary (`RUN`, `SVC`, `MCP`):** Compiles [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) for both `squad_planner` and `dispatch_squad`, verifies disjoint write scopes (skipping `readOnly: true` specialists), and tests `fingerprint -> inspect -> bundle -> verify -> integrity -> prune` in temp storage.
3. **Byte & Token Telemetry (`SKILL`, `RUN`):** Reports brief sizes, UTF-8/token overhead, and specialist timing regressions.
4. **Workspace Hygiene (`SVC`):** Detects orphaned `scratch/agy-squad/squad-*` cohorts against `--allow-active-cohort` and `--ledger`.

---

### Step 2: Execute Cohort, Verify Bundles & Close Cleanly

Use `diagnose.mjs --print-plan` (`squad_planner`) for `/swarm` execution or `--print-dispatch` (`dispatch_squad`) when explicitly targeting `invoke_subagent`. When launching `/swarm`, verify pinned models via `swarm{action: "status"}` and immediately end the creation turn with `open_board` (`[Open the Swarm UI](sidecar://swarm/swarm_board/)`) on its own line (no `swarm_wait` blocking the link) so the UI pill renders right away.

```bash
# Primary (/swarm coordinator plan, Flat or Layered, inherit workspace for read-only audit):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --print-plan [squadId] [--topology flat|layered] [--mode swarm|subagent] [--workspace-isolation inherit|share|branch]
# Targeted squad or subagent compiler (all_l1, all_specialists, or single squadId):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --print-dispatch <target> --parent-id <conversationId>
```

Working squads in [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) (`readOnly: true` specialists): `skill_and_pr_review_audit` (`SKILL`/`DOC`/`ARCH`/`SCRIPT`), `runtime_and_contract_diagnosis` (`MCP`/`RUN`/`SVC`/`SCRIPT`/`TEST`/`DEP`), and `token_and_execution_optimization` (`RUN`/`SKILL`/`SVC`/`ARCH`). On `/swarm`, omit `squadId` (passing `--topology flat` or `layered`) to plan the full cohort.

1. **Same-Cohort Re-Verification:** For remediation passes, keep existing `/swarm` workers (`swarm_wait`) or `invoke_subagent` children alive (`send_message`) to re-verify fixes in place; spawn fresh cohorts only for independent new audits.
2. **Verify & Bundle (`Scope 2`):** Assemble `<bundle-record.json>` from `--print-plan` `bundleRecordTemplates` + programmatic `fingerprint` digests, then run `node bin/agy-squad.mjs` (`verdict`, `verdict --integrity`, `fingerprint`, `inspect`, `bundle`, `verify`, and `prune <report.sources.json> <accepted-sha256> [--keep-reports]`) per [`swarm-governance`](../swarm-governance/SKILL.md).
3. **NON-NEGOTIABLE PRE-REMEDIATION & PRE-TEARDOWN GATE (`docs/reviews/`):** Before editing code or running `--teardown`, record every distinct defect/proposal `1-to-1` (`1 ID = 1 Row`, zero umbrella compression or silent drops) in `docs/reviews/<target-review-slug>.md` per [pr-review-standard.md](../pr-review/references/pr-review-standard.md) (Section 1 Session Provenance, Section 9 Cohort Provenance & Wave Finding Ledger, Section 8 residuals/deferred/closed items, and plain-text readability rules without decorative backticks on numbers or English statuses).
4. **Deterministic Atomic Teardown (`L41`, Scope 3):** After the target `docs/reviews/` ledger has `mtime >= bundle mtime`, run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --teardown [all | <squadId> [--accept <sha256>]] --ledger docs/reviews/<target-review-slug>.md [--force]` (run `--help` for full syntax).
5. **Kill Agents & Run 4-Check Closure Gate:** After `0` open blockers remain, ledger rows close, and teardown finishes, run `swarm{action: "kill"}` / `manage_subagents(Action='kill')` and verify the 4-check runtime closure gate (`manage_subagents`, `manage_task`, `swarm status`, child OS processes; see [Roles & skill workflows](../../../docs/roles-and-workflows.md#self-diagnosis)).

---

### Step 3: Triage & Verify Optimizations with `pr-review`

Activate [`pr-review`](../pr-review/SKILL.md) to evaluate findings and verify optimizations:
1. **Trace invariants first:** Verify `design thesis / invariant (L1-L7, L21, L29-L31, L40-L43) -> public contract -> implementation -> verification` before altering runtime or skill code.
2. **Categorize via Rubric:** Apply priority rules (`P1` blocking / `P2` actionable / `P3` optimization) and thresholds from Sections 2–3 of [Optimization & Review Rubric](./references/optimization-and-review-rubric.md).
3. **Prove before/after measurements:** Record exact UTF-8 byte deltas, token estimates, or runtime timings from `diagnose.mjs` and confirm `npm test` passes after final edits.
