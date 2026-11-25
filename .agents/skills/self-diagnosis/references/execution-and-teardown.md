# Self-Diagnosis Execution, Bundling & Cleanup

Commands and bundling reference for [`SKILL.md`](../SKILL.md).

## Maintainer Check & Cohort Commands

Run from the `Agy-Squad` repo root:

```bash
# 1. Read-only zero-subagent check (skills, links, manifest/doc hygiene, brief/MCP byte budgets):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--json]

# 2. Primary wave-gated /swarm cohort plan (writes full plan to disk + prints compact < 2 KB receipt):
agy-squad plan --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  --out scratch/self-diag-plan.json --replace [--topology layered|flat] [--workspace-isolation inherit|share|branch]

# 3. Fallback invoke_subagent dispatch:
agy-squad dispatch --squad all_l1 --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json
```

- **Working squads ([`self-diagnosis-manifest.json`](../resources/self-diagnosis-manifest.json), `readOnly: true`):**
  - `skill_and_pr_review_audit`: 2 specialists (`SKILL`, `DOC`, `ARCH`, `SCRIPT`).
  - `runtime_and_contract_diagnosis`: 2 specialists (`MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`, `SEC`).
  - `token_and_execution_optimization`: 2 specialists (`RUN`, `SKILL`, `SVC`, `ARCH`).
- **Comparative harness manifest ([`comparative-research-manifest.json`](../resources/comparative-research-manifest.json)):** Standalone 1-squad manifest (`harness_comparative_audit`) for external harness benchmarks.

## Multi-Squad Bundling and Cleanup

Each squad owns `scratch/agy-squad/squad-<id>/`, flat auditor `audit-<id>` (`scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md`), and its own bundle record:

```bash
# Batch across all 3 squads in 3 CLI calls (or `node bin/agy-squad.mjs --workspace <repo-root>`):
agy-squad collect --plan scratch/self-diag-plan.json --handoffs scratch/handoffs.json   # only if isolated
agy-squad bundle-init --plan scratch/self-diag-plan.json --all-squads \
  --handoffs scratch/handoffs.json [--id-map <worker=id>] \
  --from-scope --digest --out-dir scratch/records --replace
# Launch Wave-3 audit-<id> workers (with agy-squad audit-check), then finalize all squads without --prune:
agy-squad finalize scratch/records/*.json --strict-citations [--replace]
# Write docs/reviews/<slug>.md once with verified bundle SHA-256 hashes (reading lead/report.md in layered mode unless uncarriedUrls/raw detail requires specialist-N/report.md), then prune & clean records:
agy-squad prune --records scratch/records/*.json --clean-records [--keep-reports]
```

- Write temp `<plan.json>` and `bundle-record-<id>.json` outside `scratch/agy-squad/squad-<id>/` (e.g., `scratch/bundle-record-<id>.json`) and remove once done.
- Finalize bundles without `--prune` first so verified bundle SHA-256 hashes are written into `docs/reviews/<slug>.md` (Standard v1.5.0 Sections 1-9, `1 ID = 1 Row`) in a single pass with zero placeholder patching, then run `agy-squad prune` and remove finished `scratch/agy-squad/` directories. On read-only runs where `git status` is clean on the baseline-tested `HEAD`, skip a duplicate closeout `npm test`.
