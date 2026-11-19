# `self-diagnosis`: Maintainer Harness Profiler & Audit

> **Maintainer-only skill:** Run `self-diagnosis` only inside an `Agy-Squad` source repository checkout. To review or govern your own external repository, use [`pr-review`](pr-review.md), [`full-review`](full-review.md), [`day-one-review`](day-one-review.md), or [`swarm-governance`](swarm-governance.md).

`self-diagnosis` audits `Agy-Squad` itself and its workspace skills for contract accuracy, progressive-disclosure budgets, compiled template sizes, link integrity, and pipeline latency.

- **Source specification:** [`.agents/skills/self-diagnosis/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/SKILL.md)
- **References & scripts:** [`diagnose.mjs`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/scripts/diagnose.mjs), [`self-diagnosis-manifest.json`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json), [`optimization-and-review-rubric.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/references/optimization-and-review-rubric.md), [`execution-and-teardown.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/self-diagnosis/references/execution-and-teardown.md)
- **Canonical role map & closure gate:** [Roles, skill workflows, and runtime closure](../roles-and-workflows.md)

## Workflow

1. **Pre-flight intake & zero-subagent profiler (`Operator`):** Confirm execution mode (`/swarm`, `invoke_subagent` fallback, or Local Profiler Only), topology (`Flat` vs. `Layered`, zero default bias), retention (`--keep-reports` vs. `--teardown`), and integrity gate (`audit-<id>` vs. `--allow-unaudited`). Run the zero-subagent local profiler first:

```bash
node .agents/skills/self-diagnosis/scripts/diagnose.mjs --markdown
```

   `diagnose.mjs` validates `SKILL.md` line/byte/prose-share budgets, relative and hosted doc links, runtime closure checklists, `zensical.toml` nav entries, SVG XML sanity, Standard `v1.5.0` (11-category `ARCH`–`DEP`, `SEC`) and legacy `v1.4.0` review ledgers, compiled brief byte budgets, and canary handoff pipeline timings in isolated temp directories.

2. **Compile diagnostic cohorts:** Compile `self-diagnosis-manifest.json` via `diagnose.mjs --print-plan` (primary `/swarm`) or `diagnose.mjs --print-dispatch <all_l1|all_specialists|squadId>` (`invoke_subagent` fallback):
   - `Skill & PR-Review Standard Lead` (`skill_and_pr_review_audit`) -> 2 `readOnly: true` specialists (`SKILL`, `DOC`, `ARCH`, `SCRIPT`).
   - `Runtime & Contract Diagnostics Lead` (`runtime_and_contract_diagnosis`) -> 2 `readOnly: true` specialists (`MCP`, `RUN`, `SVC`, `SCRIPT`, `TEST`, `DEP`, `SEC`).
   - `Token & Execution Optimization Lead` (`token_and_execution_optimization`) -> 2 `readOnly: true` specialists (`RUN`, `SKILL`, `SVC`, `ARCH`).
3. **Report, patrol & bundle (`Specialists` -> `Working Leads / Coordinator` -> `Operator`):** Specialists write `specialist-<N>/report.md` and send `<= 500` B `READY` receipts. Leads or coordinator verify claims against source files and `npm test`, emit `Content Verdict: PASS`, and pair with flat `audit-<id>` (`Integrity Verdict: CLEAN`) before bundling via `agy-squad finalize`.
4. **Ledger, teardown, remediation & re-verification:** Transcribe every `P0`–`P3` item `1-to-1` into `docs/reviews/<slug>.md` (Sections 1, 8, and 9), run `diagnose.mjs --teardown all --ledger docs/reviews/<slug>.md`, keep spawned workers alive to re-verify fixes in place, flip closed ledger rows, kill workers (`swarm{action: "kill"}` / `manage_subagents`), and pass the [four-check runtime closure gate](../roles-and-workflows.md#3-runtime-closure-checklist-and-hook-boundary).
