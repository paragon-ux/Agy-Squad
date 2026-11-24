# `pr-review`: Pull Request & Branch Review (Standard v1.5.0)

Use `pr-review` when auditing a pull request, branch diff, or CI run in the active repository. It is a **Task Spec** skill that enforces the [Agy-Squad PR Review Standard v1.5.0](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md) and pairs with [`swarm-governance`](swarm-governance.md) when run across a `/swarm` team.

- **Source specification:** [`.agents/skills/pr-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md)
- **Normative standard:** [`pr-review-standard.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md) (`v1.5.0`)
- **Canonical role map & closure gate:** [Roles, skill workflows, and runtime closure](../roles-and-workflows.md)

## When to use `pr-review`

- Reviewing a PR, branch comparison (`base..head`), or CI run against the repository's contracts and tests.
- Re-verifying remediations on an existing PR review ledger before recommending approval.
- For broad non-diff evidence bundles or Direction decisions, use [`full-review`](full-review.md); for cold Day-1 external launch audits, use [`day-one-review`](day-one-review.md).

## Core invariants

1. **Architecture before runtime:** Trace `design thesis -> decision -> contract -> implementation -> verification` against the target repository's architecture docs or ADRs (when present) before trusting passing tests. Never rewrite contracts to match defective code.
2. **Eleven mandatory categories (`ARCH`..`DEP`, `SEC`):** Map every changed artifact to one primary category across `ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`, and `SEC` (security, trust boundaries, and vulnerabilities) without double-counting. Exploitable security defects own primary category `SEC` and cross-reference affected layers.
3. **Strict content vs. integrity gate:** Separate `Content Verdict: PASS | FAIL | BLOCKED` from the independent flat Integrity Auditor's `Target Squad`, `Evidence Digest: <64-hex>`, and `Integrity Verdict: CLEAN | INTEGRITY VIOLATION`.
4. **`1 ID = 1 Row` durability:** Assign one atomic ID per defect (`P0`-`P2` 10-field records; `P3` compact table rows) and route post-remediation residuals, deferred items, and by-design observations exclusively to Section 8.

## Workflow

1. **Pre-flight intake and defaults (`Operator / Review Lead`):** Run a `Single-Agent Audit` directly, or when launching `/swarm`, pair with [`swarm-governance`](swarm-governance.md): ask Step 0 `ask_question` only for any missing swarm setting among `topology`, `model`, `workspaceIsolation`, and report retention (skip Step 0 when all four are specified; inline tasks bias `flat`, while manifests with `lead` blocks compile `layered` unless `--topology flat` is passed), with a flat Integrity Auditor (`audit-<id>` / `integrity_auditor[:<id>]`).
2. **Pin provenance:** Record repository, PR URL, base/head SHAs, uncommitted dirty delta, CI run SHAs, append-only `Session Provenance` table, file inventory, and evidence limits.
3. **Architecture trace & 11-category review:** Trace contracts before runtime checks, evaluate all eleven categories (`ARCH`..`DEP`, `SEC`), and coordinate `/swarm` specialists via [`swarm-governance`](swarm-governance.md) if multi-agent execution is selected.
4. **Independent integrity audit:** When a cohort ran or integrity verification is enabled, run a flat Integrity Auditor (`audit-<id>`) to verify tool traces and SHA-256 digests before issuing a final recommendation.
5. **Verdict, re-verification & delivery:** Recommend `Approve` only when material categories are covered, blockers are closed and re-checked at the fixed commit, and audit status is `CLEAN`. Deliver the structured `v1.5.0` report in chat or an Antigravity artifact by default, or save to `docs/reviews/<review-slug>.md` when the repository already maintains `docs/reviews/` or the user explicitly requests it.
