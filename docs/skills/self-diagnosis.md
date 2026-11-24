# `self-diagnosis`: Maintainer Harness Profiler & Audit

> **Repo-only maintainer skill (not shipped in end-user npm installs):** `self-diagnosis` is excluded from the published npm tarball and runs only inside an `Agy-Squad` source repository checkout. To review or govern your own external repository, use [`pr-review`](pr-review.md), [`full-review`](full-review.md), [`day-one-review`](day-one-review.md), or [`swarm-governance`](swarm-governance.md).

`self-diagnosis` audits `Agy-Squad` itself and its workspace skills for contract accuracy, progressive-disclosure budgets, compiled template sizes, link integrity, and pipeline latency.

- **Source specification:** [`.agents/skills/self-diagnosis/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md)
- **References & scripts:** [`diagnose.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/scripts/diagnose.mjs), [`self-diagnosis-manifest.json`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json), [`optimization-and-review-rubric.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md), [`execution-and-teardown.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/references/execution-and-teardown.md)
- **Canonical role map & closure gate:** [Roles, skill workflows, and runtime closure](../roles-and-workflows.md)

## Workflow

1. **Zero-subagent maintainer check (`Operator`):** Run the read-only local check first from the repo root:

```bash
node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--json]
```

   `diagnose.mjs` (`[--json] [--help]`) validates shipped `SKILL.md` frontmatter and line/byte budgets, relative and hosted doc links, retired-symbol/em-dash hygiene, `docs/assets/*.svg` XML and reference checks, and compiled brief + MCP `tools/list` byte budgets.

2. **Compile diagnostic cohorts:** Compile `self-diagnosis-manifest.json` via `agy-squad plan --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json` (primary `/swarm`; manifests with `lead` blocks compile `layered` with `inherit` workspace isolation unless `--topology flat` is passed) or `agy-squad dispatch --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json --squad <all_l1|squadId>` (`invoke_subagent` fallback):
   - `Skill & PR-Review Standard Lead` (`skill_and_pr_review_audit`) -> 2 `readOnly: true` specialists (`SKILL`, `DOC`, `ARCH`, `SCRIPT`).
   - `Runtime & Contract Diagnostics Lead` (`runtime_and_contract_diagnosis`) -> 2 `readOnly: true` specialists (`MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`, `SEC`).
   - `Token & Execution Optimization Lead` (`token_and_execution_optimization`) -> 2 `readOnly: true` specialists (`RUN`, `SKILL`, `SVC`, `ARCH`).
3. **Report, patrol & bundle (`Specialists` -> `Working Leads / Coordinator` -> `Operator`):** Specialists write `specialist-<N>/report.md` and send `<= 500` B `READY` receipts. Leads or coordinator verify claims against source files and `npm test`, emit `Content Verdict: PASS`, and pair with flat `audit-<id>` (`Integrity Verdict: CLEAN`) before bundling via `agy-squad finalize <record.json> --prune [--keep-reports]`.
4. **Ledger, cleanup, remediation & re-verification:** Transcribe every `P0`-`P3` item `1-to-1` into `docs/reviews/<slug>.md` (Sections 1, 8, and 9), prune verified specialist reports via `agy-squad finalize <record.json> --prune` (and clear finished `scratch/agy-squad/` directories via `rm -rf scratch/agy-squad` once findings and bundle SHA-256 digests are archived), keep spawned workers alive to re-verify fixes in place, flip closed ledger rows, kill workers (`swarm{action: "kill"}` / `manage_subagents`), and pass the [four-check runtime closure gate](../roles-and-workflows.md#3-runtime-closure-checklist-and-hook-boundary).
