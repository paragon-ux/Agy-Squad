# Review Roles: Content Acceptance vs. Integrity Audit

Supports role separation in [../SKILL.md](../SKILL.md): never conflate **content quality** with **authentic execution**.

## 1. Two Verdicts

| Role | Question | Exact Enum | Authority | Evidence |
| --- | --- | --- | --- | --- |
| **Lead / Reviewer** | Does work satisfy contracts? | `PASS` / `FAIL` / `BLOCKED` (or `APPROVE` / `REQUEST_CHANGES`) | Final content acceptance | diffs, source, tests |
| **Work / Integrity Auditor** | Did workers perform and ground their work? | `VERIFIED` / `NOT VERIFIED` (legacy `CLEAN` / `INTEGRITY VIOLATION`) | Hard-blocks acceptance; never approves content | `audit-check` evidence, claim spot-checks, hashes |

## 2. Ordering & Discipline

1. Lead issues a **provisional** content verdict.
2. Independent flat auditor (`audit-<id>` / `integrity_auditor:<id>`) runs before acceptance.
3. On `VERIFIED` (or legacy `CLEAN`), lead re-reviews final artifacts and issues the **final** content verdict.
4. On `NOT VERIFIED` (or `INTEGRITY VIOLATION`), acceptance halts immediately: record the failure, reject, require re-run/remediation (never downgrade).
5. Acceptance record logs both verdicts, auditor identity, revision, and post-audit recheck.

- **Strict enums:** Compound/hedged verdicts (`PASS with Advisories`, `CONDITIONAL PASS`) are findings themselves.
- **Audit scope:** Review `agy-squad audit-check` work evidence (provably opened files, citation line validity, read-before-write order, report SHA-256, read-only repo writes) and spot-check up to 3 claims per worker against cited `file:line`. A valid-looking artifact still fails if evidence was fabricated.
- **Enforcement, not prose:** Emit strict audit failures only when an independent auditor, hard `NOT VERIFIED` / `INTEGRITY VIOLATION` block, re-run path, and durable record exist; else label advisory.
- **Batching:** Default to one flat `audit-<id>` covering all specialists via `agy-squad audit-check` plus focused source claim spot-checks ([work-evidence & trace inspection](../../swarm-governance/references/bundling-and-wire-format.md#dual-path-trace-inspection)). State checked workers, flags, and spot-checked claims explicitly.

## 3. Checklist

- [ ] Named lead owns content; independent peer owns work verification.
- [ ] Distinct single-line enums; compound verdicts flagged.
- [ ] Lead rechecks after `VERIFIED` / `CLEAN`; `NOT VERIFIED` / `INTEGRITY VIOLATION` hard-blocks.
- [ ] Coverage is explicit, proportional, and backed by `audit-check` evidence.
