# Full Review Report Template

Save to `docs/reviews/<slug>.md` if adopted or requested; else deliver in chat or an Antigravity artifact. Keep every mandatory section (use Not applicable with reason; None identified within reviewed scope or Not assessed per empty bucket). Reserve backticks for identifiers, paths, flags, commands, and literal verdicts.

---

# <Review title>

**Standard:** Agy-Squad PR Review Standard `v1.5.0` ([`pr-review-standard.md`](../../pr-review/references/pr-review-standard.md)) | **Type:** `<type>` | **Date:** `<YYYY-MM-DD>` | **Reviewer:** `<name>`

## 1. Metadata, Session Provenance & Limits

### 1.1 Target

| Field | Value |
| --- | --- |
| Repository | `<owner/repo>` |
| Target | `<PR/branch/commit/tree/bundle>` |
| Base / Head | `<base SHA>` / `<head SHA>` |
| Working tree | `<clean/dirty delta>` |
| CI revision | `<commit/run URL>` |
| Prior review | `<path + IDs, or None>` |

### 1.2 Session Provenance

| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology |
| --- | --- | --- | --- | --- | --- |
| `<n>` | `<id>` | `<parent/None>` | `<date>` | `<base..head + state>` | `<skill/topology>` |

### 1.3 Evidence Manifest & Limits

| EID | Artifact | Locator | SHA-256 / Size | Class | Access | Examined |
| --- | --- | --- | --- | --- | --- | --- |
| `E01` | `<item>` | `<path/URL/step>` | `<hash/size>` | `<class>` | `<Examined/Partial/Unavailable>` | `<scope>` |

Limits: `<unavailable/partial evidence, environment limits, source-derived claims>`

## 2. Inventory & Coverage Matrix

| Artifact | Role | Primary Cat | Cross-Refs | Coverage |
| --- | --- | --- | --- | --- |
| `<path>` | `<added/mod/unchanged>` | `<ARCH..DEP, SEC>` | `<cats>` | `<Complete/Partial/Not reviewed>` |

| Cat | Scope | Coverage | Verdict |
| --- | --- | --- | --- |
| `ARCH` | `<scope>` | `<cov>` | `<Changes required/No findings/Incomplete/N/A>` |
| `DOC` / `SKILL` / `MCP` / `RUN` / `SVC` / `DB` / `SCRIPT` / `TEST` / `DEP` / `SEC` | `<expand 1 row per cat>` | | |

## 3. Architecture Trace

`design thesis / invariant -> architecture decision -> public contract -> implementation -> verification`

| Claim | Source | Decision | Contract | Code | Verification | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `<claim>` | `<doc/ADR>` | `<decision>` | `<schema/doc>` | `<code>` | `<test/run>` | `<satisfied/mismatch/unverified>` |

## 4. Category Reviews

### 4.1 `ARCH`: Architecture and contracts
- **Scope:** `<files>` | **Coverage:** `<Complete/Partial/Not reviewed>`
- **P1 / P2 / P3:** `<IDs or None identified within reviewed scope / Not assessed>` (separate bucket per priority)
- **Verification:** `<tests/CI/gaps>` | **Verdict:** `<Changes required/No findings within reviewed scope/Incomplete/Not applicable>`

Repeat for `DOC` (`4.2`), `SKILL` (`4.3`), `MCP` (`4.4`), `RUN` (`4.5`), `SVC` (`4.6`), `DB` (`4.7`), `SCRIPT` (`4.8`), `TEST` (`4.9`), `DEP` (`4.10`), `SEC` (`4.11`).

### 4.12 Integrity Audit Record (when used)
- **Role contract:** [review roles](review-roles.md) | **Auditor / independence:** `<who/parent>`
- **Coverage & Findings:** `<traces/ranges/gaps; IDs or None>`
- **Lead recheck after CLEAN:** `<reviewer + final verdict>` | **Outcome:** `<CLEAN / INTEGRITY VIOLATION / N/A>`

## 5. Findings

### 5.1 P0/P1/P2 Records

#### `<ID>`: <title> | P1 | Open (Pre-Remediation)
1. **Title, priority, status:** `<...>`
2. **Contract provenance:** `<invariant/ADR/contract/norm>`
3. **Source evidence:** `<pinned links, lines, symbol, step>`
4. **Trigger:** `<input/state/instruction>`
5. **Expected / actual:** `<mismatch; observed vs inferred>`
6. **Impact:** `<consequence/scope>`
7. **Required remediation:** `<behavior, compatibility, surfaces>`
8. **Acceptance evidence:** `<regression test or source reconciliation>`
9. **Root cause / related IDs:** `<links>`
10. **Closure:** `<commit, revision evidence, recheck, limits>`

### 5.2 P3 Advisory Table

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<ID>` | `<wave>` | `<cat>` | `<status>` | `<path#line>` | `<defect>` | `<fix>` | `<evidence/sha>` |

## 6. Cross-Category Root Causes & Order
- **Root cause:** `<desc>` (`<cats/IDs>`) | **Order:** `<steps>`

## 7. Overall Disposition, Direction Decision & Closure

### 7.1 Overall Disposition
- **Coverage:** `<status across N cats>` | **Blockers:** `<IDs or None>` | **Disposition:** `<Approve/Request changes/Incomplete>` | **Reason:** `<basis>`

### 7.2 Direction Decision (when requested)
- **Question:** `<1 sentence>` | **Role separation:** `<owner/auditor/recheck or N/A>`
- **Hard constraints:** `<constraints>` | **Preferences:** `<prefs>`

| Option | Preserves | Costs / Risks | Deps | Reversibility | For | Against |
| --- | --- | --- | --- | --- | --- | --- |
| `<status quo>` | | | | | | |
| `<minimal>` | | | | | | |

- **Recommendation & evidence:** `<option + IDs>` | **Falsifiers:** `<triggers>`
- **Next actions:** `<ordered + tests>` | **What not to do:** `<ruled-out>`

### 7.3 Finding Closure Table

| ID | Cat | Prio | Status | Fix / Revision Evidence | Recheck |
| --- | --- | --- | --- | --- | --- |
| `<ID>` | `<cat>` | `<P#>` | `<status>` | `<commit/link>` | `<closed/residual>` |

## 8. Post-Remediation Residuals & Deferred Dispositions

`None (0 open residuals, 0 deferred items)` or:

| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<ID>` | `<wave>` | `<cat>` | `<Residual (Open)/Closed (Post-Remediation)/Deferred / Won't Fix/Closed (By Design)/Informational>` | `<link>` | `<defect>` | `<disposition>` | `<evidence>` |

## 9. `/self-diagnosis` Cohort & Bundle Ledger

*(Include only when `/self-diagnosis` cohorts ran.)*

| Wave | Session ID | Stage | Subagent IDs | Pre-Fix SHA | Re-Verify SHA | Teardown |
| --- | --- | --- | --- | --- | --- | --- |
| `<wave>` | `<id>` | `<stage>` | `<ids>` | `<sha/N/A>` | `<sha>` | `<retained/pruned>` |

| ID | Cat | Prio | Status | Cohort Verification |
| --- | --- | --- | --- | --- |
| `<ID>` | `<cat>` | `<P#>` | `<status>` | `<evidence>` |

## Appendix A & B: Verification & Quoted Evidence

| Check | Revision | Env | Result | Evidence |
| --- | --- | --- | --- | --- |
| `<cmd>` | `<sha>` | `<OS>` | `<pass/fail/blocked>` | `<output>` |

| EID / Locator | Quote | Class | Establishes |
| --- | --- | --- | --- |
| `<step/line>` | `<quote>` | `<user/model/tool/source>` | `<claim>` |

## Quality gates

- [ ] Standard read; target, base, dirty state, evidence manifest, and exclusions pinned.
- [ ] All artifacts mapped to one primary category; all 11 categories (`ARCH`..`DEP`, `SEC`) complete.
- [ ] `1 ID = 1 Row`; no umbrella/range IDs; Section 8 holds every residual, deferred, by-design, and informational item.
- [ ] Locators on all claims; observed vs inferred separated; prior findings revalidated; gaps separate from defects.
- [ ] Direction decision (if asked) has constraints, options, recommendation, and falsifiers.
- [ ] If audited: separate verdicts, auditor never approved content, lead rechecked after `CLEAN`, `INTEGRITY VIOLATION` hard-blocks.
- [ ] Disposition matches coverage/blockers; clean formatting; report delivered/linked.
