---
name: pr-review
description: >-
  [Task Spec: PR/branch diff & CI review; pair with swarm-governance on /swarm]
  Perform, update, or verify a PR or branch review in the active repository
  under Agy-Squad PR Review Standard v1.5.0 (ARCH..DEP, SEC), with provenance,
  1-ID-per-row findings, and Section 8 residuals.
---

# Agy-Squad PR Review Skill (Standard v1.5.0)

Conduct PR, branch diff, and CI reviews in the active repository.

- Related: [`full-review`](../full-review/SKILL.md) (non-diff/Direction) | [`day-one-review`](../day-one-review/SKILL.md) (cold Day-1 launch) | [`swarm-governance`](../swarm-governance/SKILL.md) (`/swarm`)
- Guides: [`pr-review-standard.md`](./references/pr-review-standard.md) | [PR review guide](https://paragon-ux.github.io/Agy-Squad/skills/pr-review/) | [Roles & workflows](https://paragon-ux.github.io/Agy-Squad/roles-and-workflows/)

## Invariants

1. **Architecture First:** Trace `design thesis -> decision -> contract -> implementation -> verification` against normative docs/ADRs (if present). Never rewrite contracts to match defective code.
2. **11 Categories, Zero Quotas:** Map each changed file to one primary category (`ARCH`..`DEP`, `SEC`) and cross-reference without double-counting (`DB` Not applicable on filesystem-only state; exploitable flaws own `SEC`).
3. **Evidence Separation:** Separate source inspection, local runs, and CI logs ([Section 6](./references/pr-review-standard.md#6-evidence-rules)).
4. **Content vs. Integrity:** Keep `Content Verdict: PASS | FAIL | BLOCKED` separate from flat auditor (`audit-<id>` / `integrity_auditor[:<id>]`) `Target Squad: <id>`, `Evidence Digest: <64-hex>`, and `Integrity Verdict: CLEAN | INTEGRITY VIOLATION`. Approve only after `CLEAN` and post-fix recheck.
5. **1 ID = 1 Row & Readability:** One stable ID per defect using the 6 canonical statuses; reserve the 5 Section 8 statuses strictly for Section 8 ([Section 5](./references/pr-review-standard.md#5-required-finding-record)). Restrict backticks to code identifiers, paths, flags, commands, and verdicts quoted in prose; standalone machine-parsed `Content Verdict:`, `Integrity Verdict:`, `Target Squad:`, and `Evidence Digest:` declaration lines must never wrap the declaration or verdict token in backticks (plain text or balanced `**...**` emphasis only).

## Workflow

1. **Mode:** Single-agent for small diffs, or [`swarm-governance`](../swarm-governance/SKILL.md#workflow) (Step 0 `ask_question` for any unspecified `/swarm` settings) with flat `audit-<id>`.
2. **Pin & Trace:** Pin repo, target, date, standard `1.5.0`, base/head SHAs, dirty delta, CI SHAs, Session Provenance, and exclusions; trace architecture before runtime checks.
3. **Audit:** Cover all 11 categories (`ARCH`..`DEP`, `SEC`); write 10-field records (``#### `<ID>`: <Title> | <Priority> | <Status>``) for P0-P2 and 1-row-per-ID tables for P3.
4. **Deliver:** Request changes on open P1/P2 blockers; mark Incomplete if any material category is unreviewed; Approve only after full coverage, `CLEAN` audit, and fixed-revision recheck. Write Sections 1-8 (`None (0 open residuals, 0 deferred items)` if Section 8 is empty; Section 9 only for `/self-diagnosis`) to `docs/reviews/<slug>.md` when adopted/requested; else deliver in chat or an Antigravity artifact.
