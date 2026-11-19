# Day-One Review Protocol (PR Review Standard v1.5.0)

This reference defines the exact non-digressing workflow for [../SKILL.md](../SKILL.md). It pairs with [PR Review Standard v1.5.0](../../pr-review/references/pr-review-standard.md) and applies to **any target repository or product** requested by the user (CLIs, IDE plugins, libraries, APIs, or web applications).

---

## 1. Stage 1: Designated Audit Workspace (`scratch/` Default)

1. **Default directory:** `scratch/day-one-review/` inside the target repository (or a user-designated path when specified).
2. **Hygiene check:** Confirm `scratch/` (or the designated audit folder) is gitignored and excluded from release archives/tarballs so review ledgers never accidentally ship in public packages. Write under `docs/reviews/` only when the user explicitly requests a committed in-repo ledger.
3. **File naming lineage:**
   - Initial raw cold pass: `<auditDir>/day-one-review-r1.md`
   - Cumulative follow-up passes: `<auditDir>/day-one-review-r2.md`, `day-one-review-r3.md`, ...
   - Optional unanchored final sanity pass before tagging: `<auditDir>/day-one-review-raw-final.md`
4. **Provenance pin:** Record repository path/URL, branch, `HEAD` SHA, uncommitted working-tree state, OS/runtime versions, and Session Provenance before inspecting files.

---

## 2. Stage 2: Raw, Unguided Initial Review (`r1`)

### Anti-Anchoring Rules (Mandatory on `r1`)
- **Do NOT read** prior review ledgers (`docs/reviews/*`), internal maintainer plans (`docs/plans/*`), PR self-summaries, or user-supplied hypotheses before completing independent outside-in inspection.
- **Zero leading briefs:** When spawning a read-only `invoke_subagent` reviewer (or opt-in `/swarm` specialists), pass ONLY the repository root, pinned commit/branch, output slot/path, and the cold Day-1 persona. Never inject prior finding IDs or "verify that X works" hints.
- **Strictly read-only:** Do not edit repository files or run destructive mutations during a review pass.

### Outside-In Inspection Order & Cold User-Journey Trace Matrix
Walk the repository in the exact order a real external developer experiences it on Day 1, and record a **User-Journey Trace Matrix** inside Section 3 alongside the architecture trace:

| User Journey | Promised Contract | Actual Experience on Disk / Runtime | Test Coverage | Verdict |
| --- | --- | --- | --- | --- |
| 1. First 60 seconds (`README`, visuals/jargon, Quickstart, package/site metadata) | `<claim>` | `<observed reality + file:line>` | `<tests or gap>` | `Satisfied / Mismatch / Gap` |
| 2. Clean install, setup, upgrade & rollback (fresh host, off-`PATH`, cross-OS, missing prereqs) | | | | |
| 3. Everyday usage inside an unrelated user project (zero repo-checkout assumptions, clear errors, low friction) | | | | |
| 4. Security & trust optics (`4.11 SEC`: execution surface, downloads/checksums, permissions, secret hygiene, uninstall cleanliness) | | | | |
| 5. Packaging, CI & release pipeline (published allowlist, exact artifact parity, multi-OS CI, release notes) | | | | |

### Report Structure & Ship Verdict
Conform strictly to [PR Review Standard v1.5.0](../../pr-review/references/pr-review-standard.md) Sections 1–8:
- All **11 mandatory categories** (`4.1 ARCH`, `4.2 DOC`, `4.3 SKILL`, `4.4 MCP`, `4.5 RUN`, `4.6 SVC`, `4.7 DB`, `4.8 SCRIPT`, `4.9 TEST`, `4.10 DEP`, `4.11 SEC`), marking categories that do not apply to the target repository `Not applicable` with a concrete reason (never silently omitted).
- Strict **`1 ID = 1 Row`** (10-field records for P0–P2; compact table rows for P3; mandatory Section 8 sink for residuals, deferred, by-design, and informational items).
- Explicit **Day-1 Ship Verdict** in Section 7:
  - **`SHIP NOW`**: Zero open P0/P1/P2 blockers across all material categories and journeys.
  - **`SHIP WITH QUICK FIXES`**: Zero P0/P1 blockers; only small, localized P2 polish items remain.
  - **`HOLD BEFORE PUBLIC RELEASE`**: Any open P0/P1 blocker, unreviewed material category, or unresolved `SEC` vulnerability.

---

## 3. Stage 3: Remediation & Interruption-Safe Selective Resume

1. **Confirm scope & checkpoint first:** Confirm which priorities to remediate (typically P0–P2, or P0–P3 if requested) and ensure git state is clean (commit or record baseline SHA) before coding subagents touch files.
2. **Direct subagent execution (default):** Dispatch scoped coding subagents via `invoke_subagent` with exact finding IDs from `<auditDir>/day-one-review-r1.md`, non-overlapping file ownership, and required verification commands.
3. **Interruption & Selective Resume Protocol (Non-Negotiable):**
   - If implementation is interrupted by a rate limit (`429`), timeout, disconnect, user pause, or session restart:
     1. Run `manage_subagents(Action='list')` to inspect live state across all direct subagents.
     2. **Resume ONLY the interrupted/paused subagent(s)** (never send unsolicited `send_message` nudges to healthy, actively working subagents; do not interrupt them).
     3. **Never launch fresh replacement coding subagents** when the existing interrupted subagent can be resumed cleanly.
   - **Permanent worker death fallback (Recovery Audit First):** Only when an interrupted subagent has permanently exited/died mid-edit and cannot be resumed in place:
     1. Run a read-only **recovery audit** first inspecting `git diff` / `git status` AND the deceased subagent's full transcript (including tool calls via `agy-context transcript` when available) to classify every assigned finding ID as `Completed`, `Partially Completed`, or `Unremediated`.
     2. Complete **only** the `Partially Completed` and `Unremediated` remainder without overwriting verified work.
4. **Local & CI verification:** Run the target repository's test suite, build/lint/packaging checks, and commit fixes cleanly before starting Stage 4.

---

## 4. Stage 4: Cumulative Follow-Up Reviews & Optional Raw Final

1. **Follow-up reviews build on the initial review (`r2`, `r3`, ...):**
   - Save `<auditDir>/day-one-review-r2.md` (and `r3`, ...) in the same designated directory, explicitly linking `Prior review: day-one-review-r1.md` in Section 1.1 and appending the new session row to Section 1.2 (`Session Provenance`).
   - Carry forward **every prior finding ID** in the closure table with its updated canonical status (`Closed`, `Residual (Open)`, `Closed (Post-Remediation)`, `Deferred / Won't Fix`, `Closed (By Design)`); never silently drop or renumber an ID.
   - Re-verify each fix in its primary category and all affected categories at the new commit, and record any newly discovered defects or regressions with fresh atomic IDs (`R2-...`).
   - Route every post-remediation advisory/residual exclusively to Section 8.
2. **Optional Raw Cold Final Pass (`day-one-review-raw-final.md`):**
   - After major multi-round fixes, if the user requests a final unanchored check before tagging/releasing, run one fresh read-only pass obeying the Stage 2 Anti-Anchoring Rules (zero prior `r1..rN` ledgers read) to catch blind spots missed during guided follow-ups.

---

## 5. Explicit `/swarm` Opt-In: Flat Category Specialists + Flat Auditor

Do **not** launch `/swarm` by default for `day-one-review`. Only when the user **explicitly asks for `/swarm`**, pair with [swarm-governance](../../swarm-governance/SKILL.md) using a **flat `/swarm`** mirroring flat `self-diagnosis`, generalized completely to the requested target repository (never hardcoded to `Agy-Squad` or `Agy-Context-Saver`):

1. **Flat category-specialist split:** Compile a flat single-squad plan via `squad_planner` (`agy-squad plan --topology flat --read-only`) partitioning the 11 Standard `v1.5.0` categories across read-only specialists tailored to the target repo's actual layout, for example:
   - **Specialist 1 (`ARCH`, `DOC`, `SKILL`, `MCP`):** First 60s onboarding, architecture/contracts, public API/CLI/schema docs, diagrams & jargon.
   - **Specialist 2 (`RUN`, `SVC`, `DB`, `SCRIPT`, `DEP`):** Clean install/upgrade/rollback, core runtime behavior, persistence, packaging & dependency boundaries.
   - **Specialist 3 (`TEST`, `SEC`):** Adversarial test & CI strength plus `4.11 SEC` security, injection, containment, secrets, and supply-chain posture.
   *(Adjust specialist count cleanly when categories such as `SKILL`, `MCP`, or `DB` are `Not applicable` for the target repo.)*
2. **Flat Integrity Auditor (`audit-<id>`):** Always pair the flat working specialists with one independent flat `audit-<id>` worker verifying real tool traces (`agy-context transcript` when `Agy-Context-Saver` is installed) and SHA-256 evidence digests (`Integrity Verdict: CLEAN | INTEGRITY VIOLATION`), plus `agy-squad finalize` bundle verification before accepting the synthesis into `scratch/day-one-review/day-one-review-r1.md`.
3. **Preserve all core invariants:** Keep `r1` briefs unanchored (zero prior review ledgers/hints), keep `monitor`/`narrator` strictly observational, post `[done]` and run the 4-check closure gate when finished, and execute Stage 3 remediation separately with selective resume on interruption.
