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

2. **Compile diagnostic cohorts:** Run `agy-squad plan --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json --out scratch/self-diag-plan.json --replace` (writes `self-diag-plan.json`, `self-diag-plan.wave1.json`, and `self-diag-plan.wave2.json`, and prints a compact summary with `swarmPane`; manifests with `lead` blocks compile staged `layered` waves on `inherit` unless `--topology flat` is passed) or `agy-squad dispatch --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json --squad <all_l1|squadId>` (`invoke_subagent` fallback):
   - `Skill & PR-Review Standard Lead` (`skill_and_pr_review_audit`) -> 2 `readOnly: true` specialists (`SKILL`, `DOC`, `ARCH`, `SCRIPT`).
   - `Runtime & Contract Diagnostics Lead` (`runtime_and_contract_diagnosis`) -> 2 `readOnly: true` specialists (`MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`, `SEC`).
   - `Token & Execution Optimization Lead` (`token_and_execution_optimization`) -> 2 `readOnly: true` specialists (`RUN`, `SKILL`, `SVC`, `ARCH`).
3. **Run staged waves & batch bundle (`Specialists` -> `Leads` -> `Auditors` -> `Coordinator`):** Write `swarmPane` to `.system_generated/swarm/plan.json` and launch Wave 1 (`6` specialists from `scratch/self-diag-plan.wave1.json`). Specialists write `specialist-<N>/report.md` and post `<= 500` B `READY` receipts to `@coordinator`. After specialist receipts arrive, spawn Wave 2 (`3` leads from `scratch/self-diag-plan.wave2.json`) to read specialist report slots directly, spot-check cited `file:line` claims and checks, and emit `Content Verdict: PASS`. Next, run `agy-squad bundle-init --plan scratch/self-diag-plan.json --all-squads --handoffs scratch/handoffs.json --from-scope --coord-id <coordId> --digest --out-dir scratch/records`, spawn Wave 3 (`3` `audit-<id>` workers running `agy-squad audit-check` and emitting `Work Verdict: VERIFIED`, with legacy `Integrity Verdict: CLEAN` accepted), and run `agy-squad finalize scratch/records/*.json --strict-citations` (without `--prune`) so verified bundle SHA-256 hashes are ready before writing the review ledger.
4. **Single-pass ledger, prune, remediation & re-verification:** Write the review ledger in `docs/reviews/<slug>.md` (Sections 1, 8, and 9) in one pass with the verified bundle SHA-256 digests (reading verified `lead/report.md` outputs in layered mode unless `citations.uncarriedUrls` or raw evidence requires opening a specialist report), prune verified specialist reports and temporary records via `agy-squad prune --records <record.json>=<accepted-sha256>... --clean-records` (and clear finished `scratch/agy-squad/` directories via `rm -rf scratch/agy-squad`), skip a duplicate closeout `npm test` on clean read-only runs, keep spawned workers alive to re-verify any fixes in place, update closed ledger rows, stop workers (`swarm{action: "kill"}` / `manage_subagents`), and pass the [four-check runtime closure gate](../roles-and-workflows.md#3-runtime-closure-checklist-and-hook-boundary).
