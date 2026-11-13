# Core workflows: orchestrate, self-diagnose, review, and tear down

Agy-Squad combines four connected workflows inside one workspace harness across **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** on **POSIX systems (Linux, macOS, and WSL2)**:

1. **Task-proportional orchestration** (`squad_planner` / `agy-squad plan`, `dispatch_squad`, and `mcp/handoffs.mjs`)
2. **Recursive harness self-diagnosis** ([`.agents/skills/self-diagnosis/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md))
3. **Governed PR review under Standard v1.3.0** ([`.agents/skills/pr-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md))
4. **Three-scope evidence retention and teardown** (`L41`)

## 1. Orchestrate proportional specialist or lead cohorts

Agy-Squad organizes execution into a strict 4-phase lifecycle: **Pre-Flight Intake Interview -> Working Cohort -> Mandatory Adversarial Review Squad -> Acceptance & Bundling**:

- **Phase 0 — Pre-Flight Intake Interview (Operator Alignment Gate):**
  - Before compiling manifests or launching subagents, the primary agent initiates an interactive intake round (via `ask_question` or multiple-choice prompt) to establish:
    1. **Topology:** Layered (`all_l1` — leads managing specialists) vs. Flat (`all_specialists` — operator managing specialists) vs. Single-Squad targeted run.
    2. **Teardown & Provenance Policy:** Full Evidence Retention (`--keep-reports` preserving all loose reports in `scratch/agy-squad/` for auditability and research) vs. Automatic Atomic Teardown (`--teardown` upon acceptance).
    3. **Integrity Rigor:** Independent flat `integrity_auditor` gate (`CLEAN` / `INTEGRITY VIOLATION`, enforced by `bin/agy-squad.mjs bundle`) vs. `--allow-unaudited` opt-out.
    4. **Self-Contained Instruction Standard:** Briefs must be strictly self-contained; unanchored abbreviations or phantom section codes (e.g. 'H4', 'D2') are prohibited.

- **Stage 1 — Working Cohort Execution:**
  - `dispatch_squad` compiles a stage of direct working specialists (`squadId: "<id>"`) or a stage of working squad leads (`squadId: "all_l1"`) from a task or manifest ([`docs/tools.md`](tools.md)).
  - **Standardized Brief Invariants:** Every compiled specialist and lead brief includes structurally enforced alignment rules, flattery penalties, and batch-efficient transcript forensic requirements in `mcp/briefs.mjs`, ensuring consistent execution without requiring the operator to manually repeat boilerplate instructions.
  - **Batch-Efficient Transcript Forensics:** Leads and reviewers are structurally prohibited from polling transcripts 1-2 steps iteratively (quadratic token burn). Instead, audits are conducted via single-pass batch queries (`query_transcript` with `summaryOnly: true` or `read_transcript` with `lastTurns: 10`).
  - **Writable workspace report slots:** Every specialist is compiled with `TypeName: "self"` and `Workspace: "inherit"` so it writes its evidence report directly to `scratch/agy-squad/.../specialist-<N>/report.md`.
  - **500-byte receipt ceiling (`Pointer-Over-Wire`):** Each child sends one single-line message (`READY`, `PARTIAL`, or `NO_REPORT`) under `500` UTF-8 bytes back to its parent via `send_message`, waking the parent via Reactive Wakeup without dumping multi-kilobyte transcripts into the parent context.
  - **Squad Lead Patrol & Semantic Correctness Gate:** The squad lead actively audits leaf execution traces, penalizing sycophancy or ungrounded claims. Specialists must follow the Subagent Alignment Policy: parametric guessing and unverified flattery are rejected; every claim must cite an executed tool command or primary source line. The lead independently verifies outcome claims against artifacts before writing `lead/report.md` (`Content Verdict: PASS`, `FAIL`, or `BLOCKED` on its own line; `Verdict:` also accepted).

- **Stage 2 — Independent Integrity Auditor (Role-Separated Gate):**
  - Runs **after working squads complete**, and **before acceptance**. For Antigravity native `/swarm` runs, follow the `swarm-governance` skill.
  - **Flat Integrity Auditor (Recommended):** Dispatched via `squadId: "integrity_auditor:<targetSquad>"` (or `integrity_auditor` for single-squad manifests). Compiles a flat `Integrity Auditor` into `scratch/agy-squad/squad-integrity_auditor-<targetSquad>/specialist-1/report.md` (no nested sub-hierarchies), recording `Target Squad: <targetSquad>` and strictly `Integrity Verdict: CLEAN` or `Integrity Verdict: INTEGRITY VIOLATION` (never a content `PASS`).
  - **Legacy Adversarial Dispatch:** `adversarial_l1` and `adversarial_flat` remain supported for backward compatibility.
  - **Audited Invariants:** Patrols working squads via single-pass batch transcript queries (`summaryOnly=true` / `lastTurns=10`) to verify that specialists actually ran tools rather than guessing parametrically, did not engage in sycophantic flattery, and confirms working leads independently audited evidence rather than rubber-stamping.

- **Stage 3 — Acceptance & Cryptographic Bundling:**
  - **Integrity Acceptance Gate:** `node bin/agy-squad.mjs bundle <record.json>` enforces `requireIntegrityAudit: true` by default (pass `--allow-unaudited` to opt out) and verifies `Integrity Verdict: CLEAN` plus matching `Target Squad` via `mcp/verdicts.mjs`. Any `INTEGRITY VIOLATION`, hedged verdict, or missing audit blocks bundling.
  - **Cryptographic integrity check:** Programmatically computes SHA-256 digests for all cited `verifiedFiles`, specialist reports, and the `integrityAudit` report in `lead/report.sources.json`. `node bin/agy-squad.mjs verify` enforces disk presence and hash match for the integrity report, and `prune ... [--keep-reports]` optionally retains loose reports.

## 2. Diagnose and optimize the harness (`self-diagnosis`)

The [`self-diagnosis` skill](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md) applies Agy-Squad's staged dispatch and handoff contracts to audit and optimize the repository itself. It is an operator-supervised workflow (it never modifies code autonomously without authorization).

### Run the zero-subagent profiler

From the repository root, run `diagnose.mjs` to check skill frontmatter, relative links, byte/token budgets, `dispatch_squad` and `squad_planner` compilation, handoff pipeline canaries, and the v1.3.0 review ledger schema:

```bash
# Markdown diagnostic report:
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown

# JSON output for scripts and CI:
node .agents/skills/self-diagnosis/scripts/diagnose.mjs

# Validate a specific PR review ledger under docs/reviews/:
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --ledger docs/reviews/rebuild-wsl-dispatch-review-r2.md
```

### Compile and run targeted diagnostic cohorts

When deeper inspection is needed, `self-diagnosis-manifest.json` defines three diagnostic squads (`skill_and_pr_review_audit`, `runtime_and_contract_diagnosis`, and `token_and_execution_optimization`):

```bash
# Mode A: Flat specialist squad (2 specialists reporting directly to parent):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --print-dispatch skill_and_pr_review_audit --parent-id <parent-conversation-id>

# Mode B: Layered 3-squad sweep (3 leads -> 6 specialists):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --print-dispatch all_l1 --parent-id <parent-conversation-id>
```

Every diagnostic pass follows a strict sequence:

`run zero-subagent profiler -> launch cohort -> reconcile & bundle reports -> transcribe 1-ID-per-row into docs/reviews/<slug>.md -> run diagnose.mjs --teardown -> remediate -> re-verify with the same specialists -> terminate subagents`

## 3. Review pull requests to the v1.3.0 standard

The [`pr-review` skill](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md) and its [PR Review Standard v1.3.0](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md) define the repository's review contract:

- **Commit and session provenance (Section 1):** Every review pins base/head SHAs, dirty working-tree deltas, CI run IDs, and an append-only `Session Provenance` table (`Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked`).
- **Architecture-before-runtime trace (Sections 2 & 3):** Reviewers trace active WSL and POSIX decisions (`L1-L7, L21, L29-L31, L40-L43` in [`docs/plans/LEDGER.md`](plans/LEDGER.md); `L17` is retired) to public contracts, implementation, and tests before evaluating runtime code.
- **Ten mandatory review categories (Section 4):** Every changed file maps to one primary category across `ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, and `DEP`.
- **`1 ID = 1 Row` durability (Sections 7, 8, & 9):** Every distinct `P0` through `P3` finding gets its own row (umbrella/range IDs are rejected by `diagnose.mjs`) and carries one of six canonical statuses: `Open (Pre-Remediation)`, `Closed`, `Residual (Open)`, `Closed (Post-Remediation)`, `Deferred / Won't Fix`, or `Closed (By Design)` / `Informational`. Section 8 serves as the mandatory table for post-remediation residuals and deferred items; Section 9 records `/self-diagnosis` cohort provenance and bundle SHA-256 digests.

`pr-review` is a repository workflow standard enforced by `diagnose.mjs` and `npm test` (not a GitHub branch-protection setting).

> [!WARNING]
> `diagnose.mjs` status (`HEALTHY`, finding counts) reflects the structure and contents of the target review ledger, which the author of a change usually writes. It checks that the ledger is well-formed and internally consistent. It does not independently re-review the code. Treat `HEALTHY` as evidence that the process was followed, not as an independent review. An independent reviewer's findings take precedence over a self-authored ledger's counts.

## 4. Three-scope evidence retention and teardown contract

Agy-Squad defines explicit rules for what evidence is kept, when loose reports are pruned, and when scratch directories are deleted:

| Lifecycle scope | Governing tool | What is cleaned up | What is retained and gated |
| --- | --- | --- | --- |
| **1. Native `/swarm` planning & workspace** | `agy-squad plan` (`squad_planner`) + Antigravity `/swarm` | Native `/swarm` owns worker lifecycles and `kill` cleanup (`workspace: "share"` / `"branch"` worktrees); `agy-squad` creates no temporary `.agents/plugins/`, `.agents/agents/`, or `run-<uuid>/` session directories (`L17` retired, `L42`/`L43` active) | Preserves workspace-relative specialist/lead reports and parent-authored `provenanceScaffold` under `scratch/agy-squad/squad-<id>/` (or custom `reportRoot`) |
| **2. Handoff & integrity bundle** | `node bin/agy-squad.mjs` (or `node mcp/handoffs.mjs`) | `prune` deletes loose `specialist-<N>/report.md` files only after `bundle` and `verify` succeed (unless `--keep-reports` / `retainReports: true`) | Preserves `lead/report.md` (`Content Verdict: PASS`), `lead/report.sources.json` (SHA-256 digests of all inputs and specialist reports), and verified `integrityAudit` evidence (`Integrity Verdict: CLEAN`) |
| **3. Self-diagnosis wave** | `diagnose.mjs --teardown` | Removes `scratch/agy-squad/squad-<id>` and empty `scratch/` parents | Refuses deletion (unless `--force` is passed) until `lead/report.sources.json` verifies and the target `docs/reviews/<slug>.md` ledger is schema-valid, newer than the bundle, and records the cohort's findings |

To tear down completed self-diagnosis cohorts after updating the target review ledger:

```bash
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --teardown all \
  --ledger docs/reviews/<target-review-slug>.md
```

After `--teardown` completes and zero open blocking findings remain, terminate spawned subagents via `manage_subagents(Action='kill', ConversationIds=[...])` (or `/agents` in the CLI) and verify that any child processes have exited ([Stopping agents](stopping-agents.md)).
