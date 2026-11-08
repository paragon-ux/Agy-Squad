---
name: self-diagnosis
description: >-
  Use this skill when the user asks to self-diagnose, troubleshoot, audit, or
  optimize Agy-Squad or its workspace skills (.agents/skills/self-diagnosis and
  .agents/skills/pr-review). Uses Agy-Squad's own staged dispatch_squad
  compiler, Pointer-Over-Wire handoff/bundle pipeline, and the Agy-Squad PR
  Review Standard (v1.1.0) to inspect skill integrity, contract alignment, and
  token/runtime efficiency.
---

# Agy-Squad Self-Diagnosis & Optimization Skill

Self-diagnose, review, and optimize `Agy-Squad` and its workspace skills (`self-diagnosis` and [`pr-review`](../pr-review/SKILL.md)) by dogfooding `Agy-Squad`'s own staged payload compiler (`mcp/dispatch.mjs`), Pointer-Over-Wire verifier (`mcp/handoffs.mjs`), and the 10-category [Agy-Squad PR Review Standard v1.1.0](../pr-review/references/pr-review-standard.md).

Consult the [Optimization & Review Rubric](./references/optimization-and-review-rubric.md) for quantitative token/byte budgets, latency targets, and failure-to-category triage rules.

---

## Workflow

### Step 1: Run the Automated Self-Diagnosis & Optimization Profiler (`L7`-Safe)
Run the bundled diagnostic script from the repository root (launches zero real subagents per `L7`):

```bash
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown
# Or for machine-readable JSON telemetry:
node .agents/skills/self-diagnosis/scripts/diagnose.mjs
```

[`diagnose.mjs`](./scripts/diagnose.mjs) executes four checks in one pass:
1. **Skill & Progressive Disclosure Audit (`SKILL`, `DOC`):** Validates YAML frontmatter (`name`, `description`), checks all relative Markdown links across `.agents/skills/*/SKILL.md` and `references/`, and measures `SKILL.md` entry size vs. total skill bytes.
2. **Agy-Squad Self-Dispatch & Pointer-Over-Wire Canary (`RUN`, `SVC`, `MCP`):** Compiles [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) through `handleDispatchSquad` (`all_l1` and all 3 diagnostic squads) in both unmanaged and managed (`createRun`) modes, checks for lingering untorn-down self-diagnosis directories (`L41`), checks `scopeFiles` overlap across sibling specialists, and executes `fingerprint` -> `inspect` -> `bundle` -> `verify` -> `prune` in a workspace-local canary directory (`scratch/agy-squad/self-diag-canary-<uuid>`, respecting `L4`) with automatic `try/finally` teardown.
3. **Token Budget & Runtime Performance Telemetry (`RUN`, `SKILL`, `SVC`):** Measures UTF-8 byte and token budgets for compiled unmanaged/managed lead and specialist briefs (`mcp/briefs.mjs`), MCP `tools/list` schema output (`mcp/index.js`), and compilation/bundling latency.
4. **PR-Review Standard v1.1.0 Category Matrix:** Maps any detected issues across all 10 mandatory `pr-review` categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`).

---

### Step 2: Compile or Delegate an Agy-Squad Self-Diagnosis Stage
Use [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) with `dispatch_squad` (or `diagnose.mjs --print-dispatch [squadId|all_l1|all_specialists] [--parent-id <conversationId>]`) to compile targeted or full-squad diagnostic cohorts:

| Stage / Squad ID | Agents Compiled | Purpose | Primary `pr-review` Categories |
| --- | --- | --- | --- |
| `all_l1` (Layered Full Squad) | `3` Leads (`-> 6` Specialists) | Compile all 3 squad leads; each lead dispatches and bundles its own 2 specialists | All 10 categories (`ARCH`..`DEP`) |
| `all_specialists` (Flat Full Squad) | `6` Specialists (across all `3` squads) | Compile all 6 specialists in one flat wave with the parent acting as lead across all 3 squads | All 10 categories (`ARCH`..`DEP`) |
| `skill_and_pr_review_audit` | `2` Specialists | Audit `.agents/skills/self-diagnosis` and `.agents/skills/pr-review` for contract drift, broken links, and progressive disclosure | `SKILL`, `DOC`, `ARCH` |
| `runtime_and_contract_diagnosis` | `2` Specialists | Audit `mcp/index.js`, `mcp/dispatch.mjs`, `mcp/briefs.mjs`, `mcp/handoffs.mjs`, `mcp/run-state.mjs`, `bin/agy-squad.mjs`, and `bin/terminal.py` | `MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP` |
| `token_and_execution_optimization` | `2` Specialists | Profile and optimize brief byte budgets, `SKILL.md` progressive disclosure, `scopeFiles` disjointness, and filesystem/IPC hot paths | `RUN`, `SKILL`, `SVC`, `ARCH` |

- **Payload review mode (default per `L7`):** Compile the selected squad (`node .agents/skills/self-diagnosis/scripts/diagnose.mjs --print-dispatch skill_and_pr_review_audit`) and execute the specialist checks directly or present the compiled `Subagents` payload.
- **Live subagent delegation, remediation re-verification, teardown (`L41`), and subagent termination:**
  1. **Fresh Passes vs. Same-Squad Remediation Checks:** Launch fresh subagents (`invoke_subagent`) for each new independent diagnostic pass to prevent stale context and handoff collisions. When remediating findings from an active cohort and verifying whether those exact findings were resolved, message the **same** cohort (`send_message`) after `prune`/`--teardown` so each specialist verifies its own prior findings directly in its assigned report slot.
  2. **Reconcile, Bundle & Tear Down (`L41`):** Compile with `--print-dispatch <squadId> --parent-id <conversationId>`, yield for **Reactive Wakeup**, reconcile receipts via `node mcp/handoffs.mjs` (`fingerprint`, `inspect`, `bundle`, `verify`, `prune`), and tear down completed self-diagnosis directories and empty `scratch/agy-squad` / `scratch` parents:
     ```bash
     node .agents/skills/self-diagnosis/scripts/diagnose.mjs --teardown <squadId|all> [--accept <bundle-sha256>]
     ```
  3. **Kill Subagents After Completion (`manage_subagents`):** Once the cohort's final verification (including any same-squad remediation re-check) and `--teardown` complete, **always terminate all spawned subagents via `manage_subagents(Action='kill', ConversationIds=[...])`**. In `all_l1` layered mode, each lead kills its own 2 specialists before sending its `READY` receipt, and the parent kills the 3 leads after `--teardown`. Keeping termination in the skill workflow rather than hardcoded in scripts avoids prematurely killing agents before a same-squad remediation check.

---

### Step 3: Evaluate Findings & Optimizations with the `pr-review` Skill
Activate [`pr-review`](../pr-review/SKILL.md) and apply its architecture-before-runtime trace:

1. **Trace before changing:** Verify `design thesis / invariant (active WSL IDs L1-L7, L17, L21, L29-L31, L40, L41) -> public contract -> implementation -> verification` before proposing any skill, prompt, or runtime change.
2. **Triage by category and priority (`P1` blocking / `P2` actionable / `P3` optimization):** Apply the thresholds and failure-to-category mappings in Sections 2 and 3 of the [Optimization & Review Rubric](./references/optimization-and-review-rubric.md).
3. **Require measured before/after evidence:** Every optimization proposal must report exact before/after UTF-8 bytes, token estimates, or execution milliseconds from [`diagnose.mjs`](./scripts/diagnose.mjs) and pass `npm test`.
