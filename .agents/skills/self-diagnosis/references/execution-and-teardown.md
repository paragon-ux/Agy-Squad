# Self-Diagnosis Execution, Bundling & Cleanup

Commands and bundling reference for [`SKILL.md`](../SKILL.md).

## Maintainer Check & Cohort Commands

Run from the `Agy-Squad` repo root:

```bash
# 1. Read-only zero-subagent check (skills, links, hygiene, brief/MCP byte budgets):
node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--json]

# 2. Primary /swarm cohort plan (all 3 squads; manifests defining lead blocks compile layered unless --topology flat is explicitly passed):
agy-squad plan --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  [--topology layered|flat] [--workspace-isolation inherit|share|branch]

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
# Per squad (or `node bin/agy-squad.mjs` inside a checkout):
agy-squad collect --plan <plan.json> --from <worktree-dir>...   # only if isolated
agy-squad verdict scratch/agy-squad/squad-<id>/lead/report.md
agy-squad bundle-init --plan <plan.json> --squad <id> \
  (--handoff '<worker>=READY <slot> - <note>' | --handoffs <file.json>) [--id-map <worker=id>] \
  <verified-file...> --digest --out scratch/bundle-record-<id>.json
agy-squad verdict --integrity scratch/agy-squad/squad-integrity_auditor[-<id>]/specialist-1/report.md
agy-squad finalize scratch/bundle-record-<id>.json [--replace] [--prune [--keep-reports]]
agy-squad verify scratch/agy-squad/squad-<id>/lead/report.sources.json --prune --expected-sha256 <sha256> [--keep-reports]
```

- Write temp `<plan.json>` and `bundle-record-<id>.json` outside `scratch/agy-squad/squad-<id>/` (e.g., `scratch/bundle-record-<id>.json`) and remove once done.
- Transcribe every finding `1 ID = 1 Row` and each verified bundle SHA-256 into `docs/reviews/<slug>.md` (Standard v1.5.0 Sections 1-9) before removing finished `scratch/agy-squad/` directories.
