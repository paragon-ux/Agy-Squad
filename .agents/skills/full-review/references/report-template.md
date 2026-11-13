# Full review report template

Copy this skeleton into `docs/reviews/<review-slug>.md` and replace every `<...>` placeholder. Delete no mandatory section; use Not applicable with a reason where a section does not apply, and None identified within reviewed scope or Not assessed inside each triage bucket as the standard requires.

**Formatting & Readability:** Keep reports scannable in plain prose and Markdown tables. Reserve backticks strictly for exact code identifiers, file paths, CLI flags, and commands—never wrap plain numbers, statuses (Closed, Open, PASS), or quoted sentences inside inline backticks or fenced code blocks inside table cells.

---

# <Review title>

**Governing Standard:** Agy-Squad PR Review Standard `v1.3.0` ([`pr-review-standard.md`](../../pr-review/references/pr-review-standard.md))
**Review type:** `<PR / branch / working tree / subsystem / evidence bundle / direction decision>`
**Review date:** `<YYYY-MM-DD>`
**Reviewer:** `<name / agent>`
**Standard version:** `1.3.0`

## 1. Review metadata, Session Provenance, and evidence limits

### 1.1 Target

| Field | Value |
| --- | --- |
| Repository | `paragon-ux/Agy-Squad` |
| Target | `<PR URL / branch / commit / working tree / evidence bundle>` |
| Comparison base | `<base SHA / tag / none>` |
| Head / tree | `<head SHA / tree>` |
| Working-tree state | `<clean / dirty delta / untracked files>` |
| CI revision | `<exact commit / run URL>` |
| Prior review | `<path and finding IDs, or None>` |

### 1.2 Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |
| --- | --- | --- | --- | --- | --- |
| `<n>` | `<id or Unavailable>` | `<parent or None>` | `<YYYY-MM-DD>` | `<base..head + state>` | `<skill / single-agent / cohort>` |

### 1.3 Evidence manifest

| EID | Artifact | Locator | SHA-256 / size | Class | Access | Examined |
| --- | --- | --- | --- | --- | --- | --- |
| `E01` | `<file/transcript/CI>` | `<path/URL/step>` | `<hash/size>` | `<class>` | `<Examined / Partial / Unavailable>` | `<lines/steps>` |

### 1.4 Evidence limits

- `<Unavailable or partial evidence, with reason>`
- `<Environment limitations, e.g. WSL unavailable, sandbox denial>`
- `<Claims that remain source-derived rather than observed>`

## 2. File/artifact-to-category inventory and coverage matrix

| Artifact | Change / role | Primary category | Cross-references | Coverage |
| --- | --- | --- | --- | --- |
| `<path>` | `<added/modified/unchanged>` | `<ARCH...DEP>` | `<categories>` | `<Complete/Partial/Not reviewed>` |

| Category | Scope covered | Coverage | Verdict |
| --- | --- | --- | --- |
| `ARCH` | `<files/evidence>` | `<Complete/Partial/Not reviewed>` | `<Changes required / No findings / Incomplete / Not applicable>` |
| `DOC` | | | |
| `SKILL` | | | |
| `MCP` | | | |
| `RUN` | | | |
| `SVC` | | | |
| `DB` | | | |
| `SCRIPT` | | | |
| `TEST` | | | |
| `DEP` | | | |

## 3. Architecture-to-implementation trace

For each behavior or claim:

`design thesis / invariant -> architecture decision -> public contract -> implementation -> verification`

| Claim | Normative source | Architecture decision | Public contract | Implementation | Verification | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `<claim>` | `<LEDGER ID / standard / user requirement>` | `<decision>` | `<schema/docs>` | `<code>` | `<test/run/evidence>` | `<satisfied / mismatch / unverified>` |

Narrative: `<what the trace establishes and what it does not>`

## 4. Category reviews

### 4.1 `ARCH` — Architecture and contracts

- **Scope:** `<changed and unchanged artifacts examined>`
- **Coverage:** `<Complete / Partial / Not reviewed; what remains>`
- **P1 — high priority:** `<finding IDs or None identified within reviewed scope / Not assessed>`
- **P2 — medium priority:** `<finding IDs or ...>`
- **P3 — low priority:** `<finding IDs or ...>`
- **Verification:** `<tests inspected/executed, CI, missing proof>`
- **Verdict:** `<Changes required / No findings within reviewed scope / Incomplete / Not applicable>`

Repeat this seven-item record for `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, and `DEP`.

### 4.12 Integrity audit record (when an integrity audit is used)

- **Role contract:** see [review roles](review-roles.md).
- **Auditor / independence:** `<who, parent, independence from the reviewed work>`
- **Verdict enum:** `CLEAN` / `INTEGRITY VIOLATION`
- **Coverage:** `<transcripts and step ranges, tool traces, artifacts, evidence classes; what was not covered>`
- **Findings:** `<IDs or None identified within reviewed scope / Not assessed>`
- **Lead re-review after CLEAN:** `<who re-reviewed the final artifacts and the resulting content verdict>`
- **Enforcement:** `<violation block, rejection/re-run, penalty or ledger record>`
- **Verdict:** `<CLEAN / INTEGRITY VIOLATION / Not applicable>`

## 5. Findings

### 5.1 P0/P1/P2 finding records

#### `<ID>` — `<title>` (`P1`, `Open (Pre-Remediation)`)

1. **Title, priority, status:** `<...>`
2. **Contract provenance:** `<exact invariant / decision / contract / external norm>`
3. **Source evidence:** `<commit-pinned links, lines, symbol, transcript step>`
4. **Trigger:** `<concrete input/state/interleaving/instruction>`
5. **Expected / actual:** `<mismatch; observed vs source-derived>`
6. **Impact:** `<consequence and scope>`
7. **Required remediation:** `<behavior to restore, compatibility constraints, affected surfaces>`
8. **Acceptance evidence:** `<regression case and assertions, or source reconciliation>`
9. **Root cause / related IDs:** `<cross-layer connection>`
10. **Closure:** `<fix commit, evidence at that revision, recheck, residual limits>`

### 5.2 P3 advisory table

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<ID>` | &lt;wave/session&gt; | &lt;cat&gt; | &lt;status&gt; | `<path#line>` | &lt;defect summary&gt; | &lt;fix summary&gt; | `<evidence or sha>` |

## 6. Cross-category root causes and remediation order

- **Root cause 1:** `<description>` — `<categories and IDs>`
- **Remediation order:** `<ordered steps with dependencies and rationale>`

## 7. Overall disposition, Direction decision, and finding closure

### 7.1 Overall disposition

- **Coverage:** `<complete / partial / incomplete>` across `<n>` material categories.
- **Blocking findings:** `<IDs>` or `None`.
- **Disposition:** `<Approve / Request changes / Incomplete / Not applicable>`.
- **Reason:** `<coverage and blocking-finding basis; never a pass percentage>`.

### 7.2 Direction decision (required when the user asks what to do)

- **Decision question:** `<one sentence>`
- **Role separation:** `<content owner / integrity auditor / lead re-review after CLEAN, or Not applicable>`
- **Hard constraints:** `<constraint>` — `<citation>`
- **Preferences:** `<preference>` — `<citation>`

| Option | Preserves | Costs / risks | Dependencies | Reversibility | Evidence for | Evidence against |
| --- | --- | --- | --- | --- | --- | --- |
| `<status quo>` | | | | | | |
| `<option B>` | | | | | | |
| `<option C>` | | | | | | |

- **Recommendation:** `<option and rationale>`
- **Load-bearing evidence:** `<IDs and citations>`
- **Falsifiers:** `<what evidence would change the recommendation>`
- **Immediate next actions:** `<ordered actions with acceptance tests>`
- **What not to do:** `<ruled-out action and evidence>`

### 7.3 Finding closure table

| ID | Category | Priority | Status | Fix / evidence at revision | Recheck result |
| --- | --- | --- | --- | --- | --- |
| `<ID>` | `<cat>` | `<P#>` | `<status>` | `<commit/link>` | `<closed/residual>` |

## 8. Post-Remediation Residuals & Deferred Dispositions

`<None (0 open residuals, 0 deferred items)>` or the atomic table:

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<ID>` | `<wave>` | `<cat>` | `<Residual (Open) / Closed (Post-Remediation) / Deferred / Won't Fix / Closed (By Design) / Informational>` | `<link>` | `<defect>` | `<disposition>` | `<evidence>` |

## 9. `/self-diagnosis` Cohort & Bundle Ledger

Include only when cohorts were dispatched.

### 9.1 Cohort Provenance

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| `<wave>` | `<id>` | `<stage>` | `<ids>` | `<sha or N/A>` | `<sha>` | `<retained/torn down>` |

### 9.2 Wave Finding Ledger

| ID | Category | Priority | Status | Specialist / Cohort Verification |
| --- | --- | --- | --- | --- |
| `<ID>` | `<cat>` | `<P#>` | `<status>` | `<evidence>` |

## Appendix A — Verification record

| Check | Revision | Environment | Result | Evidence |
| --- | --- | --- | --- | --- |
| `<command>` | `<sha>` | `<OS/runtime>` | `<pass/fail/blocked>` | `<output/link>` |

## Appendix B — Quoted evidence

| EID / locator | Quote | Class | What it establishes |
| --- | --- | --- | --- |
| `<step/line>` | &lt;short verbatim quote&gt; | &lt;user/model/tool/source&gt; | &lt;bounded claim&gt; |

## Quality gates

- [ ] The standard was read; target, base, dirty state, evidence manifest, and exclusions are pinned.
- [ ] Every changed file or artifact is mapped to one primary category; all ten categories have scope, coverage, P1/P2/P3, verification, and verdict.
- [ ] Every finding has one ID, one status, and the required fields; no umbrella or range IDs.
- [ ] Every material claim has a locator; observed and inferred are separated.
- [ ] Prior findings are explicitly accepted, revised, or rejected.
- [ ] Verification gaps are separate from defects; unavailable evidence is stated.
- [ ] Section 8 contains every residual, deferred, by-design, and informational item.
- [ ] A requested direction decision has constraints, options, a recommendation, and falsifiers.
- [ ] When an integrity audit is used: the content and integrity verdicts are separate, the auditor did not approve content, the lead re-reviewed after `CLEAN`, and `INTEGRITY VIOLATION` hard-blocks acceptance.
- [ ] The disposition matches coverage and open findings; no approval from a pass rate or an unreviewed category.
- [ ] Formatting & Readability: prose and table cells avoid unnecessary inline backticks on numbers, statuses, and quoted sentences, and avoid fenced code blocks inside narrative/tables.
- [ ] The report is saved at a stable path and linked from the response.
