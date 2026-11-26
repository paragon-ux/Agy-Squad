# `full-review`: Non-Diff Audits, Evidence Triage & Direction Decisions

Use `full-review` when auditing an entire repository, subsystem, commit range, or non-diff evidence bundle (transcripts, logs, CI runs, benchmarks, prior ledgers), or when the user asks a **Direction decision** question (merge vs. rework, keep vs. close, option selection, sequencing).

- **Source specification:** [`.agents/skills/full-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/SKILL.md)
- **References:** [`evidence-intake.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/references/evidence-intake.md), [`report-template.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/references/report-template.md), [`review-roles.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/full-review/references/review-roles.md)
- **Governing standard:** [PR Review Standard v1.6.0](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md)
- **Canonical role map & closure gate:** [Roles, skill workflows, and runtime closure](../roles-and-workflows.md)

## When to use `full-review`

- Auditing repository state, a subsystem, or a multi-artifact evidence bundle beyond a single PR diff.
- Answering an architectural or release **Direction decision** with explicit constraints, options, falsifiers, and sequenced next actions.
- Keep diagnosis separate from unauthorized code edits. For standard PR diffs use [`pr-review`](pr-review.md); for cold Day-1 launch audits use [`day-one-review`](day-one-review.md).

## Workflow

1. **Frame & evidence intake (`Responsible Reviewer`):** State the review or direction question in one sentence, pin `Session Provenance`, and build an explicit **Evidence manifest** (`EID | Artifact | Locator | SHA-256 / size | Class | Access | Examined`). Ingest large logs or transcripts in targeted batch windows rather than step-by-step polling.
2. **Pin, trace & 11-category coverage (`Working Cohort` -> `Responsible Reviewer`):** Trace contracts before runtime behavior and populate all eleven Standard `v1.6.0` categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`, `SEC`), marking unreviewed or irrelevant buckets explicitly (`Not assessed` or `Not applicable` with a reason; never silently skipped). Issue a **provisional** content verdict.
3. **Direction decision (Section 7.2, when requested):** Record the decision question, hard constraints, options table (including status quo and minimal option), load-bearing evidence, falsifiers, ordered immediate next actions, and explicit "What not to do" guardrails.
4. **Two-plane gate (`Responsible Reviewer` <-> `Independent Integrity Auditor`):** When running as a team or `/swarm` (paired with [`swarm-governance`](swarm-governance.md)), the flat Integrity Auditor checks tool traces and file hashes to emit `CLEAN` or `INTEGRITY VIOLATION` (never content `PASS`). On `CLEAN`, the Responsible Reviewer re-checks final artifacts and issues the **final** verdict.
5. **Delivery & quality gates:** Format using `report-template.md` (Sections 1-8, plus Section 9 only if `/self-diagnosis` cohorts ran), saving under `docs/reviews/<review-slug>.md` when adopted or explicitly requested, or delivering in chat or the Antigravity artifact directory.
