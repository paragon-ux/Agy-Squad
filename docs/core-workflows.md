# Core workflows: orchestrate, self-diagnose, review, and tear down

Agy-Squad runs four connected workflows across **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** on **Linux, macOS, and Windows**:

1. **Task-proportional orchestration** (`squad_planner` / `agy-squad plan`, `dispatch_squad` / `agy-squad dispatch`, and `agy-squad` (`collect`, `bundle-init`, `audit-check`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`, `verdict`) backed by `mcp/handoffs.mjs`)
2. **Recursive harness self-diagnosis** ([`self-diagnosis`](skills/self-diagnosis.md))
3. **Governed PR, non-diff, and Day-1 launch reviews under Standard v1.5.0** ([`pr-review`](skills/pr-review.md), [`full-review`](skills/full-review.md), and [`day-one-review`](skills/day-one-review.md))
4. **Three-scope evidence retention and deterministic scratch teardown**

For the canonical definition of every role, Task-Spec vs. Execution-Modifier skill composition, MCP/CLI surface map, and the 4-check runtime closure gate, see [Roles, skill workflows, and runtime closure](roles-and-workflows.md).

## 1. Orchestrate proportional specialist or lead cohorts

![Six-step swarm lifecycle and dual-verdict gate](assets/swarm-lifecycle.svg)

Agy-Squad structures each cohort run into four ordered stages: Pre-Flight Intake, Working Cohort, Independent Integrity Audit, and Acceptance Bundling.

### Phase 0: Step 0 intake and swarm defaults

For native `/swarm` runs, read-only reviews and cohorts with separate file scopes start right away using built-in defaults (`flat` for inline tasks, staged `layered` waves for manifests with `lead` blocks unless `--topology flat` is passed, `inherit` workspace mode, the coordinator's active model, `--prune` after synthesis, and an independent Integrity Audit). The coordinator calls `ask_question` at Step 0 only when `squad_planner` finds writable `siblingOverlaps` on `inherit`, when destructive state changes are ambiguous, or when you ask to customize run settings:

| Decision | Default and options | Governing control |
| --- | --- | --- |
| **Topology** | Inline tasks default to **Flat** (specialists report to coordinator); manifests with `lead` blocks compile staged **Layered** waves (`wave1` specialists, `wave2` leads after specialist `READY` receipts, `wave3` `audit-<id>`) unless `--topology flat` is passed | `squad_planner` (omit `squadId` for all squads) or `dispatch_squad` (`all_l1` / `<squadId>`) |
| **Workspace isolation** | Default: `inherit` (shared coordinator root with `readOnlyBaseline` checks on `readOnly: true` cohorts); opt into `share` (shared-storage copy) or `branch` (isolated clone) for concurrent edits | `squad_planner` (`workspaceIsolation`, `/swarm` only; `subagent` requires `inherit`) |
| **Teardown and provenance** | Default: verified report pruning after final synthesis (`agy-squad prune --records <record.json...> --clean-records` or `finalize --prune`); pass `--keep-reports` to retain `scratch/agy-squad/` reports | `agy-squad prune` / `agy-squad finalize` |
| **Model** | Default: coordinator active model (omit `model`/`--model`); or explicit user-selected model ID (`swarm{action: "models"}`) | `squad_planner` (`model`, `knownModels`) and `swarm{action: "status"}` |
| **Integrity rigor** | Default: independent flat integrity auditor (`audit-<id>` on `/swarm`, `integrity_auditor` via slot; runs `agy-squad audit-check` and emits `CLEAN` or `INTEGRITY VIOLATION`); explicit `--no-integrity` / `--allow-unaudited` opt-out | `agy-squad audit-check`, `agy-squad bundle` / `finalize`, and `mcp/verdicts.mjs` |
| **Instruction self-containment** | Explicit file paths, objectives, and criteria in every brief; unanchored codes (such as `H4` or `D2`) are rejected | `mcp/briefs.mjs` |

### Stage 1: Working cohort execution

1. **Compile the stage:** For Antigravity native `/swarm`, `squad_planner` (`agy-squad plan`) compiles `swarmAdd` payloads and `verificationPipeline` commands (omit `squadId` to compile all manifest squads). For `invoke_subagent`, `dispatch_squad` (`agy-squad dispatch`) builds direct working specialists (`squadId: "<id>"`) or squad leads (`squadId: "all_l1"`) ([`docs/tools.md`](tools.md)).
2. **Inject brief invariants:** `mcp/briefs.mjs` adds alignment rules, flattery penalties, and transcript inspection rules to every compiled brief so the operator does not repeat boilerplate across squads.
3. **Inspect transcripts in one batch pass:** Squad leads and reviewers inspect child sessions in a single batch pass: standalone runs read `~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl` (and matching `transcript_full.jsonl` lines for `truncated_fields`) directly, and when optional `Agy-Context-Saver` is installed, `agy-context transcript health --id <id> --json` gives step and tool counts. Iterative 1-to-2-step transcript polling is prohibited.
4. **Write to workspace report slots:** `dispatch_squad` sets `TypeName: "self"` and `Workspace: "inherit"` so each specialist writes directly to `scratch/agy-squad/.../specialist-<N>/report.md`.
5. **Send a `<= 500` byte receipt (`Pointer-Over-Wire`):** Each child posts one single-line receipt (`READY`, `PARTIAL`, or `NO_REPORT`, using spaced ASCII ` - ` or ` -- ` or Unicode `U+2014`) under `500` UTF-8 bytes, waking its parent via Reactive Wakeup without pasting full reports into parent context.
6. **Run the Squad Lead Patrol Gate:** The squad lead checks leaf traces against primary source files and test output, rejects guessed or sycophantic claims (`Subagent Alignment Policy`), and writes `lead/report.md` with `Content Verdict: PASS`, `FAIL`, or `BLOCKED` on its own line (bare `Verdict:` is accepted only as a legacy alias).

### Stage 2: Independent integrity auditor

Run the integrity auditor **after working squads finish** and **before acceptance**. For Antigravity native `/swarm` runs, follow `.agents/skills/swarm-governance/SKILL.md`.

1. **Dispatch or spawn the flat auditor:** On `/swarm`, add flat `audit-<id>` (`squad-integrity_auditor/specialist-1/report.md` for single-squad manifests, flat or layered, or `squad-integrity_auditor-<targetSquad>/specialist-1/report.md` for multi-squad manifests, flat or layered). On `invoke_subagent`, call `dispatch_squad` with `squadId: "integrity_auditor:<targetSquad>"` (or `integrity_auditor` for single-squad manifests). Legacy `adversarial_l1`, `adversarial_flat`, and `adversarial_review` stages have been removed.
2. **Audit execution traces:** The auditor runs `agy-squad audit-check --record <record.json> [--coord-id <coordId>]` first to verify Step 1 attribution, `readOnly` write rules, and cited source files, then inspects worker traces in one batch pass: reading `~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl` (and matching `transcript_full.jsonl` lines) directly when running standalone, and, when optional `Agy-Context-Saver` is installed, using `agy-context transcript health --id <u1,u2> --json` for counts. This confirms that specialists executed real tools instead of guessing from memory and had their claims checked by the squad lead.
3. **Emit an audit verdict with Evidence Digest:** Run `agy-squad digest <record.json>` (or `agy-squad bundle-init --digest`) first so the auditor records `Target Squad: <targetSquad>`, `Evidence Digest: <64-hex>`, and strictly `Integrity Verdict: CLEAN` or `Integrity Verdict: INTEGRITY VIOLATION` (never a content `PASS`).

### Stage 3: Acceptance and cryptographic bundling

1. **Enforce the dual-verdict gate:** `agy-squad finalize <record.json> [--prune]` (or `agy-squad bundle <record.json>`) requires `Content Verdict: PASS` on `lead/report.md`, `Evidence Digest: <64-hex>`, and `Integrity Verdict: CLEAN` for every auditor slot matching `Target Squad` via `mcp/verdicts.mjs`. Any `INTEGRITY VIOLATION`, stale digest, hedged verdict, or missing audit blocks bundling unless `--allow-unaudited` is passed (`auditPolicy: "required"` vs `"unaudited-explicit"`).
2. **Record and verify SHA-256 digests:** `mcp/handoffs.mjs` hashes all cited `verifiedFiles`, specialist reports, and every `integrityAudit` / `integrityAudits` report into `lead/report.sources.json`. `agy-squad finalize <record.json> [--prune [--keep-reports]]` runs `inspect -> bundle -> verify` (+ optional prune) in one call, while granular `agy-squad verify <report.sources.json>` enforces the persisted `auditPolicy` alongside archived Markdown and digest matches, and `agy-squad prune <report.sources.json> <accepted-sha256> [--keep-reports]` safely removes matching loose specialist reports.

## 2. Diagnose and optimize the harness (`self-diagnosis`)

The repo-only [`self-diagnosis` skill](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md) (excluded from end-user npm installs) uses Agy-Squad's staged dispatch and handoff contracts to audit the repository itself. The workflow requires operator supervision and makes no autonomous code changes.

### Run the zero-subagent maintainer check

From the repository root, run `diagnose.mjs` to check shipped skill frontmatter, relative and hosted links, retired-symbol/em-dash/SVG hygiene, and compiled brief and MCP `tools/list` byte budgets:

```bash
# JSON maintainer check (exits 0 when HEALTHY, 1 when issues are found):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--json]
```

### Compile and run targeted diagnostic cohorts

For deeper audits, `.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` defines three diagnostic squads (`skill_and_pr_review_audit`, `runtime_and_contract_diagnosis`, and `token_and_execution_optimization`):

```bash
# Primary (/swarm coordinator plan, inherit workspace for read-only audit):
agy-squad plan \
  --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  --mode swarm --workspace-isolation inherit

# Or compile invoke_subagent stages via agy-squad dispatch (flat squad or all_l1 leads):
agy-squad dispatch \
  --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  --squad skill_and_pr_review_audit
agy-squad dispatch \
  --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  --squad all_l1
```

Every diagnostic pass follows one fixed sequence:

`run zero-subagent check -> launch cohort -> reconcile & bundle reports via agy-squad finalize -> transcribe 1-ID-per-row into docs/reviews/<slug>.md -> prune verified reports via agy-squad prune --records ... --clean-records -> remediate -> re-verify with the same specialists -> terminate subagents`

## 3. Review pull requests to the v1.5.0 standard

The [`pr-review` skill](skills/pr-review.md), [`full-review` skill](skills/full-review.md), [`day-one-review` skill](skills/day-one-review.md), and [PR Review Standard v1.5.0](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md) define the repository review contract:

| Standard section | Requirement |
| --- | --- |
| **Section 1: Commit and session provenance** | Pin base/head SHAs, dirty working-tree deltas, CI run IDs, and an append-only `Session Provenance` table (`Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked`). |
| **Sections 2 and 3: Architecture-before-runtime trace** | Trace normative architecture docs or ADRs (when present in the target repository) to public contracts, source code, and tests before evaluating runtime behavior. |
| **Section 4: Eleven review categories** | Map every changed file to one primary category across `ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`, and `SEC` (`4.11` security, trust boundaries, and vulnerabilities). |
| **Sections 7, 8, and 9: `1 ID = 1 Row` durability** | Give every distinct `P0` through `P3` finding its own row (no range/umbrella IDs) with one of six statuses: `Open (Pre-Remediation)`, `Closed`, `Residual (Open)`, `Closed (Post-Remediation)`, `Deferred / Won't Fix`, or `Closed (By Design)` / `Informational`. Record post-remediation residuals in Section 8 and `/self-diagnosis` cohort provenance plus bundle SHA-256 digests in Section 9. |

`pr-review` is enforced by review discipline and local repo checks (`diagnose.mjs` and `npm test`), not as a GitHub branch-protection rule.

> [!WARNING]
> `diagnose.mjs` checks skill structure, links, hygiene, and prompt/MCP byte budgets inside an `Agy-Squad` checkout. It does not independently re-review code or validate review ledger claims. An independent reviewer's findings always take precedence.

## 4. Three-scope evidence retention and teardown contract

![Role separation and dual-verdict bundle gate](assets/role-and-verdict-gate.svg)

Agy-Squad separates native worker cleanup from report bundling and scratch deletion across three scopes:

| Lifecycle scope | Governing tool | What is cleaned up | What is retained and gated |
| --- | --- | --- | --- |
| **1. Native `/swarm` planning and workspace** | `agy-squad plan` (`squad_planner`) + Antigravity `/swarm` | Native `/swarm` owns worker lifecycles and `kill` cleanup (`workspace: "share"` / `"branch"` worktrees); `agy-squad` creates no temporary `.agents/plugins/`, `.agents/agents/`, or `run-<uuid>/` directories (the legacy `agy-squad run` PTY launcher is retired) | Preserves workspace-relative specialist/lead reports under `scratch/agy-squad/squad-<id>/` (or custom `reportRoot`) |
| **2. Handoff and integrity bundle** | `agy-squad` (`finalize`, `bundle`, `verify`, `prune`) | `prune` (or `finalize --prune` / `verify --prune --expected-sha256 <sha256>`) deletes loose `specialist-<N>/report.md` files only after `bundle` and `verify` succeed (unless `--keep-reports` or `retainReports: true` is set) | Preserves `lead/report.md` (`Content Verdict: PASS`), `lead/report.sources.json` (SHA-256 digests of all inputs and specialist reports), and verified `integrityAudit` evidence (`Integrity Verdict: CLEAN`) |
| **3. Self-diagnosis wave** | `agy-squad finalize` + `agy-squad prune --records` + scratch cleanup | Finalizes bundles via `finalize`, and removes verified loose specialist reports and temporary record files via `prune --records ... --clean-records` (or `finalize --prune` when no review ledger is written), then clears finished `scratch/agy-squad/` directories once findings are archived | Retain verified `lead/report.sources.json` bundles until findings and bundle SHA-256 digests are recorded in `docs/reviews/<slug>.md` |

To prune verified specialist reports and temporary record files after archiving findings into `docs/reviews/<target-review-slug>.md` (and optionally clear completed self-diagnosis scratch directories):

```bash
agy-squad finalize scratch/agy-squad/squad-*/record.json
# After transcribing findings and bundle SHA-256 digests into docs/reviews/<slug>.md:
agy-squad prune --records scratch/agy-squad/squad-*/record.json --clean-records
# Optional: remove finished scratch bundles once findings are archived in docs/reviews/
rm -rf scratch/agy-squad
```

After bundling/cleanup succeeds and no open blocking findings remain, stop spawned subagents via `manage_subagents(Action='kill', ConversationIds=[...])` (or `/agents` in the CLI) or `swarm{action: "kill", name}` for `/swarm` workers, then confirm child processes have exited ([Stopping agents](stopping-agents.md)).
