# Core workflows: orchestrate, self-diagnose, review, and tear down

Agy-Squad runs four connected workflows across **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** on **Linux and WSL2 (macOS support is best-effort and untested)**:

1. **Task-proportional orchestration** (`squad_planner` / `agy-squad plan`, `dispatch_squad` / `agy-squad dispatch`, and `node bin/agy-squad.mjs` backed by `mcp/handoffs.mjs`)
2. **Recursive harness self-diagnosis** ([`.agents/skills/self-diagnosis/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md))
3. **Governed PR & non-diff reviews under Standard v1.3.0** ([`.agents/skills/pr-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md) and [`full-review`](roles-and-workflows.md#full-review))
4. **Three-scope evidence retention and teardown** (`L41`)

For the canonical definition of every role, Task-Spec vs. Execution-Modifier skill composition, MCP/CLI surface map, and the 4-check runtime closure gate, see [Roles, skill workflows, and runtime closure](roles-and-workflows.md).

## 1. Orchestrate proportional specialist or lead cohorts

![Six-step swarm lifecycle and dual-verdict gate](assets/swarm-lifecycle.svg)

Agy-Squad structures each cohort run into four ordered stages: Pre-Flight Intake, Working Cohort, Independent Integrity Audit, and Acceptance Bundling.

### Phase 0: Pre-flight intake interview

Before compiling manifests or launching workers, the primary agent runs an interactive intake check via `ask_question` (or a multiple-choice prompt) to lock four operator choices:

| Decision | Options | Governing control |
| --- | --- | --- |
| **Topology** | Ask neutrally (no default bias): **Flat** (specialists report to parent/coordinator), **Layered** (`all_l1` leads in `dispatch_squad` or domain coordinators in `/swarm`), or single-squad run | `squad_planner` (omit `squadId` for all squads) or `dispatch_squad` (`all_l1` / `all_specialists` / `<squadId>`) |
| **Teardown and provenance** | Full retention (`--keep-reports`, preserving `scratch/agy-squad/`) or automatic atomic teardown (`--teardown`) | `bin/agy-squad.mjs prune` and `diagnose.mjs` |
| **Integrity rigor** | Independent flat integrity auditor (`audit-<id>` on `/swarm`, `integrity_auditor` via slot; emits `CLEAN` or `INTEGRITY VIOLATION`) or `--allow-unaudited` opt-out | `bin/agy-squad.mjs bundle` and `mcp/verdicts.mjs` |
| **Instruction self-containment** | Explicit file paths, objectives, and criteria in every brief; unanchored codes (such as `H4` or `D2`) are rejected | `mcp/briefs.mjs` |

### Stage 1: Working cohort execution

1. **Compile the stage:** For Antigravity native `/swarm`, `squad_planner` (`agy-squad plan`) compiles `swarmAdd` payloads and a parent-authored `provenanceScaffold` (omit `squadId` to compile all manifest squads). For `invoke_subagent`, `dispatch_squad` (`agy-squad dispatch`) builds direct working specialists (`squadId: "<id>"` / `"all_specialists"`) or squad leads (`squadId: "all_l1"`) ([`docs/tools.md`](tools.md)).
2. **Inject brief invariants:** `mcp/briefs.mjs` adds alignment rules, flattery penalties, and transcript query rules to every compiled brief so the operator does not repeat boilerplate across squads.
3. **Query transcripts in batches:** Squad leads and reviewers inspect child sessions with single-pass batch calls (`query_transcript` with `summaryOnly: true` or `read_transcript` with `lastTurns: 10`). Iterative 1-to-2-step transcript polling is prohibited.
4. **Write to workspace report slots:** `dispatch_squad` sets `TypeName: "self"` and `Workspace: "inherit"` so each specialist writes directly to `scratch/agy-squad/.../specialist-<N>/report.md`.
5. **Send a `<= 500` byte receipt (`Pointer-Over-Wire`):** Each child posts one single-line receipt (`READY`, `PARTIAL`, or `NO_REPORT`) under `500` UTF-8 bytes through `send_message`, waking its parent via Reactive Wakeup without pasting full reports into parent context.
6. **Run the Squad Lead Patrol Gate:** The squad lead checks leaf traces against primary source files and test output, rejects guessed or sycophantic claims (`Subagent Alignment Policy`), and writes `lead/report.md` with `Content Verdict: PASS`, `FAIL`, or `BLOCKED` on its own line (bare `Verdict:` is accepted only as a legacy alias).

### Stage 2: Independent integrity auditor

Run the integrity auditor **after working squads finish** and **before acceptance**. For Antigravity native `/swarm` runs, follow `.agents/skills/swarm-governance/SKILL.md`.

1. **Dispatch or spawn the flat auditor:** On `/swarm`, add flat `audit-<targetSquad>` (writes to `scratch/agy-squad/squad-integrity_auditor-<targetSquad>/specialist-1/report.md`). On `invoke_subagent`, call `dispatch_squad` with `squadId: "integrity_auditor:<targetSquad>"` (or `integrity_auditor` for single-squad manifests). Legacy `adversarial_l1`, `adversarial_flat`, and `adversarial_review` stages have been removed.
2. **Audit execution traces:** The auditor runs single-pass batch queries (`summaryOnly=true` or `lastTurns=10`) to confirm that specialists executed real tools instead of guessing from memory, avoided sycophantic filler, and had their claims checked by the squad lead.
3. **Emit an audit verdict:** The auditor writes `Target Squad: <targetSquad>` and strictly `Integrity Verdict: CLEAN` or `Integrity Verdict: INTEGRITY VIOLATION` (never a content `PASS`).

### Stage 3: Acceptance and cryptographic bundling

1. **Enforce the dual-verdict gate:** `node bin/agy-squad.mjs bundle <record.json>` requires both `Content Verdict: PASS` on `lead/report.md` and `Integrity Verdict: CLEAN` for the matching `Target Squad` via `mcp/verdicts.mjs`. Any `INTEGRITY VIOLATION`, hedged verdict, or missing audit blocks bundling unless `--allow-unaudited` is passed.
2. **Record and verify SHA-256 digests:** `mcp/handoffs.mjs` hashes all cited `verifiedFiles`, specialist reports, and the `integrityAudit` report into `lead/report.sources.json`. `node bin/agy-squad.mjs verify <report.sources.json>` checks disk presence and digest matches, and `prune <report.sources.json> <accepted-sha256> [--keep-reports]` optionally removes loose specialist reports.

## 2. Diagnose and optimize the harness (`self-diagnosis`)

The [`self-diagnosis` skill](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md) uses Agy-Squad's staged dispatch and handoff contracts to audit the repository itself. The workflow requires operator supervision and makes no autonomous code changes.

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

For deeper audits, `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` defines three diagnostic squads (`skill_and_pr_review_audit`, `runtime_and_contract_diagnosis`, and `token_and_execution_optimization`):

```bash
# Primary (/swarm coordinator plan, Flat or Layered, inherit workspace for read-only audit):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --print-plan [--mode swarm] [--workspace-isolation inherit]

# Or compile invoke_subagent stages via dispatch_squad (flat squad or all_l1 leads):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --print-dispatch skill_and_pr_review_audit --parent-id <parent-conversation-id>
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --print-dispatch all_l1 --parent-id <parent-conversation-id>
```

Every diagnostic pass follows one fixed sequence:

`run zero-subagent profiler -> launch cohort -> reconcile & bundle reports -> transcribe 1-ID-per-row into docs/reviews/<slug>.md -> run diagnose.mjs --teardown -> remediate -> re-verify with the same specialists -> terminate subagents`

## 3. Review pull requests to the v1.3.0 standard

The [`pr-review` skill](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md) and [PR Review Standard v1.3.0](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md) define the repository review contract:

| Standard section | Requirement |
| --- | --- |
| **Section 1: Commit and session provenance** | Pin base/head SHAs, dirty working-tree deltas, CI run IDs, and an append-only `Session Provenance` table (`Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked`). |
| **Sections 2 and 3: Architecture-before-runtime trace** | Trace active POSIX/WSL decisions (`L1-L7, L21, L29-L31, L40-L43` in [`docs/plans/LEDGER.md`](plans/LEDGER.md); `L17` is retired) to public contracts, source code, and tests before evaluating runtime behavior. |
| **Section 4: Ten review categories** | Map every changed file to one primary category across `ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, and `DEP`. |
| **Sections 7, 8, and 9: `1 ID = 1 Row` durability** | Give every distinct `P0` through `P3` finding its own row (range/umbrella IDs fail `diagnose.mjs`) with one of six statuses: `Open (Pre-Remediation)`, `Closed`, `Residual (Open)`, `Closed (Post-Remediation)`, `Deferred / Won't Fix`, or `Closed (By Design)` / `Informational`. Record post-remediation residuals in Section 8 and `/self-diagnosis` cohort provenance plus bundle SHA-256 digests in Section 9. |

`diagnose.mjs` and `npm test` enforce `pr-review` locally in the repository (not as a GitHub branch-protection rule).

> [!WARNING]
> `diagnose.mjs` status (`HEALTHY`, finding counts) reflects the structure and contents of the target review ledger, which the author of a change usually writes. It checks that the ledger is well-formed and internally consistent. It does not independently re-review the code. Treat `HEALTHY` as evidence that the process was followed, not as an independent review. An independent reviewer's findings take precedence over a self-authored ledger's counts.

## 4. Three-scope evidence retention and teardown contract

![Role separation and dual-verdict bundle gate](assets/role-and-verdict-gate.svg)

Agy-Squad separates native worker cleanup from report bundling and ledger-gated scratch deletion across three scopes:

| Lifecycle scope | Governing tool | What is cleaned up | What is retained and gated |
| --- | --- | --- | --- |
| **1. Native `/swarm` planning and workspace** | `agy-squad plan` (`squad_planner`) + Antigravity `/swarm` | Native `/swarm` owns worker lifecycles and `kill` cleanup (`workspace: "share"` / `"branch"` worktrees); `agy-squad` creates no temporary `.agents/plugins/`, `.agents/agents/`, or `run-<uuid>/` directories (`L17` retired, `L42`/`L43` active) | Preserves workspace-relative specialist/lead reports and parent-authored `provenanceScaffold` under `scratch/agy-squad/squad-<id>/` (or custom `reportRoot`) |
| **2. Handoff and integrity bundle** | `node bin/agy-squad.mjs` | `prune` deletes loose `specialist-<N>/report.md` files only after `bundle` and `verify` succeed (unless `--keep-reports` or `retainReports: true` is set) | Preserves `lead/report.md` (`Content Verdict: PASS`), `lead/report.sources.json` (SHA-256 digests of all inputs and specialist reports), and verified `integrityAudit` evidence (`Integrity Verdict: CLEAN`) |
| **3. Self-diagnosis wave** | `diagnose.mjs --teardown` | Removes `scratch/agy-squad/squad-<id>` and empty `scratch/` parent directories | Refuses deletion (unless `--force` is passed) until `lead/report.sources.json` verifies and the target `docs/reviews/<slug>.md` ledger is schema-valid, newer than the bundle, and records the cohort's findings |

To tear down completed self-diagnosis cohorts after updating the target review ledger:

```bash
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --teardown all \
  --ledger docs/reviews/<target-review-slug>.md
```

After `--teardown` succeeds and no open blocking findings remain, stop spawned subagents via `manage_subagents(Action='kill', ConversationIds=[...])` (or `/agents` in the CLI) or `swarm{action: "kill", name}` for `/swarm` workers, then confirm child processes have exited ([Stopping agents](stopping-agents.md)).
