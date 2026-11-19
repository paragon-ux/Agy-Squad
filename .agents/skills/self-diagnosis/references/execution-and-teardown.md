# Self-Diagnosis Execution, Bundling & Teardown Reference

Uncondensed execution examples, multi-squad bundling workflows, and Scope 2 / Scope 3 `--teardown` edge cases for [`.agents/skills/self-diagnosis/SKILL.md`](../SKILL.md).

## Planning and Dispatch Commands

Run [`scripts/diagnose.mjs`](../scripts/diagnose.mjs) from the repository root (`node .agents/skills/self-diagnosis/scripts/diagnose.mjs`):

```bash
# 1. Zero-subagent local profiler (add --allow-active-cohort when scratch/agy-squad/squad-* is in flight; --skip-mcp-spawn skips child stdio check):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--skip-mcp-spawn] --markdown
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --ledger docs/reviews/<slug>.md [--skip-mcp-spawn] --markdown

# 2. Primary /swarm cohort plan (squad_planner): omit squadId to plan all 3 working squads, or pass --topology flat|layered:
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --print-plan [squadId] [--topology flat|layered | --flat] [--mode swarm|subagent] [--workspace-isolation inherit|share|branch]

# 3. Fallback invoke_subagent stage compiler (optional squadId: all_l1 [default], all_specialists, or single squadId):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --print-dispatch [all_l1|all_specialists|squadId] [--parent-id <parent-conversation-id>]
```

- **Note on `all_specialists`:** `all_specialists` is supported only by `diagnose.mjs --print-dispatch`; MCP `dispatch_squad` accepts `all_l1`, a single `<squadId>`, or `integrity_auditor[:<target>]`.
- **Standalone comparative research manifest ([`comparative-research-manifest.json`](../resources/comparative-research-manifest.json)):** Dedicated 1-squad manifest (`harness_comparative_audit`) used separately from `self-diagnosis-manifest.json` when benchmarking external multi-agent harnesses (`docs/plans/comparative-harness-architecture-retest.md`); omitted from automated `diagnose.mjs` canary profiling.
- **Self-diagnosis working squads (`self-diagnosis-manifest.json`, `readOnly: true` specialists):**
  - `skill_and_pr_review_audit`: 2 specialists covering `SKILL`, `DOC`, `ARCH`, `SCRIPT`.
  - `runtime_and_contract_diagnosis`: 2 specialists covering `MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`.
  - `token_and_execution_optimization`: 2 specialists covering `RUN`, `SKILL`, `SVC`, `ARCH`.

## Multi-Squad Bundling and Scope 2 Prune

When running all three squads in Layered mode (or any multi-squad plan), each working squad owns its own report directory (`scratch/agy-squad/squad-<squadId>/`), its own flat integrity auditor (`audit-<squadId>` -> `scratch/agy-squad/squad-integrity_auditor-<squadId>/specialist-1/report.md`), and its own `<bundle-record.json>`:

```bash
# Per working squad (<id> = skill_and_pr_review_audit | runtime_and_contract_diagnosis | token_and_execution_optimization, or self_diagnosis in flat mode; in a local source checkout you may also substitute `node bin/agy-squad.mjs`):
agy-squad collect --plan <plan.json> --from <worktree-dir>...   # only when workspaceIsolation != inherit
agy-squad verdict scratch/agy-squad/squad-<id>/lead/report.md
agy-squad bundle-init --plan <plan.json> --squad <id> [--handoff <worker=READY ...> ... | --handoffs <file.json>] [--id-map <worker=id>] <verified-file...> --digest --out <bundle-record-<id>.json>
agy-squad verdict --integrity scratch/agy-squad/squad-integrity_auditor[-<id>]/specialist-1/report.md
agy-squad finalize <bundle-record-<id>.json> [--replace] [--prune [--keep-reports]]   # shorthand for inspect -> bundle -> verify (+ optional prune)

# Or run the granular steps individually:
agy-squad fingerprint <verified-file...>
agy-squad inspect <bundle-record-<id>.json>
agy-squad digest <bundle-record-<id>.json>
agy-squad bundle <bundle-record-<id>.json>
agy-squad verify scratch/agy-squad/squad-<id>/lead/report.sources.json [--prune [--keep-reports]]
agy-squad prune scratch/agy-squad/squad-<id>/lead/report.sources.json <accepted-sha256> [--keep-reports]
```

- **Temporary `<plan.json>` / `<bundle-record-<id>.json>` placement (`SD2-DOC-02`):** `--out` (and `inspect`/`digest`/`bundle`) require workspace-relative paths. Write temporary `<bundle-record-<id>.json>` files outside `scratch/agy-squad/squad-<id>/` (for example, `scratch/bundle-record-<id>.json`) so `--teardown` does not reject `unexpectedArtifacts`, and delete those temporary JSON files before `--teardown` so `removeEmpty` cleans `scratch/agy-squad` and `scratch`.
- **Scope 2 (`prune`) vs. Scope 3 (`--teardown`):** `prune` removes only verified loose `specialist-<N>/report.md` files (preserving `lead/report.md` and `lead/report.sources.json`) unless `--keep-reports` is passed. `Scope 3` (`--teardown`) removes the entire `scratch/agy-squad/squad-*` cohort tree after durable ledger verification.

## Scope 3 Atomic Teardown and Failure Modes

Run `--teardown` **only after** every distinct finding from the cohort is transcribed `1-to-1` (`1 ID = 1 Row`) into `docs/reviews/<target-review-slug>.md`:

```bash
# Tear down one verified squad (optional --accept <sha256> pins expected bundle digest):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --teardown <squadId> [--accept <64-hex-sha256>] --ledger docs/reviews/<target-review-slug>.md

# Tear down all completed self-diagnosis squads and accompanying integrity_auditor* directories:
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --teardown all --ledger docs/reviews/<target-review-slug>.md

# Override refusal only when discarding an aborted or superseded diagnostic cohort:
node .agents/skills/self-diagnosis/scripts/diagnose.mjs \
  --teardown all --ledger docs/reviews/<target-review-slug>.md --force
```

### Pre-Teardown Refusal Conditions and Partial Cleanup

1. **Unbundled evidence refusal:** If `scratch/agy-squad/squad-<id>/lead/report.sources.json` is missing or fails `verifyBundle()`, `--teardown` exits `1` (`unbundled evidence`) and deletes nothing unless `--force` is passed.
2. **Stale or schema-invalid ledger refusal (`mtime + 1000 ms < bundle mtime`):** If the target `docs/reviews/<target-review-slug>.md` has an `mtime` older than `bundle mtime - 1000 ms`, fails `v1.4.0` ledger schema validation, or omits the bundle SHA-256 digest from Section 9, `--teardown` exits `1` without deleting `scratch/`. (Audit-only ledgers recording `Open (Pre-Remediation)` P0–P2 blockers are permitted through `--teardown` once transcribed, while `diagnose.mjs` audit mode flags `DOC-LEDGER-OPEN-BLOCKERS` until closed.)
3. **Finding-ID coverage check:** Scoped teardown verifies that findings referenced in the verified bundle/reports appear in the target ledger before removing evidence.
4. **Scoped vs. `all` teardown with auditors:** Single-squad `--teardown <squadId>` removes `squad-<squadId>`, `squad-integrity_auditor-<squadId>`, and flat `squad-integrity_auditor` when matched in that squad's bundle; `--teardown all` deletes all working squad and auditor directories alongside verified bundle/ledger gates. Never call `--teardown` before saving the durable ledger or running same-cohort remediation re-checks.
5. **Partial permission failure during cleanup:** Check command exit codes and `ls scratch/` afterwards; if a partial deletion failure leaves orphaned files after fixing permissions, re-run `--teardown` (or `prune` for `Scope 2`) to finish cleaning empty `scratch/agy-squad/` and `scratch/` directories.
