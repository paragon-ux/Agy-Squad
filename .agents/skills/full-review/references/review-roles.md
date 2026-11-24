# Review Roles: Content Acceptance vs. Integrity Audit

Supports role separation in [../SKILL.md](../SKILL.md): never conflate **content quality** with **authentic execution**.

## 1. Two Verdicts

| Role | Question | Exact Enum | Authority | Evidence |
| --- | --- | --- | --- | --- |
| **Lead / Reviewer** | Does work satisfy contracts? | `PASS` / `FAIL` / `BLOCKED` (or `APPROVE` / `REQUEST_CHANGES`) | Final content acceptance | diffs, source, tests |
| **Integrity Auditor** | Was work produced authentically? | `CLEAN` / `INTEGRITY VIOLATION` | Hard-blocks acceptance; never approves content | traces, hashes, logs |

## 2. Ordering & Discipline

1. Lead issues a **provisional** content verdict.
2. Independent flat Integrity Auditor (`audit-<id>` / `integrity_auditor:<id>`) runs before acceptance.
3. On `CLEAN`, lead re-reviews final artifacts and issues the **final** content verdict.
4. On `INTEGRITY VIOLATION`, acceptance halts immediately: record violation, reject, require re-run/remediation (never downgrade).
5. Acceptance record logs both verdicts, auditor identity, revision, and post-audit recheck.

- **Strict enums:** Compound/hedged verdicts (`PASS with Advisories`, `CONDITIONAL PASS`) are findings themselves.
- **Audit scope:** Verify claimed tool runs/outputs, reasoning vs evidence, real non-stubbed artifacts/hashes, and scope/injection compliance. A valid-looking artifact still fails if evidence was fabricated.
- **Enforcement, not prose:** Emit strict integrity warnings only when an independent auditor, hard `INTEGRITY VIOLATION` block, re-run path, and durable record exist; else label advisory.
- **Batching:** Default to one flat `audit-<id>` covering all specialists via single-pass batch reads ([dual-path trace inspection](../../swarm-governance/references/bundling-and-wire-format.md#dual-path-trace-inspection)). State covered transcripts, step ranges, and gaps explicitly.

## 3. Checklist

- [ ] Named lead owns content; independent peer owns integrity.
- [ ] Distinct single-line enums; compound verdicts flagged.
- [ ] Lead rechecks after `CLEAN`; `INTEGRITY VIOLATION` hard-blocks.
- [ ] Coverage is explicit, proportional, and single-pass batched.
