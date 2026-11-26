# `pr-review`: Pull Request & Branch Review (Standard v1.6.0)

Use `pr-review` when auditing a pull request, branch diff, or CI run in the active repository. It is a **Task Spec** skill that enforces the [Agy-Squad PR Review Standard v1.6.0](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md) and pairs with [`swarm-governance`](swarm-governance.md) when run across a `/swarm` team.

- **Source specification:** [`.agents/skills/pr-review/SKILL.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/SKILL.md)
- **Normative standard:** [`pr-review-standard.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/.agents/skills/pr-review/references/pr-review-standard.md) (`v1.6.0`)
- **Canonical role map & closure gate:** [Roles, skill workflows, and runtime closure](../roles-and-workflows.md)

## When to use `pr-review`

- Reviewing a PR, branch comparison (`base..head`), or CI run against the repository's contracts and tests.
- Re-verifying remediations on an existing PR review ledger before recommending approval.
- For broad non-diff evidence bundles or Direction decisions, use [`full-review`](full-review.md); for cold Day-1 external launch audits, use [`day-one-review`](day-one-review.md).

## Core invariants

1. **Architecture before runtime:** Trace `design thesis -> decision -> contract -> implementation -> verification` against the target repository's architecture docs or ADRs (when present) before trusting passing tests. Never rewrite contracts to match defective code.
2. **Eleven mandatory categories (`ARCH`..`DEP`, `SEC`):** Map every changed artifact to one primary category across `ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`, and `SEC` (security, trust boundaries, and vulnerabilities) without double-counting. Exploitable security defects own primary category `SEC` and cross-reference affected layers.
3. **Strict content vs. work verification gate:** Separate `Content Verdict: PASS | FAIL | BLOCKED` from the independent flat auditor's `Target Squad`, `Evidence Digest: <64-hex>`, and `Work Verdict: VERIFIED | NOT VERIFIED` (legacy `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` remains accepted).
4. **`1 ID = 1 Row` durability:** Assign one atomic ID per defect (`P0`-`P2` 10-field records; `P3` compact table rows) and route post-remediation residuals, deferred items, and by-design observations exclusively to Section 8.

## Workflow

1. **Pre-flight intake and defaults (`Operator / Review Lead`):** Run a single-agent review directly, use `/boost` for small single-module diffs (`<= 6-8` files) that do not need multi-squad partitioning, or pair with [`swarm-governance`](swarm-governance.md) on `/swarm`. Read-only PR reviews start right away with built-in defaults (`flat` for inline tasks, staged `layered` waves for manifests with `lead` blocks unless `--topology flat` is passed, `inherit` workspace mode, the coordinator's model, and flat `audit-<id>` work verification), calling `ask_question` only if writable workers overlap on `inherit` or you ask to customize settings.
2. **Pin provenance:** Record repository, PR URL, base/head SHAs, uncommitted dirty delta, CI run SHAs, append-only `Session Provenance` table, file inventory, and evidence limits.
3. **Architecture trace & 11-category review:** Trace contracts before runtime checks, evaluate all eleven categories (`ARCH`..`DEP`, `SEC`), and coordinate `/swarm` specialists via [`swarm-governance`](swarm-governance.md) if multi-agent execution is selected.
4. **Independent work verification:** When a cohort ran or auditing is enabled, run a flat auditor (`audit-<id>`) to review `agy-squad audit-check` work evidence, spot-check cited claims against source files, and bind SHA-256 digests before issuing a final recommendation.
5. **Verdict, re-verification & delivery:** Recommend `Approve` only when material categories are covered, blockers are closed and re-checked at the fixed commit, and audit status is `VERIFIED` (or legacy `CLEAN`). Deliver the structured `v1.6.0` report in chat or an Antigravity artifact by default, or save to `docs/reviews/<review-slug>.md` when the repository already maintains `docs/reviews/` or the user explicitly requests it.
