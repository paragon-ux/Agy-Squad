---
name: full-review
description: >-
  [Task Spec: non-diff triage, evidence bundles & Direction decisions; pair with
  swarm-governance on /swarm] Run a full review, triage, root-cause diagnosis,
  or direction recommendation on the active repository using repo state or
  supplied evidence under PR Review Standard v1.5.0.
---

# Agy-Squad Full Review Skill (Standard v1.5.0)

Review a repository target, subsystem, or evidence bundle and answer the user's question (keep diagnosis separate from unauthorized edits).

- Related: [`pr-review`](../pr-review/SKILL.md) (PR diffs) | [`day-one-review`](../day-one-review/SKILL.md) (cold Day-1) | [`self-diagnosis`](https://paragon-ux.github.io/Agy-Squad/skills/self-diagnosis/) (repo-only maintainers) | [`swarm-governance`](../swarm-governance/SKILL.md) (`/swarm`)
- Guides: [`pr-review-standard.md`](../pr-review/references/pr-review-standard.md) | [Full review guide](https://paragon-ux.github.io/Agy-Squad/skills/full-review/) | [Roles & workflows](https://paragon-ux.github.io/Agy-Squad/roles-and-workflows/)

## Invariants

1. **Standard v1.5.0:** Enforce [`pr-review-standard.md`](../pr-review/references/pr-review-standard.md) Sections 1-9 (`1 ID = 1 Row`, 6 statuses, Section 8 exclusivity) plus non-PR intake and Direction decisions.
2. **Pin & Trace First:** Pin revisions, hashes, dirty state, access, and exclusions; trace `invariant -> decision -> contract -> implementation -> verification` before judging behavior.
3. **11 Categories & Roles:** Cover `ARCH`..`DEP`, `SEC` (`DB` Not applicable on filesystem-only state). Content lead owns `Content Verdict: PASS | FAIL | BLOCKED`; flat auditor (`audit-<id>` / `integrity_auditor[:<target>]`) owns `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` ([review roles](./references/review-roles.md)); lead rechecks after `CLEAN`.
4. **Locators & Readability:** Separate `Observed` from `Source-derived inference` (`path#Lx-Ly`, transcript `SHA-256 + step N @ ISO`, command + exit, prior ID + `accepted/revised/rejected`). Restrict backticks to identifiers, paths, flags, commands, and verdicts quoted in prose; standalone machine-parsed `Content Verdict:`, `Integrity Verdict:`, `Target Squad:`, and `Evidence Digest:` declaration lines must never wrap the declaration or verdict token in backticks (plain text or balanced `**...**` emphasis only).

## Workflow

1. **Frame & Intake:** State the question in 1 sentence, name target type, pin minimum evidence ([evidence intake](./references/evidence-intake.md)). On `/swarm`, run [`swarm-governance`](../swarm-governance/SKILL.md#workflow) Step 0 `ask_question` for any unspecified settings.
2. **Ingest & Triage:** Fill [report-template.md](./references/report-template.md) Sections 1-3, index large transcripts/logs in one batch pass ([transcript protocol](./references/evidence-intake.md#3-transcript-protocol-batch-never-poll)), triage all 11 categories, and route residuals/deferrals strictly to Section 8.
3. **Direction Decision (if asked):** Fill Section 7.2 (Question, Constraints, Options incl. status quo & minimal, Recommendation, Falsifiers, Next actions, What not to do). Never recommend merge with unreviewed material categories or open P1/P2 blockers.
4. **Deliver & Recheck:** Save `docs/reviews/<slug>.md` when adopted/requested; else deliver in chat or an Antigravity artifact. Recheck fixes at the fixed revision and pass [quality gates](./references/report-template.md#quality-gates).
