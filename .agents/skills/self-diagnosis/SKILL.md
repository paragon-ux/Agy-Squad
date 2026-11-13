---
name: self-diagnosis
description: >-
  Use this skill when the user asks to self-diagnose, troubleshoot, audit, or
  optimize Agy-Squad or its workspace skills (.agents/skills/self-diagnosis and
  .agents/skills/pr-review). Uses Agy-Squad's own staged dispatch_squad
  compiler, Pointer-Over-Wire handoff/bundle pipeline, and the Agy-Squad PR
  Review Standard (v1.3.0) to inspect skill integrity, contract alignment, and
  token/runtime efficiency.
---

# Agy-Squad Self-Diagnosis & Optimization Skill

Self-diagnose, review, and optimize `Agy-Squad` and its workspace skills (`self-diagnosis` and [`pr-review`](../pr-review/SKILL.md)) by dogfooding `Agy-Squad`'s staged payload compiler (`mcp/dispatch.mjs`), Pointer-Over-Wire verifier (`mcp/handoffs.mjs`), and the 10-category [Agy-Squad PR Review Standard v1.3.0](../pr-review/references/pr-review-standard.md). Consult the [Optimization & Review Rubric](./references/optimization-and-review-rubric.md) for quantitative budgets, latency targets, and category triage rules, and see [Core workflows](../../../docs/core-workflows.md) for how this operator-supervised workflow (never autonomous self-modifying code) pairs with the 3-scope evidence-retention and teardown contract (measured by durable `docs/reviews/` ledgers, verified SHA-256 bundles, `--teardown`, and child termination rather than `git status` untracked counts alone).

---

## Workflow

### Step 0: Pre-Flight Intake Interview (Operator Alignment Gate)
To eliminate hesitation, ambiguity, and false starts, the agent MUST immediately conduct a structured intake round before compiling manifests or launching subagents (trigger via `ask_question` or multiple-choice prompt):
1. **Topology & Delegation Mode:**
   - `(Recommended) Layered Squad Dispatch (all_l1)`: 1 Lead per squad (`3` leads total). Leads manage specialists, conduct transcript patrol, and synthesize findings.
   - `Flat Specialist Dispatch (all_specialists)`: Direct specialist dispatch (`6` specialists in one flat wave). The primary agent acts as lead across all squads.
   - `Targeted Single Squad Dispatch`: Run only one focused squad (`skill_and_pr_review_audit`, `runtime_and_contract_diagnosis`, or `token_and_execution_optimization`).
   - `Local Profiler Dry-Run Only`: Run `diagnose.mjs` locally without spawning subagents.
2. **Teardown & Provenance Policy:**
   - `(Recommended) Retain Full Evidence & Provenance (--keep-reports)`: Preserve all specialist and lead evidence reports in `scratch/agy-squad/` alongside bundle records for auditability and research.
   - `Automatic Atomic Teardown (--teardown)`: Prune loose reports from `scratch/` upon successful cryptographic bundle verification.
3. **Integrity Audit Rigor:**
   - `(Recommended) Mandatory Integrity Auditor Enabled`: Stage independent flat `integrity_auditor:<target>` after working squads complete, enforcing `Integrity Verdict: CLEAN` before acceptance.
   - `Working Squad Self-Synthesis Only`: Skip secondary integrity audit.
4. **Self-Contained Instruction Standard:**
   - Never use unanchored abbreviations, unexpanded section codes (e.g., 'H4', 'D2'), or undefined internal tokens in objectives or instructions. Every deliverable requirement must be fully self-contained and explicit so subagents do not waste tokens searching the codebase for phantom acronyms.

---

### Step 1: Run the Automated Self-Diagnosis & Optimization Profiler (`L7`-Safe)
Run [`diagnose.mjs`](./scripts/diagnose.mjs) from the repository root (launches zero real subagents per `L7`; pass `--allow-active-cohort` if running mid-cohort while `scratch/agy-squad/squad-*` slots are in flight):

```bash
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown
# Machine-readable JSON telemetry or CLI help:
node .agents/skills/self-diagnosis/scripts/diagnose.mjs
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --help
```

The profiler audits four surfaces in one pass:
1. **Skill & Progressive Disclosure (`SKILL`, `DOC`):** Validates YAML frontmatter, relative Markdown links across `SKILL.md` and `references/`, target `docs/reviews/` ledger presence + `v1.3.0` schema (Section 1 Session Provenance, Section 8 Residuals/Deferred, Section 9 Cohort Ledger, and `1 ID = 1 Row`), and `SKILL.md` entry share (total and prose).
2. **Self-Dispatch, `squad_planner` & Pointer-Over-Wire Canary (`RUN`, `SVC`, `MCP`):** Compiles [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) (`all_l1` + all 3 squads via `dispatch_squad` and `/swarm` planning via `squad_planner`), checks `L41` scratch cleanliness and `scopeFiles` overlap, and smoke-tests `fingerprint -> inspect -> bundle -> verify -> prune` in `scratch/agy-squad/self-diag-canary-<uuid>` (`L4`) with `try/finally` cleanup.
3. **Token & Latency Telemetry (`RUN`, `SKILL`, `SVC`):** Measures UTF-8 byte/token budgets across `mcp/briefs.mjs` templates, `mcp/index.js` `tools/list`, and stage/planner/handoff latencies.
4. **PR-Review v1.3.0 Matrix:** Maps findings across all 10 mandatory categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`).

---

### Step 2: Compile or Delegate an Agy-Squad Self-Diagnosis Stage
Use [`self-diagnosis-manifest.json`](./resources/self-diagnosis-manifest.json) with `dispatch_squad`, `squad_planner`, or `diagnose.mjs --print-dispatch [squadId|all_l1|all_specialists] [--parent-id <conversationId>]` to compile targeted or full-squad diagnostic cohorts:

| Stage / Squad ID | Agents Compiled | Purpose | Primary `pr-review` Categories |
| --- | --- | --- | --- |
| `all_l1` (Layered Full Squad) | `3` Leads (`-> 6` Specialists) | Compile all 3 squad leads; each lead dispatches and bundles its own 2 specialists | All 10 categories (`ARCH`..`DEP`) |
| `all_specialists` (Flat Full Squad) | `6` Specialists (across all `3` squads) | Compile all 6 specialists in one flat wave with the parent acting as lead across all 3 squads | All 10 categories (`ARCH`..`DEP`) |
| `skill_and_pr_review_audit` | `2` Specialists | Audit `.agents/skills/self-diagnosis` and `.agents/skills/pr-review` for contract drift, broken links, and progressive disclosure | `SKILL`, `DOC`, `ARCH`, `SCRIPT` |
| `runtime_and_contract_diagnosis` | `2` Specialists | Audit `mcp/index.js`, `mcp/dispatch.mjs`, `mcp/briefs.mjs`, `mcp/handoffs.mjs`, `mcp/planner.mjs`, and `bin/agy-squad.mjs` | `MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP` |
| `token_and_execution_optimization` | `2` Specialists | Profile and optimize brief byte budgets, `SKILL.md` progressive disclosure, `scopeFiles` disjointness, and filesystem/IPC hot paths | `RUN`, `SKILL`, `SVC`, `ARCH` |

- **Payload review mode (default per `L7`):** Compile the selected squad (`node .agents/skills/self-diagnosis/scripts/diagnose.mjs --print-dispatch skill_and_pr_review_audit`) and execute the checks directly or present the compiled `Subagents` payload.
- **Live subagent delegation, pre-remediation durable ledger gate, teardown (`L41`), and subagent termination:**
  1. **Fresh Passes vs. Same-Squad Remediation Checks:** Spawn fresh subagents (`invoke_subagent`) for each new independent pass. When remediating findings from an active cohort, keep that cohort alive (`idle`) and message the **same** subagents (`send_message`) so they re-verify their exact prior findings in place.
  2. **Reconcile & Bundle (`mcp/handoffs.mjs`):** Compile with `--print-dispatch <squadId> --parent-id <conversationId>`, yield for **Reactive Wakeup**, and run `node mcp/handoffs.mjs` (`fingerprint`, `inspect`, and when `PASS`: `bundle`, `verify`, `prune`).
  3. **NON-NEGOTIABLE PRE-REMEDIATION & PRE-TEARDOWN GATE — Formalized Operator Ledger & Zero Lead/Bundle Compression (`docs/reviews/`):** Immediately after bundling and **strictly BEFORE applying code edits or running `--teardown`**, create or update `docs/reviews/<target-review-slug>.md` in place using the `v1.3.0` structure (one file per PR review cycle). **Zero Lead/Bundle Compression or Silent Omission:** because `handoffs.mjs prune` deletes `specialist-N/report.md` and `diagnose.mjs --teardown` deletes `scratch/agy-squad/squad-<id>/lead/report.md` (`L41`), `docs/reviews/<target-review-slug>.md` is the **only surviving durable record**—every distinct `P0`–`P3` defect, optimization proposal, or advisory in any `lead/report.md` / specialist bundle **must** map `1-to-1` to its own row in the ledger before `--teardown` (never compressed into umbrella/range IDs or silently dropped, which would make solved vs. hidden items indistinguishable to the user):
     - **Section 1 (`Session Provenance`):** Append/update the session row (`Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked`).
     - **Section 9 (`/self-diagnosis` Cohort & Bundle Ledger):** Update the single **Cohort Provenance** table (`Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown`) and single atomic **Wave Finding Ledger** (`ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA` for `P3`s; concise 10-field blocks for `P0`–`P2`s). Enforce `1 ID = 1 Row`: log newly surfaced findings as `Open (Pre-Remediation)`, then flip them to `Closed` after same-squad re-verification (`send_message`).
     - **Section 8 (`Post-Remediation Residuals & Deferred Dispositions` — Mandatory Sink for Non-Closed / Post-Remediation Items):** Every post-remediation finding surfaced during re-verification (`Residual (Open)` -> `Closed (Post-Remediation)`), every `Deferred / Won't Fix` proposal, and every `Closed (By Design)` / `Informational` item **must** receive its own atomic row here—never silently omitted and never tucked into a `Closed` row's prose cell.
  4. **Deterministic Atomic Teardown (`L41`):** Immediately after updating the target `docs/reviews/` ledger (`mtime >= bundle mtime`) — and before mutating `verifiedFiles` during code remediation — tear down completed self-diagnosis directories and empty `scratch/agy-squad` / `scratch` parents:
     ```bash
     node .agents/skills/self-diagnosis/scripts/diagnose.mjs --teardown all [--ledger docs/reviews/<target-review-slug>.md] [--force]
     # Or for a single squad with explicit digest check:
     node .agents/skills/self-diagnosis/scripts/diagnose.mjs --teardown <squadId> --accept <bundle-sha256> [--ledger docs/reviews/<target-review-slug>.md] [--force]
     ```
     *Note:* `--teardown` requires a fresh verified bundle on disk and ledger `mtime >= bundle mtime` unless `--force` is passed explicitly.
  5. **Kill Subagents After Final Closure (`manage_subagents`):** Only after `0` open blocking findings remain, the target `docs/reviews/` ledger is updated (`Open -> Closed`), and `--teardown` completes, terminate all spawned subagents via `manage_subagents(Action='kill', ConversationIds=[...])` (killing the `3` leads in `all_l1` mode automatically terminates their `6` specialist descendants).

---

### Step 3: Evaluate Findings & Optimizations with the `pr-review` Skill
Activate [`pr-review`](../pr-review/SKILL.md) and apply its architecture-before-runtime trace:

1. **Trace before changing:** Verify `design thesis / invariant (active WSL IDs L1-L7, L21, L29-L31, L40-L43) -> public contract -> implementation -> verification` before proposing any skill, prompt, or runtime change.
2. **Triage by category and priority (`P1` blocking / `P2` actionable / `P3` optimization):** Apply the thresholds and failure-to-category mappings in Sections 2 and 3 of the [Optimization & Review Rubric](./references/optimization-and-review-rubric.md).
3. **Require measured before/after evidence:** Every optimization proposal must report exact before/after UTF-8 bytes, token estimates, or execution milliseconds from [`diagnose.mjs`](./scripts/diagnose.mjs) and pass `npm test`.
