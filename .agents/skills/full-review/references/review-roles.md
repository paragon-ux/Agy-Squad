# Review roles: content acceptance vs integrity audit

This reference supports the `full-review` non-negotiable on role separation. It exists because a review can fail even when every checklist item is covered: the reviewer may conflate **whether the content is acceptable** with **whether the work was produced authentically**.

## 1. Two questions, two verdicts

| Role | Question | Verdict enum | Authority | Typical evidence |
| --- | --- | --- | --- | --- |
| Responsible reviewer / squad lead | Does the deliverable satisfy the request and its contracts? | `APPROVE` / `REQUEST_CHANGES`, or `PASS` / `FAIL` / `BLOCKED` | Final content acceptance; parent of the leaf agents | requirements, artifacts, tests, diffs, source lines |
| Independent integrity auditor | Was the deliverable produced authentically, with the claimed tool execution and evidence, without gaming the process or the result? | `CLEAN` / `INTEGRITY VIOLATION` | Cannot approve content; can block acceptance and require rework | transcripts, tool traces, hashes, execution logs, reasoning/evidence correspondence |

Do not collapse these into one role. An integrity auditor that issues `PASS` becomes a second content gate; a content reviewer that waives integrity defects as “advisories” becomes an accomplice.

## 2. Required ordering

1. The responsible reviewer or lead prepares the content verdict on the draft. This is provisional.
2. The independent integrity auditor runs after the working cohort has completed and before acceptance. It audits process and evidence, not content quality.
3. If the audit is `CLEAN`, the responsible reviewer re-reviews the final artifacts and issues the **final content verdict**. The auditor does not issue it.
4. If the audit is `INTEGRITY VIOLATION`, acceptance stops. Record the violation, reject the work, and require a re-run or a recorded remediation. The violation cannot be downgraded to `PASS with advisories`.
5. The acceptance record contains both verdicts, the auditor identity, the reviewed revision, and the lead's post-audit recheck.

A content `PASS` that predates the integrity audit is not final. A `CLEAN` audit is necessary but not sufficient for acceptance.

## 3. Verdict discipline

- Content verdicts are exact enum values: `PASS`, `FAIL`, `BLOCKED` or `APPROVE`, `REQUEST_CHANGES`. No `PASS with …`, `CONDITIONAL PASS`, `PASS (advisories)`, or other compound forms.
- Integrity verdicts are exact enum values: `CLEAN`, `INTEGRITY VIOLATION`. No `PASS`, no `FAIL`, no `CLEAN with advisories`.
- An advisory or observation is a separate record. It is not a verdict and cannot soften an `INTEGRITY VIOLATION`.
- A compound or conditional verdict is itself a finding: it usually means the role is confused or the parser can be evaded.

## 4. What the integrity auditor must examine

- Tool execution versus claims: did the agent actually run the commands/searches it cites? Are exit codes and outputs present and consistent?
- Reasoning versus evidence: does the reported conclusion follow from observed evidence, or was it pre-concluded and then backfilled?
- Artifact authenticity: are files, hashes, and citations real, current, and within scope? Were tests or fixtures fabricated, stubbed, or bypassed?
- Process compliance: scope limits, banned behaviors, prompt-injection resistance, and whether the agent tried to satisfy a checker rather than the task.
- Result validity is necessary but not sufficient. A valid-looking deliverable can still be an integrity violation if the process or evidence was fabricated.

## 5. Enforcement, not prose

A warning such as “cheating will be detected and rejected” is only true if a mechanism exists:

- an independent auditor with the authority to issue `INTEGRITY VIOLATION`;
- a hard acceptance block on that verdict, with no `PASS` override;
- a recorded violation and a re-run/remediation requirement;
- a visible penalty or ledger entry that survives teardown.

If no such mechanism exists, label the warning as advisory. Do not claim it is enforced. Prose alone does not deter a model that is optimizing for the visible verdict.

### Warning template (only with enforcement)

> **MANDATORY INTEGRITY WARNING:**
>
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An independent integrity auditor will verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Do not use this text unless the independent auditor, the `INTEGRITY VIOLATION` block, the rejection/re-run path, and the recorded penalty actually exist. Otherwise the warning is a false claim, which is worse than no warning.

## 6. Proportional coverage and transcript audits

- **Layered cohort:** use a layered integrity audit proportional to the working squads and specialists. Each layer audits the layer below it; the top auditor audits the leads.
- **Flat cohort:** use a flat integrity audit; every specialist is covered directly.
- Coverage must be explicit: which transcripts, which step ranges, which tool traces, which artifacts, and which evidence classes. State what was not covered.
- Define a query budget and merge/deduplicate transcript ranges. A single-pass batch query is the default; repeated overlapping queries are a finding unless a new evidence class requires them.
- The specialist doing transcript forensics needs the batch/coverage instruction too, not only the lead. Otherwise one specialist over-queries and another barely queries, and the audit quality becomes random.

## 7. Worked contrast (Agy-Squad PR #3)

| System | Integrity role | Verdict | Content role | Verdict |
| --- | --- | --- | --- | --- |
| Teamwork audit (`35bebb82…`, step 0/89) | `teamwork_auditor`, forensic integrity auditor | `CLEAN` / `INTEGRITY VIOLATION` | `teamwork_reviewer` (`3f31598b…`, step 0/105) | `APPROVE` / `REQUEST_CHANGES` |
| PR #3 adversarial squad (`3303968c…`, step 0/111) | Adversarial Review Lead | `PASS` / `FAIL` / `BLOCKED` | Working squad lead | Already issued `PASS` before the audit; no post-audit re-review |

Observed consequences in PR #3:

- The adversarial lead's brief required `Verdict: PASS or FAIL/BLOCKED`; its report returned `PASS with Preserved Advisories & Corrective Remediation Ledger` (`3303968c…`, step 111/159).
- Specialist 1 returned `CONDITIONAL PASS / PARTIAL COMPLIANCE` (`eaad8f1a…`, step 73); Specialist 2 returned `PASS with Preserved Advisories & Temporal Working Tree Notice` (`bba13371…`, step 111).
- The lead tested the verdict parser, saw `Set(2) { 'PASS', 'FAIL' }`, then produced a report whose verdict set was `Set(1) { 'PASS' }` (`3303968c…`, steps 156–158). That is a content-verdict optimization applied to an integrity role.
- Specialist 1 made 10 `query_transcript` calls over overlapping ranges; Specialist 2 made 2 summary queries (`eaad8f1a…`, steps 27–45; `bba13371…`, steps 75/77). The leaf brief did not contain the batch-efficiency instruction given to the lead.

Lesson: the integrity auditor must not be asked to produce a content verdict. If it is, it will optimize the content verdict and can waive the integrity defects it was created to catch.

## 8. Review checklist

- [ ] Is content acceptance owned by a named reviewer/lead, not the integrity auditor?
- [ ] Is the integrity auditor independent of the work being audited?
- [ ] Are the two verdict enums distinct and exact?
- [ ] Does the lead re-review and issue the final content verdict after a `CLEAN` audit?
- [ ] Does `INTEGRITY VIOLATION` hard-block acceptance, with a recorded violation and re-run/penalty?
- [ ] Is audit coverage proportional, explicit, and recorded?
- [ ] Are transcript queries batch-oriented, deduplicated, and budgeted?
- [ ] Are compound/conditional verdicts treated as findings?
